import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { NO_ADULT_CONTENT, getStoredAdultContent, setStoredAdultContent } from "../adult-content/model/store.ts";
import { getLanguage, readStoredLanguage, setLanguage } from "../_shared/i18n.ts";
import { LanguageProvider } from "../_shared/language.tsx";
import { LanguageSync } from "./components/language-sync.tsx";
import { getRemoteLanguage, saveRemoteLanguage } from "./api/language.api.ts";
import { getSettings, saveSettings } from "./api/settings.api.ts";
import { useAccountSettings } from "./hooks/use-settings.ts";
import { settingsKeys } from "./keys.ts";
import { getNotificationTypes, saveNotificationType } from "./api/notification-preferences.api.ts";
import {
  DEFAULT_NOTIFICATION_TYPES,
  DEFAULT_SETTINGS,
  NOTIFICATION_GROUP_TYPES,
  SETTINGS_COLUMNS,
  toNotificationTypes,
  withAllNotificationsOff,
  toRow,
  toSettings,
  withLanguage,
  withNotification,
  type SettingsRow,
} from "./model/settings.ts";
import { SettingsScreen } from "./screens/settings-screen.tsx";
import { settingsText } from "./strings.ts";

const t = settingsText;

const ROW: SettingsRow = {
  language_code: "vi",
  notify_chapter_published: true,
  notify_comment_replied: false,
  notify_collaboration_answers: true,
};

afterEach(cleanup);
beforeEach(() => {
  setLanguage("vi", { persist: false });
  // jsdom lacks these; Radix Select calls them when it opens.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
  window.localStorage.clear();
  setStoredAdultContent(NO_ADULT_CONTENT);
});

describe("settings model", () => {
  it("uses the defaults when nothing was saved, and the saved values otherwise", () => {
    expect(toSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(toSettings(ROW)).toEqual({
      language: "vi",
      notifications: { chapterPublished: true, commentReplied: false, collaborationAnswers: true },
    });
  });

  it("falls back to the default language for one this client does not know", () => {
    expect(toSettings({ ...ROW, language_code: "xx" }).language).toBe("vi");
    expect(toSettings({ ...ROW, language_code: "en" }).language).toBe("en");
  });

  it("round-trips through the row shape", () => {
    expect(toRow(toSettings(ROW))).toEqual(ROW);
    expect(toRow(DEFAULT_SETTINGS)).toEqual({
      language_code: "vi",
      notify_chapter_published: true,
      notify_comment_replied: true,
      notify_collaboration_answers: true,
    });
  });

  it("changes one switch or the language and leaves the rest, returning the same object when nothing changes", () => {
    const off = withNotification(DEFAULT_SETTINGS, "commentReplied", false);
    expect(off.notifications).toEqual({ chapterPublished: true, commentReplied: false, collaborationAnswers: true });
    expect(withNotification(off, "commentReplied", false)).toBe(off);
    expect(withNotification(DEFAULT_SETTINGS, "chapterPublished", false).notifications.commentReplied).toBe(true);
    expect(withNotification(DEFAULT_SETTINGS, "collaborationAnswers", false).notifications).toEqual({
      chapterPublished: true,
      commentReplied: true,
      collaborationAnswers: false,
    });
    expect(withLanguage(DEFAULT_SETTINGS, "vi")).toBe(DEFAULT_SETTINGS);
    expect(withLanguage(DEFAULT_SETTINGS, "en")).toMatchObject({
      language: "en",
      notifications: DEFAULT_SETTINGS.notifications,
    });
  });

  it("keys settings by account", () => {
    expect(settingsKeys.account("a")).not.toEqual(settingsKeys.account("b"));
    expect(settingsKeys.account("a")[0]).toBe(settingsKeys.all[0]);
  });
});

function fakeClient(
  options: {
    row?: SettingsRow | null;
    selectError?: unknown;
    upsertError?: unknown;
    types?: { event_type: string; in_app: boolean }[];
    typeUpsertError?: unknown;
  } = {},
) {
  const upsert = vi.fn(async (_row: unknown, _options?: unknown) => ({
    data: null,
    error: options.upsertError ?? null,
  }));
  const select = vi.fn(() => ({
    maybeSingle: async () => ({ data: options.row ?? null, error: options.selectError ?? null }),
  }));
  // notification_preferences: the per-type switches (a plain list of the reader's rows).
  const typeUpsert = vi.fn(async (_row: unknown, _options?: unknown) => ({
    data: null,
    error: options.typeUpsertError ?? null,
  }));
  const typeSelect = vi.fn(async (_columns: string) => ({ data: options.types ?? [], error: null }));
  const from = vi.fn((table: string) =>
    table === "notification_preferences" ? { select: typeSelect, upsert: typeUpsert } : { select, upsert },
  );
  return { from, select, upsert, typeSelect, typeUpsert };
}

describe("settings api", () => {
  it("reads only the settings columns and maps them", async () => {
    const c = fakeClient({ row: ROW });
    expect((await getSettings(c as unknown as DataClient)).notifications.commentReplied).toBe(false);
    expect(c.from).toHaveBeenCalledWith("user_settings");
    expect(c.select).toHaveBeenCalledWith(SETTINGS_COLUMNS);
    expect(await getSettings(fakeClient() as unknown as DataClient)).toEqual(DEFAULT_SETTINGS);
  });

  it("saves by account and never sends the adult-content columns", async () => {
    const c = fakeClient();
    await saveSettings(c as unknown as DataClient, "u1", toSettings(ROW));
    expect(c.upsert).toHaveBeenCalledWith({ user_id: "u1", ...ROW }, { onConflict: "user_id" });
    const payload = c.upsert.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(["user_id", ...Object.keys(ROW)].sort()); // no adult-content columns
  });
});

describe("per-type notification switches", () => {
  it("are on unless a row says otherwise, and ignore types this client does not know", () => {
    expect(toNotificationTypes([])).toEqual(DEFAULT_NOTIFICATION_TYPES);
    expect(
      toNotificationTypes([
        { event_type: "collaboration_declined", in_app: false },
        { event_type: "email_digest", in_app: false },
      ]),
    ).toEqual({ ...DEFAULT_NOTIFICATION_TYPES, collaboration_declined: false });
  });

  it("cover exactly the types the database accepts, each under one group", () => {
    const grouped = Object.values(NOTIFICATION_GROUP_TYPES).flat().sort();
    expect(grouped).toEqual(Object.keys(DEFAULT_NOTIFICATION_TYPES).sort());
    expect(grouped).not.toContain("collaboration_invited");
  });

  it("turn all off switches the three groups off and keeps the language", () => {
    const off = withAllNotificationsOff({ ...DEFAULT_SETTINGS, language: "en" });
    expect(off).toEqual({
      language: "en",
      notifications: { chapterPublished: false, commentReplied: false, collaborationAnswers: false },
    });
  });

  it("are read and saved through notification_preferences", async () => {
    const c = fakeClient({ types: [{ event_type: "collaboration_accepted", in_app: false }] });
    expect((await getNotificationTypes(c as unknown as DataClient)).collaboration_accepted).toBe(false);
    expect(c.from).toHaveBeenCalledWith("notification_preferences");
    await saveNotificationType(c as unknown as DataClient, "u1", "collaboration_declined", false);
    expect(c.typeUpsert).toHaveBeenCalledWith(
      { user_id: "u1", event_type: "collaboration_declined", in_app: false },
      { onConflict: "user_id,event_type" },
    );
  });
});

const toasts = { show: vi.fn() };
const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _replace, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/settings" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

function renderScreen(client: ReturnType<typeof fakeClient>, signedIn = true) {
  toasts.show.mockClear();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(client, signedIn ? testSession() : null)}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={toasts}>
              <SettingsScreen />
            </ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

describe("SettingsScreen", () => {
  it("asks a guest to sign in and requests nothing", async () => {
    const c = fakeClient();
    renderScreen(c, false);
    expect(await screen.findByRole("link", { name: t.signInLink })).toBeTruthy();
    expect(c.from).not.toHaveBeenCalled();
  });

  it("shows the saved switches", async () => {
    renderScreen(fakeClient({ row: ROW }));
    expect(
      ((await screen.findByLabelText(t.notifications.chapterPublished.label)) as HTMLElement).getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
    expect(screen.getByLabelText(t.notifications.commentReplied.label).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByLabelText(t.notifications.collaborationAnswers.label).getAttribute("aria-checked")).toBe("true");
  });

  it("saves a switch at once, with the other values unchanged", async () => {
    const c = fakeClient({ row: ROW });
    renderScreen(c);
    fireEvent.click(await screen.findByLabelText(t.notifications.commentReplied.label));
    await waitFor(() => expect(c.upsert).toHaveBeenCalledTimes(1));
    expect(c.upsert).toHaveBeenCalledWith(
      { user_id: expect.any(String), ...ROW, notify_comment_replied: true },
      { onConflict: "user_id" },
    );
    await waitFor(() =>
      expect(screen.getByLabelText(t.notifications.commentReplied.label).getAttribute("aria-checked")).toBe("true"),
    );
  });

  it("unfolds a switch per type under a group with several, and saves one type on its own", async () => {
    const c = fakeClient({ row: ROW, types: [{ event_type: "collaboration_declined", in_app: false }] });
    renderScreen(c);
    const group = await screen.findByLabelText(t.notifications.collaborationAnswers.label);
    expect(group.getAttribute("aria-expanded")).toBe("true");
    const declined = await screen.findByLabelText(t.notifications.types.collaboration_declined.label);
    await waitFor(() => expect(declined.getAttribute("aria-checked")).toBe("false"));
    expect(screen.getByText(t.notifications.invitedAlwaysOn.label)).toBeTruthy();
    expect(screen.getAllByText(t.notifications.channels.unavailable).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText(t.notifications.types.collaboration_accepted.label));
    await waitFor(() => expect(c.typeUpsert).toHaveBeenCalledTimes(1));
    expect(c.typeUpsert).toHaveBeenCalledWith(
      { user_id: expect.any(String), event_type: "collaboration_accepted", in_app: false },
      { onConflict: "user_id,event_type" },
    );
    expect(c.upsert).not.toHaveBeenCalled();
  });

  it("puts a type switch back when its save is refused", async () => {
    const c = fakeClient({ row: ROW, typeUpsertError: { message: "no", code: "42501" } });
    renderScreen(c);
    const accepted = await screen.findByLabelText(t.notifications.types.collaboration_accepted.label);
    await waitFor(() => expect((accepted as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(accepted);
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.saveFailed));
    await waitFor(() => expect(accepted.getAttribute("aria-checked")).toBe("true"));
  });

  it("turns every group off with one save", async () => {
    const c = fakeClient({ row: ROW });
    renderScreen(c);
    fireEvent.click(await screen.findByRole("button", { name: t.notifications.turnAllOff }));
    await waitFor(() => expect(c.upsert).toHaveBeenCalledTimes(1));
    expect(c.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        notify_chapter_published: false,
        notify_comment_replied: false,
        notify_collaboration_answers: false,
      }),
      { onConflict: "user_id" },
    );
  });

  it("puts the switch back and says so when the save is refused", async () => {
    const c = fakeClient({ row: ROW, upsertError: { message: "no", code: "42501" } });
    renderScreen(c);
    fireEvent.click(await screen.findByLabelText(t.notifications.chapterPublished.label));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.saveFailed));
    await waitFor(() =>
      expect(screen.getByLabelText(t.notifications.chapterPublished.label).getAttribute("aria-checked")).toBe("true"),
    );
  });

  it("offers both languages, and choosing one switches the page at once and remembers it on the device", async () => {
    renderScreen(fakeClient({ row: ROW }));
    const trigger = await screen.findByLabelText(t.language.label);
    fireEvent.keyDown(trigger, { key: "Enter" });
    const listbox = await screen.findByRole("listbox");
    expect(
      within(listbox).getByRole("option", { name: t.language.options.vi }).getAttribute("aria-disabled"),
    ).toBeNull();
    expect(
      within(listbox).getByRole("option", { name: t.language.options.en }).getAttribute("aria-disabled"),
    ).toBeNull();
    fireEvent.click(within(listbox).getByRole("option", { name: t.language.options.en }));
    await waitFor(() => expect(getLanguage()).toBe("en"));
    expect(readStoredLanguage()).toBe("en");
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeTruthy();
  });

  it("carries the language in force when it saves another setting", async () => {
    const c = fakeClient({ row: { ...ROW, language_code: "vi" } });
    renderScreen(c);
    await screen.findByLabelText(t.notifications.chapterPublished.label);
    act(() => setLanguage("en"));
    fireEvent.click(await screen.findByLabelText("New chapters"));
    await waitFor(() => expect(c.upsert).toHaveBeenCalledTimes(1));
    expect(c.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ language_code: "en", notify_chapter_published: false }),
      { onConflict: "user_id" },
    );
  });

  it("asks before showing adult content, and only then turns it on for this device", async () => {
    renderScreen(fakeClient({ row: ROW }));
    const toggle = await screen.findByLabelText(t.adult.label);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    const dialog = await screen.findByRole("dialog");
    expect(getStoredAdultContent().show).toBe(false);
    fireEvent.click(within(dialog).getByRole("button", { name: t.adult.cancel }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(getStoredAdultContent()).toEqual(NO_ADULT_CONTENT);
    fireEvent.click(toggle);
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: t.adult.confirm }));
    await waitFor(() => expect(getStoredAdultContent()).toEqual({ ageConfirmed: true, show: true }));
    await waitFor(() => expect(screen.getByLabelText(t.adult.label).getAttribute("aria-checked")).toBe("true"));
  });

  it("hides adult content again without asking", async () => {
    setStoredAdultContent({ ageConfirmed: true, show: true });
    renderScreen(fakeClient({ row: ROW }));
    fireEvent.click(await screen.findByLabelText(t.adult.label));
    await waitFor(() => expect(getStoredAdultContent()).toEqual({ ageConfirmed: true, show: false }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("explains a load failure and retries", async () => {
    const c = fakeClient({ selectError: { message: "x", code: "XX000" } });
    renderScreen(c);
    fireEvent.click(await screen.findByRole("button", { name: t.error.retry }));
    await waitFor(() => expect(c.select.mock.calls.length).toBeGreaterThan(1));
  });
});

describe("useAccountSettings", () => {
  const wrapper = (client: DataClient) =>
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <DataProvider client={client}>
            <AuthProvider>{children}</AuthProvider>
          </DataProvider>
        </QueryClientProvider>
      );
    };

  it("asks nothing for a guest", async () => {
    const c = fakeClient({ row: ROW });
    const { result } = renderHook(() => useAccountSettings(), { wrapper: wrapper(withAuth(c, null)) });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(c.from).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);
  });

  it("loads a member's settings", async () => {
    const c = fakeClient({ row: ROW });
    const { result } = renderHook(() => useAccountSettings(), { wrapper: wrapper(withAuth(c, testSession())) });
    await waitFor(() => expect(result.current.data?.notifications.commentReplied).toBe(false));
  });
});

describe("the account language", () => {
  function syncClient(remote: { language_code: string } | null, selectError: unknown = null) {
    const upsert = vi.fn(async (_row: unknown, _options?: unknown) => ({ data: null, error: null }));
    const select = vi.fn(() => ({ maybeSingle: async () => ({ data: remote, error: selectError }) }));
    return { from: vi.fn(() => ({ select, upsert })), select, upsert };
  }
  function renderSync(client: DataClient) {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DataProvider client={client}>
          <AuthProvider>
            <LanguageSync />
          </AuthProvider>
        </DataProvider>
      </QueryClientProvider>,
    );
  }

  it("reads null for no row or an unknown language, and the language for a saved one; saves only that column", async () => {
    expect(await getRemoteLanguage(syncClient(null) as unknown as DataClient)).toBeNull();
    expect(await getRemoteLanguage(syncClient({ language_code: "xx" }) as unknown as DataClient)).toBeNull();
    const saved = syncClient({ language_code: "en" });
    expect(await getRemoteLanguage(saved as unknown as DataClient)).toBe("en");
    expect(saved.select).toHaveBeenCalledWith("language_code");
    await saveRemoteLanguage(saved as unknown as DataClient, "u1", "en");
    expect(saved.upsert).toHaveBeenCalledWith({ user_id: "u1", language_code: "en" }, { onConflict: "user_id" });
  });

  it("does nothing for a guest", async () => {
    const c = syncClient({ language_code: "en" });
    renderSync(withAuth(c, null));
    await act(async () => {});
    expect(c.from).not.toHaveBeenCalled();
    expect(getLanguage()).toBe("vi");
  });

  it("adopts the account's language on a device that never chose, and on one that did", async () => {
    renderSync(withAuth(syncClient({ language_code: "en" }), testSession()));
    await waitFor(() => expect(getLanguage()).toBe("en"));
    cleanup();
    setLanguage("vi");
    renderSync(withAuth(syncClient({ language_code: "en" }), testSession()));
    await waitFor(() => expect(getLanguage()).toBe("en")); // the account decides when it has a row
  });

  it("lets the reader's own switch win when it happens before the account has been read", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let release: (value: { data: unknown; error: unknown }) => void = () => undefined;
    const upsert = vi.fn(async (_row: unknown, _options?: unknown) => ({ data: null, error: null }));
    const slow = {
      from: vi.fn(() => ({
        select: () => ({ maybeSingle: () => new Promise((resolve) => (release = resolve)) }),
        upsert,
      })),
    };
    renderSync(withAuth(slow, testSession()));
    await waitFor(() => expect(slow.from).toHaveBeenCalled());
    act(() => setLanguage("en")); // the reader taps the switch while the account is still loading
    await act(async () => release({ data: { language_code: "vi" }, error: null }));
    await act(async () => void (await vi.advanceTimersByTimeAsync(800)));
    expect(getLanguage()).toBe("en");
    expect(upsert).toHaveBeenCalledWith(
      { user_id: expect.any(String), language_code: "en" },
      { onConflict: "user_id" },
    );
    vi.useRealTimers();
  });

  it("gives an account with no settings the language the reader chose on this device", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setLanguage("en");
    const c = syncClient(null);
    renderSync(withAuth(c, testSession()));
    await waitFor(() => expect(c.from).toHaveBeenCalled());
    await act(async () => void (await vi.advanceTimersByTimeAsync(800)));
    expect(c.upsert).toHaveBeenCalledWith(
      { user_id: expect.any(String), language_code: "en" },
      { onConflict: "user_id" },
    );
    vi.useRealTimers();
  });

  it("uploads nothing when the reader never chose and the account has nothing", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.localStorage.clear();
    const c = syncClient(null);
    renderSync(withAuth(c, testSession()));
    await waitFor(() => expect(c.from).toHaveBeenCalled());
    await act(async () => void (await vi.advanceTimersByTimeAsync(800)));
    expect(c.upsert).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("saves a change made on the device once, after a short pause, and not what the account already holds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const c = syncClient({ language_code: "vi" });
    renderSync(withAuth(c, testSession()));
    await waitFor(() => expect(c.from).toHaveBeenCalled());
    await act(async () => {});
    act(() => setLanguage("en"));
    act(() => setLanguage("vi"));
    act(() => setLanguage("en"));
    expect(c.upsert).not.toHaveBeenCalled();
    await act(async () => void (await vi.advanceTimersByTimeAsync(800)));
    expect(c.upsert).toHaveBeenCalledTimes(1);
    expect(c.upsert).toHaveBeenCalledWith(
      { user_id: expect.any(String), language_code: "en" },
      { onConflict: "user_id" },
    );
    vi.useRealTimers();
  });

  it("is not started again, and does not read the account's old value back, when a switch re-mounts the page", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const c = syncClient({ language_code: "vi" });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DataProvider client={withAuth(c, testSession())}>
          <AuthProvider>
            <LanguageSync />
            <LanguageProvider>
              <p>page</p>
            </LanguageProvider>
          </AuthProvider>
        </DataProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(c.from).toHaveBeenCalled());
    await act(async () => {});
    const reads = c.select.mock.calls.length;
    act(() => setLanguage("en"));
    await act(async () => void (await vi.advanceTimersByTimeAsync(800)));
    expect(getLanguage()).toBe("en"); // the account still says "vi" until the save lands; that must not undo the choice
    expect(c.select.mock.calls.length).toBe(reads); // no second read of the account
    expect(c.upsert).toHaveBeenCalledWith(
      { user_id: expect.any(String), language_code: "en" },
      { onConflict: "user_id" },
    );
    vi.useRealTimers();
  });

  it("saves nothing when the reader ends up where the account already is", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const c = syncClient({ language_code: "en" });
    renderSync(withAuth(c, testSession()));
    await waitFor(() => expect(getLanguage()).toBe("en"));
    await act(async () => {});
    act(() => setLanguage("vi"));
    act(() => setLanguage("en"));
    await act(async () => void (await vi.advanceTimersByTimeAsync(800)));
    expect(c.upsert).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("keeps working on the device when the account cannot be read", async () => {
    setLanguage("en");
    const c = syncClient(null, { message: "x", code: "XX000" });
    renderSync(withAuth(c, testSession()));
    await waitFor(() => expect(c.from).toHaveBeenCalled());
    await act(async () => {});
    expect(getLanguage()).toBe("en");
    expect(c.upsert).not.toHaveBeenCalled();
  });
});

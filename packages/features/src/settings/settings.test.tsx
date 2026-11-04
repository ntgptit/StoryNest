import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { NO_ADULT_CONTENT, getStoredAdultContent, setStoredAdultContent } from "../adult-content/model/store.ts";
import { getSettings, saveSettings } from "./api/settings.api.ts";
import { useAccountSettings } from "./hooks/use-settings.ts";
import { settingsKeys } from "./keys.ts";
import {
  DEFAULT_SETTINGS,
  SETTINGS_COLUMNS,
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

function fakeClient(options: { row?: SettingsRow | null; selectError?: unknown; upsertError?: unknown } = {}) {
  const upsert = vi.fn(async (_row: unknown, _options?: unknown) => ({
    data: null,
    error: options.upsertError ?? null,
  }));
  const select = vi.fn(() => ({
    maybeSingle: async () => ({ data: options.row ?? null, error: options.selectError ?? null }),
  }));
  const from = vi.fn(() => ({ select, upsert }));
  return { from, select, upsert };
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

  it("puts the switch back and says so when the save is refused", async () => {
    const c = fakeClient({ row: ROW, upsertError: { message: "no", code: "42501" } });
    renderScreen(c);
    fireEvent.click(await screen.findByLabelText(t.notifications.chapterPublished.label));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.saveFailed));
    await waitFor(() =>
      expect(screen.getByLabelText(t.notifications.chapterPublished.label).getAttribute("aria-checked")).toBe("true"),
    );
  });

  it("offers only the available language and keeps the unavailable one disabled", async () => {
    renderScreen(fakeClient({ row: ROW }));
    const trigger = await screen.findByLabelText(t.language.label);
    fireEvent.keyDown(trigger, { key: "Enter" });
    const listbox = await screen.findByRole("listbox");
    expect(
      within(listbox).getByRole("option", { name: t.language.options.vi }).getAttribute("aria-disabled"),
    ).toBeNull();
    expect(within(listbox).getByRole("option", { name: t.language.options.en }).getAttribute("aria-disabled")).toBe(
      "true",
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

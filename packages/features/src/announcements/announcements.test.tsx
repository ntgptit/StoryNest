import type { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { setLanguage } from "../_shared/i18n.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { createAnnouncement, listActiveAnnouncements } from "./api/announcements.api.ts";
import { AnnouncementBanner } from "./components/announcement-banner.tsx";
import { AnnouncementManager } from "./components/announcement-manager.tsx";
import { HomeEventPopup } from "./components/home-event-popup.tsx";
import { announcementsKeys } from "./keys.ts";
import {
  BANNER_DISMISSED_KEY,
  POPUP_SNOOZE_KEY,
  announcementState,
  isInternalLink,
  isPopupSnoozed,
  localDay,
  readClosedBanners,
  snoozePopupToday,
  toAnnouncements,
  writeClosedBanners,
  type AnnouncementRow,
} from "./model/announcement.ts";
import { announcementsText } from "./strings.ts";

const t = announcementsText;

const row = (n: number, extra: Partial<AnnouncementRow> = {}): AnnouncementRow => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  kind: "banner",
  title: `Announcement ${n}`,
  body: null,
  link_url: null,
  locale: null,
  starts_at: "2026-11-01T00:00:00.000Z",
  ends_at: "2026-12-01T00:00:00.000Z",
  ...extra,
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => {
  setLanguage("vi", { persist: false });
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

describe("announcements query keys", () => {
  it("are rooted at the feature name", () => {
    expect(announcementsKeys.all).toEqual(["announcements"]);
    expect(announcementsKeys.active("banner", "vi")[0]).toBe("announcements");
  });
});

describe("announcement model", () => {
  it("maps rows and drops a kind this client does not know", () => {
    const list = toAnnouncements([row(1, { link_url: "/ranking" }), row(2, { kind: "toast" })]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "banner", href: "/ranking", title: "Announcement 1" });
  });

  it("tells scheduled, active and ended apart", () => {
    const window = { startsAt: "2026-11-05T10:00:00Z", endsAt: "2026-11-06T10:00:00Z" };
    expect(announcementState(window, new Date("2026-11-05T09:59:00Z"))).toBe("scheduled");
    expect(announcementState(window, new Date("2026-11-05T10:00:00Z"))).toBe("active");
    expect(announcementState(window, new Date("2026-11-06T10:00:00Z"))).toBe("ended");
  });

  it("opens internal paths in the app only", () => {
    expect(isInternalLink("/ranking")).toBe(true);
    expect(isInternalLink("//evil.example")).toBe(false);
    expect(isInternalLink("https://example.com")).toBe(false);
  });

  it("remembers closed banners on this device, only those still showing", () => {
    writeClosedBanners(["a", "b"], ["b", "c"]);
    expect(readClosedBanners()).toEqual(["b"]);
    window.localStorage.setItem(BANNER_DISMISSED_KEY, "{not json");
    expect(readClosedBanners()).toEqual([]);
  });

  it("'don't show today' lasts for the reader's day and for the popups seen then", () => {
    const now = new Date(2026, 10, 5, 23, 30);
    snoozePopupToday(["a", "b"], now);
    expect(isPopupSnoozed(["a", "b"], now)).toBe(true);
    expect(isPopupSnoozed(["a"], now)).toBe(true);
    expect(isPopupSnoozed(["a", "c"], now)).toBe(false); // a new popup the same day still shows
    expect(isPopupSnoozed(["a"], new Date(2026, 10, 6, 0, 1))).toBe(false); // the next day
    expect(localDay(now)).toBe("2026-11-05");
    window.localStorage.setItem(POPUP_SNOOZE_KEY, "42");
    expect(isPopupSnoozed(["a"], now)).toBe(false);
  });
});

function fakeClient(options: { active?: AnnouncementRow[]; all?: AnnouncementRow[]; insertError?: unknown } = {}) {
  const rpc = vi.fn(async (_name: string, args: { p_kind?: string; p_locale?: string }) => ({
    data: (options.active ?? []).filter((r) => r.kind === args.p_kind),
    error: null,
  }));
  const insert = vi.fn(async (_row: unknown) => ({ data: null, error: options.insertError ?? null }));
  const eq = vi.fn(async () => ({ data: null, error: null }));
  const update = vi.fn(() => ({ eq }));
  const del = vi.fn(() => ({ eq }));
  const limit = vi.fn(async () => ({ data: options.all ?? [], error: null }));
  const order = vi.fn(() => ({ order, limit }));
  const select = vi.fn(() => ({ order }));
  const from = vi.fn(() => ({ select, insert, update, delete: del }));
  return { rpc, from, insert, update, delete: del, eq };
}

describe("announcements api", () => {
  it("asks the server for what shows now, by kind and language", async () => {
    const c = fakeClient({ active: [row(1), row(2, { kind: "popup" })] });
    const list = await listActiveAnnouncements(c as unknown as DataClient, { kind: "popup", locale: "en" });
    expect(c.rpc).toHaveBeenCalledWith("active_announcements", { p_kind: "popup", p_locale: "en" });
    expect(list.map((a) => a.kind)).toEqual(["popup"]);
  });

  it("inserts exactly the row payload (created_by comes from the session on the server)", async () => {
    const c = fakeClient();
    const payload = {
      kind: "banner" as const,
      title: "Hi",
      body: null,
      link_url: null,
      locale: null,
      starts_at: "2026-11-05T00:00:00.000Z",
      ends_at: "2026-11-06T00:00:00.000Z",
    };
    await createAnnouncement(c as unknown as DataClient, payload);
    expect(c.from).toHaveBeenCalledWith("announcements");
    expect(c.insert).toHaveBeenCalledWith(payload);
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
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

const moderatorSession = {
  access_token: "t",
  user: { id: "00000000-0000-4000-8000-0000000000dd", email: "m@test.dev", app_metadata: { role: "moderator" } },
} as unknown as Session;

function renderUi(client: ReturnType<typeof fakeClient>, ui: ReactNode, session: Session | null = null) {
  toasts.show.mockClear();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(client, session)}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={toasts}>{ui}</ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

describe("AnnouncementBanner", () => {
  it("shows the active banners to a guest, with internal links in the app and others in a new tab", async () => {
    const c = fakeClient({
      active: [row(1, { link_url: "/ranking" }), row(2, { link_url: "https://example.com/x" })],
    });
    renderUi(c, <AnnouncementBanner />);
    const region = await screen.findByRole("region", { name: t.banner.region });
    const links = within(region).getAllByRole("link", { hidden: true });
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/ranking", "https://example.com/x"]);
    expect(links[1]?.getAttribute("target")).toBe("_blank");
    expect(links[1]?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(c.rpc).toHaveBeenCalledWith("active_announcements", { p_kind: "banner", p_locale: "vi" });
  });

  it("closing remembers these banners on the device; the bell takes it back", async () => {
    const c = fakeClient({ active: [row(1)] });
    renderUi(c, <AnnouncementBanner />);
    fireEvent.click(await screen.findByRole("button", { name: t.banner.close }));
    expect(readClosedBanners()).toEqual([row(1).id]);
    fireEvent.click(await screen.findByRole("button", { name: t.banner.reopen }));
    expect(readClosedBanners()).toEqual([]);
    expect(screen.getByRole("region", { name: t.banner.region })).toBeTruthy();
  });

  it("stays away on the next visit for banners closed before, but a new one shows", async () => {
    writeClosedBanners([row(1).id], [row(1).id]);
    const c = fakeClient({ active: [row(1)] });
    renderUi(c, <AnnouncementBanner />);
    await waitFor(() => expect(c.rpc).toHaveBeenCalled());
    expect(screen.queryByRole("region", { name: t.banner.region })).toBeNull();
    cleanup();
    renderUi(fakeClient({ active: [row(1), row(2)] }), <AnnouncementBanner />);
    const region = await screen.findByRole("region", { name: t.banner.region });
    expect(region.textContent).toContain("Announcement 2");
    expect(region.textContent).not.toContain("Announcement 1");
  });
});

describe("HomeEventPopup", () => {
  const popups = [row(1, { kind: "popup", title: "Writing contest", link_url: "/contest" }), row(2, { kind: "popup" })];

  it("opens with the active popups and their end date", async () => {
    renderUi(fakeClient({ active: popups }), <HomeEventPopup />);
    const dialog = await screen.findByRole("dialog", { name: t.popup.dialog });
    expect(within(dialog).getByText("Writing contest")).toBeTruthy();
    expect(within(dialog).getByText("1 / 2")).toBeTruthy();
  });

  it("'Don't show today' keeps it closed for the rest of the day, with the gift to open it", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderUi(fakeClient({ active: popups }), <HomeEventPopup />);
    fireEvent.click(await screen.findByRole("button", { name: t.popup.dontShowToday }));
    act(() => vi.advanceTimersByTime(600));
    expect(isPopupSnoozed([popups[0]!.id, popups[1]!.id], new Date())).toBe(true);
    cleanup();
    renderUi(fakeClient({ active: popups }), <HomeEventPopup />);
    expect(await screen.findByRole("button", { name: t.popup.reopen })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: t.popup.reopen }));
    expect(await screen.findByRole("dialog", { name: t.popup.dialog })).toBeTruthy();
  });

  it("shows nothing when no popup is active", async () => {
    const c = fakeClient({ active: [row(1)] });
    renderUi(c, <HomeEventPopup />);
    await waitFor(() => expect(c.rpc).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: t.popup.reopen })).toBeNull();
  });
});

describe("AnnouncementManager", () => {
  it("lists every announcement with its state, and ends only an active one", async () => {
    const now = Date.now();
    const iso = (ms: number) => new Date(now + ms).toISOString();
    const c = fakeClient({
      all: [
        row(1, { title: "Later", starts_at: iso(86_400_000), ends_at: iso(2 * 86_400_000) }),
        row(2, { title: "Now", starts_at: iso(-3_600_000), ends_at: iso(3_600_000), locale: "en" }),
        row(3, { title: "Over", starts_at: iso(-2 * 86_400_000), ends_at: iso(-86_400_000) }),
      ],
    });
    renderUi(c, <AnnouncementManager />, moderatorSession);
    const list = await screen.findByRole("list", { name: t.manage.listLabel });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => within(li).getByText(/Later|Now|Over/).textContent)).toEqual(["Later", "Now", "Over"]);
    expect(within(items[0]!).getByText(t.manage.states.scheduled)).toBeTruthy();
    expect(within(items[1]!).getByText(t.manage.states.active)).toBeTruthy();
    expect(within(items[1]!).getByText("English")).toBeTruthy();
    expect(within(items[2]!).getByText(t.manage.states.ended)).toBeTruthy();
    expect(within(items[0]!).queryByRole("button", { name: t.manage.end })).toBeNull();
    fireEvent.click(within(items[1]!).getByRole("button", { name: t.manage.end }));
    await waitFor(() => expect(c.update).toHaveBeenCalledTimes(1));
    expect(c.eq).toHaveBeenCalledWith("id", row(2).id);
  });

  it("checks the form before sending and sends the row payload", async () => {
    const c = fakeClient();
    renderUi(c, <AnnouncementManager />, moderatorSession);
    fireEvent.click(await screen.findByRole("button", { name: t.manage.form.submit }));
    expect(await screen.findByText(t.manage.form.errors.title_required)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.manage.form.headline), { target: { value: "Contest" } });
    fireEvent.change(screen.getByLabelText(t.manage.form.link), { target: { value: "//evil" } });
    fireEvent.click(screen.getByRole("button", { name: t.manage.form.submit }));
    expect(await screen.findByText(t.manage.form.errors.link_invalid)).toBeTruthy();
    expect(c.insert).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(t.manage.form.link), { target: { value: "/ranking" } });
    fireEvent.click(screen.getByRole("button", { name: t.manage.form.submit }));
    await waitFor(() => expect(c.insert).toHaveBeenCalledTimes(1));
    expect(c.insert.mock.calls[0]?.[0]).toMatchObject({
      kind: "banner",
      title: "Contest",
      body: null,
      link_url: "/ranking",
      locale: null,
    });
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.manage.created));
  });

  it("says when the database refuses (not a moderator any more)", async () => {
    const c = fakeClient({ insertError: { code: "42501", message: "rls" } });
    renderUi(c, <AnnouncementManager />, moderatorSession);
    fireEvent.change(await screen.findByLabelText(t.manage.form.headline), { target: { value: "Contest" } });
    fireEvent.click(screen.getByRole("button", { name: t.manage.form.submit }));
    expect((await screen.findByRole("alert")).textContent).toBe(t.manage.failed.forbidden);
  });
});

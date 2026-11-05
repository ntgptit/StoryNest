import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { AppError } from "../_shared/errors.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { countUnread, listNotifications, markAllRead, markRead } from "./api/notifications.api.ts";
import { NotificationBell, NotificationsScreen } from "./index.ts";
import {
  NOTIFICATIONS_PAGE_SIZE,
  badgeText,
  countByFilter,
  cursorAfter,
  filterNotifications,
  notificationGroup,
  describeNotification,
  notificationErrorMessage,
  toNotification,
  toPage,
  type NotificationRow,
} from "./model/notification.ts";
import { notificationText } from "./strings.ts";

afterEach(cleanup);

const t = notificationText;
const nid = (n: number) => `a0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const STORY = "5eed0000-0000-4000-8000-00000000d001";

const row = (n: number, overrides: Partial<NotificationRow> = {}): NotificationRow => ({
  id: nid(n),
  event_type: "chapter_published",
  story_id: STORY,
  chapter_id: null,
  payload: {
    story_title: "Rừng sương mù",
    chapter_title: "Mở đầu",
    chapter_sort_order: 3,
    story_slug: "rung",
    chapter_slug: "mo-dau",
  },
  read_at: null,
  created_at: `2026-11-04T10:00:0${n % 10}.123456+00:00`,
  actor: { username: "tac_gia", display_name: "Tác Giả" },
  ...overrides,
});

describe("notification model", () => {
  it("maps a row: unread by default, the actor's name (the username when blank), the payload as an object", () => {
    expect(toNotification(row(1))).toMatchObject({ id: nid(1), read: false, actorName: "Tác Giả" });
    expect(toNotification(row(1, { read_at: "2026-11-04T11:00:00Z" })).read).toBe(true);
    expect(toNotification(row(1, { actor: [{ username: "u", display_name: " " }] })).actorName).toBe("u");
    expect(toNotification(row(1, { actor: null })).actorName).toBeNull();
    expect(toNotification(row(1, { payload: "oops" })).payload).toEqual({});
    expect(toNotification(row(1)).createdAt).toBe("2026-11-04T10:00:01.123456+00:00");
  });

  it("says what a new chapter is and links to it", () => {
    const view = describeNotification(toNotification(row(1)));
    expect(view.text).toBe(t.text.chapterPublished("Rừng sương mù", 3, "Mở đầu"));
    expect(view.href).toBe(`/story/${STORY}/rung/mo-dau`);
  });

  it("says what a collaboration event is and where to answer or look", () => {
    const base = { payload: { story_title: "Truyện kín" } };
    expect(describeNotification(toNotification(row(1, { ...base, event_type: "collaboration_invited" })))).toEqual({
      text: t.text.collaborationInvited("Tác Giả", "Truyện kín"),
      href: "/studio",
    });
    expect(describeNotification(toNotification(row(1, { ...base, event_type: "collaboration_accepted" }))).href).toBe(
      `/studio/story/${STORY}/team`,
    );
    expect(
      describeNotification(toNotification(row(1, { ...base, event_type: "collaboration_declined", actor: null }))),
    ).toEqual({
      text: t.text.collaborationDeclined(t.someone, "Truyện kín"),
      href: `/studio/story/${STORY}/team`,
    });
  });

  it("says who replied and what, and links to the paragraph's thread or to the chapter's comments", () => {
    const base = {
      event_type: "comment_replied",
      payload: {
        story_title: "Rừng sương mù",
        story_slug: "rung",
        chapter_slug: "mo-dau",
        excerpt: "Mình đồng ý",
        block_id: null,
      },
    };
    const chapterLevel = describeNotification(toNotification(row(1, base)));
    expect(chapterLevel.text).toBe(t.text.commentReplied("Tác Giả", "Mình đồng ý"));
    expect(chapterLevel.href).toBe(`/story/${STORY}/rung/mo-dau#comments`);
    const block = "b0000000-0000-4000-8000-0000000000b1";
    const inline = describeNotification(
      toNotification(row(1, { ...base, payload: { ...base.payload, block_id: block } })),
    );
    expect(inline.href).toBe(`/story/${STORY}/rung/mo-dau#b-${block}`);
    const blank = describeNotification(toNotification(row(1, { ...base, payload: { ...base.payload, excerpt: "" } })));
    expect(blank.text).toContain("Tác Giả");
    expect(blank.text).not.toContain('"'); // no empty pair of quotes after a colon
    expect(blank.text).not.toContain(":");
    expect(describeNotification(toNotification(row(1, { ...base, payload: { story_title: "X" } }))).href).toBeNull();
  });

  it("keeps the text but drops the link when the data for it is missing, and shows a neutral line for an unknown type", () => {
    expect(describeNotification(toNotification(row(1, { payload: { story_title: "X" } }))).href).toBeNull();
    expect(describeNotification(toNotification(row(1, { story_id: null }))).href).toBeNull();
    expect(describeNotification(toNotification(row(1, { event_type: "something_new" })))).toEqual({
      text: t.generic,
      href: null,
    });
  });

  it("cuts the extra row off a page, keeps the cursor of the last shown row, and shortens the badge", () => {
    const rows = Array.from({ length: NOTIFICATIONS_PAGE_SIZE + 1 }, (_, i) =>
      row(i + 1, { created_at: `2026-11-04T10:00:00.${100 + i}000+00:00` }),
    );
    const page = toPage(rows);
    expect(page.items).toHaveLength(NOTIFICATIONS_PAGE_SIZE);
    expect(page.hasMore).toBe(true);
    expect(cursorAfter(page)).toEqual({
      createdAt: `2026-11-04T10:00:00.${100 + NOTIFICATIONS_PAGE_SIZE - 1}000+00:00`,
      id: nid(NOTIFICATIONS_PAGE_SIZE),
    });
    expect(cursorAfter(toPage(rows.slice(0, 2)))).toBeUndefined();
    expect([badgeText(1), badgeText(9), badgeText(10), badgeText(120)]).toEqual(["1", "9", "9+", "9+"]);
    expect(notificationErrorMessage(new AppError("network", "x"))).toBe(t.errors.network);
    expect(notificationErrorMessage(new AppError("unknown", "x"))).toBe(t.errors.generic);
  });
});

type Call = [string, unknown[]];
type Op = { calls: Call[]; op: "select" | "update"; values?: unknown; head: boolean };
type Result = { data: unknown; error: unknown; count?: number };

type StatusCallback = (status: string) => void;
function fakeClient(options: {
  pages?: (cursorId: string | null) => unknown[];
  unread?: { current: number };
  update?: Result;
  /** While `current` is a promise, reads of notifications wait for it (to look at the screen before a reload lands). */
  hold?: { current: Promise<void> | null };
}) {
  const ops: Op[] = [];
  const unread = options.unread ?? { current: 0 };
  const from = vi.fn((table: string) => {
    const op: Op = { calls: [], op: "select", head: false };
    if (table === "notifications") ops.push(op);
    const builder: Record<string, unknown> = {};
    for (const method of ["eq", "is", "in", "order", "limit", "returns", "or"]) {
      builder[method] = (...args: unknown[]) => {
        op.calls.push([method, args]);
        return builder;
      };
    }
    builder.select = (...args: unknown[]) => {
      op.calls.push(["select", args]);
      op.head = Boolean((args[1] as { head?: boolean } | undefined)?.head);
      return builder;
    };
    builder.update = (values: unknown) => {
      op.op = "update";
      op.values = values;
      return builder;
    };
    builder.then = (resolve: (value: unknown) => unknown) => {
      if (op.op === "update") return resolve(options.update ?? { data: null, error: null });
      const gate = options.hold?.current;
      if (gate) return gate.then(() => resolve({ data: op.head ? null : [], error: null, count: unread.current }));
      if (op.head) return resolve({ data: null, error: null, count: unread.current });
      const orFilter = op.calls.find(([m]) => m === "or")?.[1][0] as string | undefined;
      const cursorId = orFilter ? (/id\.lt\.([0-9a-f-]+)\)/.exec(orFilter)?.[1] ?? null) : null;
      return resolve({ data: options.pages ? options.pages(cursorId) : [], error: null });
    };
    return builder;
  });
  // The realtime channel: records what was asked and lets a test push an event or a status change.
  const channels: { name: string; filter: unknown; onInsert: () => void; status: StatusCallback; removed: boolean }[] =
    [];
  const channel = vi.fn((name: string) => {
    const entry = {
      name,
      filter: undefined as unknown,
      onInsert: (() => undefined) as () => void,
      status: (() => undefined) as StatusCallback,
      removed: false,
    };
    channels.push(entry);
    const handle = {
      on: (_type: string, filter: unknown, callback: () => void) => {
        entry.filter = filter;
        entry.onInsert = callback;
        return handle;
      },
      subscribe: (callback: StatusCallback) => {
        entry.status = callback;
        return handle;
      },
      entry,
    };
    return handle;
  });
  const removeChannel = vi.fn(async (handle: { entry: { removed: boolean } }) => {
    handle.entry.removed = true;
    return "ok";
  });
  return {
    from,
    channel,
    removeChannel,
    ops,
    channels,
    unread,
    selects: () => ops.filter((o) => o.op === "select"),
    updates: () => ops.filter((o) => o.op === "update"),
  };
}
const callOf = (op: { calls: Call[] }, method: string) => op.calls.find(([m]) => m === method)?.[1];

describe("notification filters", () => {
  const items = [
    toNotification(row(1)),
    toNotification(row(2, { event_type: "comment_replied", read_at: "2026-11-04T11:00:00Z" })),
    toNotification(row(3, { event_type: "collaboration_invited" })),
    toNotification(row(4, { event_type: "collaboration_declined", read_at: "2026-11-04T11:00:00Z" })),
    toNotification(row(5, { event_type: "something_new" })),
  ];

  it("puts each known type under one chip, and an unknown one under none", () => {
    expect(notificationGroup("chapter_published")).toBe("chapters");
    expect(notificationGroup("comment_replied")).toBe("replies");
    expect(notificationGroup("collaboration_accepted")).toBe("team");
    expect(notificationGroup("something_new")).toBeNull();
  });

  it("narrows the loaded rows by kind and unread state, keeping their order", () => {
    expect(filterNotifications(items, "all", false)).toHaveLength(5);
    expect(filterNotifications(items, "team", false).map((n) => n.id)).toEqual([nid(3), nid(4)]);
    expect(filterNotifications(items, "team", true).map((n) => n.id)).toEqual([nid(3)]);
    expect(filterNotifications(items, "all", true).map((n) => n.id)).toEqual([nid(1), nid(3), nid(5)]);
  });

  it("counts what each chip would keep, with the unread toggle as it stands", () => {
    expect(countByFilter(items, false)).toEqual({ all: 5, chapters: 1, replies: 1, team: 2 });
    expect(countByFilter(items, true)).toEqual({ all: 3, chapters: 1, replies: 0, team: 1 });
  });
});

describe("notifications api", () => {
  it("lists the reader's notifications newest first, one row more than a page, and pages after the cursor", async () => {
    const c = fakeClient({ pages: () => [row(1), row(2)] });
    const client = c as unknown as DataClient;
    const page = await listNotifications(client, TEST_USER_ID);
    expect(page.items.map((n) => n.id)).toEqual([nid(1), nid(2)]);
    await listNotifications(client, TEST_USER_ID, { createdAt: "2026-11-04T10:00:01.123456+00:00", id: nid(1) });
    const [first, second] = c.selects();
    expect(callOf(first!, "eq")).toEqual(["recipient_id", TEST_USER_ID]);
    expect(first!.calls.filter(([m]) => m === "order").map(([, a]) => a)).toEqual([
      ["created_at", { ascending: false }],
      ["id", { ascending: false }],
    ]);
    expect(callOf(first!, "limit")).toEqual([NOTIFICATIONS_PAGE_SIZE + 1]);
    expect(callOf(first!, "or")).toBeUndefined();
    expect(callOf(second!, "or")).toEqual([
      `created_at.lt."2026-11-04T10:00:01.123456+00:00",and(created_at.eq."2026-11-04T10:00:01.123456+00:00",id.lt.${nid(1)})`,
    ]);
    expect(String(callOf(first!, "select")?.[0])).toContain(
      "actor:app_users!notifications_actor_id_fkey(username, display_name)",
    );
  });

  it("counts the unread ones without fetching rows", async () => {
    const c = fakeClient({ unread: { current: 7 } });
    expect(await countUnread(c as unknown as DataClient, TEST_USER_ID)).toBe(7);
    const q = c.selects()[0]!;
    expect(callOf(q, "select")?.[1]).toEqual({ count: "exact", head: true });
    expect(callOf(q, "is")).toEqual(["read_at", null]);
    expect(callOf(q, "eq")).toEqual(["recipient_id", TEST_USER_ID]);
  });

  it("marks only unread notifications of this reader, and sends nothing for an empty list", async () => {
    const c = fakeClient({});
    const client = c as unknown as DataClient;
    await markRead(client, TEST_USER_ID, []);
    expect(c.ops).toHaveLength(0);
    await markRead(client, TEST_USER_ID, [nid(1), nid(2)]);
    await markAllRead(client, TEST_USER_ID);
    const [some, all] = c.updates();
    expect(typeof (some!.values as { read_at: unknown }).read_at).toBe("string");
    expect(callOf(some!, "in")).toEqual(["id", [nid(1), nid(2)]]);
    expect(callOf(some!, "eq")).toEqual(["recipient_id", TEST_USER_ID]);
    expect(callOf(some!, "is")).toEqual(["read_at", null]);
    expect(callOf(all!, "in")).toBeUndefined();
    expect(callOf(all!, "is")).toEqual(["read_at", null]);
    const failing = fakeClient({ update: { data: null, error: { code: "42501", message: "denied" } } });
    await expect(markAllRead(failing as unknown as DataClient, TEST_USER_ID)).rejects.toMatchObject({
      kind: "forbidden",
    });
  });
});

const push = vi.fn();
const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push, replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};
const toasts = { show: vi.fn() };

function renderUi(c: ReturnType<typeof fakeClient>, ui: React.ReactNode, userId: string | null = TEST_USER_ID) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = (id: string | null) => (
    <QueryClientProvider client={queryClient}>
      <DataProvider client={withAuth(c, id ? testSession(id) : null)}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={toasts}>{ui}</ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>
  );
  return render(tree(userId));
}

beforeEach(() => {
  push.mockClear();
  toasts.show.mockClear();
});

describe("NotificationBell", () => {
  it("shows nothing to a guest and opens no channel", async () => {
    const c = fakeClient({});
    renderUi(c, <NotificationBell />, null);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByRole("link")).toBeNull();
    expect(c.channel).not.toHaveBeenCalled();
    expect(c.ops).toHaveLength(0);
  });

  it("links to the notifications, with the unread count in its name and a short badge", async () => {
    const c = fakeClient({ unread: { current: 12 } });
    renderUi(c, <NotificationBell />);
    const link = await screen.findByRole("link", { name: t.bell.withUnread(12) });
    expect(link.getAttribute("href")).toBe("/notifications");
    expect(link.textContent).toBe("9+");
  });

  it("has no badge when everything is read", async () => {
    const c = fakeClient({ unread: { current: 0 } });
    renderUi(c, <NotificationBell />);
    const link = await screen.findByRole("link", { name: t.bell.label });
    await waitFor(() => expect(c.selects().length).toBeGreaterThan(0));
    expect(link.textContent).toBe("");
  });

  it("listens for this reader's new notifications only, and updates the badge when one arrives", async () => {
    const unread = { current: 1 };
    const c = fakeClient({ unread });
    renderUi(c, <NotificationBell />);
    await screen.findByRole("link", { name: t.bell.withUnread(1) });
    expect(c.channels).toHaveLength(1);
    expect(c.channels[0]!.name).toBe(`notifications:${TEST_USER_ID}`);
    expect(c.channels[0]!.filter).toEqual({
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `recipient_id=eq.${TEST_USER_ID}`,
    });
    unread.current = 2;
    act(() => c.channels[0]!.onInsert());
    expect(await screen.findByRole("link", { name: t.bell.withUnread(2) })).toBeTruthy();
  });

  it("fetches what it missed when the connection comes back, but not on the first connection", async () => {
    const c = fakeClient({ unread: { current: 0 } });
    renderUi(c, <NotificationBell />);
    await screen.findByRole("link", { name: t.bell.label });
    // The bell shows before its effect has opened the channel; wait for the channel instead of assuming it is there.
    await waitFor(() => expect(c.channels).toHaveLength(1));
    const channel = c.channels[0]!;
    const fetches = () => c.selects().filter((o) => o.head).length;
    await waitFor(() => expect(fetches()).toBe(1));
    act(() => channel.status("SUBSCRIBED"));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(fetches()).toBe(1);
    act(() => channel.status("CLOSED"));
    act(() => channel.status("SUBSCRIBED"));
    await waitFor(() => expect(fetches()).toBe(2));
    act(() => channel.status("TIMED_OUT"));
    act(() => channel.status("SUBSCRIBED"));
    await waitFor(() => expect(fetches()).toBe(3));
  });

  it("closes the channel when it goes away", async () => {
    const c = fakeClient({ unread: { current: 0 } });
    const view = renderUi(c, <NotificationBell />);
    await screen.findByRole("link", { name: t.bell.label });
    view.unmount();
    expect(c.removeChannel).toHaveBeenCalledTimes(1);
    expect(c.channels[0]!.removed).toBe(true);
  });
});

describe("NotificationsScreen", () => {
  const rows = () => [
    row(3, { read_at: "2026-11-04T11:00:00Z" }),
    row(2, { event_type: "collaboration_invited", payload: { story_title: "Truyện kín" }, story_id: null }),
    row(1, { event_type: "something_new" }),
  ];

  it("lists them with the unread ones marked, each with its link (a neutral line without one)", async () => {
    const c = fakeClient({ pages: () => rows(), unread: { current: 2 } });
    renderUi(c, <NotificationsScreen />);
    const list = within(await screen.findByRole("list", { name: t.listLabel }));
    const items = list.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]!).getByRole("link").getAttribute("href")).toBe(`/story/${STORY}/rung/mo-dau`);
    expect(within(items[0]!).queryByText(new RegExp(t.unread))).toBeNull();
    expect(within(items[1]!).getByRole("link").getAttribute("href")).toBe("/studio");
    expect(within(items[1]!).getByText(new RegExp(t.unread))).toBeTruthy();
    expect(within(items[2]!).queryByRole("link")).toBeNull();
    expect(within(items[2]!).getByText(t.generic)).toBeTruthy();
  });

  it("marks one read when it is opened and lowers the badge at once", async () => {
    const unread = { current: 2 };
    const c = fakeClient({ pages: () => rows(), unread });
    renderUi(
      c,
      <>
        <NotificationBell />
        <NotificationsScreen />
      </>,
    );
    await screen.findByRole("link", { name: t.bell.withUnread(2) });
    const list = within(await screen.findByRole("list", { name: t.listLabel }));
    unread.current = 1;
    fireEvent.click(list.getAllByRole("listitem")[1]!.querySelector("a")!);
    expect(await screen.findByRole("link", { name: t.bell.withUnread(1) })).toBeTruthy();
    await waitFor(() => expect(c.updates()).toHaveLength(1));
    expect(callOf(c.updates()[0]!, "in")).toEqual(["id", [nid(2)]]);
  });

  it("does not send anything for a notification that is already read", async () => {
    const c = fakeClient({ pages: () => rows(), unread: { current: 2 } });
    renderUi(c, <NotificationsScreen />);
    const list = within(await screen.findByRole("list", { name: t.listLabel }));
    fireEvent.click(list.getAllByRole("listitem")[0]!.querySelector("a")!);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(c.updates()).toHaveLength(0);
  });

  it("marks everything read in one step", async () => {
    const unread = { current: 2 };
    const c = fakeClient({ pages: () => rows(), unread });
    renderUi(c, <NotificationsScreen />);
    await screen.findByRole("list", { name: t.listLabel });
    const button = screen.getByRole("button", { name: t.markAll });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    unread.current = 0;
    fireEvent.click(button);
    await waitFor(() => expect(c.updates()).toHaveLength(1));
    expect(callOf(c.updates()[0]!, "in")).toBeUndefined();
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.markedAll));
    await waitFor(() =>
      expect((screen.getByRole("button", { name: t.markAll }) as HTMLButtonElement).disabled).toBe(true),
    );
  });

  it("puts the unread state back and says why when marking everything is refused", async () => {
    const c = fakeClient({
      pages: () => rows(),
      unread: { current: 2 },
      update: { data: null, error: { code: "42501", message: "denied" } },
    });
    renderUi(
      c,
      <>
        <NotificationBell />
        <NotificationsScreen />
      </>,
    );
    await screen.findByRole("link", { name: t.bell.withUnread(2) });
    await screen.findByRole("list", { name: t.listLabel });
    fireEvent.click(screen.getByRole("button", { name: t.markAll }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.errors.generic));
    expect(await screen.findByRole("link", { name: t.bell.withUnread(2) })).toBeTruthy();
  });

  it("shows a notification as read and lowers the badge before the reload lands", async () => {
    const hold: { current: Promise<void> | null } = { current: null };
    const c = fakeClient({ pages: () => rows(), unread: { current: 2 }, hold });
    renderUi(
      c,
      <>
        <NotificationBell />
        <NotificationsScreen />
      </>,
    );
    await screen.findByRole("link", { name: t.bell.withUnread(2) });
    const list = within(await screen.findByRole("list", { name: t.listLabel }));
    hold.current = new Promise(() => undefined); // the reload never lands: only the immediate change can show
    fireEvent.click(list.getAllByRole("listitem")[1]!.querySelector("a")!);
    expect(await screen.findByRole("link", { name: t.bell.withUnread(1) })).toBeTruthy();
    expect(list.getAllByText(new RegExp(t.unread))).toHaveLength(1);
  });

  it("puts the unread state and the badge back when marking everything is refused, even before the reload lands", async () => {
    const hold: { current: Promise<void> | null } = { current: null };
    const c = fakeClient({
      pages: () => rows(),
      unread: { current: 2 },
      hold,
      update: { data: null, error: { code: "42501", message: "denied" } },
    });
    renderUi(
      c,
      <>
        <NotificationBell />
        <NotificationsScreen />
      </>,
    );
    await screen.findByRole("link", { name: t.bell.withUnread(2) });
    const list = within(await screen.findByRole("list", { name: t.listLabel }));
    await waitFor(() =>
      expect((screen.getByRole("button", { name: t.markAll }) as HTMLButtonElement).disabled).toBe(false),
    );
    hold.current = new Promise(() => undefined);
    fireEvent.click(screen.getByRole("button", { name: t.markAll }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.errors.generic));
    expect(screen.getByRole("link", { name: t.bell.withUnread(2) })).toBeTruthy();
    expect(list.getAllByText(new RegExp(t.unread))).toHaveLength(2);
  });

  it("loads the next page after the last one shown", async () => {
    const first = Array.from({ length: NOTIFICATIONS_PAGE_SIZE + 1 }, (_, i) =>
      row(i + 1, { created_at: `2026-11-04T10:00:00.${100 + i}000+00:00` }),
    );
    const c = fakeClient({ pages: (cursorId) => (cursorId ? [row(99, { event_type: "something_new" })] : first) });
    renderUi(c, <NotificationsScreen />);
    const list = within(await screen.findByRole("list", { name: t.listLabel }));
    expect(list.getAllByRole("listitem")).toHaveLength(NOTIFICATIONS_PAGE_SIZE);
    fireEvent.click(screen.getByRole("button", { name: t.loadMore }));
    await waitFor(() => expect(list.getAllByRole("listitem")).toHaveLength(NOTIFICATIONS_PAGE_SIZE + 1));
    expect(callOf(c.selects().filter((o) => !o.head)[1]!, "or")?.[0]).toContain(
      `id.lt.${nid(NOTIFICATIONS_PAGE_SIZE)}`,
    );
    expect(screen.queryByRole("button", { name: t.loadMore })).toBeNull();
  });

  it("filters the loaded notifications by kind and to the unread ones, and says how many are shown", async () => {
    const c = fakeClient({ pages: () => rows() });
    renderUi(c, <NotificationsScreen />);
    const list = within(await screen.findByRole("list", { name: t.listLabel }));
    expect(list.getAllByRole("listitem")).toHaveLength(3);
    const chips = screen.getByRole("radiogroup", { name: t.filter.label });
    expect(
      within(chips)
        .getByRole("radio", { name: `${t.filter.all} 3` })
        .getAttribute("aria-checked"),
    ).toBe("true");
    fireEvent.click(within(chips).getByRole("radio", { name: `${t.filter.team} 1` }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText(t.filter.showing(1, 3))).toBeTruthy();

    fireEvent.click(within(chips).getByRole("radio", { name: `${t.filter.chapters} 1` }));
    const unreadOnly = screen.getByRole("button", { name: t.filter.unreadOnly });
    fireEvent.click(unreadOnly);
    expect(unreadOnly.getAttribute("aria-pressed")).toBe("true");
    // The only new-chapter row is read: nothing left, and no more pages to look in.
    expect(screen.queryByRole("list", { name: t.listLabel })).toBeNull();
    expect(screen.getByText(t.filter.noMatch)).toBeTruthy();
    expect(within(chips).getByRole("radio", { name: `${t.filter.chapters} 0` })).toBeTruthy();

    fireEvent.click(within(chips).getByRole("radio", { name: `${t.filter.all} 2` }));
    fireEvent.click(unreadOnly);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(c.selects().filter((o) => !o.head)).toHaveLength(1); // filtering never asked the server again
  });

  it("slides in a notification that arrives while the page is open, but not the first ones", async () => {
    let current = rows();
    const c = fakeClient({ pages: () => current });
    renderUi(
      c,
      <>
        <NotificationBell />
        <NotificationsScreen />
      </>,
    );
    const list = within(await screen.findByRole("list", { name: t.listLabel }));
    expect(document.querySelector(".animate-row-arrive")).toBeNull();
    current = [row(4, { created_at: "2026-11-04T12:00:00.000000+00:00" }), ...rows()];
    await waitFor(() => expect(c.channels).toHaveLength(1));
    act(() => c.channels[0]!.onInsert());
    await waitFor(() => expect(list.getAllByRole("listitem")).toHaveLength(4));
    const arrived = document.querySelectorAll(".animate-row-arrive");
    expect(arrived).toHaveLength(1);
    expect(list.getAllByRole("listitem")[0]!.contains(arrived[0]!)).toBe(true);
  });

  it("shows an empty note", async () => {
    renderUi(fakeClient({ pages: () => [] }), <NotificationsScreen />);
    expect(await screen.findByText(t.empty.title)).toBeTruthy();
  });
});

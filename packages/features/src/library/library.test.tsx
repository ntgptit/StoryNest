import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { AppError } from "../_shared/errors.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { listFollowing, listReading, listSaved, removeFromReading } from "./api/library.api.ts";
import { LibraryScreen } from "./index.ts";
import { libraryErrorMessage, toReadingEntry, toShelfEntry, type LibraryStoryRow } from "./model/library.ts";
import { libraryText } from "./strings.ts";

afterEach(cleanup);

const t = libraryText;
const sid = (n: number) => `5eed0000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const storyRow = (n: number, overrides: Partial<LibraryStoryRow> = {}): LibraryStoryRow => ({
  id: sid(n),
  slug: `truyen-${n}`,
  title: `Truyện ${n}`,
  synopsis: `Tóm tắt ${n}`,
  cover_storage_key: null,
  status: "ongoing",
  is_mature: false,
  language_code: "vi",
  updated_at: "2026-11-04T09:00:00+00:00",
  owner: { username: "tac_gia", display_name: "Tác Giả" },
  category: null,
  stats: { reads: 1, votes: 2, comments: 3, followers: 4 },
  story_tags: [],
  deleted_at: null,
  ...overrides,
});
const readingRow = (n: number, overrides: Record<string, unknown> = {}) => ({
  story_id: sid(n),
  current_chapter_id: `c${n}`,
  last_read_at: `2026-11-04T10:0${n}:00.123456+00:00`,
  story: storyRow(n),
  chapter: { slug: `chuong-${n}`, sort_order: n + 1 },
  ...overrides,
});
const shelfRow = (n: number, overrides: Record<string, unknown> = {}) => ({
  story_id: sid(n),
  at: `2026-11-04T10:0${n}:00+00:00`,
  story: storyRow(n),
  ...overrides,
});

describe("library model", () => {
  it("builds the continue link from the story and the chapter the reader is in", () => {
    const entry = toReadingEntry(readingRow(3) as never);
    expect(entry.story?.title).toBe("Truyện 3");
    expect(entry.resume).toEqual({ href: `/story/${sid(3)}/truyen-3/chuong-3`, number: 4 });
    expect(entry.at).toBe("2026-11-04T10:03:00.123456+00:00");
  });

  it("accepts the embeds as object or one-element array", () => {
    const entry = toReadingEntry(
      readingRow(1, { story: [storyRow(1)], chapter: [{ slug: "a", sort_order: 7 }] }) as never,
    );
    expect(entry.story?.id).toBe(sid(1));
    expect(entry.resume?.number).toBe(7);
  });

  it("keeps a story that is gone (not visible, or soft-deleted) as an entry without a story and without a resume link", () => {
    expect(toReadingEntry(readingRow(1, { story: null }) as never)).toMatchObject({
      storyId: sid(1),
      story: null,
      resume: null,
    });
    const deleted = toShelfEntry(shelfRow(2, { story: storyRow(2, { deleted_at: "2026-11-04T00:00:00Z" }) }) as never);
    expect(deleted).toMatchObject({ storyId: sid(2), story: null });
    expect(toReadingEntry(readingRow(1, { chapter: null }) as never).resume).toBeNull();
  });

  it("explains a failure", () => {
    expect(libraryErrorMessage(new AppError("network", "x"))).toBe(t.errors.network);
    expect(libraryErrorMessage(new AppError("unknown", "x"))).toBe(t.errors.generic);
  });
});

type Call = [string, unknown[]];
function fakeClient(options: {
  reading?: unknown[];
  saved?: unknown[];
  following?: unknown[];
  fail?: Partial<Record<"user_story_progress" | "story_saves" | "story_follows", boolean>>;
  rpc?: (name: string, args: Record<string, unknown>) => { data: unknown; error: unknown };
}) {
  const queries: { table: string; calls: Call[]; deleted: boolean }[] = [];
  const rows = {
    user_story_progress: options.reading ?? [],
    story_saves: options.saved ?? [],
    story_follows: options.following ?? [],
  } as Record<string, unknown[]>;
  const from = vi.fn((table: string) => {
    const q = { table, calls: [] as Call[], deleted: false };
    queries.push(q);
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "limit", "returns"]) {
      builder[method] = (...args: unknown[]) => {
        q.calls.push([method, args]);
        return builder;
      };
    }
    builder.delete = () => {
      q.deleted = true;
      return builder;
    };
    builder.then = (resolve: (value: unknown) => unknown) =>
      resolve(
        q.deleted
          ? { data: null, error: null }
          : options.fail?.[table as keyof typeof options.fail]
            ? { data: null, error: { code: "XX000", message: "boom" } }
            : { data: rows[table], error: null },
      );
    return builder;
  });
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    rpcCalls.push({ name, args });
    return options.rpc?.(name, args) ?? { data: 0, error: null };
  });
  const select = (table: string) => queries.filter((q) => q.table === table && !q.deleted);
  return { from, rpc, queries, rpcCalls, select };
}
const callOf = (q: { calls: Call[] }, method: string) => q.calls.find(([m]) => m === method)?.[1];

describe("library api", () => {
  it("lists what is being read, newest first, for this reader, with the story as a left embed and the chapter to continue", async () => {
    const c = fakeClient({ reading: [readingRow(1), readingRow(2)] });
    const entries = await listReading(c as unknown as DataClient, TEST_USER_ID);
    expect(entries.map((e) => e.storyId)).toEqual([sid(1), sid(2)]);
    const q = c.select("user_story_progress")[0]!;
    expect(callOf(q, "eq")).toEqual(["user_id", TEST_USER_ID]);
    expect(callOf(q, "order")).toEqual(["last_read_at", { ascending: false }]);
    expect(callOf(q, "limit")).toEqual([50]);
    const columns = String(callOf(q, "select")?.[0]);
    expect(columns).toContain("story:stories!user_story_progress_story_id_fkey(");
    expect(columns).toContain("deleted_at)");
    expect(columns).toContain(
      "chapter:chapters!user_story_progress_current_chapter_id_story_id_fkey(slug, sort_order)",
    );
    expect(columns.split("(").length).toBe(columns.split(")").length);
  });

  it("lists the shelf by saved time and the follows by follow time, each renaming its date to `at`", async () => {
    const c = fakeClient({ saved: [shelfRow(1)], following: [shelfRow(2)] });
    await listSaved(c as unknown as DataClient, TEST_USER_ID);
    await listFollowing(c as unknown as DataClient, TEST_USER_ID);
    const saved = c.select("story_saves")[0]!;
    const follows = c.select("story_follows")[0]!;
    expect(String(callOf(saved, "select")?.[0])).toContain("at:saved_at");
    expect(callOf(saved, "order")).toEqual(["saved_at", { ascending: false }]);
    expect(String(callOf(follows, "select")?.[0])).toContain("at:created_at");
    expect(callOf(follows, "order")).toEqual(["created_at", { ascending: false }]);
    expect(String(callOf(saved, "select")?.[0])).toContain("story:stories!story_saves_story_id_fkey(");
    expect(String(callOf(follows, "select")?.[0])).toContain("story:stories!story_follows_story_id_fkey(");
  });

  it("removes only the reader's own progress row of that story", async () => {
    const c = fakeClient({});
    await removeFromReading(c as unknown as DataClient, TEST_USER_ID, sid(1));
    const q = c.queries.find((x) => x.deleted)!;
    expect(q.table).toBe("user_story_progress");
    expect(q.calls.filter(([m]) => m === "eq").map(([, a]) => a)).toEqual([
      ["user_id", TEST_USER_ID],
      ["story_id", sid(1)],
    ]);
  });
});

const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/library" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};
const toasts = { show: vi.fn() };

function renderLibrary(c: ReturnType<typeof fakeClient>) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(c, testSession())}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={toasts}>
              <LibraryScreen />
            </ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

const openTab = (name: string) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });

beforeEach(() => toasts.show.mockClear());

describe("LibraryScreen before the session is known", () => {
  it("asks for nothing until the reader is known, then loads their list", async () => {
    const c = fakeClient({ reading: [readingRow(1)] });
    let resolveSession: (value: { data: { session: ReturnType<typeof testSession> } }) => void = () => undefined;
    const client = {
      ...c,
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
        getSession: () => new Promise((resolve) => (resolveSession = resolve)),
      },
    } as unknown as DataClient;
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DataProvider client={client}>
          <AuthProvider>
            <PlatformProvider adapter={adapter}>
              <ToastProvider port={toasts}>
                <LibraryScreen />
              </ToastProvider>
            </PlatformProvider>
          </AuthProvider>
        </DataProvider>
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(c.queries).toHaveLength(0);
    expect(screen.queryByText(t.empty.reading.title)).toBeNull();
    resolveSession({ data: { session: testSession() } });
    expect(await screen.findByRole("heading", { name: "Truyện 1" })).toBeTruthy();
    expect(callOf(c.select("user_story_progress")[0]!, "eq")).toEqual(["user_id", TEST_USER_ID]);
  });
});

describe("LibraryScreen", () => {
  it("opens on what the reader is reading, in the order the server gives, each with a one-tap continue link", async () => {
    const c = fakeClient({ reading: [readingRow(2), readingRow(1)] });
    renderLibrary(c);
    const list = within(await screen.findByRole("list", { name: t.listLabel(t.tabs.reading) }));
    expect(list.getAllByRole("heading").map((h) => h.textContent)).toEqual(["Truyện 2", "Truyện 1"]);
    expect(list.getByRole("link", { name: t.continueReading(3) }).getAttribute("href")).toBe(
      `/story/${sid(2)}/truyen-2/chuong-2`,
    );
    expect(list.getByRole("link", { name: t.continueReading(2) }).getAttribute("href")).toBe(
      `/story/${sid(1)}/truyen-1/chuong-1`,
    );
    expect(c.select("story_saves")).toHaveLength(0); // the other tabs are not loaded yet
    expect(c.select("story_follows")).toHaveLength(0);
  });

  it("loads a tab only when it is opened, and shows the shelf with an open-story link", async () => {
    const c = fakeClient({ reading: [readingRow(1)], saved: [shelfRow(5)], following: [shelfRow(6)] });
    renderLibrary(c);
    await screen.findByRole("list", { name: t.listLabel(t.tabs.reading) });
    openTab(t.tabs.saved);
    const saved = within(await screen.findByRole("list", { name: t.listLabel(t.tabs.saved) }));
    expect(saved.getByRole("heading", { name: "Truyện 5" })).toBeTruthy();
    expect(saved.getByRole("link", { name: t.openStory }).getAttribute("href")).toBe(`/story/${sid(5)}/truyen-5`);
    expect(c.select("story_follows")).toHaveLength(0);
    openTab(t.tabs.following);
    expect(await screen.findByRole("heading", { name: "Truyện 6" })).toBeTruthy();
  });

  it("shows a placeholder for a story that is gone, which can still be removed", async () => {
    const c = fakeClient({ reading: [readingRow(1, { story: null, chapter: null })] });
    renderLibrary(c);
    const list = within(await screen.findByRole("list", { name: t.listLabel(t.tabs.reading) }));
    expect(list.getByText(t.unavailable.title)).toBeTruthy();
    expect(list.queryByRole("link")).toBeNull();
    expect(list.getByRole("button", { name: t.remove.reading })).toBeTruthy();
  });

  it("shows an empty note per tab", async () => {
    renderLibrary(fakeClient({}));
    expect(await screen.findByText(t.empty.reading.title)).toBeTruthy();
    openTab(t.tabs.saved);
    expect(await screen.findByText(t.empty.saved.title)).toBeTruthy();
    openTab(t.tabs.following);
    expect(await screen.findByText(t.empty.following.title)).toBeTruthy();
  });

  it("offers a retry when a tab cannot load, and it does not break the others", async () => {
    const c = fakeClient({ fail: { user_story_progress: true }, saved: [shelfRow(5)] });
    renderLibrary(c);
    expect(await screen.findByRole("button", { name: t.error.retry })).toBeTruthy();
    openTab(t.tabs.saved);
    expect(await screen.findByRole("heading", { name: "Truyện 5" })).toBeTruthy();
  });

  it("removes from the reading list by deleting the progress row, then reloads", async () => {
    const c = fakeClient({ reading: [readingRow(1)] });
    renderLibrary(c);
    const list = within(await screen.findByRole("list", { name: t.listLabel(t.tabs.reading) }));
    fireEvent.click(list.getByRole("button", { name: t.remove.reading }));
    await waitFor(() => expect(c.queries.some((q) => q.deleted && q.table === "user_story_progress")).toBe(true));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.removed.reading));
    await waitFor(() => expect(c.select("user_story_progress").length).toBeGreaterThan(1));
  });

  it("unsaves and unfollows through the same RPCs the story page uses", async () => {
    const c = fakeClient({ saved: [shelfRow(5)], following: [shelfRow(6)] });
    renderLibrary(c);
    openTab(t.tabs.saved);
    fireEvent.click(await screen.findByRole("button", { name: t.remove.saved }));
    await waitFor(() =>
      expect(c.rpcCalls).toContainEqual({ name: "set_story_save", args: { p_story_id: sid(5), p_saved: false } }),
    );
    openTab(t.tabs.following);
    fireEvent.click(await screen.findByRole("button", { name: t.remove.following }));
    await waitFor(() =>
      expect(c.rpcCalls).toContainEqual({ name: "set_story_follow", args: { p_story_id: sid(6), p_followed: false } }),
    );
  });

  it("says why when removing fails", async () => {
    const c = fakeClient({
      saved: [shelfRow(5)],
      rpc: () => ({ data: null, error: { code: "XX000", message: "boom" } }),
    });
    renderLibrary(c);
    openTab(t.tabs.saved);
    fireEvent.click(await screen.findByRole("button", { name: t.remove.saved }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.errors.generic));
  });
});

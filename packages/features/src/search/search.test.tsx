import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { orderByIds, type StoryListRow } from "../discovery/index.ts";
import { searchAuthors, searchStories, searchTags } from "./api/search.api.ts";
import { useSearchStories } from "./hooks/use-search.ts";
import { SearchBox, SearchScreen, searchHref, tabFromParam } from "./index.ts";
import {
  SEARCH_MAX_LENGTH,
  SEARCH_MAX_OFFSET,
  SEARCH_MIN_LENGTH,
  SEARCH_PAGE_SIZE,
  SUGGESTION_DELAY_MS,
  nextOffset,
  normalizeTerm,
  termState,
} from "./model/search.ts";
import { searchText } from "./strings.ts";

afterEach(cleanup);

const t = searchText;
const uuid = (n: number) => `5eed0000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const storyRow = (n: number): StoryListRow => ({
  id: uuid(n),
  slug: `truyen-${n}`,
  title: `Truyện ${n}`,
  synopsis: `Mô tả ${n}`,
  cover_storage_key: null,
  status: "ongoing",
  is_mature: false,
  language_code: "vi",
  updated_at: "2026-11-04T00:00:00.123456+00:00",
  owner: { username: "demo_an", display_name: "An Nhiên" },
  category: null,
  stats: { reads: 1, votes: 2, comments: 0, followers: 0 },
  story_tags: [],
});

type Result = { data: unknown; error: unknown };
interface RpcCall {
  name: string;
  args: Record<string, unknown>;
}

/** A client whose RPCs and stories query answer from the given handlers; every RPC call is recorded. */
function fakeClient(options: {
  rpc?: (name: string, args: Record<string, unknown>) => Result | Promise<Result>;
  stories?: StoryListRow[];
}) {
  const calls: RpcCall[] = [];
  const inQueries: string[][] = [];
  const client = {
    rpc: vi.fn((name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { returns: () => Promise.resolve(options.rpc?.(name, args) ?? { data: [], error: null }) };
    }),
    from: vi.fn(() => {
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.in = (_column: string, ids: string[]) => {
        inQueries.push(ids);
        return builder;
      };
      builder.returns = () => Promise.resolve({ data: options.stories ?? [], error: null });
      return builder;
    }),
  };
  return { client: client as unknown as DataClient, calls, inQueries };
}

const scored = (ns: number[]) => ns.map((n) => ({ story_id: uuid(n), score: 1.5 }));

describe("search model", () => {
  it("normalizes spaces", () => {
    expect(normalizeTerm("  đọc    truyện \n")).toBe("đọc truyện");
    expect(normalizeTerm("   ")).toBe("");
  });

  it("knows when a term is searchable: 3 to 100 characters", () => {
    expect(termState("")).toBe("empty");
    expect(termState("ab")).toBe("short");
    expect(termState("abc")).toBe("ok");
    expect(termState("a".repeat(SEARCH_MAX_LENGTH))).toBe("ok");
    expect(termState("a".repeat(SEARCH_MAX_LENGTH + 1))).toBe("long");
    expect(SEARCH_MIN_LENGTH).toBe(3);
  });

  it("counts characters, not UTF-16 units", () => {
    expect(termState("😀😀")).toBe("short");
    expect(termState("😀😀😀")).toBe("ok");
  });

  it("reads a tab from the address and falls back to stories", () => {
    expect(tabFromParam("authors")).toBe("authors");
    expect(tabFromParam("tags")).toBe("tags");
    expect(tabFromParam("nope")).toBe("stories");
    expect(tabFromParam(undefined)).toBe("stories");
  });

  it("builds addresses: term encoded, default tab omitted", () => {
    expect(searchHref("")).toBe("/search");
    expect(searchHref("  đọc  truyện ")).toBe("/search?q=%C4%91%E1%BB%8Dc+truy%E1%BB%87n");
    expect(searchHref("abc", "authors")).toBe("/search?q=abc&tab=authors");
    expect(searchHref("a&b=c")).toBe("/search?q=a%26b%3Dc");
  });

  it("pages by offset up to the database cap", () => {
    expect(nextOffset(0, false)).toBeNull();
    expect(nextOffset(0, true)).toBe(SEARCH_PAGE_SIZE);
    expect(nextOffset(SEARCH_MAX_OFFSET - SEARCH_PAGE_SIZE, true)).toBe(SEARCH_MAX_OFFSET);
    expect(nextOffset(SEARCH_MAX_OFFSET - SEARCH_PAGE_SIZE + 1, true)).toBeNull();
    expect(nextOffset(0, true, 5)).toBe(5);
  });

  it("restores the ranked order and drops what did not come back", () => {
    const rows = [{ id: "b" }, { id: "a" }];
    expect(orderByIds(["a", "x", "b"], rows)).toEqual([{ id: "a" }, { id: "b" }]);
  });
});

describe("search api", () => {
  it("asks the RPC for one extra row, fetches the cards by id and keeps the ranked order", async () => {
    const { client, calls, inQueries } = fakeClient({
      rpc: () => ({ data: scored([3, 1, 2]), error: null }),
      stories: [storyRow(1), storyRow(2), storyRow(3)],
    });
    const page = await searchStories(client, "doc truyen", { pageSize: 2 });
    expect(calls).toEqual([
      { name: "search_stories", args: { p_query: "doc truyen", p_include_mature: false, p_limit: 3, p_offset: 0 } },
    ]);
    expect(inQueries).toEqual([[uuid(3), uuid(1)]]);
    expect(page.items.map((s) => s.id)).toEqual([uuid(3), uuid(1)]);
    expect(page.nextOffset).toBe(2);
  });

  it("has no next page when the extra row is missing, and skips the second request when nothing matched", async () => {
    const last = fakeClient({ rpc: () => ({ data: scored([1]), error: null }), stories: [storyRow(1)] });
    expect((await searchStories(last.client, "abc", { pageSize: 2 })).nextOffset).toBeNull();
    const none = fakeClient({});
    expect(await searchStories(none.client, "abc")).toEqual({ items: [], nextOffset: null });
    expect(none.inQueries).toEqual([]);
  });

  it("a page that is exactly full has no next page: only the extra row proves there is one", async () => {
    const { client } = fakeClient({
      rpc: () => ({ data: scored([1, 2]), error: null }),
      stories: [storyRow(1), storyRow(2)],
    });
    expect((await searchStories(client, "abc", { pageSize: 2 })).nextOffset).toBeNull();
  });

  it("authors page the same way: one extra row, the offset sent, the next offset returned", async () => {
    const author = (n: number) => ({
      user_id: `u${n}`,
      username: `u_${n}`,
      display_name: `U ${n}`,
      avatar_storage_key: null,
      stories_count: 1,
      score: 1,
    });
    const { client, calls } = fakeClient({ rpc: () => ({ data: [author(1), author(2), author(3)], error: null }) });
    const page = await searchAuthors(client, "abc", { pageSize: 2, offset: 4 });
    expect(calls[0]?.args).toEqual({ p_query: "abc", p_include_mature: false, p_limit: 3, p_offset: 4 });
    expect(page.items.map((a) => a.userId)).toEqual(["u1", "u2"]);
    expect(page.nextOffset).toBe(6);
  });

  it("passes the offset through and stops at the cap", async () => {
    const { client, calls } = fakeClient({
      rpc: () => ({ data: scored([1, 2, 3]), error: null }),
      stories: [storyRow(1)],
    });
    const page = await searchStories(client, "abc", { pageSize: 2, offset: SEARCH_MAX_OFFSET - 1 });
    expect(calls[0]?.args.p_offset).toBe(SEARCH_MAX_OFFSET - 1);
    expect(page.nextOffset).toBeNull();
  });

  it("turns a database error into a thrown error", async () => {
    const { client } = fakeClient({ rpc: () => ({ data: null, error: { code: "22023", message: "too short" } }) });
    await expect(searchStories(client, "ab")).rejects.toMatchObject({ message: "too short" });
  });

  it("maps authors and tags (counts arrive as numbers or strings)", async () => {
    const authors = fakeClient({
      rpc: () => ({
        data: [
          {
            user_id: "u1",
            username: "demo_an",
            display_name: "An",
            avatar_storage_key: null,
            stories_count: "4",
            score: 1,
          },
        ],
        error: null,
      }),
    });
    expect(await searchAuthors(authors.client, "an")).toEqual({
      items: [{ userId: "u1", username: "demo_an", displayName: "An", avatarStorageKey: null, storiesCount: 4 }],
      nextOffset: null,
    });
    const tags = fakeClient({
      rpc: () => ({
        data: [{ tag_id: "7", slug: "lang-man", display_name: "Lãng mạn", stories_count: 2, score: 1 }],
        error: null,
      }),
    });
    expect(await searchTags(tags.client, "lang")).toEqual([
      { id: 7, slug: "lang-man", name: "Lãng mạn", storiesCount: 2 },
    ]);
    expect(tags.calls[0]).toEqual({ name: "search_tags", args: { p_query: "lang", p_limit: 10 } });
  });
});

const push = vi.fn();
const replace = vi.fn();
const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push, replace, back: vi.fn(), refresh: vi.fn(), pathname: "/search" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

function wrapper(client: DataClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DataProvider client={client}>{children}</DataProvider>
      </QueryClientProvider>
    );
  };
}

describe("useSearchStories", () => {
  it("does not ask the database for a term that is too short", async () => {
    const { client, calls } = fakeClient({});
    const { result } = renderHook(() => useSearchStories("ab"), { wrapper: wrapper(client) });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(result.current.fetchStatus).toBe("idle");
    expect(calls).toEqual([]);
  });
});

function renderUi(client: DataClient, ui: ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={client}>
        <PlatformProvider adapter={adapter}>{ui}</PlatformProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

describe("SearchScreen", () => {
  it("asks for more characters instead of searching a short term", () => {
    const { client, calls } = fakeClient({});
    renderUi(client, <SearchScreen term="ab" tab="stories" />);
    expect(screen.getByRole("status").textContent).toBe(t.hint(SEARCH_MIN_LENGTH));
    expect(calls).toEqual([]);
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("says when a term is too long", () => {
    const { client, calls } = fakeClient({});
    renderUi(client, <SearchScreen term={"a".repeat(SEARCH_MAX_LENGTH + 1)} tab="stories" />);
    expect(screen.getByRole("status").textContent).toBe(t.tooLong(SEARCH_MAX_LENGTH));
    expect(calls).toEqual([]);
  });

  it("switches result tabs by swiping the results sideways on touch (the address changes, as with a click)", async () => {
    const { client } = fakeClient({ rpc: () => ({ data: [], error: null }) });
    renderUi(client, <SearchScreen term="truyen" tab="authors" />);
    await screen.findByRole("tab", { name: t.tabs.authors });
    const target = document.querySelector<HTMLElement>(".touch-pan-y")!;
    Object.defineProperty(target, "clientWidth", { value: 400 });
    const touch = (x: number) => ({ pointerType: "touch", isPrimary: true, pointerId: 1, clientX: x, clientY: 0 });
    fireEvent.pointerDown(target, touch(350));
    fireEvent.pointerMove(target, touch(300));
    fireEvent.pointerMove(target, touch(150));
    fireEvent.pointerUp(target, touch(150));
    expect(replace).toHaveBeenLastCalledWith(searchHref("truyen", "tags"));
    // The panel is drawn again after a swipe (so the next one slides in): find it again.
    const again = document.querySelector<HTMLElement>(".touch-pan-y")!;
    Object.defineProperty(again, "clientWidth", { value: 400 });
    fireEvent.pointerDown(again, touch(100));
    fireEvent.pointerMove(again, touch(150));
    fireEvent.pointerMove(again, touch(300));
    fireEvent.pointerUp(again, touch(300));
    expect(replace).toHaveBeenLastCalledWith(searchHref("truyen", "stories"));
  });

  it("shows story results as cards linking to the story", async () => {
    const { client } = fakeClient({
      rpc: () => ({ data: scored([1, 2]), error: null }),
      stories: [storyRow(1), storyRow(2)],
    });
    renderUi(client, <SearchScreen term="  truyen  " tab="stories" />);
    expect(await screen.findByRole("heading", { name: t.resultsFor("truyen") })).toBeTruthy();
    const link = (await screen.findByText("Truyện 1")).closest("a");
    expect(link?.getAttribute("href")).toBe(`/story/${uuid(1)}/truyen-1`);
    expect(screen.getByText("Truyện 2")).toBeTruthy();
  });

  it("shows an empty state, and an error with a retry", async () => {
    const empty = fakeClient({});
    renderUi(empty.client, <SearchScreen term="khong co" tab="stories" />);
    expect(await screen.findByText(t.empty.stories.title)).toBeTruthy();
    cleanup();

    let fail = true;
    const flaky = fakeClient({
      rpc: () => (fail ? { data: null, error: { code: "500", message: "boom" } } : { data: scored([1]), error: null }),
      stories: [storyRow(1)],
    });
    renderUi(flaky.client, <SearchScreen term="truyen" tab="stories" />);
    expect(await screen.findByText(t.error.title)).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: t.error.retry }));
    expect(await screen.findByText("Truyện 1")).toBeTruthy();
  });

  it("loads the next page with the next offset", async () => {
    const many = Array.from({ length: SEARCH_PAGE_SIZE + 1 }, (_, i) => i + 1);
    const { client, calls } = fakeClient({
      rpc: () => ({ data: scored(many), error: null }),
      stories: many.map(storyRow),
    });
    renderUi(client, <SearchScreen term="truyen" tab="stories" />);
    fireEvent.click(await screen.findByRole("button", { name: t.loadMore }));
    await waitFor(() => expect(calls.map((c) => c.args.p_offset)).toEqual([0, SEARCH_PAGE_SIZE]));
  });

  it("changes tab and submits a new term by replacing the address", async () => {
    const { client } = fakeClient({});
    renderUi(client, <SearchScreen term="truyen" tab="stories" />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: t.tabs.authors }));
    expect(replace).toHaveBeenCalledWith("/search?q=truyen&tab=authors");

    fireEvent.change(screen.getByRole("searchbox", { name: t.inputLabel }), { target: { value: "  rung   suong " } });
    fireEvent.click(screen.getByRole("button", { name: t.submit }));
    expect(replace).toHaveBeenLastCalledWith("/search?q=rung+suong");
  });

  it("keeps the tab when a new term is submitted", () => {
    renderUi(fakeClient({}).client, <SearchScreen term="truyen" tab="tags" />);
    fireEvent.change(screen.getByRole("searchbox", { name: t.inputLabel }), { target: { value: "rung suong" } });
    fireEvent.click(screen.getByRole("button", { name: t.submit }));
    expect(replace).toHaveBeenLastCalledWith("/search?q=rung+suong&tab=tags");
  });

  it("lists authors and tags with their counts", async () => {
    const authors = fakeClient({
      rpc: () => ({
        data: [
          {
            user_id: "u1",
            username: "demo_an",
            display_name: "An Nhiên",
            avatar_storage_key: null,
            stories_count: 3,
            score: 1,
          },
        ],
        error: null,
      }),
    });
    renderUi(authors.client, <SearchScreen term="an nhien" tab="authors" />);
    const list = within(await screen.findByRole("list", { name: t.tabs.authors }));
    expect(list.getByText("An Nhiên")).toBeTruthy();
    expect(list.getByText(`@demo_an · ${t.storiesCount(3)}`)).toBeTruthy();
    expect(list.getByRole("link", { name: /An Nhiên/ }).getAttribute("href")).toBe("/author/demo_an");
    cleanup();

    const tags = fakeClient({
      rpc: () => ({
        data: [{ tag_id: 1, slug: "lang-man", display_name: "Lãng mạn", stories_count: 5, score: 1 }],
        error: null,
      }),
    });
    renderUi(tags.client, <SearchScreen term="lang man" tab="tags" />);
    const tagList = within(await screen.findByRole("list", { name: t.tabs.tags }));
    expect(tagList.getByRole("link", { name: /Lãng mạn/ }).getAttribute("href")).toBe("/?tag=lang-man");
    expect(tagList.getByText(t.tagStoriesCount(5))).toBeTruthy();
  });
});

describe("SearchBox", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  const type = (value: string) =>
    fireEvent.change(screen.getByRole("combobox", { name: t.inputLabel }), { target: { value } });
  const pause = () => act(() => vi.advanceTimersByTimeAsync(SUGGESTION_DELAY_MS + 50));

  it("waits for a pause in typing, then suggests the first stories", async () => {
    const { client, calls } = fakeClient({
      rpc: () => ({ data: scored([1, 2]), error: null }),
      stories: [storyRow(1), storyRow(2)],
    });
    renderUi(client, <SearchBox />);
    type("tru");
    type("truy");
    type("truyen");
    expect(calls).toEqual([]);
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([t.seeAll("truyen")]);
    await pause();
    await screen.findByText("Truyện 2");
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Truyện 1", "Truyện 2", t.seeAll("truyen")]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.args).toMatchObject({ p_query: "truyen", p_limit: 6 });
  });

  it("does not open the results page for a term that is too short", () => {
    renderUi(fakeClient({}).client, <SearchBox />);
    type("ab");
    fireEvent.submit(screen.getByRole("search"));
    expect(push).not.toHaveBeenCalled();
  });

  it("does not show the suggestions of an earlier, different term while a new one has not settled", async () => {
    const { client } = fakeClient({ rpc: () => ({ data: scored([1]), error: null }), stories: [storyRow(1)] });
    renderUi(client, <SearchBox />);
    type("truyen");
    await pause();
    await screen.findByText("Truyện 1");
    type("ab");
    await pause();
    type("abc");
    expect(screen.queryByText("Truyện 1")).toBeNull();
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([t.seeAll("abc")]);
  });

  it("shows nothing for a term that is too short, and never asks the database", async () => {
    const { client, calls } = fakeClient({});
    renderUi(client, <SearchBox />);
    type("tr");
    await pause();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(calls).toEqual([]);
  });

  it("opens the results page on Enter, and a story when a suggestion is chosen with the keys", async () => {
    const { client } = fakeClient({ rpc: () => ({ data: scored([1]), error: null }), stories: [storyRow(1)] });
    renderUi(client, <SearchBox />);
    type("truyen");
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenLastCalledWith("/search?q=truyen");
    expect(screen.queryByRole("listbox")).toBeNull();

    type("truyen ");
    await pause();
    await screen.findByText("Truyện 1");
    const input = screen.getByRole("combobox", { name: t.inputLabel });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[0]?.getAttribute("aria-selected")).toBe("true");
    expect(input.getAttribute("aria-activedescendant")).toBe(screen.getAllByRole("option")[0]?.id);
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenLastCalledWith(`/story/${uuid(1)}/truyen-1`);
  });

  it("closes on Escape, and the last row opens the results page", async () => {
    const { client } = fakeClient({ rpc: () => ({ data: scored([1]), error: null }), stories: [storyRow(1)] });
    renderUi(client, <SearchBox />);
    type("truyen");
    await pause();
    await screen.findByText("Truyện 1");
    fireEvent.mouseDown(screen.getByText(t.seeAll("truyen")));
    expect(push).toHaveBeenLastCalledWith("/search?q=truyen");

    type("truyen!");
    await pause();
    await screen.findByText("Truyện 1");
    fireEvent.keyDown(screen.getByRole("combobox", { name: t.inputLabel }), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("on narrow screens opens the same field in place from the icon, and folds it back on Escape or close", async () => {
    renderUi(fakeClient({}).client, <SearchBox />);
    const toggle = screen.getByRole("button", { name: t.openSearch });
    const form = screen.getByRole("search");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBe(form.id);
    expect(form.className).toContain("hidden");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(form.className).not.toMatch(/(^| )hidden( |$)/);
    const input = screen.getByRole("combobox", { name: t.inputLabel });
    await waitFor(() => expect(document.activeElement).toBe(input));

    fireEvent.keyDown(input, { key: "Escape" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: t.closeSearch }));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(push).not.toHaveBeenCalled();
  });

  it("folds the narrow-screen field back when a search is submitted", () => {
    renderUi(fakeClient({}).client, <SearchBox />);
    const toggle = screen.getByRole("button", { name: t.openSearch });
    fireEvent.click(toggle);
    type("truyen");
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenLastCalledWith("/search?q=truyen");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
});

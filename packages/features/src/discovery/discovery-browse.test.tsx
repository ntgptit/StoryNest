import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataClient } from "../_shared/client.ts";
import { AuthProvider } from "../_shared/auth.tsx";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { StoryPeekContext, type StoryPeekTarget } from "../_shared/story-peek.tsx";
import { withAuth } from "../_shared/test-auth.ts";
import { countLatestStories } from "./api/discovery.api.ts";
import { DiscoverScreen, STORY_VIEW_STORAGE_KEY, StoryTile, toStorySummary, type StoryListRow } from "./index.ts";
import type { Category } from "./model/categories.ts";
import { discoveryText } from "./strings.ts";

afterEach(cleanup);

const t = discoveryText;
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
  stats: null,
  story_tags: [],
});
const CATEGORIES: Category[] = [
  { id: 1, slug: "lang-man", name: "Lãng mạn", parentId: null, sortOrder: 10 },
  { id: 2, slug: "gia-tuong", name: "Giả tưởng", parentId: null, sortOrder: 20 },
];
const CATEGORY_ROWS = CATEGORIES.map((c) => ({
  id: c.id,
  slug: c.slug,
  name: c.name,
  parent_id: c.parentId,
  sort_order: c.sortOrder,
}));
const TAG_ROWS = [{ tag_id: 1, slug: "tinh-yeu", display_name: "Tình yêu", stories_count: 5 }];

type Call = [string, unknown[]];
type Query = { table: string; calls: Call[]; sent?: boolean };

/**
 * Each `from()` gets its own recorded builder. A head-only count (`select(…, { head: true })`) is answered by
 * `count(query)`; a row query by `rows(query)`.
 */
function fakeClient(options: { rows?: (q: Query) => unknown[]; count?: (q: Query) => number }) {
  const queries: Query[] = [];
  const client = {
    from: (table: string) => {
      const q: Query = { table, calls: [] };
      queries.push(q);
      const b: Record<string, unknown> = {};
      for (const method of ["select", "eq", "is", "neq", "in", "or", "order", "limit", "returns"]) {
        b[method] = (...args: unknown[]) => {
          q.calls.push([method, args]);
          return b;
        };
      }
      b.then = (resolve: (value: unknown) => unknown) => {
        q.sent = true;
        if (table === "categories") return resolve({ data: CATEGORY_ROWS, error: null });
        const head = (q.calls.find(([m]) => m === "select")?.[1][1] as { head?: boolean } | undefined)?.head;
        return resolve(
          head
            ? { data: null, count: options.count?.(q) ?? 0, error: null }
            : { data: options.rows?.(q) ?? [], error: null },
        );
      };
      return b;
    },
    rpc: () => ({ returns: () => Promise.resolve({ data: TAG_ROWS, error: null }) }),
  } as unknown as DataClient;
  const counts = () =>
    queries.filter((q) => (q.calls.find(([m]) => m === "select")?.[1][1] as { head?: boolean } | undefined)?.head);
  return { client, queries, counts };
}

const args = (q: Query, method: string) => q.calls.filter(([m]) => m === method).map(([, a]) => a);
const tagOf = (q: Query) => args(q, "eq").find(([column]) => column === "tagFilter.tag.slug")?.[1];
const categoryOf = (q: Query) => args(q, "in").find(([column]) => column === "category_id")?.[1];

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

function renderScreen(client: DataClient, ui: ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(client, null)}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>{ui}</PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
  window.localStorage.clear();
});

describe("countLatestStories", () => {
  it("counts the feed's own rows with one head-only request (same filters, no rows, no order or limit)", async () => {
    const { client, queries } = fakeClient({ count: () => 7 });
    const n = await countLatestStories(client, {
      categorySlug: "lang-man",
      tagSlug: "tinh-yeu",
      categories: CATEGORIES,
    });
    expect(n).toBe(7);
    const [q] = queries;
    expect(args(q!, "select")[0]).toEqual([
      "id, tagFilter:story_tags!inner(tag:tags!inner(slug))",
      { count: "exact", head: true },
    ]);
    expect(args(q!, "eq")).toContainEqual(["visibility", "public"]);
    expect(args(q!, "eq")).toContainEqual(["is_mature", false]);
    expect(args(q!, "neq")).toContainEqual(["status", "draft"]);
    expect(args(q!, "is")).toContainEqual(["deleted_at", null]);
    expect(categoryOf(q!)).toEqual([1]);
    expect(tagOf(q!)).toBe("tinh-yeu");
    expect(args(q!, "order")).toEqual([]);
    expect(args(q!, "limit")).toEqual([]);
  });

  it("is 0 without asking for an unknown category", async () => {
    const { client, queries } = fakeClient({ count: () => 7 });
    expect(await countLatestStories(client, { categorySlug: "khong-co", categories: CATEGORIES })).toBe(0);
    expect(queries.filter((q) => q.sent)).toHaveLength(0);
  });
});

describe("DiscoverScreen: empty filtered feed (loosen the filters)", () => {
  it("offers to drop the tag or the category, each with how many stories that would list", async () => {
    const { client } = fakeClient({
      rows: () => [],
      count: (q) => (tagOf(q) ? 2 : categoryOf(q) ? 9 : 0),
    });
    renderScreen(client, <DiscoverScreen categorySlug="lang-man" tagSlug="tinh-yeu" />);
    // The block only renders after the empty feed and both count queries settle (several async rounds); the default
    // 1 s findBy wait was not enough when the machine was busy.
    const loosen = within(await screen.findByRole("navigation", { name: t.loosen.label }, { timeout: 5000 }));
    const withoutTag = loosen.getByRole("link", { name: new RegExp(t.loosen.withoutTag("Tình yêu")) });
    expect(withoutTag.getAttribute("href")).toBe("/?category=lang-man");
    await waitFor(() => expect(withoutTag.textContent).toContain(t.loosen.count("9")));
    const withoutCategory = loosen.getByRole("link", { name: new RegExp(t.loosen.withoutCategory("Lãng mạn")) });
    expect(withoutCategory.getAttribute("href")).toBe("/?tag=tinh-yeu");
    await waitFor(() => expect(withoutCategory.textContent).toContain(t.loosen.count("2")));
  });

  it("asks nothing extra while the feed has stories, and offers nothing without filters", async () => {
    const full = fakeClient({ rows: () => [storyRow(1)], count: () => 1 });
    renderScreen(full.client, <DiscoverScreen categorySlug="lang-man" />);
    await screen.findByText("Truyện 1");
    expect(full.counts()).toHaveLength(0);
    cleanup();

    const empty = fakeClient({ rows: () => [] });
    renderScreen(empty.client, <DiscoverScreen />);
    await screen.findByText(t.empty.title);
    expect(screen.queryByRole("navigation", { name: t.loosen.label })).toBeNull();
    expect(empty.counts()).toHaveLength(0);
  });
});

describe("DiscoverScreen: filter sheet (phones)", () => {
  it("shows the active filters as removable chips and counts a choice live before applying it", async () => {
    const { client, counts } = fakeClient({
      rows: () => [storyRow(1)],
      count: (q) => (categoryOf(q) ? 4 : 12),
    });
    renderScreen(client, <DiscoverScreen tagSlug="tinh-yeu" />);
    await screen.findByText("Truyện 1");
    expect(screen.getByRole("link", { name: t.filters.removeTag("Tình yêu") }).getAttribute("href")).toBe("/");
    expect(counts()).toHaveLength(0); // nothing is counted until the sheet opens

    fireEvent.click(screen.getByRole("button", { name: new RegExp(t.filters.open) }));
    const sheet = within(await screen.findByRole("dialog", { name: t.filters.title }));
    expect(sheet.getByRole("button", { name: "#Tình yêu" }).getAttribute("aria-pressed")).toBe("true");
    expect(await sheet.findByRole("button", { name: t.filters.show(12) })).toBeTruthy();

    fireEvent.click(sheet.getByRole("button", { name: "Giả tưởng" }));
    const show = await sheet.findByRole("button", { name: t.filters.show(4) });
    const last = counts().at(-1)!;
    expect(categoryOf(last)).toEqual([2]);
    expect(tagOf(last)).toBe("tinh-yeu");
    fireEvent.click(show);
    expect(push).toHaveBeenCalledWith("/?category=gia-tuong&tag=tinh-yeu");
  });

  it("cannot apply a choice that lists nothing", async () => {
    const { client } = fakeClient({ rows: () => [storyRow(1)], count: () => 0 });
    renderScreen(client, <DiscoverScreen />);
    await screen.findByText("Truyện 1");
    fireEvent.click(screen.getByRole("button", { name: new RegExp(t.filters.open) }));
    const button = await screen.findByRole("button", { name: t.filters.none });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("DiscoverScreen: grid or list", () => {
  it("switches the cards to rows and remembers the choice in this browser", async () => {
    const { client } = fakeClient({ rows: () => [storyRow(1), storyRow(2)] });
    renderScreen(client, <DiscoverScreen />);
    await screen.findByText("Truyện 1");
    const group = within(screen.getByRole("group", { name: t.view.label }));
    expect(screen.getByRole("link", { name: /Truyện 1/ }).getAttribute("data-variant")).toBe("grid");
    fireEvent.click(group.getByRole("button", { name: t.view.list }));
    expect(screen.getByRole("link", { name: /Truyện 1/ }).getAttribute("data-variant")).toBe("list");
    expect(group.getByRole("button", { name: t.view.list }).getAttribute("aria-pressed")).toBe("true");
    expect(window.localStorage.getItem(STORY_VIEW_STORAGE_KEY)).toBe("list");
  });
});

describe("StoryTile", () => {
  it("asks the app's story peek to open on the context menu, with the story id and its card", () => {
    const peek = vi.fn<(target: StoryPeekTarget) => void>();
    renderScreen(
      fakeClient({}).client,
      <StoryPeekContext value={peek}>
        <StoryTile story={toStorySummary(storyRow(3))} locale="vi" />
      </StoryPeekContext>,
    );
    fireEvent.contextMenu(screen.getByRole("link", { name: /Truyện 3/ }));
    expect(peek).toHaveBeenCalledWith(
      expect.objectContaining({ id: uuid(3), card: expect.objectContaining({ title: "Truyện 3" }) }),
    );
  });

  it("keeps the browser's own context menu where the app has no peek", () => {
    renderScreen(fakeClient({}).client, <StoryTile story={toStorySummary(storyRow(3))} locale="vi" />);
    expect(fireEvent.contextMenu(screen.getByRole("link", { name: /Truyện 3/ }))).toBe(true);
  });
});

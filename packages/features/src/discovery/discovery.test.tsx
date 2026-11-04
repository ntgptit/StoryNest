import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeCursor, encodeCursor } from "@storynest/utils";
import type { DataClient } from "../_shared/client.ts";
import { AuthProvider } from "../_shared/auth.tsx";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { testSession, withAuth } from "../_shared/test-auth.ts";
import { listCategories, listLatestStories } from "./api/discovery.api.ts";
import { categoryIdsFor, rootCategories, type Category } from "./model/categories.ts";
import { statusLabel, storyHref, toStoryCardData, toStorySummary, type StoryListRow } from "./model/story-card.ts";
import { DiscoverScreen } from "./index.ts";
import { discoveryText } from "./strings.ts";

afterEach(cleanup);

const CATEGORIES: Category[] = [
  { id: 1, slug: "lang-man", name: "Lãng mạn", parentId: null, sortOrder: 10 },
  { id: 2, slug: "gia-tuong", name: "Giả tưởng", parentId: null, sortOrder: 20 },
  { id: 3, slug: "lang-man-hoc-duong", name: "Lãng mạn học đường", parentId: 1, sortOrder: 11 },
];

const uuid = (n: number) => `5eed0000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const row = (n: number, overrides: Partial<StoryListRow> = {}): StoryListRow => ({
  id: uuid(n),
  slug: `truyen-${n}`,
  title: `Truyện ${n}`,
  synopsis: `Mô tả truyện ${n}`,
  cover_storage_key: null,
  status: "ongoing",
  is_mature: false,
  language_code: "vi",
  updated_at: `2026-11-04T00:00:0${n}.123456+00:00`,
  owner: { username: "demo_an", display_name: "An Nhiên" },
  category: { slug: "lang-man", name: "Lãng mạn" },
  stats: { reads: 1234, votes: 56, comments: 0, followers: 0 },
  story_tags: [{ tag: { slug: "tinh-yeu", display_name: "Tình yêu" } }],
  ...overrides,
});

type Call = [string, unknown[]];

/** Records the query-builder calls and answers with whatever `respond` returns for the finished query. */
function recorder(respond: (calls: Call[]) => { data: unknown; error: unknown }) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "neq", "in", "or", "order", "limit", "returns"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown) => resolve(respond(calls));
  return { calls, builder };
}

function storiesClient(respond: (calls: Call[]) => { data: unknown; error: unknown }, categories = CATEGORIES) {
  const stories = recorder(respond);
  const cats = recorder(() => ({
    data: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      parent_id: c.parentId,
      sort_order: c.sortOrder,
    })),
    error: null,
  }));
  const client = {
    from: (table: string) => (table === "categories" ? cats.builder : stories.builder),
  } as unknown as DataClient;
  return { client, calls: stories.calls };
}

const names = (calls: Call[], method: string) => calls.filter(([m]) => m === method).map(([, args]) => args);

describe("listLatestStories", () => {
  it("lists only public, published-or-ongoing, non-deleted, non-mature stories, newest first, in one query", async () => {
    const { client, calls } = storiesClient(() => ({ data: [row(1)], error: null }));
    await listLatestStories(client, {});
    expect(names(calls, "eq")).toContainEqual(["visibility", "public"]);
    expect(names(calls, "eq")).toContainEqual(["is_mature", false]);
    expect(names(calls, "is")).toContainEqual(["deleted_at", null]);
    expect(names(calls, "neq")).toContainEqual(["status", "draft"]);
    expect(names(calls, "order")).toEqual([
      ["updated_at", { ascending: false }],
      ["id", { ascending: false }],
    ]);
    expect(calls.filter(([m]) => m === "select")).toHaveLength(1);
    // author, category, counters and tags come embedded, with the explicit relationship name PostgREST needs
    expect(String(names(calls, "select")[0]?.[0])).toContain("owner:app_users!stories_owner_id_fkey(");
  });

  it("asks for one extra row and reports a next cursor only when there is one", async () => {
    const twelve = Array.from({ length: 12 }, (_, i) => row(i + 1));
    const full = storiesClient(() => ({ data: [...twelve, row(13)], error: null }));
    const page = await listLatestStories(full.client, { pageSize: 12 });
    expect(names(full.calls, "limit")).toEqual([[13]]);
    expect(page.items).toHaveLength(12);
    expect(decodeCursor(page.nextCursor ?? "")).toEqual({ u: row(12).updated_at, i: row(12).id });

    const last = storiesClient(() => ({ data: twelve, error: null }));
    expect((await listLatestStories(last.client, { pageSize: 12 })).nextCursor).toBeNull();
  });

  it("continues strictly after the cursor using (updated_at, id) so equal timestamps are neither skipped nor repeated", async () => {
    const { client, calls } = storiesClient(() => ({ data: [], error: null }));
    const cursor = encodeCursor({ u: "2026-11-04T00:37:57.203797+00:00", i: uuid(5) });
    await listLatestStories(client, { cursor });
    const filter = String(names(calls, "or")[0]?.[0]);
    expect(filter).toBe(
      `updated_at.lt."2026-11-04T00:37:57.203797+00:00",and(updated_at.eq."2026-11-04T00:37:57.203797+00:00",id.lt.${uuid(5)})`,
    );
  });

  it("rejects a tampered cursor before querying", async () => {
    const { client, calls } = storiesClient(() => ({ data: [], error: null }));
    for (const cursor of [
      "garbage",
      encodeCursor({ u: "not a date", i: uuid(1) }),
      encodeCursor({ u: "2026-11-04T00:00:00Z", i: "x" }),
      encodeCursor({ u: 1 }),
    ]) {
      await expect(listLatestStories(client, { cursor })).rejects.toMatchObject({ kind: "invalid" });
    }
    expect(names(calls, "or")).toHaveLength(0);
  });

  it("filters by language, includes mature stories on request, and expands a root category to its children", async () => {
    const { client, calls } = storiesClient(() => ({ data: [], error: null }));
    await listLatestStories(client, {
      language: "vi",
      includeMature: true,
      categorySlug: "lang-man",
      categories: CATEGORIES,
    });
    expect(names(calls, "eq")).toContainEqual(["language_code", "vi"]);
    expect(names(calls, "eq")).not.toContainEqual(["is_mature", false]);
    expect(names(calls, "in")).toEqual([["category_id", [1, 3]]]);
  });

  it("an unknown category lists nothing instead of everything", async () => {
    const { client, calls } = storiesClient(() => ({ data: [row(1)], error: null }));
    await expect(listLatestStories(client, { categorySlug: "khong-co", categories: CATEGORIES })).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    expect(names(calls, "order")).toHaveLength(0);
  });

  it("turns database errors into AppError", async () => {
    const { client } = storiesClient(() => ({ data: null, error: { code: "42501", message: "denied" } }));
    await expect(listLatestStories(client, {})).rejects.toMatchObject({ name: "AppError", kind: "forbidden" });
  });
});

describe("listCategories and category helpers", () => {
  it("maps rows and orders roots", async () => {
    const { client } = storiesClient(() => ({ data: [], error: null }));
    expect(await listCategories(client)).toEqual(CATEGORIES);
    expect(rootCategories(CATEGORIES).map((c) => c.slug)).toEqual(["lang-man", "gia-tuong"]);
  });
  it("categoryIdsFor includes children and tolerates unknown slugs", () => {
    expect(categoryIdsFor("lang-man", CATEGORIES)).toEqual([1, 3]);
    expect(categoryIdsFor("gia-tuong", CATEGORIES)).toEqual([2]);
    expect(categoryIdsFor("lang-man-hoc-duong", CATEGORIES)).toEqual([3]);
    expect(categoryIdsFor("nope", CATEGORIES)).toEqual([]);
  });
});

describe("story mapping", () => {
  it("maps a row and tolerates missing relations", () => {
    const summary = toStorySummary(row(1));
    expect(summary).toMatchObject({
      title: "Truyện 1",
      author: { username: "demo_an", displayName: "An Nhiên" },
      tags: [{ slug: "tinh-yeu", name: "Tình yêu" }],
    });
    const sparse = toStorySummary(row(2, { owner: null, stats: null, category: null, story_tags: [{ tag: null }] }));
    expect(sparse.author.displayName).toBe(discoveryText.unknownAuthor);
    expect(sparse.stats).toEqual({ reads: 0, votes: 0, comments: 0, followers: 0 });
    expect(sparse.tags).toEqual([]);
    expect(sparse.category).toBeNull();
  });

  it("builds the canonical id-first URL and the card data", () => {
    const summary = toStorySummary(row(1, { is_mature: true, cover_storage_key: "covers/a.png" }));
    expect(storyHref(summary)).toBe(`/story/${uuid(1)}/truyen-1`);
    const card = toStoryCardData(summary, (key) => `https://cdn.test/${key}`);
    expect(card).toMatchObject({
      href: storyHref(summary),
      authorName: "An Nhiên",
      coverUrl: "https://cdn.test/covers/a.png",
      matureLabel: "18+",
      statusLabel: "Đang ra",
      reads: 1234,
    });
    expect(toStoryCardData(summary).coverUrl).toBeNull();
    expect(statusLabel("weird")).toBe("weird");
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
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

function renderScreen(client: DataClient, ui: ReactNode, signedIn = false) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(client, signedIn ? testSession() : null)}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>{ui}</PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

/** Four stories, served two per page: the second request is the one carrying the cursor filter. */
const pagedClient = () =>
  storiesClient((calls) => {
    const paged = calls.some(([m]) => m === "or");
    return { data: paged ? [row(3), row(4)] : [row(1), row(2), row(3)], error: null };
  });

describe("DiscoverScreen", () => {
  it("shows cards that link to the story, with category chips as links", async () => {
    const { client } = pagedClient();
    renderScreen(client, <DiscoverScreen pageSize={2} />);
    const first = await screen.findByText("Truyện 1");
    expect(first.closest("a")?.getAttribute("href")).toBe(`/story/${uuid(1)}/truyen-1`);
    expect(screen.getByText("Truyện 2")).toBeTruthy();
    expect(screen.queryByText("Truyện 3")).toBeNull(); // the extra row only signals "more pages"
    const nav = screen.getByRole("navigation", { name: discoveryText.categoriesLabel });
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe(discoveryText.allCategories);
    expect(screen.getByText("Giả tưởng").closest("a")?.getAttribute("href")).toBe("/?category=gia-tuong");
  });

  it("marks the active category and filters the query by it and its children", async () => {
    const { client, calls } = pagedClient();
    renderScreen(client, <DiscoverScreen categorySlug="lang-man" pageSize={2} />);
    await screen.findByText("Truyện 1");
    const nav = screen.getByRole("navigation", { name: discoveryText.categoriesLabel });
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe("Lãng mạn");
    expect(names(calls, "in")).toContainEqual(["category_id", [1, 3]]);
  });

  it("loads the next page on demand and then says the list is finished", async () => {
    const { client } = pagedClient();
    renderScreen(client, <DiscoverScreen pageSize={2} />);
    await screen.findByText("Truyện 1");
    fireEvent.click(screen.getByRole("button", { name: discoveryText.loadMore }));
    expect(await screen.findByText("Truyện 4")).toBeTruthy();
    // every story exactly once and in order: nothing repeated or skipped across the page boundary
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Truyện 1",
      "Truyện 2",
      "Truyện 3",
      "Truyện 4",
    ]);
    expect(await screen.findByText(discoveryText.endOfList)).toBeTruthy();
    expect(screen.queryByRole("button", { name: discoveryText.loadMore })).toBeNull();
  });

  it("shows an empty state", async () => {
    const { client } = storiesClient(() => ({ data: [], error: null }));
    renderScreen(client, <DiscoverScreen />);
    expect(await screen.findByText(discoveryText.empty.title)).toBeTruthy();
  });

  it("shows an error state and recovers on retry", async () => {
    let fail = true;
    const { client } = storiesClient(() =>
      fail ? { data: null, error: { code: "XX000", message: "boom" } } : { data: [row(1)], error: null },
    );
    renderScreen(client, <DiscoverScreen />);
    const alert = await screen.findByText(discoveryText.error.title);
    expect(alert).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: discoveryText.error.retry }));
    await waitFor(() => expect(screen.getByText("Truyện 1")).toBeTruthy());
  });
});

describe("server/client boundary", () => {
  it('queries.ts (called from a Server Component) must not be a "use client" module', () => {
    const source = readFileSync("src/discovery/queries.ts", "utf8");
    expect(source).not.toMatch(/^\s*["']use client["']/m);
    const hooks = readFileSync("src/discovery/hooks/use-latest-stories.ts", "utf8");
    expect(hooks).toMatch(/^"use client"/);
  });
});

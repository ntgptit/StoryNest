import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataClient } from "../_shared/client.ts";
import { AuthProvider } from "../_shared/auth.tsx";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { testSession, withAuth } from "../_shared/test-auth.ts";
import { listLatestStories, listPopularTags } from "./api/discovery.api.ts";
import { DiscoverScreen, discoveryKeys, homeHref } from "./index.ts";
import { toPopularTag } from "./model/popular-tags.ts";
import { discoveryText } from "./strings.ts";

afterEach(cleanup);

const t = discoveryText;
const uuid = (n: number) => `5eed0000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const storyRow = (n: number) => ({
  id: uuid(n),
  slug: `truyen-${n}`,
  title: `Truyện ${n}`,
  synopsis: "",
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
const CATEGORY_ROWS = [
  { id: 1, slug: "lang-man", name: "Lãng mạn", parent_id: null, sort_order: 10 },
  { id: 2, slug: "gia-tuong", name: "Giả tưởng", parent_id: null, sort_order: 20 },
];
const TAG_ROWS = [
  { tag_id: 1, slug: "tinh-yeu", display_name: "Tình yêu", stories_count: "5" },
  { tag_id: 2, slug: "phieu-luu", display_name: "Phiêu lưu", stories_count: 3 },
];

type Call = [string, unknown[]];

function builder(respond: () => { data: unknown; error: unknown }) {
  const calls: Call[] = [];
  const b: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "neq", "in", "or", "order", "limit", "returns"]) {
    b[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return b;
    };
  }
  b.then = (resolve: (value: unknown) => unknown) => resolve(respond());
  return { calls, b };
}

/** A client with stories, categories and the popular_tags RPC; every RPC call is recorded. */
function fakeClient(options: { stories?: unknown[]; popular?: { data: unknown; error: unknown } } = {}) {
  const stories = builder(() => ({ data: options.stories ?? [], error: null }));
  const cats = builder(() => ({ data: CATEGORY_ROWS, error: null }));
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const client = {
    from: (table: string) => (table === "categories" ? cats.b : stories.b),
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return { returns: () => Promise.resolve(options.popular ?? { data: TAG_ROWS, error: null }) };
    },
  } as unknown as DataClient;
  return { client, calls: stories.calls, rpcCalls };
}

const names = (calls: Call[], method: string) => calls.filter(([m]) => m === method).map(([, args]) => args);

describe("homeHref", () => {
  it("builds the home address with its filters", () => {
    expect(homeHref()).toBe("/");
    expect(homeHref({})).toBe("/");
    expect(homeHref({ categorySlug: "lang-man" })).toBe("/?category=lang-man");
    expect(homeHref({ tagSlug: "tinh-yeu" })).toBe("/?tag=tinh-yeu");
    expect(homeHref({ categorySlug: "lang-man", tagSlug: "tinh-yeu" })).toBe("/?category=lang-man&tag=tinh-yeu");
    expect(homeHref({ tagSlug: "a&b" })).toBe("/?tag=a%26b");
  });
});

describe("feed query keys", () => {
  it("differ by tag, so switching the tag never shows another filter's cached stories", () => {
    const all = discoveryKeys.latest({});
    expect(discoveryKeys.latest({ tagSlug: "tinh-yeu" })).not.toEqual(all);
    expect(discoveryKeys.latest({ tagSlug: "tinh-yeu" })).not.toEqual(discoveryKeys.latest({ tagSlug: "phieu-luu" }));
    expect(discoveryKeys.latest({ tagSlug: "tinh-yeu" })).toEqual(discoveryKeys.latest({ tagSlug: "tinh-yeu" }));
  });
});

describe("popular tags", () => {
  it("maps a row (the count may arrive as a string)", () => {
    expect(toPopularTag(TAG_ROWS[0]!)).toEqual({ slug: "tinh-yeu", name: "Tình yêu", storiesCount: 5 });
  });

  it("asks the database for that many tags", async () => {
    const { client, rpcCalls } = fakeClient();
    expect(await listPopularTags(client, 7)).toEqual([
      { slug: "tinh-yeu", name: "Tình yêu", storiesCount: 5 },
      { slug: "phieu-luu", name: "Phiêu lưu", storiesCount: 3 },
    ]);
    expect(rpcCalls).toEqual([{ name: "popular_tags", args: { p_limit: 7 } }]);
  });

  it("turns a database error into a thrown error", async () => {
    const { client } = fakeClient({ popular: { data: null, error: { code: "22023", message: "bad limit" } } });
    await expect(listPopularTags(client, 0)).rejects.toMatchObject({ message: "bad limit" });
  });
});

describe("listLatestStories with a tag", () => {
  it("joins the tag under its own alias and filters on its slug, keeping the card's tags embed intact", async () => {
    const { client, calls } = fakeClient({ stories: [storyRow(1)] });
    await listLatestStories(client, { tagSlug: "tinh-yeu" });
    const select = String(names(calls, "select")[0]?.[0]);
    expect(select).toContain("story_tags(tag:tags(slug, display_name))");
    expect(select).toContain("tagFilter:story_tags!inner(tag:tags!inner(slug))");
    expect(names(calls, "eq")).toContainEqual(["tagFilter.tag.slug", "tinh-yeu"]);
    expect(names(calls, "eq")).toContainEqual(["visibility", "public"]);
  });

  it("does not join or filter without a tag", async () => {
    const { client, calls } = fakeClient({ stories: [storyRow(1)] });
    await listLatestStories(client, {});
    expect(String(names(calls, "select")[0]?.[0])).not.toContain("tagFilter");
    expect(names(calls, "eq").some(([column]) => String(column).startsWith("tagFilter"))).toBe(false);
  });

  it("combines with a category", async () => {
    const { client, calls } = fakeClient({ stories: [storyRow(1)] });
    await listLatestStories(client, {
      tagSlug: "tinh-yeu",
      categorySlug: "lang-man",
      categories: [{ id: 1, slug: "lang-man", name: "Lãng mạn", parentId: null, sortOrder: 10 }],
    });
    expect(names(calls, "in")).toContainEqual(["category_id", [1]]);
    expect(names(calls, "eq")).toContainEqual(["tagFilter.tag.slug", "tinh-yeu"]);
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

describe("home shortcuts", () => {
  it("offers the ranking to everyone and the feed of followed authors only to a signed-in reader", async () => {
    const guest = fakeClient({ stories: [storyRow(1)] });
    renderScreen(guest.client, <DiscoverScreen />);
    const shortcuts = within(await screen.findByRole("navigation", { name: t.shortcutsLabel }));
    expect(shortcuts.getByRole("link", { name: t.seeRanking }).getAttribute("href")).toBe("/ranking");
    expect(shortcuts.queryByRole("link", { name: t.seeFollowing })).toBeNull();
    cleanup();

    renderScreen(fakeClient({ stories: [storyRow(1)] }).client, <DiscoverScreen />, true);
    const signedIn = within(await screen.findByRole("navigation", { name: t.shortcutsLabel }));
    await waitFor(() =>
      expect(signedIn.getByRole("link", { name: t.seeFollowing }).getAttribute("href")).toBe("/following"),
    );
    expect(signedIn.getByRole("link", { name: t.seeRanking })).toBeTruthy();
  });
});

describe("home feed tag filters", () => {
  it("shows the popular tags as links to the filtered feed", async () => {
    renderScreen(fakeClient({ stories: [storyRow(1)] }).client, <DiscoverScreen />);
    const nav = within(await screen.findByRole("navigation", { name: t.popularTagsLabel }));
    expect(nav.getByRole("link", { name: "#Tình yêu" }).getAttribute("href")).toBe("/?tag=tinh-yeu");
    expect(nav.getByRole("link", { name: "#Phiêu lưu" }).getAttribute("href")).toBe("/?tag=phieu-luu");
    expect(screen.queryByText(t.tagFilter.clear)).toBeNull();
  });

  it("keeps the category when choosing a tag, and the tag when choosing a category", async () => {
    renderScreen(
      fakeClient({ stories: [storyRow(1)] }).client,
      <DiscoverScreen categorySlug="lang-man" tagSlug="tinh-yeu" />,
    );
    const tags = within(await screen.findByRole("navigation", { name: t.popularTagsLabel }));
    expect(tags.getByRole("link", { name: "#Phiêu lưu" }).getAttribute("href")).toBe(
      "/?category=lang-man&tag=phieu-luu",
    );
    const categories = within(screen.getByRole("navigation", { name: t.categoriesLabel }));
    expect(categories.getByRole("link", { name: "Giả tưởng" }).getAttribute("href")).toBe(
      "/?category=gia-tuong&tag=tinh-yeu",
    );
    expect(categories.getByRole("link", { name: t.allCategories }).getAttribute("href")).toBe("/?tag=tinh-yeu");
  });

  it("marks the active tag, offers to remove it (keeping the category) and filters the query", async () => {
    const { client, calls } = fakeClient({ stories: [storyRow(1)] });
    renderScreen(client, <DiscoverScreen categorySlug="lang-man" tagSlug="tinh-yeu" />);
    expect(await screen.findByText(t.tagFilter.label("Tình yêu"))).toBeTruthy();
    expect(screen.getByRole("link", { name: t.tagFilter.clear }).getAttribute("href")).toBe("/?category=lang-man");
    const active = screen.getByRole("link", { name: "#Tình yêu" });
    expect(active.getAttribute("aria-current")).toBe("page");
    expect(active.getAttribute("href")).toBe("/?category=lang-man");
    expect(screen.getByRole("link", { name: "#Phiêu lưu" }).getAttribute("aria-current")).toBeNull();
    await waitFor(() => expect(names(calls, "eq")).toContainEqual(["tagFilter.tag.slug", "tinh-yeu"]));
  });

  it("names an active tag that is not among the popular ones by its slug", async () => {
    renderScreen(fakeClient({ stories: [storyRow(1)] }).client, <DiscoverScreen tagSlug="hiem-gap" />);
    expect(await screen.findByText(t.tagFilter.label("hiem-gap"))).toBeTruthy();
  });

  it("says so when no story has the tag, instead of listing everything", async () => {
    renderScreen(fakeClient({ stories: [] }).client, <DiscoverScreen tagSlug="hiem-gap" />);
    expect(await screen.findByText(t.emptyTag.title)).toBeTruthy();
    expect(screen.queryByText(t.empty.title)).toBeNull();
  });

  it("keeps the plain empty state when no tag is active", async () => {
    renderScreen(fakeClient({ stories: [] }).client, <DiscoverScreen />);
    expect(await screen.findByText(t.empty.title)).toBeTruthy();
  });

  it("shows no tag bar when there are no popular tags and no active tag", async () => {
    renderScreen(fakeClient({ stories: [storyRow(1)], popular: { data: [], error: null } }).client, <DiscoverScreen />);
    expect(await screen.findByText("Truyện 1")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: t.popularTagsLabel })).toBeNull();
    // and no empty wrapper either: it would still take a gap in the column
    expect(document.querySelectorAll("section > div:empty")).toHaveLength(0);
    expect(document.querySelector("section > div:not(:has(*))")).toBeNull();
  });

  it("still shows the feed when the popular tags fail to load", async () => {
    renderScreen(
      fakeClient({ stories: [storyRow(1)], popular: { data: null, error: { code: "500", message: "boom" } } }).client,
      <DiscoverScreen />,
    );
    expect(await screen.findByText("Truyện 1")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: t.popularTagsLabel })).toBeNull();
  });
});

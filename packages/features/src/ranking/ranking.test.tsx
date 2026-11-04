import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { orderByIds, type StoryListRow } from "../discovery/index.ts";
import { getRankingFreshness, listTopStories } from "./api/ranking.api.ts";
import { RankingScreen, periodFromParam, rankingHref, rankingKeys } from "./index.ts";
import {
  RANKING_MAX_OFFSET,
  RANKING_PAGE_SIZE,
  RANKING_PERIODS,
  nextRankingOffset,
  toFreshness,
  toRankedStories,
} from "./model/ranking.ts";
import { rankingText } from "./strings.ts";

afterEach(cleanup);

const t = rankingText;
const uuid = (n: number) => `5eed0000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const storyRow = (n: number): StoryListRow => ({
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
const rankRow = (n: number, position = n) => ({
  story_id: uuid(n),
  reads: String(100 - n),
  votes: n,
  score: 100 - n + 5 * n,
  rank_position: position,
});

type Result = { data: unknown; error: unknown };

function fakeClient(options: {
  top?: (args: Record<string, unknown>) => Result;
  stories?: StoryListRow[];
  freshness?: Result;
}) {
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const inQueries: string[][] = [];
  const rpc = (name: string, args: Record<string, unknown> = {}) => {
    rpcCalls.push({ name, args });
    const result =
      name === "top_stories"
        ? (options.top?.(args) ?? { data: [], error: null })
        : (options.freshness ?? { data: [], error: null });
    const promise = Promise.resolve(result);
    return Object.assign(promise, { returns: () => promise });
  };
  const from = () => {
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.in = (_c: string, ids: string[]) => {
      inQueries.push(ids);
      return b;
    };
    b.returns = () => Promise.resolve({ data: options.stories ?? [], error: null });
    return b;
  };
  return { client: { rpc, from } as unknown as DataClient, rpcCalls, inQueries };
}

describe("ranking model", () => {
  it("reads a period from the address and falls back to the week", () => {
    expect(periodFromParam("day")).toBe("day");
    expect(periodFromParam("month")).toBe("month");
    expect(periodFromParam("all")).toBe("all");
    expect(periodFromParam("week")).toBe("week");
    expect(periodFromParam("year")).toBe("week");
    expect(periodFromParam(undefined)).toBe("week");
    expect(periodFromParam(null)).toBe("week");
  });

  it("builds addresses, leaving the default period out", () => {
    expect(rankingHref()).toBe("/ranking");
    expect(rankingHref("week")).toBe("/ranking");
    expect(rankingHref("day")).toBe("/ranking?period=day");
    expect(rankingHref("all")).toBe("/ranking?period=all");
  });

  it("mirrors the database cap on paging", () => {
    expect(RANKING_MAX_OFFSET).toBe(200);
    expect(nextRankingOffset(0, false)).toBeNull();
    expect(nextRankingOffset(0, true)).toBe(RANKING_PAGE_SIZE);
    expect(nextRankingOffset(RANKING_MAX_OFFSET - RANKING_PAGE_SIZE, true)).toBe(RANKING_MAX_OFFSET);
    expect(nextRankingOffset(RANKING_MAX_OFFSET - RANKING_PAGE_SIZE + 1, true)).toBeNull();
    expect(nextRankingOffset(0, true, 5)).toBe(5);
  });

  it("maps freshness (numbers may arrive as strings)", () => {
    expect(
      toFreshness({ refreshed_at: "2026-11-04T00:00:00Z", lag_seconds: "12.5", duration_ms: "40", row_count: 7 }),
    ).toEqual({
      refreshedAt: "2026-11-04T00:00:00Z",
      lagSeconds: 12.5,
      refreshMs: 40,
      rows: 7,
    });
  });

  it("pairs ranked rows with their stories in rank order and drops a story that vanished", () => {
    const stories = new Map([
      [uuid(2), { id: uuid(2) } as never],
      [uuid(1), { id: uuid(1) } as never],
    ]);
    const ranked = toRankedStories([rankRow(1), rankRow(9, 2), rankRow(2, 3)], stories);
    expect(ranked.map((r) => [r.rank, r.story.id])).toEqual([
      [1, uuid(1)],
      [3, uuid(2)],
    ]);
    expect(ranked[0]).toMatchObject({ reads: 99, votes: 1, score: 104 });
  });

  it("orders rows by ids, shared with search", () => {
    expect(orderByIds(["a", "x", "b"], [{ id: "b" }, { id: "a" }])).toEqual([{ id: "a" }, { id: "b" }]);
  });
});

describe("ranking query keys", () => {
  it("differ by period, so each tab has its own cache", () => {
    const keys = RANKING_PERIODS.map((period) => JSON.stringify(rankingKeys.top(period)));
    expect(new Set(keys).size).toBe(RANKING_PERIODS.length);
  });
});

describe("ranking api", () => {
  it("asks for the period it was given, whichever it is", async () => {
    for (const period of RANKING_PERIODS) {
      const f = fakeClient({});
      await listTopStories(f.client, period);
      expect(f.rpcCalls[0]?.args.p_period).toBe(period);
    }
  });

  it("asks for one extra row, fetches the cards by id and keeps the rank order", async () => {
    const f = fakeClient({
      top: () => ({ data: [rankRow(3, 1), rankRow(1, 2), rankRow(2, 3)], error: null }),
      stories: [storyRow(1), storyRow(2), storyRow(3)],
    });
    const page = await listTopStories(f.client, "week", { pageSize: 2 });
    expect(f.rpcCalls).toEqual([
      { name: "top_stories", args: { p_period: "week", p_include_mature: false, p_limit: 3, p_offset: 0 } },
    ]);
    expect(f.inQueries).toEqual([[uuid(3), uuid(1)]]);
    expect(page.items.map((i) => [i.rank, i.story.id])).toEqual([
      [1, uuid(3)],
      [2, uuid(1)],
    ]);
    expect(page.nextOffset).toBe(2);
  });

  it("has no next page when the extra row is missing, and no second request for an empty ranking", async () => {
    const full = fakeClient({
      top: () => ({ data: [rankRow(1), rankRow(2)], error: null }),
      stories: [storyRow(1), storyRow(2)],
    });
    expect((await listTopStories(full.client, "day", { pageSize: 2 })).nextOffset).toBeNull();
    const none = fakeClient({});
    expect(await listTopStories(none.client, "day")).toEqual({ items: [], nextOffset: null });
    expect(none.inQueries).toEqual([]);
  });

  it("passes the offset and stops paging at the cap", async () => {
    const f = fakeClient({
      top: () => ({ data: [rankRow(1), rankRow(2), rankRow(3)], error: null }),
      stories: [storyRow(1)],
    });
    const page = await listTopStories(f.client, "all", { pageSize: 2, offset: RANKING_MAX_OFFSET - 1 });
    expect(f.rpcCalls[0]?.args.p_offset).toBe(RANKING_MAX_OFFSET - 1);
    expect(page.nextOffset).toBeNull();
  });

  it("throws what the database refuses with", async () => {
    const f = fakeClient({ top: () => ({ data: null, error: { code: "22023", message: "bad period" } }) });
    await expect(listTopStories(f.client, "week")).rejects.toMatchObject({ message: "bad period" });
  });

  it("reads the freshness, or null when there is no row yet", async () => {
    const f = fakeClient({
      freshness: {
        data: [{ refreshed_at: "2026-11-04T00:00:00Z", lag_seconds: 3, duration_ms: 10, row_count: 2 }],
        error: null,
      },
    });
    expect(await getRankingFreshness(f.client)).toMatchObject({ refreshedAt: "2026-11-04T00:00:00Z", lagSeconds: 3 });
    expect(await getRankingFreshness(fakeClient({}).client)).toBeNull();
  });
});

const replace = vi.fn();
const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn(), replace, back: vi.fn(), refresh: vi.fn(), pathname: "/ranking" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

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
  replace.mockClear();
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

describe("RankingScreen", () => {
  it("shows ranked cards with their place and what they earned in the period, linking to the story", async () => {
    const f = fakeClient({
      top: () => ({ data: [rankRow(2, 1), rankRow(1, 2)], error: null }),
      stories: [storyRow(1), storyRow(2)],
    });
    renderUi(f.client, <RankingScreen period="week" />);
    const link = (await screen.findByText("Truyện 2")).closest("a");
    expect(link?.getAttribute("href")).toBe(`/story/${uuid(2)}/truyen-2`);
    expect(screen.getByLabelText(t.rank(1)).textContent).toBe("1");
    expect(screen.getByLabelText(t.rank(2)).textContent).toBe("2");
    expect(screen.getByText(t.inPeriod("98", "2"))).toBeTruthy();
    // the page asks for the period it shows
    expect(f.rpcCalls.find((c) => c.name === "top_stories")?.args.p_period).toBe("week");
  });

  it("asks for the period it shows, and for the other one after the period changes", async () => {
    const f = fakeClient({ top: () => ({ data: [rankRow(1)], error: null }), stories: [storyRow(1)] });
    const view = (period: "day" | "month") => (
      <QueryClientProvider client={client}>
        <DataProvider client={f.client}>
          <PlatformProvider adapter={adapter}>
            <RankingScreen period={period} />
          </PlatformProvider>
        </DataProvider>
      </QueryClientProvider>
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(view("month"));
    await screen.findByText("Truyện 1");
    rerender(view("day"));
    await waitFor(() =>
      expect(f.rpcCalls.filter((c) => c.name === "top_stories").map((c) => c.args.p_period)).toEqual(["month", "day"]),
    );
  });

  it("puts the first story first", async () => {
    const f = fakeClient({
      top: () => ({ data: [rankRow(2, 1), rankRow(1, 2)], error: null }),
      stories: [storyRow(1), storyRow(2)],
    });
    renderUi(f.client, <RankingScreen period="day" />);
    await screen.findByText("Truyện 2");
    const order = screen.getAllByText(/^Truyện \d$/).map((el) => el.textContent);
    expect(order).toEqual(["Truyện 2", "Truyện 1"]);
  });

  it("changes the address when another period is chosen", async () => {
    renderUi(fakeClient({}).client, <RankingScreen period="week" />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: t.periods.month }));
    expect(replace).toHaveBeenCalledWith("/ranking?period=month");
    fireEvent.mouseDown(screen.getByRole("tab", { name: t.periods.all }));
    expect(replace).toHaveBeenLastCalledWith("/ranking?period=all");
  });

  it("marks the shown period as selected", () => {
    renderUi(fakeClient({}).client, <RankingScreen period="day" />);
    expect(screen.getByRole("tab", { name: t.periods.day }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: t.periods.week }).getAttribute("aria-selected")).toBe("false");
  });

  it("tells how old the numbers are, when it knows", async () => {
    const recent = new Date(Date.now() - 3 * 60_000).toISOString();
    const f = fakeClient({
      freshness: { data: [{ refreshed_at: recent, lag_seconds: 180, duration_ms: 10, row_count: 1 }], error: null },
    });
    renderUi(f.client, <RankingScreen period="week" />);
    expect(await screen.findByText(/^Cập nhật /)).toBeTruthy();
  });

  it("shows no freshness note when there is no refresh row", async () => {
    renderUi(fakeClient({}).client, <RankingScreen period="week" />);
    await screen.findByText(t.empty.title);
    expect(screen.queryByText(/^Cập nhật /)).toBeNull();
  });

  it("shows an empty state", async () => {
    renderUi(fakeClient({}).client, <RankingScreen period="week" />);
    expect(await screen.findByText(t.empty.title)).toBeTruthy();
  });

  it("shows an error with a retry that recovers", async () => {
    let fail = true;
    const f = fakeClient({
      top: () => (fail ? { data: null, error: { code: "500", message: "boom" } } : { data: [rankRow(1)], error: null }),
      stories: [storyRow(1)],
    });
    renderUi(f.client, <RankingScreen period="week" />);
    expect(await screen.findByText(t.error.title)).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: t.error.retry }));
    expect(await screen.findByText("Truyện 1")).toBeTruthy();
  });

  it("loads the next page with the next offset and continues the numbering", async () => {
    const many = Array.from({ length: RANKING_PAGE_SIZE + 1 }, (_, i) => rankRow(i + 1));
    const f = fakeClient({
      top: (args) => ({ data: args.p_offset === 0 ? many : [rankRow(40, RANKING_PAGE_SIZE + 1)], error: null }),
      stories: [...many.map((_, i) => storyRow(i + 1)), storyRow(40)],
    });
    renderUi(f.client, <RankingScreen period="all" />);
    fireEvent.click(await screen.findByRole("button", { name: t.loadMore }));
    await waitFor(() =>
      expect(f.rpcCalls.filter((c) => c.name === "top_stories").map((c) => c.args.p_offset)).toEqual([
        0,
        RANKING_PAGE_SIZE,
      ]),
    );
    expect(await screen.findByLabelText(t.rank(RANKING_PAGE_SIZE + 1))).toBeTruthy();
    expect(within(screen.getByLabelText(t.rank(1)).parentElement as HTMLElement).getByText(/^Truyện/)).toBeTruthy();
  });
});

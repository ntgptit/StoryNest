// Batch 4 (insights4): the model mappers and the RPC calls behind the custom range, cohorts, reader split, comment
// terms, read sources, ranking history, trending searches and the story length filter.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataClient } from "./_shared/client.ts";
import {
  getCommentTerms,
  getDailyRange,
  getReaderCohorts,
  getReaderSplit,
  getReadSources,
} from "./analytics/api/analytics.api.ts";
import {
  addDays,
  isValidRange,
  rangeBounds,
  rangeDays,
  toCohorts,
  toReadSources,
  toTermMonths,
} from "./analytics/model/insights.ts";
import { countLatestStories, getLengthHistogram } from "./discovery/api/discovery.api.ts";
import { homeHref } from "./discovery/model/home-href.ts";
import { bucketsToRange, parseWordsParam, rangeToBuckets, wordsParam } from "./discovery/model/story-length.ts";
import { recordChapterRead } from "./progress/api/progress.api.ts";
import { currentReadSource, markReadSource, READ_SOURCE_TTL_MS } from "./progress/model/read-source.ts";
import { getRankingHistory } from "./ranking/api/ranking.api.ts";
import { rankMoves, toHistoryDays } from "./ranking/model/history.ts";
import { getTrendingSearches, logSearch } from "./search/api/search.api.ts";
import { toTrendingSearches } from "./search/model/trending.ts";

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

const rpcClient = (data: unknown) => {
  const rpc = vi.fn(() => {
    const result = Promise.resolve({ data, error: null });
    return Object.assign(result, { returns: () => result });
  });
  return { client: { rpc } as unknown as DataClient, rpc };
};

describe("custom range", () => {
  it("is bounded to the last 90 UTC days", () => {
    expect(rangeBounds("2026-11-05")).toEqual({ min: "2026-08-08", max: "2026-11-05" });
    expect(isValidRange({ from: "2026-08-08", to: "2026-11-05" }, "2026-11-05")).toBe(true);
    expect(isValidRange({ from: "2026-08-07", to: "2026-11-05" }, "2026-11-05")).toBe(false);
    expect(isValidRange({ from: "2026-11-05", to: "2026-11-06" }, "2026-11-05")).toBe(false);
    expect(isValidRange({ from: "2026-11-04", to: "2026-11-03" }, "2026-11-05")).toBe(false);
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(rangeDays({ from: "2026-11-01", to: "2026-11-05" })).toBe(5);
  });

  it("calls author_story_daily_range with the two days", async () => {
    const { client, rpc } = rpcClient([{ day: "2026-11-01", reads: "3", votes: 0, comments: 1 }]);
    expect(await getDailyRange(client, "s1", { from: "2026-11-01", to: "2026-11-01" })).toEqual([
      { day: "2026-11-01", reads: 3, votes: 0, comments: 1 },
    ]);
    expect(rpc).toHaveBeenCalledWith("author_story_daily_range", {
      p_story_id: "s1",
      p_from: "2026-11-01",
      p_to: "2026-11-01",
    });
  });
});

describe("cohorts", () => {
  it("turns cells into shares and keeps hidden cohorts hidden", async () => {
    const rows = [
      { cohort_week: "2026-10-26", cohort_size: "8", week_offset: 0, active_readers: "8", suppressed: false },
      { cohort_week: "2026-10-26", cohort_size: "8", week_offset: 1, active_readers: "2", suppressed: false },
      { cohort_week: "2026-11-02", cohort_size: null, week_offset: 0, active_readers: null, suppressed: true },
      { cohort_week: "2026-10-19", cohort_size: 0, week_offset: 0, active_readers: 0, suppressed: false },
    ];
    const cohorts = toCohorts(rows);
    expect(cohorts.map((c) => c.week)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02"]);
    expect(cohorts[1]?.shares).toEqual([1, 0.25]);
    expect(cohorts[2]).toMatchObject({ suppressed: true, size: null, shares: [null] });
    expect(cohorts[0]?.shares).toEqual([null]);
    const { client, rpc } = rpcClient(rows);
    await getReaderCohorts(client, "s1", 8);
    expect(rpc).toHaveBeenCalledWith("author_reader_cohorts", { p_story_id: "s1", p_weeks: 8 });
  });
});

describe("reader split, terms and sources", () => {
  it("maps the split (zeros when there is no row)", async () => {
    const { client, rpc } = rpcClient([
      { signed_in_reads: "6", anonymous_reads: 11, signed_in_readers: 2, anonymous_readers: "9" },
    ]);
    expect(await getReaderSplit(client, "s1", 30)).toEqual({
      signedInReads: 6,
      anonymousReads: 11,
      signedInReaders: 2,
      anonymousReaders: 9,
    });
    expect(rpc).toHaveBeenCalledWith("author_reader_split", { p_story_id: "s1", p_days: 30 });
    expect(await getReaderSplit(rpcClient([]).client, "s1", 7)).toMatchObject({ signedInReads: 0 });
  });

  it("lists every month of the window, terms in rank order", async () => {
    const months = toTermMonths(
      [
        { month: "2026-11-01", term: "hay", mentions: 2, commenters: 2, rank_position: 2 },
        { month: "2026-11-01", term: "plot", mentions: "3", commenters: 3, rank_position: 1 },
      ],
      3,
      "2026-11-05",
    );
    expect(months.map((m) => m.month)).toEqual(["2026-09-01", "2026-10-01", "2026-11-01"]);
    expect(months[2]?.terms.map((t) => t.term)).toEqual(["plot", "hay"]);
    const { client, rpc } = rpcClient([]);
    await getCommentTerms(client, "s1", 3);
    expect(rpc).toHaveBeenCalledWith("author_comment_terms", { p_story_id: "s1", p_months: 3, p_limit: 24 });
  });

  it("splits sources into shown and hidden, ignoring unknown words", async () => {
    const result = toReadSources([
      { source: "discover", readers: 5, continued: 1, followed: 0, suppressed: false },
      { source: "search", readers: "9", continued: 4, followed: 1, suppressed: false },
      { source: "notification", readers: null, continued: null, followed: null, suppressed: true },
      { source: "facebook", readers: 50, continued: 0, followed: 0, suppressed: false },
    ]);
    expect(result.shown.map((s) => s.source)).toEqual(["search", "discover"]);
    expect(result.hidden).toBe(1);
    const { client, rpc } = rpcClient([]);
    await getReadSources(client, "s1", 30);
    expect(rpc).toHaveBeenCalledWith("author_read_sources", { p_story_id: "s1", p_days: 30 });
  });
});

describe("read sources on the client", () => {
  it("marks, expires and ignores junk", () => {
    expect(currentReadSource()).toBeUndefined();
    markReadSource("search", 1_000);
    expect(currentReadSource(1_000 + 60_000)).toBe("search");
    expect(currentReadSource(1_000 + READ_SOURCE_TTL_MS + 1)).toBeUndefined();
    window.sessionStorage.setItem("storynest.readSource", JSON.stringify({ source: "https://x", at: 1_000 }));
    expect(currentReadSource(2_000)).toBeUndefined();
    window.sessionStorage.setItem("storynest.readSource", "{oops");
    markReadSource("ranking", 5_000);
    expect(currentReadSource(6_000)).toBe("ranking");
  });

  it("sends the source only when there is one", async () => {
    const { client, rpc } = rpcClient(true);
    await recordChapterRead(client, "c1", null, "discover");
    await recordChapterRead(client, "c1", "anon");
    expect(rpc).toHaveBeenNthCalledWith(1, "record_chapter_read", { p_chapter_id: "c1", p_source: "discover" });
    expect(rpc).toHaveBeenNthCalledWith(2, "record_chapter_read", { p_chapter_id: "c1", p_anon_id: "anon" });
  });
});

describe("ranking history", () => {
  const rows = [
    { day: "2026-11-05", story_id: "b", rank_position: 1, score: "7", reads: 3, votes: 0 },
    { day: "2026-11-04", story_id: "a", rank_position: 1, score: 5, reads: 5, votes: 0 },
    { day: "2026-11-04", story_id: "b", rank_position: 2, score: 3, reads: 3, votes: 0 },
    { day: "2026-11-05", story_id: "a", rank_position: 2, score: 5, reads: 5, votes: 0 },
    { day: "2026-11-05", story_id: "c", rank_position: 3, score: 1, reads: 1, votes: 0 },
  ];

  it("groups by day, oldest first, and compares the last day with the first", () => {
    const days = toHistoryDays(rows);
    expect(days.map((d) => d.day)).toEqual(["2026-11-04", "2026-11-05"]);
    expect(rankMoves(days)).toEqual([
      { storyId: "b", from: { rank: 2, score: 3 }, to: { rank: 1, score: 7 } },
      { storyId: "a", from: { rank: 1, score: 5 }, to: { rank: 2, score: 5 } },
      { storyId: "c", from: null, to: { rank: 3, score: 1 } },
    ]);
    expect(rankMoves(days.slice(0, 1))).toEqual([]);
  });

  it("asks for a week of the period and fetches the titles", async () => {
    const { client, rpc } = rpcClient(rows);
    const inSpy = vi.fn(async () => ({ data: [{ id: "a", title: "A" }], error: null }));
    const from = vi.fn(() => ({ select: () => ({ in: inSpy }) }));
    Object.assign(client, { from });
    const history = await getRankingHistory(client, "week", false);
    expect(rpc).toHaveBeenCalledWith("ranking_history", {
      p_period: "week",
      p_days: 7,
      p_include_mature: false,
      p_limit: 10,
    });
    expect(inSpy).toHaveBeenCalledWith("id", ["a", "b", "c"]);
    expect(history.titles).toEqual({ a: "A" });
  });
});

describe("trending searches", () => {
  it("maps ranks and treats no previous rank as new", async () => {
    expect(
      toTrendingSearches([
        { term: "lua", searchers: "4", rank_position: 2, previous_rank: 1, rank_change: -1 },
        { term: "rong lua", searchers: 10, rank_position: 1, previous_rank: null, rank_change: null },
      ]),
    ).toEqual([
      { term: "rong lua", rank: 1, searchers: 10, change: null },
      { term: "lua", rank: 2, searchers: 4, change: -1 },
    ]);
    const { client, rpc } = rpcClient([]);
    await getTrendingSearches(client);
    expect(rpc).toHaveBeenCalledWith("trending_searches", { p_limit: 10 });
  });

  it("logs a search with the anonymous id only for guests", async () => {
    const { client, rpc } = rpcClient(true);
    expect(await logSearch(client, "rong lua", null)).toBe(true);
    await logSearch(client, "rong lua", "anon");
    expect(rpc).toHaveBeenNthCalledWith(1, "log_search", { p_query: "rong lua" });
    expect(rpc).toHaveBeenNthCalledWith(2, "log_search", { p_query: "rong lua", p_anon_id: "anon" });
  });
});

describe("story length filter", () => {
  it("round-trips the address parameter and accepts only bucket edges", () => {
    expect(parseWordsParam("2000-30000")).toEqual({ min: 2000, max: 30000 });
    expect(parseWordsParam("100000-")).toEqual({ min: 100000, max: null });
    expect(parseWordsParam("0-")).toBeUndefined();
    expect(parseWordsParam("1234-30000")).toBeUndefined();
    expect(parseWordsParam("30000-2000")).toBeUndefined();
    expect(parseWordsParam("x")).toBeUndefined();
    expect(wordsParam({ min: 2000, max: null })).toBe("2000-");
    expect(homeHref({ tagSlug: "t", words: { min: 0, max: 10000 } })).toBe("/?tag=t&words=0-10000");
  });

  it("maps between bucket indexes and word ranges", () => {
    expect(bucketsToRange(0, 7)).toBeNull();
    expect(bucketsToRange(1, 2)).toEqual({ min: 2000, max: 30000 });
    expect(bucketsToRange(6, 7)).toEqual({ min: 200000, max: null });
    expect(rangeToBuckets({ min: 2000, max: 30000 })).toEqual([1, 2]);
    expect(rangeToBuckets(undefined)).toEqual([0, 7]);
    expect(rangeToBuckets({ min: 200000, max: null })).toEqual([6, 7]);
  });

  it("filters the feed count through story_stats and asks the histogram for the other filters", async () => {
    const calls: [string, ...unknown[]][] = [];
    const query: Record<string, unknown> = {};
    for (const name of ["select", "eq", "is", "neq", "in", "gte", "lt", "or", "order", "limit"]) {
      query[name] = (...args: unknown[]) => {
        calls.push([name, ...args]);
        return query;
      };
    }
    Object.assign(query, { then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null, count: 4 }) });
    const client = { from: () => query } as unknown as DataClient;
    expect(await countLatestStories(client, { words: { min: 2000, max: 30000 } })).toBe(4);
    expect(String(calls.find((c) => c[0] === "select")?.[1])).toContain("lengthFilter:story_stats!inner(word_count)");
    expect(calls).toContainEqual(["gte", "lengthFilter.word_count", 2000]);
    expect(calls).toContainEqual(["lt", "lengthFilter.word_count", 30000]);

    const { client: rpcOnly, rpc } = rpcClient([
      { bucket: 2, min_words: 2000, max_words: 10000, stories: "3" },
      { bucket: 1, min_words: 0, max_words: 2000, stories: 1 },
      { bucket: 8, min_words: 400000, max_words: null, stories: 0 },
    ]);
    expect(await getLengthHistogram(rpcOnly, { tagSlug: "t", includeMature: true })).toEqual([
      { minWords: 0, maxWords: 2000, stories: 1 },
      { minWords: 2000, maxWords: 10000, stories: 3 },
      { minWords: 400000, maxWords: null, stories: 0 },
    ]);
    expect(rpc).toHaveBeenCalledWith("story_length_histogram", { p_include_mature: true, p_tag_slug: "t" });
  });
});

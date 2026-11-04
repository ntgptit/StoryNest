import type { StorySummary } from "../../discovery/index.ts";

export const RANKING_PERIODS = ["day", "week", "month", "all"] as const;
export type RankingPeriod = (typeof RANKING_PERIODS)[number];
export const DEFAULT_RANKING_PERIOD: RankingPeriod = "week";

export const RANKING_PAGE_SIZE = 12;
/** Last offset the database accepts (top_stories): deep paging of a ranking is capped. */
export const RANKING_MAX_OFFSET = 200;

export function periodFromParam(value: string | null | undefined): RankingPeriod {
  return RANKING_PERIODS.find((period) => period === value) ?? DEFAULT_RANKING_PERIOD;
}

/** Address of the ranking page; the period lives in the URL (the default week is left out). */
export function rankingHref(period: RankingPeriod = DEFAULT_RANKING_PERIOD): string {
  return period === DEFAULT_RANKING_PERIOD ? "/ranking" : `/ranking?period=${period}`;
}

/** Offset of the page after this one, or null when the last page was short or the database's cap is reached. */
export function nextRankingOffset(
  offset: number,
  hasMore: boolean,
  pageSize: number = RANKING_PAGE_SIZE,
): number | null {
  if (!hasMore) return null;
  const next = offset + pageSize;
  return next <= RANKING_MAX_OFFSET ? next : null;
}

export interface RankingRow {
  story_id: string;
  reads: number | string;
  votes: number | string;
  score: number | string;
  rank_position: number | string;
}

export interface FreshnessRow {
  refreshed_at: string;
  lag_seconds: number | string;
  duration_ms: number | string;
  row_count: number | string;
}

/** One line of the ranking: the story with its place and the reads and votes it earned inside the period. */
export interface RankedStory {
  rank: number;
  reads: number;
  votes: number;
  score: number;
  story: StorySummary;
}

export interface RankingFreshness {
  /** When the snapshot behind the ranking was taken. */
  refreshedAt: string;
  lagSeconds: number;
  refreshMs: number;
  rows: number;
}

export function toFreshness(row: FreshnessRow): RankingFreshness {
  return {
    refreshedAt: row.refreshed_at,
    lagSeconds: Number(row.lag_seconds),
    refreshMs: Number(row.duration_ms),
    rows: Number(row.row_count),
  };
}

/** Pairs the ranked rows with their stories (in rank order); a story hidden between the two requests is dropped. */
export function toRankedStories(
  rows: readonly RankingRow[],
  stories: ReadonlyMap<string, StorySummary>,
): RankedStory[] {
  return rows.flatMap((row) => {
    const story = stories.get(row.story_id);
    return story
      ? [
          {
            rank: Number(row.rank_position),
            reads: Number(row.reads),
            votes: Number(row.votes),
            score: Number(row.score),
            story,
          },
        ]
      : [];
  });
}

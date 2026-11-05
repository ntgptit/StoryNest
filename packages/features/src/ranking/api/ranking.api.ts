import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import { STORY_COLUMNS, toStorySummary, type StoryListRow, type StorySummary } from "../../discovery/index.ts";
import {
  RANKING_PAGE_SIZE,
  nextRankingOffset,
  toFreshness,
  toRankedStories,
  type FreshnessRow,
  type RankedStory,
  type RankingFreshness,
  type RankingPeriod,
  type RankingRow,
} from "../model/ranking.ts";
import { HISTORY_DAYS, HISTORY_STORIES, toHistoryDays, type HistoryDay, type HistoryRow } from "../model/history.ts";

export interface RankingPage {
  items: RankedStory[];
  /** Offset of the next page, or null when there is none. */
  nextOffset: number | null;
}

/**
 * One page of the ranking for a period. Two requests on purpose: top_stories ranks and applies the discovery rules,
 * then the same card query the home feed uses fetches the stories. One extra row is asked for to know whether another
 * page exists without a count.
 */
export async function listTopStories(
  client: DataClient,
  period: RankingPeriod,
  options: { offset?: number; pageSize?: number; includeMature?: boolean } = {},
): Promise<RankingPage> {
  const offset = options.offset ?? 0;
  const pageSize = options.pageSize ?? RANKING_PAGE_SIZE;
  const rows =
    unwrap(
      await client
        .rpc("top_stories", {
          p_period: period,
          p_include_mature: options.includeMature ?? false,
          p_limit: pageSize + 1,
          p_offset: offset,
        })
        .returns<RankingRow[]>(),
    ) ?? [];
  const hasMore = rows.length > pageSize;
  const page = rows.slice(0, pageSize);
  if (page.length === 0) return { items: [], nextOffset: null };

  const stories =
    unwrap(
      await client
        .from("stories")
        .select(STORY_COLUMNS)
        .in(
          "id",
          page.map((row) => row.story_id),
        )
        .returns<StoryListRow[]>(),
    ) ?? [];
  const byId = new Map<string, StorySummary>(stories.map((row) => [row.id, toStorySummary(row)]));
  return { items: toRankedStories(page, byId), nextOffset: nextRankingOffset(offset, hasMore, pageSize) };
}

/** How old the numbers of the ranking are (the ranking is refreshed by a job, so it trails by a few minutes). */
export async function getRankingFreshness(client: DataClient): Promise<RankingFreshness | null> {
  const rows = unwrap(await client.rpc("ranking_freshness").returns<FreshnessRow[]>()) ?? [];
  const row = rows[0];
  return row ? toFreshness(row) : null;
}

export interface RankingHistory {
  days: HistoryDay[];
  /** Titles of the stories in the history, by id (a story the reader may no longer see is simply missing). */
  titles: Record<string, string>;
}

/** The daily snapshots of a period's ranking over the last week, with the stories' titles. */
export async function getRankingHistory(
  client: DataClient,
  period: RankingPeriod,
  includeMature: boolean,
): Promise<RankingHistory> {
  const rows =
    unwrap(
      await client
        .rpc("ranking_history", {
          p_period: period,
          p_days: HISTORY_DAYS,
          p_include_mature: includeMature,
          p_limit: HISTORY_STORIES,
        })
        .returns<HistoryRow[]>(),
    ) ?? [];
  const days = toHistoryDays(rows);
  const ids = [...new Set(days.flatMap((day) => day.entries.map((entry) => entry.storyId)))];
  if (ids.length === 0) return { days, titles: {} };
  const stories = unwrap(await client.from("stories").select("id, title").in("id", ids)) ?? [];
  return { days, titles: Object.fromEntries(stories.map((story) => [story.id, story.title])) };
}

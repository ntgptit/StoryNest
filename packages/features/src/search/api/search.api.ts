import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import {
  STORY_COLUMNS,
  orderByIds,
  toStorySummary,
  type StoryListRow,
  type StorySummary,
} from "../../discovery/index.ts";
import {
  SEARCH_PAGE_SIZE,
  TAG_RESULT_LIMIT,
  nextOffset,
  toAuthorHit,
  toTagHit,
  type AuthorHit,
  type AuthorRow,
  type ScoreRow,
  type TagHit,
  type TagRow,
} from "../model/search.ts";
import { TRENDING_LIMIT, toTrendingSearches, type TrendingRow, type TrendingSearch } from "../model/trending.ts";

export interface OffsetPage<T> {
  items: T[];
  /** Offset of the next page, or null when there is none. */
  nextOffset: number | null;
  /** True when more results exist but the database's paging cap stops the list here. */
  capped: boolean;
}

/**
 * One page of stories whose title matches `term` (diacritics and case ignored), best match first.
 * Two requests on purpose: the RPC ranks and applies the discovery rules, then the same card query the home feed uses
 * (STORY_COLUMNS) fetches the stories, so a search result is exactly a home-feed card. One extra row is asked for to
 * know whether another page exists without a count.
 */
export async function searchStories(
  client: DataClient,
  term: string,
  options: { offset?: number; pageSize?: number; includeMature?: boolean } = {},
): Promise<OffsetPage<StorySummary>> {
  const offset = options.offset ?? 0;
  const pageSize = options.pageSize ?? SEARCH_PAGE_SIZE;
  const scored =
    unwrap(
      await client
        .rpc("search_stories", {
          p_query: term,
          p_include_mature: options.includeMature ?? false,
          p_limit: pageSize + 1,
          p_offset: offset,
        })
        .returns<ScoreRow[]>(),
    ) ?? [];
  const hasMore = scored.length > pageSize;
  const ids = scored.slice(0, pageSize).map((row) => row.story_id);
  if (ids.length === 0) return { items: [], nextOffset: null, capped: false };

  const rows = unwrap(await client.from("stories").select(STORY_COLUMNS).in("id", ids).returns<StoryListRow[]>()) ?? [];
  const next = nextOffset(offset, hasMore, pageSize);
  return {
    items: orderByIds(ids, rows).map(toStorySummary),
    nextOffset: next,
    capped: hasMore && next === null,
  };
}

/** Authors (with at least one public story) whose name or username matches `term`. */
export async function searchAuthors(
  client: DataClient,
  term: string,
  options: { offset?: number; pageSize?: number; includeMature?: boolean } = {},
): Promise<OffsetPage<AuthorHit>> {
  const offset = options.offset ?? 0;
  const pageSize = options.pageSize ?? SEARCH_PAGE_SIZE;
  const rows =
    unwrap(
      await client
        .rpc("search_authors", {
          p_query: term,
          p_include_mature: options.includeMature ?? false,
          p_limit: pageSize + 1,
          p_offset: offset,
        })
        .returns<AuthorRow[]>(),
    ) ?? [];
  const hasMore = rows.length > pageSize;
  const next = nextOffset(offset, hasMore, pageSize);
  return { items: rows.slice(0, pageSize).map(toAuthorHit), nextOffset: next, capped: hasMore && next === null };
}

/** Tags that name `term` and are used by at least one public story. Short list, no paging. */
export async function searchTags(client: DataClient, term: string, limit = TAG_RESULT_LIMIT): Promise<TagHit[]> {
  const rows = unwrap(await client.rpc("search_tags", { p_query: term, p_limit: limit }).returns<TagRow[]>()) ?? [];
  return rows.map(toTagHit);
}

/** The most searched terms of the last 7 days, with how many places each moved since the week before. */
export async function getTrendingSearches(
  client: DataClient,
  limit: number = TRENDING_LIMIT,
): Promise<TrendingSearch[]> {
  const rows = unwrap(await client.rpc("trending_searches", { p_limit: limit }).returns<TrendingRow[]>()) ?? [];
  return toTrendingSearches(rows);
}

/**
 * Counts a search of `term` toward the trend: by account when signed in, else by the browser's anonymous id. The
 * server keeps no searcher (only a daily count per term), counts one search per searcher, term and day, ignores terms
 * that find nothing public, and rate limits. Resolves to whether it was counted.
 */
export async function logSearch(client: DataClient, term: string, anonymousId: string | null): Promise<boolean> {
  const counted = unwrap(
    await client.rpc("log_search", { p_query: term, ...(anonymousId ? { p_anon_id: anonymousId } : {}) }),
  );
  return counted === true;
}

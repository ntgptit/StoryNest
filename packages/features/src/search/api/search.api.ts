import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import { STORY_COLUMNS, toStorySummary, type StoryListRow, type StorySummary } from "../../discovery/index.ts";
import {
  SEARCH_PAGE_SIZE,
  TAG_RESULT_LIMIT,
  nextOffset,
  orderByIds,
  toAuthorHit,
  toTagHit,
  type AuthorHit,
  type AuthorRow,
  type ScoreRow,
  type TagHit,
  type TagRow,
} from "../model/search.ts";

export interface OffsetPage<T> {
  items: T[];
  /** Offset of the next page, or null when there is none. */
  nextOffset: number | null;
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
  if (ids.length === 0) return { items: [], nextOffset: null };

  const rows = unwrap(await client.from("stories").select(STORY_COLUMNS).in("id", ids).returns<StoryListRow[]>()) ?? [];
  return { items: orderByIds(ids, rows).map(toStorySummary), nextOffset: nextOffset(offset, hasMore, pageSize) };
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
  return {
    items: rows.slice(0, pageSize).map(toAuthorHit),
    nextOffset: nextOffset(offset, rows.length > pageSize, pageSize),
  };
}

/** Tags that name `term` and are used by at least one public story. Short list, no paging. */
export async function searchTags(client: DataClient, term: string, limit = TAG_RESULT_LIMIT): Promise<TagHit[]> {
  const rows = unwrap(await client.rpc("search_tags", { p_query: term, p_limit: limit }).returns<TagRow[]>()) ?? [];
  return rows.map(toTagHit);
}

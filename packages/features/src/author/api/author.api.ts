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
  FOLLOWED_PAGE_SIZE,
  followedCursorAfter,
  toAuthorProfile,
  type AuthorProfile,
  type AuthorProfileRow,
  type FollowedCursor,
  type FollowedRow,
} from "../model/author.ts";

/** The author page's data for a username (as the viewer sees it), or null when there is no such visible author. */
export async function getAuthorProfile(client: DataClient, username: string): Promise<AuthorProfile | null> {
  const rows = unwrap(await client.rpc("author_profile", { p_username: username }).returns<AuthorProfileRow[]>()) ?? [];
  const row = rows[0];
  return row ? toAuthorProfile(row) : null;
}

/** Follows or unfollows an author (idempotent). Resolves to the author's follower count after the change. */
export async function setUserFollow(client: DataClient, userId: string, followed: boolean): Promise<number> {
  return Number(unwrap(await client.rpc("set_user_follow", { p_user_id: userId, p_followed: followed })) ?? 0);
}

export interface FollowedPage {
  items: StorySummary[];
  /** Where the next page starts, or null when there is none. */
  nextCursor: FollowedCursor | null;
}

/**
 * Stories of the authors the viewer follows, newest update first. Two requests on purpose: the RPC finds the stories
 * (and applies the discovery rules), the same card query the home feed uses fetches them. One extra row is asked for
 * to know whether another page exists without a count.
 */
export async function listFollowedStories(
  client: DataClient,
  options: { cursor?: FollowedCursor | null; pageSize?: number; includeMature?: boolean } = {},
): Promise<FollowedPage> {
  const pageSize = options.pageSize ?? FOLLOWED_PAGE_SIZE;
  const rows =
    unwrap(
      await client
        .rpc("list_followed_stories", {
          p_include_mature: options.includeMature ?? false,
          ...(options.cursor ? { p_cursor_at: options.cursor.at, p_cursor_id: options.cursor.id } : {}),
          p_limit: pageSize + 1,
        })
        .returns<FollowedRow[]>(),
    ) ?? [];
  const hasMore = rows.length > pageSize;
  const page = rows.slice(0, pageSize);
  if (page.length === 0) return { items: [], nextCursor: null };

  const ids = page.map((row) => row.story_id);
  const stories =
    unwrap(await client.from("stories").select(STORY_COLUMNS).in("id", ids).returns<StoryListRow[]>()) ?? [];
  return { items: orderByIds(ids, stories).map(toStorySummary), nextCursor: followedCursorAfter(page, hasMore) };
}

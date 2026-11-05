import type { CommentReaction } from "@storynest/validation";
import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import {
  COMMENTS_PAGE_SIZE,
  toPage,
  type CommentCardRow,
  type CommentCursor,
  type CommentPage,
  readReactions,
} from "../model/comment.ts";
import { MENTION_SUGGESTIONS, likePrefix, type MentionSuggestion } from "../model/mention.ts";

/**
 * One page of top-level comments of a chapter (`blockId` null) or of one paragraph. The server is asked for one row
 * more than a page so the answer also says whether another page exists.
 */
export async function listComments(
  client: DataClient,
  input: { chapterId: string; blockId: string | null; newestFirst: boolean; cursor?: CommentCursor | undefined },
): Promise<CommentPage> {
  const rows = unwrap(
    await client.rpc("list_comments", {
      p_chapter_id: input.chapterId,
      ...(input.blockId === null ? {} : { p_block_id: input.blockId }),
      p_newest_first: input.newestFirst,
      ...(input.cursor ? { p_cursor_at: input.cursor.createdAt, p_cursor_id: input.cursor.id } : {}),
      p_limit: COMMENTS_PAGE_SIZE + 1,
    }),
  );
  return toPage((rows ?? []) as CommentCardRow[]);
}

export async function listReplies(
  client: DataClient,
  input: { parentId: string; cursor?: CommentCursor | undefined },
): Promise<CommentPage> {
  const rows = unwrap(
    await client.rpc("list_replies", {
      p_parent_id: input.parentId,
      ...(input.cursor ? { p_cursor_at: input.cursor.createdAt, p_cursor_id: input.cursor.id } : {}),
      p_limit: COMMENTS_PAGE_SIZE + 1,
    }),
  );
  return toPage((rows ?? []) as CommentCardRow[]);
}

/** Comment count of every paragraph that has any (replies included), for the margin buttons. */
export async function getBlockCommentCounts(client: DataClient, chapterId: string): Promise<Record<string, number>> {
  const rows = unwrap(await client.rpc("comment_counts_by_block", { p_chapter_id: chapterId })) ?? [];
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (row.block_id) counts[row.block_id] = Number(row.comment_count);
  }
  return counts;
}

/** Posts a comment (or a reply). Sending the same `id` again is harmless, so a retry cannot post twice. */
export async function postComment(
  client: DataClient,
  input: { id: string; chapterId: string; blockId: string | null; parentId: string | null; body: string },
): Promise<string> {
  // The generated type asks for strings, but the function treats NULL as "no paragraph" / "not a reply", and a JSON
  // null reaches it as exactly that.
  const orNull = (value: string | null) => value as string;
  const id = unwrap(
    await client.rpc("post_comment", {
      p_id: input.id,
      p_chapter_id: input.chapterId,
      p_block_id: orNull(input.blockId),
      p_parent_id: orNull(input.parentId),
      p_body: input.body,
    }),
  );
  return id ?? input.id;
}

export async function editComment(client: DataClient, commentId: string, body: string): Promise<void> {
  unwrap(await client.rpc("edit_comment", { p_comment_id: commentId, p_body: body }));
}

export async function deleteComment(client: DataClient, commentId: string): Promise<void> {
  unwrap(await client.rpc("delete_comment", { p_comment_id: commentId }));
}

/** Sets my like to exactly `liked` and returns the comment's like count afterwards. */
export async function setCommentLike(client: DataClient, commentId: string, liked: boolean): Promise<number> {
  return Number(unwrap(await client.rpc("set_comment_like", { p_comment_id: commentId, p_liked: liked })) ?? 0);
}

/** Sets my `reaction` on a comment to exactly `on` and returns the comment's reaction counts afterwards. */
export async function setCommentReaction(
  client: DataClient,
  commentId: string,
  reaction: CommentReaction,
  on: boolean,
): Promise<Partial<Record<CommentReaction, number>>> {
  const counts = unwrap(
    await client.rpc("set_comment_reaction", { p_comment_id: commentId, p_reaction: reaction, p_on: on }),
  );
  return readReactions(counts);
}

/**
 * People whose username starts with `query` (case ignored), for the @ list. Reads the public profiles (RLS shows only
 * active accounts); an empty query asks nothing.
 */
export async function searchMentionCandidates(client: DataClient, query: string): Promise<MentionSuggestion[]> {
  if (query === "") return [];
  const rows =
    unwrap(
      await client
        .from("app_users")
        .select("username, display_name")
        .ilike("username", likePrefix(query))
        .order("username", { ascending: true })
        .limit(MENTION_SUGGESTIONS),
    ) ?? [];
  return rows.map((row) => ({
    username: String(row.username),
    name: row.display_name?.trim() || String(row.username),
  }));
}

/** Hides a comment on my story (or shows it again). Returns the card status afterwards. */
export async function setCommentHidden(client: DataClient, commentId: string, hidden: boolean): Promise<string> {
  return unwrap(await client.rpc("set_comment_hidden", { p_comment_id: commentId, p_hidden: hidden })) ?? "";
}

/** True when I own or co-author the story the chapter belongs to. */
export async function canModerateComments(client: DataClient, chapterId: string): Promise<boolean> {
  return unwrap(await client.rpc("can_moderate_comments", { p_chapter_id: chapterId })) === true;
}

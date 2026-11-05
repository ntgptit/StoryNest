import { decideChapterReviewArgsSchema, requestChapterReviewArgsSchema } from "@storynest/validation";
import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import { toChapterReview, type ChapterReview, type ReviewRow } from "../model/review.ts";

const REVIEW_COLUMNS = [
  "status, requested_by, requested_at, requested_revision, request_note, decided_by, decided_at, decision_note",
  "requester:app_users!chapter_reviews_requested_by_fkey(username, display_name)",
  "decider:app_users!chapter_reviews_decided_by_fkey(username, display_name)",
].join(", ");

/** The chapter's current review sign-off, or null when nobody asked yet. RLS: the story team only. */
export async function getChapterReview(client: DataClient, chapterId: string): Promise<ChapterReview | null> {
  const row = unwrap(
    await client
      .from("chapter_reviews")
      .select(REVIEW_COLUMNS)
      .eq("chapter_id", chapterId)
      .returns<ReviewRow[]>()
      .maybeSingle(),
  );
  return row ? toChapterReview(row) : null;
}

/** Asks for a sign-off of the saved draft at `expectedRevision` (PT409 when the draft moved on). */
export async function requestChapterReview(
  client: DataClient,
  chapterId: string,
  expectedRevision: number,
  note: string,
): Promise<void> {
  const args = requestChapterReviewArgsSchema.parse({
    p_chapter_id: chapterId,
    p_expected_revision: expectedRevision,
    p_note: note,
  });
  unwrap(await client.rpc("request_chapter_review", args));
}

/** Owner or co-author (not the one who asked): approve, or send back for changes. */
export async function decideChapterReview(
  client: DataClient,
  chapterId: string,
  approve: boolean,
  note: string,
): Promise<void> {
  const args = decideChapterReviewArgsSchema.parse({ p_chapter_id: chapterId, p_approve: approve, p_note: note });
  unwrap(await client.rpc("decide_chapter_review", args));
}

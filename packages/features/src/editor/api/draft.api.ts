import { chapterBodySchema, chapterDraftSaveSchema, type ChapterBody } from "@storynest/validation";
import type { DataClient } from "../../_shared/client.ts";
import { AppError, unwrap } from "../../_shared/errors.ts";

export interface ChapterDraft {
  chapterId: string;
  storyId: string;
  title: string;
  /** Empty for a draft that has never been written (a new chapter): the editor shows one empty paragraph. */
  body: ChapterBody | [];
  /** Compare-and-swap token: a save only succeeds against the revision it was based on. */
  revision: number;
}

/** The working draft of a chapter the caller may edit, or null (RLS hides it from everyone else). */
export async function getChapterDraft(client: DataClient, chapterId: string): Promise<ChapterDraft | null> {
  const row = unwrap(
    await client
      .from("chapter_drafts")
      .select("chapter_id, title, body, revision, chapter:chapters(story_id)")
      .eq("chapter_id", chapterId)
      .maybeSingle(),
  );
  if (!row) return null;
  const chapter = Array.isArray(row.chapter) ? row.chapter[0] : row.chapter;
  if (!chapter) return null;

  // A draft nobody has written yet is `[]`. Anything else must be a valid body: opening a body the editor cannot
  // represent and saving it back would silently overwrite it.
  const isEmpty = Array.isArray(row.body) && row.body.length === 0;
  const parsed = isEmpty ? { success: true as const, data: [] as [] } : chapterBodySchema.safeParse(row.body);
  if (!parsed.success) throw new AppError("invalid", "The draft body cannot be read", { details: parsed.error.issues });

  return {
    chapterId: row.chapter_id,
    storyId: chapter.story_id,
    title: row.title,
    body: parsed.data,
    revision: Number(row.revision),
  };
}

/**
 * Saves the draft if it is still at `expectedRevision`. The body and title go through chapterDraftSaveSchema first, so
 * what reaches the database always satisfies the contract the publish RPC expects. If someone saved in between, no row
 * matches and the call fails with a `conflict`: the caller must reload instead of overwriting their work.
 * Resolves to the new revision.
 */
export async function saveChapterDraft(
  client: DataClient,
  userId: string,
  input: { chapterId: string; title: string; body: ChapterBody; expectedRevision: number },
): Promise<number> {
  const next = input.expectedRevision + 1;
  const payload = chapterDraftSaveSchema.parse({
    chapter_id: input.chapterId,
    title: input.title,
    body: input.body,
    revision: next,
  });
  const rows = unwrap(
    await client
      .from("chapter_drafts")
      .update({ title: payload.title, body: payload.body, revision: payload.revision, updated_by: userId })
      .eq("chapter_id", payload.chapter_id)
      .eq("revision", input.expectedRevision)
      .select("revision"),
  );
  if (!rows || rows.length === 0) {
    throw new AppError("conflict", "The draft was changed elsewhere", { code: "DRAFT_REVISION" });
  }
  return next;
}

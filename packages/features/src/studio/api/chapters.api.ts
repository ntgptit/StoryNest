import type { ChapterForm } from "@storynest/validation";
import type { DataClient } from "../../_shared/client.ts";
import { AppError, unwrap } from "../../_shared/errors.ts";
import { sortChapters, toStudioChapter, type StudioChapter, type StudioChapterRow } from "../model/studio-chapter.ts";

const CHAPTER_COLUMNS =
  "id, slug, sort_order, status, scheduled_for, deleted_at, updated_at, part_id, draft:chapter_drafts(title)";

/** Every chapter of the story the caller works on (drafts, archived and deleted too), in studio order. */
export async function listStudioChapters(client: DataClient, storyId: string): Promise<StudioChapter[]> {
  const rows =
    unwrap(
      await client
        .from("chapters")
        .select(CHAPTER_COLUMNS)
        .eq("story_id", storyId)
        .order("sort_order", { ascending: true })
        .returns<StudioChapterRow[]>(),
    ) ?? [];
  return sortChapters(rows.map(toStudioChapter));
}

/** Appends a chapter (draft, with its title) at the next position. A taken slug is a unique violation (conflict). */
export async function createChapter(
  client: DataClient,
  storyId: string,
  id: string,
  form: ChapterForm,
): Promise<string> {
  const created = unwrap(
    await client.rpc("create_chapter", { p_story_id: storyId, p_title: form.title, p_slug: form.slug, p_id: id }),
  );
  return created ?? id;
}

/** Sends the complete new order of the live chapters; the server rejects a list that is stale or incomplete. */
export async function reorderChapters(
  client: DataClient,
  storyId: string,
  orderedIds: readonly string[],
): Promise<void> {
  unwrap(await client.rpc("reorder_chapters", { p_story_id: storyId, p_chapter_ids: [...orderedIds] }));
}

export async function setChapterArchived(client: DataClient, chapterId: string, archived: boolean): Promise<void> {
  unwrap(await client.rpc(archived ? "archive_chapter" : "unarchive_chapter", { p_chapter_id: chapterId }));
}

/** Changes only the URL slug (the title lives in the draft). Zero matched rows means the caller may not edit it. */
export async function renameChapterSlug(client: DataClient, chapterId: string, slug: string): Promise<void> {
  const rows = unwrap(await client.from("chapters").update({ slug }).eq("id", chapterId).select("id"));
  if (!rows || rows.length === 0) throw new AppError("notFound", "Chapter not found or not editable");
}

/** Soft delete or restore. Nothing is ever removed from the database. */
export async function setChapterDeleted(client: DataClient, chapterId: string, deleted: boolean): Promise<void> {
  const rows = unwrap(
    await client
      .from("chapters")
      .update({ deleted_at: deleted ? new Date().toISOString() : null })
      .eq("id", chapterId)
      .select("id"),
  );
  if (!rows || rows.length === 0) throw new AppError("notFound", "Chapter not found or not editable");
}

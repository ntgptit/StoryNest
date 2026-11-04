import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import type { ChapterProgress, ReadingPosition, StoryProgress } from "../model/progress.ts";

/** Records where the signed-in reader is. The server decides the version and validates the block (see the RPC). */
export async function saveReadingProgress(
  client: DataClient,
  chapterId: string,
  position: ReadingPosition,
): Promise<void> {
  unwrap(
    await client.rpc("save_reading_progress", {
      p_chapter_id: chapterId,
      p_percent: position.percent,
      // Omitted (not null) when unknown: the function parameter has a default.
      ...(position.lastBlockId ? { p_last_block_id: position.lastBlockId } : {}),
    }),
  );
}

/** The caller's saved position in a chapter, or null (RLS returns only the caller's own rows). */
export async function getChapterProgress(client: DataClient, chapterId: string): Promise<ChapterProgress | null> {
  const row = unwrap(
    await client
      .from("user_chapter_progress")
      .select("last_block_id, last_version_id, percent_complete, completed_at")
      .eq("chapter_id", chapterId)
      .maybeSingle(),
  );
  if (!row) return null;
  return {
    lastBlockId: row.last_block_id,
    lastVersionId: row.last_version_id,
    percent: Number(row.percent_complete),
    completed: row.completed_at !== null,
  };
}

/** The chapter the caller is currently in for a story, and whether they finished it; null when never opened. */
export async function getStoryProgress(client: DataClient, storyId: string): Promise<StoryProgress | null> {
  const story = unwrap(
    await client.from("user_story_progress").select("current_chapter_id").eq("story_id", storyId).maybeSingle(),
  );
  if (!story) return null;
  const chapter = unwrap(
    await client
      .from("user_chapter_progress")
      .select("completed_at")
      .eq("chapter_id", story.current_chapter_id)
      .maybeSingle(),
  );
  return { currentChapterId: story.current_chapter_id, currentChapterCompleted: chapter?.completed_at != null };
}

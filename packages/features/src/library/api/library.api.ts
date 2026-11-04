import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import { STORY_COLUMNS } from "../../discovery/index.ts";
import {
  LIBRARY_PAGE_SIZE,
  toReadingEntry,
  toShelfEntry,
  type LibraryEntry,
  type ReadingRow,
  type ShelfRow,
} from "../model/library.ts";

const STORY_EMBED = (fk: string) => `story:stories!${fk}(${STORY_COLUMNS}, deleted_at)`;

/**
 * Stories the reader opened, most recently read first. The story is a left embed: a story the reader can no longer see
 * comes back as null and is shown as a placeholder instead of vanishing.
 */
export async function listReading(client: DataClient, userId: string): Promise<LibraryEntry[]> {
  const rows =
    unwrap(
      await client
        .from("user_story_progress")
        .select(
          `story_id, current_chapter_id, last_read_at, ${STORY_EMBED("user_story_progress_story_id_fkey")}, ` +
            "chapter:chapters!user_story_progress_current_chapter_id_story_id_fkey(slug, sort_order)",
        )
        .eq("user_id", userId)
        .order("last_read_at", { ascending: false })
        .limit(LIBRARY_PAGE_SIZE)
        .returns<ReadingRow[]>(),
    ) ?? [];
  return rows.map(toReadingEntry);
}

export async function listSaved(client: DataClient, userId: string): Promise<LibraryEntry[]> {
  const rows =
    unwrap(
      await client
        .from("story_saves")
        .select(`story_id, at:saved_at, ${STORY_EMBED("story_saves_story_id_fkey")}`)
        .eq("user_id", userId)
        .order("saved_at", { ascending: false })
        .limit(LIBRARY_PAGE_SIZE)
        .returns<ShelfRow[]>(),
    ) ?? [];
  return rows.map(toShelfEntry);
}

export async function listFollowing(client: DataClient, userId: string): Promise<LibraryEntry[]> {
  const rows =
    unwrap(
      await client
        .from("story_follows")
        .select(`story_id, at:created_at, ${STORY_EMBED("story_follows_story_id_fkey")}`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(LIBRARY_PAGE_SIZE)
        .returns<ShelfRow[]>(),
    ) ?? [];
  return rows.map(toShelfEntry);
}

/** Takes the story off the "reading" list (the reader's own progress pointer; nothing else is touched). */
export async function removeFromReading(client: DataClient, userId: string, storyId: string): Promise<void> {
  unwrap(await client.from("user_story_progress").delete().eq("user_id", userId).eq("story_id", storyId));
}

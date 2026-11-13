import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import { STORY_COLUMNS } from "../../discovery/index.ts";
import {
  LIBRARY_PAGE_SIZE,
  toLibraryPage,
  toReadingEntry,
  toShelfEntry,
  type LibraryPage,
  type ReadingRow,
  type ShelfRow,
} from "../model/library.ts";

const STORY_EMBED = (fk: string) => `story:stories!${fk}(${STORY_COLUMNS}, deleted_at)`;

/** Rows of one page: the page size plus one, so the caller learns whether another page follows without a count query. */
const pageRange = (offset: number): [number, number] => [offset, offset + LIBRARY_PAGE_SIZE];

/**
 * Stories the reader opened, most recently read first. The story is a left embed: a story the reader can no longer see
 * comes back as null and is shown as a placeholder instead of vanishing.
 */
export async function listReading(client: DataClient, userId: string, offset = 0): Promise<LibraryPage> {
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
        .range(...pageRange(offset))
        .returns<ReadingRow[]>(),
    ) ?? [];
  return toLibraryPage(rows.map(toReadingEntry), offset);
}

export async function listSaved(client: DataClient, userId: string, offset = 0): Promise<LibraryPage> {
  const rows =
    unwrap(
      await client
        .from("story_saves")
        .select(`story_id, at:saved_at, ${STORY_EMBED("story_saves_story_id_fkey")}`)
        .eq("user_id", userId)
        .order("saved_at", { ascending: false })
        .range(...pageRange(offset))
        .returns<ShelfRow[]>(),
    ) ?? [];
  return toLibraryPage(rows.map(toShelfEntry), offset);
}

export async function listFollowing(client: DataClient, userId: string, offset = 0): Promise<LibraryPage> {
  const rows =
    unwrap(
      await client
        .from("story_follows")
        .select(`story_id, at:created_at, ${STORY_EMBED("story_follows_story_id_fkey")}`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(...pageRange(offset))
        .returns<ShelfRow[]>(),
    ) ?? [];
  return toLibraryPage(rows.map(toShelfEntry), offset);
}

/** Takes the story off the "reading" list (the reader's own progress pointer; nothing else is touched). */
export async function removeFromReading(client: DataClient, userId: string, storyId: string): Promise<void> {
  unwrap(await client.from("user_story_progress").delete().eq("user_id", userId).eq("story_id", storyId));
}

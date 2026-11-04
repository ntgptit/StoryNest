import { isUuid } from "@storynest/utils";
import { CHAPTER_STATUS } from "@storynest/validation";
import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import { toChapterContent, type ChapterContent, type ChapterContentRow } from "../model/chapter.ts";

// The published snapshot and its blocks come with the chapter in one request. The pointer FK is named because
// chapter_versions is also the chapter's history (see story.api.ts).
const BLOCK_COLUMNS = "block_id, sort_order, block_type, text_content, rich_text, image_storage_key";
const CHAPTER_COLUMNS =
  "id, slug, sort_order, first_published_at, " +
  `version:chapter_versions!fk_chapter_published_version(title, word_count, blocks:chapter_version_blocks(${BLOCK_COLUMNS}))`;

/**
 * The currently published content of one chapter, or null when it does not exist, is not published, was removed,
 * or RLS hides it (a hidden chapter and a missing one look the same on purpose).
 */
export async function getChapterContent(
  client: DataClient,
  storyId: string,
  chapterSlug: string,
): Promise<ChapterContent | null> {
  if (!isUuid(storyId) || chapterSlug === "") return null;
  const row = unwrap(
    await client
      .from("chapters")
      .select(CHAPTER_COLUMNS)
      .eq("story_id", storyId)
      .eq("slug", chapterSlug)
      .eq("status", CHAPTER_STATUS.PUBLISHED)
      .is("deleted_at", null)
      .returns<ChapterContentRow[]>()
      .maybeSingle(),
  );
  // `published` guarantees a version through a CHECK; a row without one is treated as not readable.
  return row?.version ? toChapterContent(row) : null;
}

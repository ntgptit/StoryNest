import { isUuid } from "@storynest/utils";
import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import { STORY_COLUMNS } from "../../discovery/index.ts";
import {
  toChapterListItem,
  toStoryDetail,
  type ChapterListItem,
  type ChapterRow,
  type StoryDetail,
  type StoryDetailRow,
} from "../model/story-detail.ts";

// Same columns as the discovery card plus visibility/created_at: one request, no follow-up queries.
const DETAIL_COLUMNS = `${STORY_COLUMNS}, visibility, created_at`;

// chapter_versions is reachable from chapters two ways (history and the published pointer): name the pointer FK.
const CHAPTER_COLUMNS =
  "id, slug, sort_order, first_published_at, version:chapter_versions!fk_chapter_published_version(title, word_count)";

/**
 * One story by id, or null when it does not exist or RLS hides it from the caller (private, draft, deleted):
 * both look the same on purpose, so the page cannot be used to probe for hidden stories.
 */
export async function getStory(client: DataClient, storyId: string): Promise<StoryDetail | null> {
  if (!isUuid(storyId)) return null;
  const row = unwrap(
    await client
      .from("stories")
      .select(DETAIL_COLUMNS)
      .eq("id", storyId)
      .is("deleted_at", null)
      .returns<StoryDetailRow[]>()
      .maybeSingle(),
  );
  return row ? toStoryDetail(row) : null;
}

/** Published chapters of a story in reading order. Drafts and scheduled chapters are the studio's business. */
export async function listStoryChapters(client: DataClient, storyId: string): Promise<ChapterListItem[]> {
  if (!isUuid(storyId)) return [];
  const rows =
    unwrap(
      await client
        .from("chapters")
        .select(CHAPTER_COLUMNS)
        .eq("story_id", storyId)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .returns<ChapterRow[]>(),
    ) ?? [];
  return rows.map(toChapterListItem);
}

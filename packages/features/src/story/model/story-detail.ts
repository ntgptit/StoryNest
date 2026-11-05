import { VISIBILITIES, VISIBILITY, type Visibility } from "@storynest/validation";
import { excerpt } from "@storynest/utils";
import { storyHref, toStorySummary, type StoryListRow, type StorySummary } from "../../discovery/index.ts";
import { toPartRef, type PartRef } from "../../_shared/parts.ts";

/** One row of the story-page query: the discovery row plus the fields only the detail page needs. */
export interface StoryDetailRow extends StoryListRow {
  visibility: string;
  created_at: string;
  /** Weekly update schedule (bit mask, Monday = bit 0). */
  update_days?: number;
  /** BlurHash of the cover, for the blur-up placeholder. */
  cover_blurhash?: string | null;
}

export interface StoryDetail extends StorySummary {
  visibility: Visibility;
  createdAt: string;
  updateDays: number;
  coverBlurhash: string | null;
}

export function toStoryDetail(row: StoryDetailRow): StoryDetail {
  const visibility = VISIBILITIES.find((v) => v === row.visibility) ?? VISIBILITY.PRIVATE;
  return {
    ...toStorySummary(row),
    visibility,
    createdAt: row.created_at,
    updateDays: row.update_days ?? 0,
    coverBlurhash: row.cover_blurhash ?? null,
  };
}

/**
 * Only public stories belong in search engines; unlisted ones are reachable by link but must not be indexed. Adult
 * (18+) stories are not offered to search engines either: they open by link, behind the age gate (WP 5.6).
 */
export function isIndexable(story: Pick<StoryDetail, "visibility" | "isMature">): boolean {
  return story.visibility === VISIBILITY.PUBLIC && !story.isMature;
}

/** Where the story page's meta / Open Graph description is cut (the usual length a search result shows). */
export const STORY_META_DESCRIPTION_LENGTH = 160;

/** The story page's meta and Open Graph description: the synopsis, cut on a word boundary. */
export function storyMetaDescription(synopsis: string): string {
  return excerpt(synopsis, STORY_META_DESCRIPTION_LENGTH);
}

/** Row of the published-chapter query. `version` is the currently published snapshot (title, size). */
export interface ChapterRow {
  id: string;
  slug: string;
  sort_order: number;
  first_published_at: string | null;
  version: { title: string; word_count: number } | null;
  /** The story part (volume) the chapter is in. */
  part?: { id: string; title: string } | { id: string; title: string }[] | null;
}

export interface ChapterListItem {
  id: string;
  slug: string;
  /** 1-based position shown to readers ("Chương 3"). */
  number: number;
  title: string;
  wordCount: number;
  publishedAt: string | null;
  /** The part (volume) heading this chapter sits under, if any. */
  part?: PartRef | null;
}

export function toChapterListItem(row: ChapterRow): ChapterListItem {
  return {
    id: row.id,
    slug: row.slug,
    number: row.sort_order,
    title: row.version?.title ?? "",
    wordCount: row.version?.word_count ?? 0,
    publishedAt: row.first_published_at,
    part: toPartRef(row.part),
  };
}

/** Reader URL: story id + slug for the story, then the chapter slug (unique per story). Page lives in WBS WP 2.4. */
export function chapterHref(story: Pick<StorySummary, "id" | "slug">, chapter: Pick<ChapterListItem, "slug">): string {
  return `${storyHref(story)}/${chapter.slug}`;
}

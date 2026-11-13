import { toStorySummary, storyHref, type StoryListRow, type StorySummary } from "../../discovery/index.ts";
import type { AppError } from "../../_shared/errors.ts";
import { libraryText } from "../strings.ts";

export const LIBRARY_TABS = ["reading", "saved", "following"] as const;
export type LibraryTab = (typeof LIBRARY_TABS)[number];

export const LIBRARY_PAGE_SIZE = 50;

export interface LibraryPage {
  entries: LibraryEntry[];
  /** Offset of the next page, or null when this was the last one. */
  nextOffset: number | null;
}

/** Cuts the extra row the query asked for (see the API) and says where the next page starts. */
export function toLibraryPage(rows: LibraryEntry[], offset: number): LibraryPage {
  if (rows.length <= LIBRARY_PAGE_SIZE) return { entries: rows, nextOffset: null };
  return { entries: rows.slice(0, LIBRARY_PAGE_SIZE), nextOffset: offset + LIBRARY_PAGE_SIZE };
}

type Maybe<T> = T | T[] | null;
const one = <T>(value: Maybe<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

/** The story as the library query embeds it: the discovery columns plus `deleted_at`. */
export type LibraryStoryRow = StoryListRow & { deleted_at: string | null };

export interface ReadingRow {
  story_id: string;
  current_chapter_id: string;
  last_read_at: string;
  story: Maybe<LibraryStoryRow>;
  chapter: Maybe<{ slug: string; sort_order: number }>;
}
export interface ShelfRow {
  story_id: string;
  /** `saved_at` for the shelf, `created_at` for the follows: the query renames it. */
  at: string;
  story: Maybe<LibraryStoryRow>;
}

export interface LibraryEntry {
  storyId: string;
  /** Null when the story is gone for this reader (deleted, made private, or the reader lost access). */
  story: StorySummary | null;
  /** When the reader last read it / saved it / followed it. Kept as the server's text (it orders the list). */
  at: string;
  /** For the reading list: where to continue. */
  resume: { href: string; number: number } | null;
}

/**
 * A story RLS still returns can be a soft-deleted one the reader owns; to the library that is gone too. An entry
 * whose story is gone stays in the list (so it can be removed) as a placeholder.
 */
function availableStory(row: Maybe<LibraryStoryRow>): StorySummary | null {
  const story = one(row);
  return story && story.deleted_at === null ? toStorySummary(story) : null;
}

export function toReadingEntry(row: ReadingRow): LibraryEntry {
  const story = availableStory(row.story);
  const chapter = one(row.chapter);
  return {
    storyId: row.story_id,
    story,
    at: row.last_read_at,
    resume: story && chapter ? { href: `${storyHref(story)}/${chapter.slug}`, number: chapter.sort_order } : null,
  };
}

export function toShelfEntry(row: ShelfRow): LibraryEntry {
  return { storyId: row.story_id, story: availableStory(row.story), at: row.at, resume: null };
}

export function libraryErrorMessage(error: AppError): string {
  return error.kind === "network" ? libraryText.errors.network : libraryText.errors.generic;
}

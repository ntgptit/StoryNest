import { CHAPTER_ERROR, CHAPTER_STATUS, CHAPTER_STATUSES, type ChapterStatus } from "@storynest/validation";
import type { AppError } from "../../_shared/errors.ts";
import { studioText } from "../strings.ts";

export interface StudioChapterRow {
  id: string;
  slug: string;
  sort_order: number;
  status: string;
  scheduled_for: string | null;
  deleted_at: string | null;
  updated_at: string;
  /** One-to-one embed of chapter_drafts: the working title (the draft outlives publishing). */
  draft: { title: string } | { title: string }[] | null;
}

export interface StudioChapter {
  id: string;
  slug: string;
  position: number;
  title: string;
  status: ChapterStatus;
  scheduledFor: string | null;
  deleted: boolean;
  updatedAt: string;
}

export function toStudioChapter(row: StudioChapterRow): StudioChapter {
  const draft = Array.isArray(row.draft) ? row.draft[0] : row.draft;
  return {
    id: row.id,
    slug: row.slug,
    position: row.sort_order,
    title: draft?.title ?? "",
    // An unknown status is shown as a draft: the least public reading of it.
    status: CHAPTER_STATUSES.find((s) => s === row.status) ?? CHAPTER_STATUS.DRAFT,
    scheduledFor: row.scheduled_for,
    deleted: row.deleted_at !== null,
    updatedAt: row.updated_at,
  };
}

/** Chapters in reading order: live ones by position, then deleted ones (the database keeps them after the live ones). */
export function sortChapters(chapters: readonly StudioChapter[]): StudioChapter[] {
  return [...chapters].sort(
    (a, b) => Number(a.deleted) - Number(b.deleted) || a.position - b.position || (a.id < b.id ? -1 : 1),
  );
}

export function liveChapterIds(chapters: readonly StudioChapter[]): string[] {
  return sortChapters(chapters)
    .filter((c) => !c.deleted)
    .map((c) => c.id);
}

/**
 * The live order after moving `chapterId` one place up (-1) or down (+1). null when it cannot move (an end of the list,
 * or an unknown/deleted chapter). Deleted chapters are not part of the order the server accepts.
 */
export function moveChapter(ids: readonly string[], chapterId: string, direction: 1 | -1): string[] | null {
  const from = ids.indexOf(chapterId);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= ids.length) return null;
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as string);
  return next;
}

/** The cached list after a reorder: positions renumbered 1..n for live chapters, deleted ones after them. */
export function applyOrder(chapters: readonly StudioChapter[], orderedIds: readonly string[]): StudioChapter[] {
  const live = new Map(orderedIds.map((id, index) => [id, index + 1]));
  let after = orderedIds.length;
  return sortChapters(
    sortChapters(chapters).map((chapter) => {
      const position = live.get(chapter.id);
      if (position !== undefined) return { ...chapter, position };
      after += 1;
      return { ...chapter, position: after };
    }),
  );
}

// A function, not a constant: the text is read when it is needed, so it follows the language.
const VALIDATION_TEXT = (): Record<string, string> => ({
  [CHAPTER_ERROR.titleRequired]: studioText.chapters.validation.titleRequired,
  [CHAPTER_ERROR.titleTooLong]: studioText.chapters.validation.titleTooLong,
  [CHAPTER_ERROR.slugRequired]: studioText.chapters.validation.slugRequired,
  [CHAPTER_ERROR.slugTooLong]: studioText.chapters.validation.slugTooLong,
  [CHAPTER_ERROR.slugInvalid]: studioText.chapters.validation.slugInvalid,
});

export function chapterValidationMessage(code: string | undefined): string | undefined {
  if (code === undefined) return undefined;
  return VALIDATION_TEXT()[code] ?? studioText.errors.generic;
}

const UNIQUE_VIOLATION = "23505";

/** A unique violation on chapters can only be the slug (positions are assigned by the server functions). */
export function isChapterSlugTaken(error: AppError): boolean {
  return error.kind === "conflict" && error.code === UNIQUE_VIOLATION;
}

/** Banner/toast text for a failed chapter action. */
export function chapterErrorMessage(error: AppError): string {
  switch (error.kind) {
    case "forbidden":
      return studioText.chapters.errors.forbidden;
    case "notFound":
      return studioText.chapters.errors.notFound;
    case "conflict":
      return studioText.chapters.errors.conflict;
    case "invalid":
      return studioText.chapters.errors.stale;
    case "network":
      return studioText.errors.network;
    default:
      return studioText.errors.generic;
  }
}

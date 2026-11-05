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

/** Live chapters waiting for their publish time, soonest first (then in reading order). */
export function scheduledChapters(chapters: readonly StudioChapter[]): (StudioChapter & { scheduledFor: string })[] {
  return chapters
    .filter(
      (c): c is StudioChapter & { scheduledFor: string } =>
        !c.deleted && c.status === CHAPTER_STATUS.SCHEDULED && c.scheduledFor !== null,
    )
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime() || a.position - b.position);
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

// ---- archive / delete, for one row or a selection ---------------------------------------------------------------

/** The state changes a chapter row offers besides writing, moving and renaming. */
export const CHAPTER_STATE_ACTION = {
  ARCHIVE: "archive",
  UNARCHIVE: "unarchive",
  DELETE: "delete",
  RESTORE: "restore",
} as const;
export type ChapterStateAction = (typeof CHAPTER_STATE_ACTION)[keyof typeof CHAPTER_STATE_ACTION];
export const CHAPTER_STATE_ACTIONS: readonly ChapterStateAction[] = Object.values(CHAPTER_STATE_ACTION);

/**
 * What a chapter row offers, in the order of its buttons. Only owners and co-authors (`canManage`) archive and delete;
 * a deleted chapter can only be restored, an archived one unarchived instead of archived. A bulk selection applies
 * exactly the same rule to each chapter (`chaptersFor`), so it can never do more than the rows themselves.
 */
export function chapterStateActions(chapter: StudioChapter, canManage: boolean): ChapterStateAction[] {
  if (!canManage) return [];
  if (chapter.deleted) return [CHAPTER_STATE_ACTION.RESTORE];
  return [
    chapter.status === CHAPTER_STATUS.ARCHIVED ? CHAPTER_STATE_ACTION.UNARCHIVE : CHAPTER_STATE_ACTION.ARCHIVE,
    CHAPTER_STATE_ACTION.DELETE,
  ];
}

/** The selected chapters that `action` applies to, in list order. */
export function chaptersFor(
  chapters: readonly StudioChapter[],
  selected: ReadonlySet<string>,
  action: ChapterStateAction,
  canManage: boolean,
): StudioChapter[] {
  return sortChapters(chapters).filter(
    (chapter) => selected.has(chapter.id) && chapterStateActions(chapter, canManage).includes(action),
  );
}

/**
 * The selection after ticking (`checked`) or unticking `target`. With an `anchor` (the row ticked before, while Shift
 * is held) every row between the two, in `order`, takes the same state; without one only `target` changes.
 */
export function selectRange(
  order: readonly string[],
  selected: ReadonlySet<string>,
  target: string,
  checked: boolean,
  anchor: string | null = null,
): Set<string> {
  const next = new Set(selected);
  const to = order.indexOf(target);
  const from = anchor === null ? -1 : order.indexOf(anchor);
  const ids = from === -1 || to === -1 ? [target] : order.slice(Math.min(from, to), Math.max(from, to) + 1);
  for (const id of ids) {
    if (checked) next.add(id);
    else next.delete(id);
  }
  return next;
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

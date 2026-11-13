import { CHAPTER_STATUS, STORY_STATUS, VISIBILITY, type Visibility } from "@storynest/validation";
import type { StudioChapter } from "./studio-chapter.ts";

/** Who can read a story right now, as the Studio explains it to the team. */
export const READER_ACCESS = {
  LIVE: "live",
  LINK_ONLY: "link_only",
  TEAM_ONLY: "team_only",
  DELETED: "deleted",
} as const;
export type ReaderAccessState = (typeof READER_ACCESS)[keyof typeof READER_ACCESS];

/** Why readers cannot see a story (empty for a live or link-only one). */
export const ACCESS_REASON = {
  PRIVATE: "private",
  DRAFT_STATUS: "draft_status",
  NO_PUBLISHED_CHAPTER: "no_published_chapter",
  DELETED: "deleted",
} as const;
export type AccessReason = (typeof ACCESS_REASON)[keyof typeof ACCESS_REASON];

export interface ReaderAccess {
  state: ReaderAccessState;
  reasons: AccessReason[];
}

/**
 * Mirrors the database rule for a reader who is not on the team (`can_read_story`: not deleted, public or unlisted,
 * status other than draft), plus the fact that there is nothing to read until a chapter is published. A moderator's
 * removal is not known here: such a story shows as deleted, as it does to its owner.
 */
export function readerAccess(
  story: { visibility: Visibility; status: string; deleted: boolean },
  publishedChapters: number,
): ReaderAccess {
  if (story.deleted) return { state: READER_ACCESS.DELETED, reasons: [ACCESS_REASON.DELETED] };

  const reasons: AccessReason[] = [];
  if (story.visibility === VISIBILITY.PRIVATE) reasons.push(ACCESS_REASON.PRIVATE);
  if (story.status === STORY_STATUS.DRAFT) reasons.push(ACCESS_REASON.DRAFT_STATUS);
  if (publishedChapters === 0) reasons.push(ACCESS_REASON.NO_PUBLISHED_CHAPTER);
  if (reasons.length > 0) return { state: READER_ACCESS.TEAM_ONLY, reasons };

  return { state: story.visibility === VISIBILITY.PUBLIC ? READER_ACCESS.LIVE : READER_ACCESS.LINK_ONLY, reasons };
}

/** True when saving the change would take readers away from a story they can read now (the owner is warned first). */
export function removesReaderAccess(before: ReaderAccess, after: ReaderAccess): boolean {
  const open = (access: ReaderAccess) =>
    access.state === READER_ACCESS.LIVE || access.state === READER_ACCESS.LINK_ONLY;
  return open(before) && !open(after);
}

/** Chapters a reader can open: published and not deleted. */
export function countPublished(chapters: readonly StudioChapter[]): number {
  return chapters.filter((chapter) => !chapter.deleted && chapter.status === CHAPTER_STATUS.PUBLISHED).length;
}

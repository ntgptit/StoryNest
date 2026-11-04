/** From this percentage a chapter counts as finished. Keep in sync with c_completed_percent in save_reading_progress. */
export const READING_COMPLETED_PERCENT = 95;

/** Minimum time between two writes while the reader keeps scrolling. */
export const PROGRESS_WRITE_INTERVAL_MS = 5000;

export interface ChapterProgress {
  lastBlockId: string | null;
  /** The published version the position refers to. A different current version means the chapter was republished. */
  lastVersionId: string | null;
  percent: number;
  completed: boolean;
}

export interface StoryProgress {
  currentChapterId: string;
  /** True when the reader had finished that chapter (see READING_COMPLETED_PERCENT). */
  currentChapterCompleted: boolean;
}

/** Where the reader is inside a chapter: the block at the reading line and how far down the page they are. */
export interface ReadingPosition {
  lastBlockId: string | null;
  /** 0..100 with one decimal. */
  percent: number;
}

/** Restore only an unfinished chapter that has a real position; a finished chapter reopens at the top. */
export function shouldRestore(progress: ChapterProgress | null | undefined): progress is ChapterProgress {
  if (!progress || progress.completed) return false;
  return progress.lastBlockId !== null || progress.percent > 0;
}

export function samePosition(a: ReadingPosition | null, b: ReadingPosition): boolean {
  return a !== null && a.lastBlockId === b.lastBlockId && a.percent === b.percent;
}

/** Percent of the scroll distance as stored: 0..100, one decimal. */
export function toPercent(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  return Math.round(Math.min(1, Math.max(0, ratio)) * 1000) / 10;
}

/**
 * Chapter to open from the story page. The chapter the reader was in; if they had finished it, the next one. null when
 * there is nothing to continue (no progress, the chapter is gone, or the last chapter was finished).
 */
export function resolveContinueChapter<T extends { id: string }>(
  chapters: readonly T[],
  progress: StoryProgress | null | undefined,
): T | null {
  if (!progress) return null;
  const index = chapters.findIndex((c) => c.id === progress.currentChapterId);
  if (index === -1) return null;
  return progress.currentChapterCompleted ? (chapters[index + 1] ?? null) : (chapters[index] ?? null);
}

/** Index of the last element whose top edge is at or above `line` (tops must be in non-decreasing order). -1 if none. */
export function lastIndexAbove(tops: readonly number[], line: number): number {
  let low = 0;
  let high = tops.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if ((tops[mid] ?? Infinity) <= line) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

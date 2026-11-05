import type { ChapterListItem } from "./story-detail.ts";

/**
 * A story with more published chapters than this is "long": the story page groups its chapter list in ranges and the
 * table of contents gets a scrub rail. Shorter stories keep the plain list.
 */
export const LONG_STORY_CHAPTERS = 50;
/** Chapters per range, and the most ranges a list is cut into (the range grows by 50s beyond that). */
export const CHAPTER_RANGE_SIZE = 50;
export const MAX_CHAPTER_RANGES = 20;

export function isLongStory(chapterCount: number): boolean {
  return chapterCount > LONG_STORY_CHAPTERS;
}

/** 50 chapters per range, or a larger multiple of 50 when that would make more than MAX_CHAPTER_RANGES ranges. */
export function chapterRangeSize(chapterCount: number): number {
  const steps = Math.ceil(chapterCount / MAX_CHAPTER_RANGES / CHAPTER_RANGE_SIZE);
  return Math.max(1, steps) * CHAPTER_RANGE_SIZE;
}

export interface ChapterRange {
  /** Position of its first chapter in the published list (0-based). */
  start: number;
  /** Displayed numbers of its first and last chapter. */
  firstNumber: number;
  lastNumber: number;
  chapters: readonly ChapterListItem[];
}

/** The published chapters (reading order) cut into consecutive ranges. Positions, not numbers: gaps are fine. */
export function chapterRanges(chapters: readonly ChapterListItem[]): ChapterRange[] {
  const size = chapterRangeSize(chapters.length);
  const ranges: ChapterRange[] = [];
  for (let start = 0; start < chapters.length; start += size) {
    const slice = chapters.slice(start, start + size);
    const first = slice[0];
    const last = slice[slice.length - 1];
    if (!first || !last) continue;
    ranges.push({ start, firstNumber: first.number, lastNumber: last.number, chapters: slice });
  }
  return ranges;
}

/** Index of the range holding the chapter `slug`, or -1. */
export function rangeIndexOf(ranges: readonly ChapterRange[], slug: string | undefined): number {
  if (slug === undefined) return -1;
  return ranges.findIndex((range) => range.chapters.some((chapter) => chapter.slug === slug));
}

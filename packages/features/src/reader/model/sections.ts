import type { ReaderBlock } from "./chapter.ts";

/** A heading of the chapter, as the "In this chapter" outline lists it. */
export interface ChapterSection {
  id: string;
  label: string;
}

/** The chapter's headings with text, in reading order (what the outline in the contents sheet shows). */
export function chapterSections(blocks: readonly ReaderBlock[]): ChapterSection[] {
  return blocks.flatMap((block) => {
    if (block.type !== "heading") return [];
    const label = block.text.trim();
    return label === "" ? [] : [{ id: block.id, label }];
  });
}

/**
 * The section being read: the last heading whose top (px from the viewport top) is at or above `line`. Before the
 * first heading it is the first one (the reader is in its lead-in). -1 when there are no headings.
 */
export function currentSection(headingTops: readonly number[], line: number): number {
  if (headingTops.length === 0) return -1;
  let index = 0;
  headingTops.forEach((top, i) => {
    if (top <= line) index = i;
  });
  return index;
}

/** The reading line: a third of the way down the screen, like focus mode's. */
export function readingLinePx(): number {
  return typeof window === "undefined" ? 0 : window.innerHeight / 3;
}

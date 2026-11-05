import type { ReaderBlock } from "./chapter.ts";

/** One stretch of text the speech engine reads in one go: a paragraph or a heading of the chapter. */
export interface SpokenBlock {
  id: string;
  text: string;
}

/** What "read aloud" says, in reading order: the text blocks with something in them (images and dividers are skipped). */
export function readAloudQueue(blocks: readonly ReaderBlock[]): SpokenBlock[] {
  return blocks.flatMap((block) => {
    if (block.type !== "paragraph" && block.type !== "heading") return [];
    const text = block.text.trim();
    return text === "" ? [] : [{ id: block.id, text }];
  });
}

/**
 * Where to start reading: the first block whose bottom is below `line` (the reader bar), from the block tops/bottoms
 * on screen. A reader who scrolled halfway hears the chapter from where they are, not from the top. -1 = none left.
 */
export function firstUnreadBlock(bottoms: readonly number[], line: number): number {
  return bottoms.findIndex((bottom) => bottom > line);
}

/** Share of the queue already read, for the button's ring. */
export function readAloudProgress(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, index / total));
}

/** Speech lang tag of an app language ("vi" → "vi-VN"); voices are looked up by it. */
export function speechLang(language: string): string {
  return language === "vi" ? "vi-VN" : language === "en" ? "en-US" : language;
}

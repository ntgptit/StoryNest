/**
 * Reading speed behind "N minutes left" (BR-READ-019), in words per minute. Words are counted like the chapter's
 * word count (whitespace-separated, so a Vietnamese syllable is one word). 200 is a calm silent-reading pace for
 * fiction, deliberately on the slow side so the estimate is rarely short of the real time.
 */
export const READING_WORDS_PER_MINUTE = 200;

/** The share of the text counted as read from which the chapter shows as finished (the element's 98.5 %). */
export const FINISHED_RATIO = 0.985;

export interface TimeLeft {
  /** Whole minutes still to read, at least 1 until the chapter is finished. */
  minutes: number;
  done: boolean;
}

/**
 * Minutes left in a chapter of `wordCount` words when `ratio` (0..1) of its text has been scrolled past: the unread
 * words at READING_WORDS_PER_MINUTE, rounded up. A chapter without words is done at once.
 */
export function timeLeft(wordCount: number, ratio: number): TimeLeft {
  const read = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  if (!(wordCount > 0) || read >= FINISHED_RATIO) return { minutes: 0, done: true };
  return { minutes: Math.max(1, Math.ceil((wordCount * (1 - read)) / READING_WORDS_PER_MINUTE)), done: false };
}

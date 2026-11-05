// Story length filter of the home feed (Lucian 024): a range of words over fixed buckets (story_length_histogram).
import { STORY_LENGTH_EDGES } from "@storynest/validation";

/** Words of a story, from `min` (inclusive) to `max` (exclusive); null = no upper bound. */
export interface WordRange {
  min: number;
  max: number | null;
}

const EDGES: readonly number[] = STORY_LENGTH_EDGES;
const LAST = EDGES.length - 1;

/** Upper edge of bucket i (exclusive), or null for the open last bucket. */
const upper = (i: number): number | null => (i >= LAST ? null : (EDGES[i + 1] ?? null));

/** The range that bucket indexes lo..hi cover; null when that is every bucket (no filter). */
export function bucketsToRange(lo: number, hi: number): WordRange | null {
  const a = Math.max(0, Math.min(lo, hi, LAST));
  const b = Math.min(LAST, Math.max(lo, hi, 0));
  if (a === 0 && b === LAST) return null;
  return { min: EDGES[a] ?? 0, max: upper(b) };
}

/** The bucket indexes a range covers (the whole track when there is none). */
export function rangeToBuckets(range: WordRange | undefined | null): [number, number] {
  if (!range) return [0, LAST];
  const lo = Math.max(0, EDGES.indexOf(range.min));
  const hi = range.max === null ? LAST : Math.max(lo, EDGES.indexOf(range.max) - 1);
  return [lo, Math.min(hi, LAST)];
}

/**
 * Reads the `words` address parameter ("2000-30000", "100000-" for no upper bound). Only bucket edges are accepted,
 * so an address cannot ask for a range the histogram cannot show; anything else is no filter.
 */
export function parseWordsParam(value: string | null | undefined): WordRange | undefined {
  if (!value) return undefined;
  const match = /^(\d+)-(\d*)$/.exec(value);
  if (!match) return undefined;
  const min = Number(match[1]);
  const max = match[2] === "" ? null : Number(match[2]);
  if (!EDGES.includes(min) || (max !== null && (!EDGES.includes(max) || max <= min))) return undefined;
  if (min === 0 && max === null) return undefined;
  return { min, max };
}

export function wordsParam(range: WordRange): string {
  return `${range.min}-${range.max ?? ""}`;
}

/** "2k", "100k", "0": the short edge labels under the track. */
export function formatWords(words: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 0 }).format(words);
}

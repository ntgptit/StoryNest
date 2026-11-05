import { HIGHLIGHT_STYLES, SERVER_LIMITS, type HighlightStyle } from "@storynest/validation";

/** One row of list_my_highlights. */
export interface HighlightRow {
  id: string;
  block_id: string;
  start_offset: number;
  end_offset: number;
  style: string;
  created_at: string;
  stale: boolean;
}

/** A personal highlight: a range [start, end) of one paragraph's text, in UTF-16 code units. */
export interface Highlight {
  id: string;
  blockId: string;
  start: number;
  end: number;
  style: HighlightStyle;
  /** The paragraph's text changed since (re-publish): the range may point at other words, so it is not drawn. */
  stale: boolean;
}

const isStyle = (value: string): value is HighlightStyle => (HIGHLIGHT_STYLES as readonly string[]).includes(value);

export function toHighlights(rows: readonly HighlightRow[]): Highlight[] {
  return rows.flatMap((row) =>
    isStyle(row.style) && row.end_offset > row.start_offset
      ? [
          {
            id: row.id,
            blockId: row.block_id,
            start: row.start_offset,
            end: row.end_offset,
            style: row.style,
            stale: row.stale === true,
          },
        ]
      : [],
  );
}

/** The live highlights of each block (stale ones are kept on the server but not drawn). */
export function highlightsByBlock(highlights: readonly Highlight[]): Record<string, Highlight[]> {
  const byBlock: Record<string, Highlight[]> = {};
  for (const h of highlights) {
    if (h.stale) continue;
    (byBlock[h.blockId] ??= []).push(h);
  }
  return byBlock;
}

/**
 * The range a selection asks for, kept inside the paragraph's text and the server's length limit, or null when nothing
 * is left (a selection made only of the trailing button, or of spaces).
 */
export function highlightRange(start: number, end: number, textLength: number): { start: number; end: number } | null {
  const from = Math.max(0, Math.min(start, textLength));
  const to = Math.min(end, textLength, from + SERVER_LIMITS.highlightLength);
  return to > from ? { start: from, end: to } : null;
}

/** My live highlights in `blockId` that overlap [start, end): what "Remove highlight" takes away. */
export function overlapping(
  highlights: readonly Highlight[],
  blockId: string,
  start: number,
  end: number,
): Highlight[] {
  return highlights.filter((h) => !h.stale && h.blockId === blockId && h.start < end && h.end > start);
}

/**
 * Spoiler convention of comment bodies (BR-CMT-SPOILER): text written between two pairs of bars, `||like this||`, is
 * shown covered until the reader presses it. Rendering only: the body is stored and sent exactly as written, so
 * notifications, excerpts and moderation see the plain text with its bars.
 */
export const SPOILER_MARK = "||";

export interface BodySegment {
  text: string;
  spoiler: boolean;
}

/**
 * Cuts a comment body into plain and spoiler segments. A spoiler needs a closing `||` and some non-space text in
 * between; an unclosed `||` or an empty pair (`||||`, `|| ||`) stays as typed. Spoilers do not nest.
 */
export function splitSpoilers(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  let plain = "";
  let index = 0;
  while (index < body.length) {
    const open = body.indexOf(SPOILER_MARK, index);
    if (open === -1) break;
    const close = body.indexOf(SPOILER_MARK, open + SPOILER_MARK.length);
    if (close === -1) break;
    const inner = body.slice(open + SPOILER_MARK.length, close);
    if (inner.trim() === "") {
      // Not a spoiler: keep the first bars as text and look again from the second pair.
      plain += body.slice(index, close);
      index = close;
      continue;
    }
    plain += body.slice(index, open);
    if (plain !== "") segments.push({ text: plain, spoiler: false });
    plain = "";
    segments.push({ text: inner, spoiler: true });
    index = close + SPOILER_MARK.length;
  }
  plain += body.slice(index);
  if (plain !== "") segments.push({ text: plain, spoiler: false });
  return segments;
}

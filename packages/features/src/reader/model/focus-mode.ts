/**
 * Reading focus (BR-READ-020): an optional mode that dims every block of the chapter except the one at the reading
 * line. It is a device setting kept apart from the reader preferences: those are synced to the account in a row with
 * fixed keys (BR-READ-016/017), this one never leaves the device.
 */

/** localStorage key of the on/off choice ("1" = on). Off when missing, unreadable or anything else. */
export const READER_FOCUS_STORAGE_KEY = "storynest.readerFocus";

/** The reading line, as a share of the viewport height from the top: the block crossing it is the one in focus. */
export const FOCUS_LINE = 0.4;

export interface BlockBox {
  top: number;
  bottom: number;
}

/**
 * Index of the block crossing the line `line` (viewport px), or else the one closest to it; -1 when there are no
 * blocks. Gaps between blocks go to the nearest neighbour, so the focus never falls on nothing.
 */
export function blockAtLine(boxes: readonly BlockBox[], line: number): number {
  let best = -1;
  let bestDistance = Infinity;
  boxes.forEach((box, index) => {
    const distance = line < box.top ? box.top - line : line > box.bottom ? line - box.bottom : 0;
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

/** The neighbouring index in direction `by`, staying within 0..count-1. */
export function stepFocus(index: number, by: 1 | -1, count: number): number {
  if (count <= 0) return -1;
  return Math.min(count - 1, Math.max(0, (index < 0 ? 0 : index) + by));
}

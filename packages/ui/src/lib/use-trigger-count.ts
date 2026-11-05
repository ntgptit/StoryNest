import { useState } from "react";

/**
 * Counts how many times `value` changed in a way `shouldTrigger(previous, next)` accepts, starting at 0 on the first
 * render. Animated widgets pass the count as a React `key` to replay a CSS animation on each trigger and skip it on
 * mount (count 0), so content that is already in its final state (a story already saved, unread notifications already
 * there) never animates when the page loads.
 *
 * Implemented as "adjust state while rendering" (no effect), so the replay starts in the same commit as the change.
 */
export function useTriggerCount<T>(value: T, shouldTrigger: (previous: T, next: T) => boolean): number {
  const [previous, setPrevious] = useState(value);
  const [count, setCount] = useState(0);
  if (!Object.is(value, previous)) {
    setPrevious(value);
    if (shouldTrigger(previous, value)) setCount((current) => current + 1);
  }
  return count;
}

/**
 * Trigger when a flag turns on (false → true). `undefined` means "not loaded yet": undefined → true is the first load,
 * not a change, so it does not trigger.
 */
export const turnedOn = (previous: boolean | undefined, next: boolean | undefined) =>
  previous === false && next === true;

/** Trigger when a known number goes up. undefined → n is the first load and does not trigger. */
export const increased = (previous: number | undefined, next: number | undefined) =>
  previous !== undefined && next !== undefined && next > previous;

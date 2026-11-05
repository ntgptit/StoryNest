/* Lucian UX/UI Prompt #212 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#212 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Pixels the page must keep moving in one direction before the header hides (down) or comes back (up). */
export const HIDE_ON_SCROLL_THRESHOLD = 8;
/** Near the top of the page the header always shows. */
export const HIDE_ON_SCROLL_TOP_ZONE = 60;

/**
 * Whether a header should be tucked away: `hidden` turns true after the window scrolled down by more than
 * `threshold` pixels in a row, false again as soon as it scrolls back up by `threshold`, and is always false within
 * `topZone` of the top. The small threshold keeps a jittery finger or trackpad from flickering the header. Scroll
 * events are read at most once per animation frame. `reveal()` brings the header back until the next scroll-down
 * (e.g. when the keyboard focus moves into it). Disabled (the default on most pages) it is always false and listens
 * to nothing.
 *
 * Reduced motion does not change the answer: the header still gets out of the way, only without sliding (the global
 * reduced-motion clamp in tokens.css turns the transition off).
 */
export function useHideOnScroll(
  enabled: boolean,
  { threshold = HIDE_ON_SCROLL_THRESHOLD, topZone = HIDE_ON_SCROLL_TOP_ZONE } = {},
): { hidden: boolean; reveal: () => void } {
  const [hidden, setHidden] = useState(false);
  // Distance moved in the current direction: positive while going down, negative while going up.
  const run = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let last = window.scrollY;
    let frame = 0;
    run.current = 0;

    const read = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - last;
      last = y;
      if (delta === 0) return;
      run.current = delta > 0 === run.current > 0 ? run.current + delta : delta;
      if (y <= topZone) setHidden(false);
      else if (run.current > threshold) setHidden(true);
      else if (run.current < -threshold) setHidden(false);
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(read);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
      setHidden(false);
    };
  }, [enabled, threshold, topZone]);

  const reveal = useCallback(() => {
    run.current = 0;
    setHidden(false);
  }, []);

  return { hidden: enabled && hidden, reveal };
}

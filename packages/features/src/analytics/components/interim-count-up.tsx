"use client";

// INTERIM — to be replaced by RollingNumber (packages/ui/src/widgets/rolling-number.tsx, built by another batch) after
// merge. Deliberately private to the analytics feature so there is no competing shared count-up widget in packages/ui.
// Count-up adapted from Lucian 047 (Period segmented control, MIT (c) 2026 Seokwoooo): 750 ms, ease-out quart.

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 750;
const easeOutQuart = (k: number) => 1 - (1 - k) ** 4;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * A number that counts from its previous value to a new one when it changes (a range switch), and is simply shown on
 * first render (first data load) and with reduced motion. While it counts, the moving digits are hidden from screen
 * readers and the final value is offered instead, so only one number is ever read.
 */
export function InterimCountUp({ value, format }: { value: number; format: (value: number) => string }) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const targetRef = useRef(value);

  useEffect(() => {
    if (value === targetRef.current) return; // first render, or nothing new
    targetRef.current = value;
    const from = shownRef.current;
    const set = (next: number) => {
      shownRef.current = next;
      setShown(next);
    };
    if (prefersReducedMotion() || typeof window.requestAnimationFrame !== "function") {
      set(value);
      return;
    }
    let start: number | null = null;
    let frame = 0;
    const step = (now: number) => {
      start ??= now;
      const k = Math.min(1, (now - start) / DURATION_MS);
      set(k >= 1 ? value : from + (value - from) * easeOutQuart(k));
      if (k < 1) frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    // A new value mid-count starts from wherever the digits are (shownRef), so it never jumps back.
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  if (shown === value) return <>{format(value)}</>;
  return (
    <>
      <span aria-hidden data-slot="counting">
        {format(Math.round(shown))}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}

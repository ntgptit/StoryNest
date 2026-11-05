"use client";

import { useEffect, useState, type RefObject } from "react";

import { cn } from "../lib/utils.ts";

/** Fraction (0..1) of the scrollable distance already scrolled. A page that does not scroll counts as 0. */
export function scrollRatio(scrollTop: number, scrollHeight: number, clientHeight: number): number {
  const scrollable = scrollHeight - clientHeight;
  if (!(scrollable > 0) || !Number.isFinite(scrollTop)) return 0;
  return Math.min(1, Math.max(0, scrollTop / scrollable));
}

/**
 * The page scroll as `scrollRatio` of the window, measured at most once per frame. With `endRef` the distance ends
 * where that element ends instead of at the bottom of the page: 1 once its bottom edge is in view (also when it fits on
 * the first screen), so a long comment section after the text does not count as reading.
 */
export function useScrollProgress(endRef?: RefObject<Element | null>): number {
  const [ratio, setRatio] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const end = endRef?.current;
      if (!end) {
        setRatio(scrollRatio(window.scrollY, root.scrollHeight, root.clientHeight));
        return;
      }
      const bottom = end.getBoundingClientRect().bottom + window.scrollY;
      setRatio(bottom <= root.clientHeight ? 1 : scrollRatio(window.scrollY, bottom, root.clientHeight));
    };
    // One state update per frame at most, however fast the scroll events arrive.
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [endRef]);

  return ratio;
}

/** Thin bar showing how far down the page the reader is. `label` is the accessible name of the progressbar. */
export function ReadingProgress({ label, className }: { label: string; className?: string }) {
  const ratio = useScrollProgress();
  const percent = Math.round(ratio * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("h-0.5 w-full bg-transparent", className)}
    >
      <div className="h-full origin-left bg-primary transition-[width] duration-100" style={{ width: `${percent}%` }} />
    </div>
  );
}

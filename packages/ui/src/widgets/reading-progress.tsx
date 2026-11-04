"use client";

import { useEffect, useState } from "react";

import { cn } from "../lib/utils.ts";

/** Fraction (0..1) of the scrollable distance already scrolled. A page that does not scroll counts as 0. */
export function scrollRatio(scrollTop: number, scrollHeight: number, clientHeight: number): number {
  const scrollable = scrollHeight - clientHeight;
  if (!(scrollable > 0) || !Number.isFinite(scrollTop)) return 0;
  return Math.min(1, Math.max(0, scrollTop / scrollable));
}

/** Thin bar showing how far down the page the reader is. `label` is the accessible name of the progressbar. */
export function ReadingProgress({ label, className }: { label: string; className?: string }) {
  const [ratio, setRatio] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.documentElement;
      setRatio(scrollRatio(window.scrollY, root.scrollHeight, root.clientHeight));
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
  }, []);

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

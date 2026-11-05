/* Lucian UX/UI Prompt #301 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#301 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useState } from "react";

import { cn } from "../lib/utils.ts";
import { RollingNumber } from "./rolling-number.tsx";

export interface SizeShrinkLabels {
  original: string;
  result: string;
  /** "−97% smaller" style text for a whole percentage. */
  saved: (percent: number) => string;
  /** The whole comparison as one sentence for screen readers. */
  summary: (original: string, result: string, percent: number) => string;
}

/** How much smaller `result` is than `original`, in whole percent (0 when it is not smaller). */
export function savedPercent(original: number, result: number): number {
  if (!(original > 0) || !(result >= 0) || result >= original) return 0;
  return Math.round((1 - result / original) * 100);
}

/**
 * Original and prepared file size of a picture (the size bars of Lucian 301): two bars, the second shrinking from full
 * length to its share of the first, and the saving rolling up beside them. It is shown after an upload the person
 * started, so the shrink plays when it appears and again when the numbers change. Screen readers get one sentence
 * (`labels.summary`); the bars are decoration. `formatSize` turns bytes into text ("3.2 MB").
 */
export function SizeShrink({
  original,
  result,
  formatSize,
  labels,
  className,
}: {
  original: number;
  result: number;
  formatSize: (bytes: number) => string;
  labels: SizeShrinkLabels;
  className?: string;
}) {
  const percent = savedPercent(original, result);
  const ratio = original > 0 ? Math.min(1, result / original) : 1;
  // The bar and the number start full / at zero and move to the values two frames later, so the change is seen.
  const [shown, setShown] = useState({ ratio: 1, percent: 0 });
  useEffect(() => {
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setShown({ ratio, percent }));
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [ratio, percent]);

  const row = (label: string, bytes: number, width: number, tone: string) => (
    <div className="grid grid-cols-[minmax(0,5.5rem)_1fr_auto] items-center gap-2">
      <span className="truncate">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-muted">
        <span
          data-part="bar"
          className={cn("block h-full rounded-full transition-[width] duration-500 ease-glide", tone)}
          style={{ width: `${Math.max(width * 100, 2)}%` }}
        />
      </span>
      <span className="text-right font-medium text-foreground tabular-nums">{formatSize(bytes)}</span>
    </div>
  );

  return (
    <div
      data-slot="size-shrink"
      className={cn("flex max-w-xs flex-col gap-1.5 text-xs text-muted-foreground", className)}
    >
      <p className="sr-only">{labels.summary(formatSize(original), formatSize(result), percent)}</p>
      <div aria-hidden className="flex flex-col gap-1.5">
        {row(labels.original, original, 1, "bg-muted-foreground/50")}
        {row(labels.result, result, shown.ratio, "bg-primary")}
        {percent > 0 ? (
          <span className="font-medium text-primary">
            <RollingNumber value={shown.percent} format={labels.saved} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

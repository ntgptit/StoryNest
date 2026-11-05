/* Lucian UX/UI Prompt #024 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#024 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";

import { cn } from "../lib/utils.ts";
import { RollingNumber } from "./rolling-number.tsx";

export interface HistogramBucket {
  key: string;
  /** What the bucket covers, for the thumbs' value text ("10k–30k words"). */
  label: string;
  /** Short edge label under the track ("10k"). */
  edge: string;
  count: number;
}

export interface RangeHistogramText {
  /** Names of the two thumbs. */
  minThumb: string;
  maxThumb: string;
  /** The line above the bars, from the first to the last picked bucket: "2k – 30k words". */
  range: (from: HistogramBucket, to: HistogramBucket) => string;
  /** The rolling result count, formatted for the locale: "128 stories". */
  results: (count: number) => string;
}

/**
 * A range filter over a histogram (Lucian 024): two thumbs pick the first and last bucket; the bars inside the range
 * rise in the accent colour and the ones outside sink and fade, and the result count rolls to the new total. Drag a
 * thumb, or focus it and use the arrow keys, Home and End. The value is a pair of bucket indexes, inclusive, and the
 * thumbs never cross.
 */
export function RangeHistogram({
  buckets,
  value,
  onChange,
  text,
  className,
}: {
  buckets: readonly HistogramBucket[];
  value: readonly [number, number];
  onChange: (value: [number, number]) => void;
  text: RangeHistogramText;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const last = Math.max(0, buckets.length - 1);
  const lo = Math.min(Math.max(0, value[0]), last);
  const hi = Math.max(lo, Math.min(value[1], last));
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const inRange = buckets.slice(lo, hi + 1).reduce((sum, b) => sum + b.count, 0);
  const from = buckets[lo];
  const to = buckets[hi];

  const set = (thumb: 0 | 1, index: number) => {
    const next = Math.min(last, Math.max(0, index));
    if (thumb === 0) onChange([Math.min(next, hi), hi]);
    else onChange([lo, Math.max(next, lo)]);
  };
  const indexAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.round(((clientX - rect.left) / rect.width) * last);
  };
  const onKey = (thumb: 0 | 1) => (event: KeyboardEvent<HTMLSpanElement>) => {
    const current = thumb === 0 ? lo : hi;
    const next = {
      ArrowLeft: current - 1,
      ArrowDown: current - 1,
      ArrowRight: current + 1,
      ArrowUp: current + 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    set(thumb, next);
  };
  const drag = (thumb: 0 | 1) => ({
    onPointerDown: (event: PointerEvent<HTMLSpanElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus();
    },
    onPointerMove: (event: PointerEvent<HTMLSpanElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) set(thumb, indexAt(event.clientX));
    },
  });
  const position = (index: number) => `${last === 0 ? 0 : (index / last) * 100}%`;

  return (
    <div data-slot="range-histogram" className={cn("flex w-full flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{from && to ? text.range(from, to) : null}</span>
        <span aria-live="polite" className="text-sm text-muted-foreground">
          <RollingNumber value={inRange} format={text.results} />
        </span>
      </div>
      <div aria-hidden className="flex h-20 items-end gap-1">
        {buckets.map((bucket, i) => {
          const inside = i >= lo && i <= hi;
          return (
            <span
              key={bucket.key}
              className={cn(
                "flex-1 origin-bottom rounded-t-sm transition-[background-color,transform,opacity] duration-550 ease-spring",
                inside ? "bg-primary" : "translate-y-1 scale-y-75 bg-muted-foreground/30 opacity-60",
              )}
              style={{ height: `${Math.max(4, (bucket.count / max) * 100)}%` }}
            />
          );
        })}
      </div>
      <div className="relative mx-5.5 h-11">
        <div ref={trackRef} className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted">
          <span
            className="absolute inset-y-0 rounded-full bg-primary"
            style={{ left: position(lo), right: `calc(100% - ${position(hi)})` }}
          />
        </div>
        {([0, 1] as const).map((thumb) => {
          const index = thumb === 0 ? lo : hi;
          const bucket = buckets[index];
          return (
            <span
              key={thumb}
              role="slider"
              tabIndex={0}
              aria-label={thumb === 0 ? text.minThumb : text.maxThumb}
              aria-valuemin={0}
              aria-valuemax={last}
              aria-valuenow={index}
              aria-valuetext={bucket?.label}
              onKeyDown={onKey(thumb)}
              {...drag(thumb)}
              className="absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none place-items-center focus-visible:outline-none active:cursor-grabbing [&:focus-visible>span]:ring-2 [&:focus-visible>span]:ring-ring"
              style={{ left: position(index) }}
            >
              <span className="size-5 rounded-full border-2 border-primary bg-background shadow transition-transform duration-350 ease-spring active:scale-110" />
            </span>
          );
        })}
      </div>
      <div aria-hidden className="mx-5.5 flex justify-between text-xs text-muted-foreground">
        {buckets.map((bucket) => (
          <span
            key={bucket.key}
            className="w-0 text-center whitespace-nowrap [&:nth-child(odd)]:visible [&:nth-child(even)]:invisible sm:[&:nth-child(even)]:visible"
          >
            {bucket.edge}
          </span>
        ))}
      </div>
    </div>
  );
}

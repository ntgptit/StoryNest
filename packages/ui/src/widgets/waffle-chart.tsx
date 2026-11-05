/* Lucian UX/UI Prompt #326 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#326 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useState } from "react";

import { cn } from "../lib/utils.ts";
import { RollingNumber } from "./rolling-number.tsx";

export type WaffleTone = 1 | 2 | 3 | 4 | 5;

export interface WaffleSegment {
  key: string;
  label: string;
  value: number;
  tone: WaffleTone;
}

export interface WaffleChartText {
  /** Name of the chart, e.g. "Reads by reader type". */
  label: string;
  /** Name of the legend group. */
  legend: string;
  /** Full sentence for one segment: "Signed in: 62% (1 240 reads)". */
  share: (segment: WaffleSegment, percent: number) => string;
  /** Shown instead of the grid when every value is 0. */
  empty: string;
}

const TONE: Record<WaffleTone, string> = {
  1: "bg-chart-1",
  2: "bg-chart-2",
  3: "bg-chart-3",
  4: "bg-chart-4",
  5: "bg-chart-5",
};
const CELLS = 100;
const DIAGONAL_MS = 22;

/** Whole cells per segment out of 100, by largest remainder, so they always add up to 100 when anything is > 0. */
export function waffleCells(values: readonly number[]): number[] {
  const total = values.reduce((sum, v) => sum + Math.max(0, v), 0);
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((v) => (Math.max(0, v) / total) * CELLS);
  const cells = exact.map(Math.floor);
  let left = CELLS - cells.reduce((sum, n) => sum + n, 0);
  const order = exact.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) {
    if (left <= 0) break;
    cells[i] = (cells[i] ?? 0) + 1;
    left -= 1;
  }
  return cells;
}

/**
 * A 10 × 10 waffle chart of shares (Lucian 326): each cell is one percent. When the values change (another window
 * picked), only the cells that change hands flip into their new colour, one after another along a diagonal wave, and
 * the percentages in the legend roll to their new values. Press a legend item to keep only that segment in focus,
 * press it again to see all. Nothing moves on the first render.
 */
export function WaffleChart({
  segments,
  text,
  className,
}: {
  segments: readonly WaffleSegment[];
  text: WaffleChartText;
  className?: string;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const counts = waffleCells(segments.map((s) => s.value));
  const owners: number[] = [];
  counts.forEach((n, index) => {
    for (let i = 0; i < n; i += 1) owners.push(index);
  });
  // Which cells changed owner since the values drawn before (none on the first render). Derived state: when the
  // values change, the render that sees it records the cells that flip and a new generation that restarts them.
  const signature = owners.join(",");
  const [drawn, setDrawn] = useState({ signature, owners, flips: new Set<number>(), generation: 0 });
  if (drawn.signature !== signature) {
    const flips = new Set(owners.flatMap((owner, i) => (drawn.owners[i] !== owner ? [i] : [])));
    setDrawn({ signature, owners, flips, generation: drawn.generation + 1 });
  }
  const flipping = drawn.signature === signature ? drawn.flips : new Set<number>();

  const total = counts.reduce((sum, n) => sum + n, 0);
  const sumValues = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);

  return (
    <div data-slot="waffle-chart" className={cn("flex flex-wrap items-start gap-5", className)}>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">{text.empty}</p>
      ) : (
        <div
          role="img"
          aria-label={text.label}
          className="grid w-full max-w-56 grid-cols-10 gap-1 perspective-midrange"
        >
          {owners.map((owner, i) => {
            const segment = segments[owner];
            if (!segment) return null;
            const flips = flipping.has(i);
            return (
              <span
                key={flips ? `${i}-${drawn.generation}` : i}
                aria-hidden
                className={cn(
                  "aspect-square rounded-sm transition-opacity duration-250",
                  TONE[segment.tone],
                  flips && "animate-cell-flip",
                  focus !== null && focus !== segment.key && "opacity-20",
                )}
                style={flips ? { animationDelay: `${((i % 10) + Math.floor(i / 10)) * DIAGONAL_MS}ms` } : undefined}
              />
            );
          })}
        </div>
      )}
      <ul aria-label={text.legend} className="flex min-w-40 flex-col gap-1">
        {segments.map((segment) => {
          const share = sumValues > 0 ? Math.round((Math.max(0, segment.value) / sumValues) * 100) : 0;
          const pressed = focus === segment.key;
          return (
            <li key={segment.key}>
              <button
                type="button"
                aria-pressed={pressed}
                aria-label={text.share(segment, share)}
                onClick={() => setFocus(pressed ? null : segment.key)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm transition-colors duration-200 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                  pressed && "bg-muted",
                  focus !== null && !pressed && "text-muted-foreground",
                )}
              >
                <span aria-hidden className={cn("size-3 shrink-0 rounded-sm", TONE[segment.tone])} />
                <span className="flex-1">{segment.label}</span>
                <span aria-hidden className="font-semibold tabular-nums">
                  <RollingNumber value={share} format={(n) => `${n}%`} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

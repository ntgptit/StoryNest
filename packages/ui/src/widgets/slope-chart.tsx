/* Lucian UX/UI Prompt #359 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#359 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useState } from "react";

import { cn } from "../lib/utils.ts";

export interface SlopeEnd {
  rank: number;
  score: number;
}

export interface SlopeItem {
  id: string;
  label: string;
  /** Place and score at the start; null when the item was not in the list then (drawn as a new entry). */
  from: SlopeEnd | null;
  to: SlopeEnd;
}

export type SlopeMode = "rank" | "score";

export interface SlopeChartText {
  label: string;
  /** Captions of the two posts ("7 days ago", "Today"). */
  fromLabel: string;
  toLabel: string;
  /** Names of the mode switch and its two options. */
  modes: string;
  rank: string;
  score: string;
  /** An item's sentence: "Rồng lửa: 5th → 2nd". */
  item: (item: SlopeItem) => string;
  idle: string;
}

const HEIGHT = 100;
const PAD = 6;
/** Least distance between two names on the right post, in percent of the height (about one line). */
const LABEL_GAP = 7;

/**
 * Where to put the names on the right post: at their line's end, pushed apart just enough not to overlap (in Score
 * mode two stories can end at the same height), then pulled back inside the chart when the stack runs off the bottom.
 */
export function spreadLabels(ends: readonly { id: string; y: number }[]): Map<string, number> {
  const sorted = [...ends].sort((a, b) => a.y - b.y);
  const placed: number[] = [];
  sorted.forEach((end, i) => {
    const previous = placed[i - 1];
    placed.push(previous === undefined ? end.y : Math.max(end.y, previous + LABEL_GAP));
  });
  const overflow = (placed.at(-1) ?? 0) - (HEIGHT - PAD / 2);
  if (overflow > 0) {
    for (let i = placed.length - 1; i >= 0; i -= 1) {
      const below = placed[i + 1];
      const value = placed[i] ?? 0;
      placed[i] = below === undefined ? value - overflow : Math.min(value, below - LABEL_GAP);
    }
  }
  return new Map(sorted.map((end, i) => [end.id, Math.max(0, placed[i] ?? end.y)]));
}

/**
 * Two posts joined by one line per item (Lucian 359): where each item stood at the start and where it stands now.
 * Climbers are drawn in the accent colour, fallers in the destructive colour, new entries as a dot on the right post.
 * Switch between Rank and Score and each end slides to its other position (so lines cross in Rank mode), only when the
 * reader switches; nothing is drawn in on the first render. Press a name to keep only its line and read how far it
 * moved; press again to see all.
 */
export function SlopeChart({
  items,
  text,
  className,
}: {
  items: readonly SlopeItem[];
  text: SlopeChartText;
  className?: string;
}) {
  const [mode, setMode] = useState<SlopeMode>("rank");
  const [focus, setFocus] = useState<string | null>(null);
  const places = Math.max(1, ...items.flatMap((item) => [item.to.rank, item.from?.rank ?? 0]));
  const maxScore = Math.max(1, ...items.flatMap((item) => [item.to.score, item.from?.score ?? 0]));
  const y = (end: SlopeEnd) =>
    mode === "rank"
      ? PAD + ((end.rank - 1) / Math.max(1, places - 1)) * (HEIGHT - 2 * PAD)
      : PAD + (1 - end.score / maxScore) * (HEIGHT - 2 * PAD);
  const focused = items.find((item) => item.id === focus);
  const labelTop = spreadLabels(items.map((item) => ({ id: item.id, y: y(item.to) })));

  return (
    <div data-slot="slope-chart" className={cn("flex w-full flex-col gap-3", className)}>
      <div role="group" aria-label={text.modes} className="flex gap-1 self-end">
        {(["rank", "score"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
            className="min-h-9 rounded-full border px-3 text-sm transition-colors duration-200 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
          >
            {text[option]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[5rem_1fr] gap-2 sm:grid-cols-[8rem_1fr]">
        <div className="relative h-72">
          <span className="absolute -top-5 left-0 text-xs text-muted-foreground">{text.fromLabel}</span>
          <span className="absolute -top-5 right-0 text-xs text-muted-foreground">{text.toLabel}</span>
          <svg
            role="img"
            aria-label={text.label}
            viewBox={`0 0 100 ${HEIGHT}`}
            preserveAspectRatio="none"
            className="size-full overflow-visible"
          >
            <line x1="4" x2="4" y1="0" y2={HEIGHT} className="stroke-border" vectorEffect="non-scaling-stroke" />
            <line x1="96" x2="96" y1="0" y2={HEIGHT} className="stroke-border" vectorEffect="non-scaling-stroke" />
            {items.map((item) => {
              const to = y(item.to);
              const dim = focus !== null && focus !== item.id;
              if (!item.from) {
                return (
                  <circle
                    key={item.id}
                    cx="96"
                    cy={to}
                    r="1.6"
                    className={cn("fill-chart-4 transition-[opacity,cy] duration-550 ease-race", dim && "opacity-15")}
                  />
                );
              }
              const from = y(item.from);
              const tone =
                item.to.rank < item.from.rank
                  ? "stroke-chart-2"
                  : item.to.rank > item.from.rank
                    ? "stroke-destructive"
                    : "stroke-muted-foreground";
              return (
                <path
                  key={item.id}
                  d={`M 4 ${from.toFixed(2)} L 96 ${to.toFixed(2)}`}
                  vectorEffect="non-scaling-stroke"
                  className={cn(
                    "fill-none transition-[d,opacity] duration-550 ease-race",
                    tone,
                    focus === item.id ? "stroke-3" : "stroke-2",
                    dim && "opacity-15",
                  )}
                />
              );
            })}
          </svg>
        </div>
        <ul className="relative h-72">
          {items.map((item) => {
            const pressed = focus === item.id;
            return (
              <li
                key={item.id}
                className="absolute inset-x-0 -translate-y-1/2 transition-[top] duration-550 ease-race"
                style={{ top: `${labelTop.get(item.id) ?? y(item.to)}%` }}
              >
                <button
                  type="button"
                  aria-pressed={pressed}
                  aria-label={text.item(item)}
                  onClick={() => setFocus(pressed ? null : item.id)}
                  className={cn(
                    "flex min-h-6 max-w-full items-center gap-1 truncate rounded px-1 text-left text-xs transition-opacity duration-250 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                    focus !== null && !pressed && "opacity-30",
                    pressed && "font-semibold",
                  )}
                >
                  <span className="tabular-nums text-muted-foreground">
                    {mode === "rank" ? item.to.rank : item.to.score}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {focused ? text.item(focused) : text.idle}
      </p>
    </div>
  );
}

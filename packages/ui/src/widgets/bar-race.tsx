/* Lucian UX/UI Prompt #246 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#246 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

export interface RaceBar {
  id: string;
  label: string;
  value: number;
}

export interface RaceFrame {
  key: string;
  /** Big label of the frame ("Nov 5"). */
  label: string;
  /** The bars of this frame, in rank order (first = top). */
  bars: readonly RaceBar[];
}

export interface BarRaceText {
  label: string;
  play: string;
  pause: string;
  /** Name of the frame slider. */
  scrubber: string;
  /** A bar's accessible text: "2. Rồng lửa, 1 204". */
  bar: (rank: number, bar: RaceBar, value: string) => string;
}

const ROW_REM = 2.5;
const STEP_MS = 1400;
const TONES = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"] as const;

/**
 * A bar race over frames (Lucian 246): the top `rows` of each frame as bars, longest first. Moving to another frame
 * (play, or drag the slider) slides each bar to its new row and length, so a story that climbs visibly overtakes the
 * one above; bars that leave the top fall away below and new ones rise in. Play steps through the frames and stops at
 * the last; it never starts by itself. Each story keeps one colour for the whole race.
 */
export function BarRace({
  frames,
  rows = 6,
  format = String,
  text,
  className,
}: {
  frames: readonly RaceFrame[];
  rows?: number;
  format?: (value: number) => string;
  text: BarRaceText;
  className?: string;
}) {
  const last = Math.max(0, frames.length - 1);
  const [index, setIndex] = useState(last);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((i) => {
        if (i >= last) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [playing, last]);

  const frame = frames[Math.min(index, last)];
  // Every story that appears in any frame gets a fixed row element and a fixed colour.
  const everyone = new Map<string, { label: string; tone: string }>();
  for (const f of frames) {
    for (const bar of f.bars) {
      if (!everyone.has(bar.id))
        everyone.set(bar.id, { label: bar.label, tone: TONES[everyone.size % TONES.length] ?? "bg-chart-1" });
    }
  }
  const top = (frame?.bars ?? []).slice(0, rows);
  const max = Math.max(1, ...top.map((bar) => bar.value));

  return (
    <div data-slot="bar-race" className={cn("flex w-full flex-col gap-3", className)}>
      <div role="list" aria-label={text.label} className="relative" style={{ height: `${rows * ROW_REM}rem` }}>
        {[...everyone.entries()].map(([id, info]) => {
          const rank = top.findIndex((bar) => bar.id === id);
          const bar = rank >= 0 ? top[rank] : undefined;
          const shown = bar !== undefined;
          return (
            <div
              key={id}
              role={shown ? "listitem" : undefined}
              aria-hidden={shown ? undefined : true}
              aria-label={bar ? text.bar(rank + 1, bar, format(bar.value)) : undefined}
              className={cn(
                "absolute inset-x-0 top-0 flex items-center gap-2 transition-[transform,opacity] duration-550 ease-race",
                !shown && "opacity-0",
              )}
              style={{
                height: `${ROW_REM}rem`,
                transform: `translateY(${(shown ? rank : rows) * ROW_REM}rem)`,
              }}
            >
              <span aria-hidden className="w-28 shrink-0 truncate text-right text-xs text-muted-foreground sm:w-40">
                {info.label}
              </span>
              <span aria-hidden className="relative flex h-7 flex-1 items-center">
                <span
                  className={cn("h-full rounded-r-md transition-[width] duration-550 ease-race", info.tone)}
                  style={{ width: `${bar ? Math.max(2, (bar.value / max) * 85) : 0}%` }}
                />
                <span className="ml-2 text-xs font-semibold tabular-nums">{bar ? format(bar.value) : ""}</span>
              </span>
            </div>
          );
        })}
        <span
          aria-live="polite"
          className="pointer-events-none absolute right-1 bottom-0 text-2xl font-bold text-muted-foreground/60 tabular-nums"
        >
          {frame?.label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={playing ? text.pause : text.play}
          disabled={frames.length < 2}
          onClick={() => {
            if (playing) return setPlaying(false);
            if (index >= last) setIndex(0);
            setPlaying(true);
          }}
        >
          {playing ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
        </Button>
        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={Math.min(index, last)}
          aria-label={text.scrubber}
          aria-valuetext={frame?.label}
          disabled={frames.length < 2}
          onChange={(event) => {
            setPlaying(false);
            setIndex(Number(event.target.value));
          }}
          className="h-11 flex-1 accent-primary"
        />
      </div>
    </div>
  );
}

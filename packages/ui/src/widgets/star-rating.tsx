/* Lucian UX/UI Prompt #016 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#016 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";

import { useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

const STAR = "M26 4.5l6.4 13.2 14.4 2-10.5 10.1 2.6 14.3L26 37.3l-12.9 6.8 2.6-14.3L5.2 19.7l14.4-2z";
const MAX = 5;
/** Each newly lit star pops 70 ms after the one before it (the element's stagger). */
const STAGGER_MS = 70;
const SPARKS = [0, 72, 144, 216, 288];

/** The value the arrow, Home, End and digit keys lead to from `value`, or null for any other key. */
export function ratingForKey(key: string, value: number, min = 0): number | null {
  if (key === "ArrowRight" || key === "ArrowUp") return Math.min(MAX, value + 1);
  if (key === "ArrowLeft" || key === "ArrowDown") return Math.max(min, value - 1);
  if (key === "Home") return min;
  if (key === "End") return MAX;
  if (/^[0-5]$/.test(key)) return Math.max(min, Number(key));
  return null;
}

/**
 * Five-star rating (Lucian 016), a slider from 0 ("not rated") to 5: stars fill in ahead of the pointer as a preview,
 * and on a press the newly lit stars pop one after another from the left with a small sparkle; a word for the score
 * sits beside the number. Arrow keys, Home/End and the digits 0-5 work on the focused stars. `onChange(0)` means
 * "take my rating back"; set `allowClear={false}` when 0 must not be chosen. Nothing pops on first render or for a
 * value that came from the server; reduced motion skips the pop and sparkle. `disabled` shows the value only.
 */
export function StarRating({
  value,
  onChange,
  label,
  words,
  valueText,
  disabled = false,
  allowClear = true,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  /** Accessible name of the slider ("Your rating"). */
  label: string;
  /** Six words: for no rating and for 1 to 5 stars. */
  words: readonly [string, string, string, string, string, string];
  /** aria-valuetext for a value, e.g. "4 stars, Great". */
  valueText: (value: number) => string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}) {
  const [preview, setPreview] = useState(0);
  // Stars lit by the reader's own press, and how often: the pop replays only for those.
  const [pop, setPop] = useState<{ from: number; to: number; n: number }>({ from: 0, to: 0, n: 0 });
  const min = allowClear ? 0 : 1;
  const swaps = useTriggerCount(value, (previous, next) => previous !== next);

  const choose = (next: number) => {
    if (disabled || next === value) return;
    if (next > value) setPop((current) => ({ from: value, to: next, n: current.n + 1 }));
    onChange(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = ratingForKey(event.key, value, min);
    if (next === null) return;
    event.preventDefault();
    choose(next);
  };

  const word = words[Math.max(0, Math.min(MAX, value))] ?? "";

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={MAX}
        aria-valuenow={value}
        aria-valuetext={valueText(value)}
        aria-disabled={disabled || undefined}
        onKeyDown={disabled ? undefined : onKeyDown}
        onPointerLeave={() => setPreview(0)}
        className="flex gap-1 rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {Array.from({ length: MAX }, (_, index) => {
          const n = index + 1;
          const on = n <= value;
          const pre = !on && n <= preview;
          const popped = pop.n > 0 && on && n > pop.from && n <= pop.to;
          const delay = { animationDelay: `${(n - pop.from - 1) * STAGGER_MS}ms` } as CSSProperties;
          return (
            <span
              key={popped ? `${n}-${pop.n}` : n}
              onPointerEnter={() => !disabled && setPreview(n)}
              onClick={() => choose(n)}
              style={popped ? delay : undefined}
              className={cn(
                "relative size-9 [transition:transform_0.35s_var(--ease-spring)]",
                !disabled && "cursor-pointer hover:scale-110 hover:-rotate-6",
                popped && "motion-safe:animate-star-pop",
              )}
            >
              <svg viewBox="0 0 52 52" className="absolute inset-0 size-full overflow-visible" aria-hidden>
                <path d={STAR} strokeLinejoin="round" className="fill-muted stroke-border" strokeWidth={1} />
                <path
                  d={STAR}
                  className={cn(
                    "origin-[50%_55%] fill-star [transform-box:fill-box] [transition:transform_0.4s_var(--ease-spring),opacity_0.4s]",
                    on ? "scale-100 opacity-100" : pre ? "scale-[0.72] opacity-55" : "scale-0",
                  )}
                />
              </svg>
              {popped
                ? SPARKS.map((angle) => (
                    <i
                      key={angle}
                      aria-hidden
                      style={{ "--spark-angle": `${angle}deg`, ...delay } as CSSProperties}
                      className="pointer-events-none absolute top-1/2 left-1/2 -m-[3px] size-1.5 rounded-full bg-star opacity-0 motion-safe:animate-star-spark"
                    />
                  ))
                : null}
            </span>
          );
        })}
      </div>
      <div aria-hidden className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-2xl font-extrabold tracking-tight tabular-nums",
            value ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {value.toFixed(1)}
        </span>
        <span
          key={swaps}
          className={cn("text-sm font-semibold text-muted-foreground", swaps > 0 && "motion-safe:animate-hint-swap")}
        >
          {word}
        </span>
      </div>
    </div>
  );
}

/* Lucian UX/UI Prompt #399 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#399 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useRef, useState } from "react";

import { FLIP_KEY_ATTRIBUTE, useFlip } from "../lib/use-flip.ts";
import { cn } from "../lib/utils.ts";

export interface CloudWord {
  term: string;
  /** How often it came up in the period (drives the size). */
  count: number;
}

export interface CloudPeriod {
  key: string;
  /** Name on the period switch ("Nov"). */
  label: string;
  words: readonly CloudWord[];
}

export interface WordCloudText {
  /** Name of the period switch. */
  periods: string;
  /** Name of the cloud for a period ("Words in comments, November"). */
  cloud: (period: CloudPeriod) => string;
  /** A word's name and the status line when it is picked: count and change from the period before (null = new). */
  word: (word: CloudWord, change: number | null) => string;
  idle: string;
  empty: string;
}

const MIN_REM = 0.875;
const MAX_REM = 2.25;

/** Font size of a word, rem: square root of its share of the period's largest count, so a big word does not drown. */
export function cloudSize(count: number, max: number): number {
  if (max <= 0 || count <= 0) return MIN_REM;
  return MIN_REM + (MAX_REM - MIN_REM) * Math.sqrt(Math.min(1, count / max));
}

/**
 * A word cloud per period (Lucian 399): words sized by how often they come up. Switch period and the words that stay
 * grow or shrink and glide to their new spots, words that drop out go, and new ones pop in; nothing moves on the
 * first render. Press a word to see its count and its change from the period before; press again to clear. The order
 * is alphabetical, so a word keeps roughly the same place from one period to the next.
 */
export function WordCloud({
  periods,
  initialKey,
  text,
  className,
}: {
  periods: readonly CloudPeriod[];
  /** Period shown first; defaults to the last one. */
  initialKey?: string;
  text: WordCloudText;
  className?: string;
}) {
  const [key, setKey] = useState(initialKey ?? periods.at(-1)?.key ?? "");
  const [picked, setPicked] = useState<string | null>(null);
  const [switched, setSwitched] = useState(false);
  const cloudRef = useRef<HTMLDivElement>(null);
  const capture = useFlip(cloudRef);

  const index = Math.max(
    0,
    periods.findIndex((p) => p.key === key),
  );
  const period = periods[index];
  const before = index > 0 ? periods[index - 1] : undefined;
  const words = [...(period?.words ?? [])].sort((a, b) => a.term.localeCompare(b.term));
  const max = Math.max(0, ...words.map((w) => w.count));
  const changeOf = (word: CloudWord) => {
    if (!before) return null;
    const old = before.words.find((w) => w.term === word.term);
    return old ? word.count - old.count : null;
  };
  const pickedWord = words.find((w) => w.term === picked);

  return (
    <div data-slot="word-cloud" className={cn("flex w-full flex-col gap-3", className)}>
      <div role="group" aria-label={text.periods} className="flex flex-wrap gap-1">
        {periods.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={p.key === period?.key}
            onClick={() => {
              if (p.key === period?.key) return;
              capture();
              setSwitched(true);
              setKey(p.key);
            }}
            className="min-h-9 rounded-full border px-3 text-sm transition-colors duration-200 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
          >
            {p.label}
          </button>
        ))}
      </div>
      {words.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{text.empty}</p>
      ) : (
        <div
          ref={cloudRef}
          role="group"
          aria-label={period ? text.cloud(period) : undefined}
          className="flex min-h-40 flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border p-4"
        >
          {words.map((word, i) => {
            const isNew = switched && before !== undefined && !before.words.some((w) => w.term === word.term);
            const pressed = picked === word.term;
            return (
              <button
                key={word.term}
                type="button"
                {...{ [FLIP_KEY_ATTRIBUTE]: word.term }}
                aria-pressed={pressed}
                aria-label={text.word(word, changeOf(word))}
                onClick={() => setPicked(pressed ? null : word.term)}
                className={cn(
                  "rounded-md px-1 leading-tight font-semibold transition-[color,opacity,font-size] duration-750 ease-morph focus-visible:outline-2 focus-visible:outline-ring",
                  word.count >= max * 0.6
                    ? "text-primary"
                    : word.count >= max * 0.3
                      ? "text-chart-2"
                      : "text-foreground",
                  picked !== null && !pressed && "opacity-30",
                  isNew && "animate-word-pop",
                )}
                style={{
                  fontSize: `${cloudSize(word.count, max).toFixed(3)}rem`,
                  animationDelay: isNew ? `${(i % 7) * 25}ms` : undefined,
                }}
              >
                {word.term}
              </button>
            );
          })}
        </div>
      )}
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {pickedWord ? text.word(pickedWord, changeOf(pickedWord)) : text.idle}
      </p>
    </div>
  );
}

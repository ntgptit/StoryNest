/* Lucian UX/UI Prompt #036 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#036 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { cn } from "../lib/utils.ts";

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

/** Bar colour per level: empty, weak, fair, good, strong (all design tokens). */
const LEVEL_BG: Record<StrengthScore, string> = {
  0: "bg-border",
  1: "bg-destructive",
  2: "bg-chart-5",
  3: "bg-chart-4",
  4: "bg-chart-2",
};
/** The level word stays readable (AA) in both schemes: only "weak" takes a colour, the bars carry the rest. */
const LEVEL_TEXT: Record<StrengthScore, string> = {
  0: "text-muted-foreground",
  1: "text-destructive",
  2: "text-foreground",
  3: "text-foreground",
  4: "text-foreground",
};

/** Delays of the four bars, as in the element: each one starts 50 ms after the one before. */
const BAR_DELAY = ["delay-0", "delay-50", "delay-100", "delay-150"] as const;

/**
 * Advisory password meter: four bars that fill and change colour with the score, the level in words, a checklist
 * whose circles turn into checks as each point is met, and optional hints ("avoid 1234"). Pure presentation: the
 * caller computes the score and decides what is a rule and what is advice; the meter never blocks anything.
 * Everything moves with transitions, so only typing animates it.
 */
export function PasswordStrengthMeter({
  score,
  title,
  levelLabel,
  note,
  checks,
  metLabel,
  hints = [],
  className,
}: {
  score: StrengthScore;
  /** "Strength". */
  title: string;
  /** "Weak", "Fair"... for the current score (empty string while there is nothing to rate). */
  levelLabel: string;
  /** Small text next to the title, e.g. "advice only". */
  note?: string;
  checks: readonly { id: string; label: string; met: boolean }[];
  /** Read after a met check by screen readers ("done"); the circle and check are decorative. */
  metLabel: string;
  hints?: readonly string[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div aria-hidden className="grid grid-cols-4 gap-1.5">
        {BAR_DELAY.map((delay, index) => (
          <span key={delay} className="relative h-1.5 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                "absolute inset-0 origin-left rounded-full transition-[scale,background-color] duration-450 ease-soft",
                delay,
                LEVEL_BG[score],
                index < score ? "scale-x-100" : "scale-x-0",
              )}
            />
          </span>
        ))}
      </div>
      <p className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {title}
          {note ? <span className="ml-1.5 opacity-80">· {note}</span> : null}
        </span>
        <b aria-live="polite" className={cn("font-semibold transition-colors duration-400", LEVEL_TEXT[score])}>
          {levelLabel}
        </b>
      </p>
      <ul className="grid grid-cols-1 gap-x-3 gap-y-1.5 rounded-lg bg-muted/60 p-3 sm:grid-cols-2">
        {checks.map((check) => (
          <li
            key={check.id}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors duration-300",
              check.met ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "relative grid size-4 shrink-0 place-items-center rounded-full transition-[background-color,box-shadow,scale] duration-400 ease-spring",
                check.met
                  ? "scale-100 bg-chart-2 text-background"
                  : "scale-90 shadow-[inset_0_0_0_1.5px_var(--border)]",
              )}
            >
              <svg viewBox="0 0 20 20" className="size-full fill-none stroke-current stroke-[2.6]">
                <path
                  d="M5.5 10.5l3 3 6-6.5"
                  pathLength={1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "transition-[stroke-dashoffset] delay-100 duration-300 ease-soft [stroke-dasharray:1]",
                    check.met ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:1]",
                  )}
                />
              </svg>
            </span>
            <span>
              {check.label}
              {check.met ? <span className="sr-only">, {metLabel}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      {hints.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          {hints.map((hint) => (
            <li key={hint} className="flex gap-1.5 motion-safe:animate-hint-drop">
              <span aria-hidden>•</span>
              {hint}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

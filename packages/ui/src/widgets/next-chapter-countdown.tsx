/* Lucian UX/UI Prompt #265 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#265 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";

import { useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

/** Whole days, hours, minutes and seconds left until `target` (never negative). */
export function timeLeft(
  target: number,
  now: number,
): { days: number; hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.floor((target - now) / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** The share of the wait still ahead, 0..1, measured from `start` (e.g. the last chapter) to `target`. */
export function remainingShare(start: number | null, target: number, now: number): number {
  if (start === null || target <= start) return now < target ? 1 : 0;
  return Math.min(1, Math.max(0, (target - now) / (target - start)));
}

/**
 * "Next chapter in 1 d 04 h 12 min" (Lucian 265's delivery promise): the time left ticks every second and the bar
 * below shrinks with it, from the last chapter (`start`) to the next one. When the time has come the headline swaps,
 * rising in, to `dueLabel` (the cron job publishes within a minute). Nothing animates on the first render; the bar
 * moves linearly one second at a time and the global reduced-motion clamp stops even that. The live region only
 * announces the headline, not every second.
 */
export function NextChapterCountdown({
  target,
  start = null,
  headline,
  dueLabel,
  format,
  whenLabel,
  className,
}: {
  /** When the next chapter goes live (ISO). */
  target: string;
  /** When the wait began, e.g. the latest chapter (ISO); without it the bar stays full until the end. */
  start?: string | null;
  /** "Next chapter in". */
  headline: string;
  /** "New chapter any moment now". */
  dueLabel: string;
  /** Formats the parts left, e.g. ({ days: 1, hours: 4, ... }) => "1 d 04 h 12 min 05 s". */
  format: (left: ReturnType<typeof timeLeft>) => string;
  /** The absolute time, e.g. "Thursday 20:00". */
  whenLabel: string;
  className?: string;
}) {
  const targetMs = new Date(target).getTime();
  const startMs = start === null ? null : new Date(start).getTime();
  const [now, setNow] = useState(() => Date.now());
  const due = now >= targetMs;

  useEffect(() => {
    if (due) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [due, targetMs]);

  const swaps = useTriggerCount(due, (previous, next) => previous !== next);
  const share = remainingShare(startMs, targetMs, now);

  return (
    <section
      className={cn("flex w-full max-w-md flex-col gap-1.5 rounded-xl border bg-muted/40 p-4 text-sm", className)}
    >
      <div aria-live="polite" className="relative overflow-hidden">
        <p
          key={swaps}
          className={cn(
            "flex items-center gap-2 text-base font-semibold",
            swaps > 0 && "motion-safe:animate-headline-in",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-md",
              due ? "bg-chart-4 text-primary-foreground" : "bg-primary text-primary-foreground",
            )}
          >
            <CalendarClock className="size-3.5" />
          </span>
          {due ? dueLabel : headline}
        </p>
      </div>
      {due ? null : (
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{format(timeLeft(targetMs, now))}</span>
          <span aria-hidden> · </span>
          <span>{whenLabel}</span>
        </p>
      )}
      <div aria-hidden className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            "h-full origin-left rounded-full bg-primary transition-transform duration-1000 ease-linear",
            due && "opacity-30",
          )}
          style={{ transform: `scaleX(${share.toFixed(4)})` }}
        />
      </div>
    </section>
  );
}

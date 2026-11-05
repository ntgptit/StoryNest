/* Lucian UX/UI Prompt #058 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#058 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { cn } from "../lib/utils.ts";

/** The check from the Lucian element, on a 24px grid. */
const CHECK_PATH = "M6 12.5l4 4L18 8";

/**
 * Small progress ring with the reading time that is left, for a reader toolbar: the ring fills with `ratio` and turns
 * into a check once `done`. `label` ("12 minutes left") is shown from `sm` up and is the accessible text; phones show
 * `shortLabel` ("12 min"). It is not a live region: it changes on every scroll and would talk over the text. The ring
 * only moves with the reader's own scrolling, so nothing animates on first render.
 */
export function ReadingTimeLeft({
  ratio,
  done,
  label,
  shortLabel,
  className,
}: {
  /** Share of the text read, 0..1. */
  ratio: number;
  done: boolean;
  /** Full text, e.g. "12 minutes left", or "Finished" when done. */
  label: string;
  /** Compact text for narrow screens, e.g. "12 min". */
  shortLabel: string;
  className?: string;
}) {
  const fill = Math.min(1, Math.max(0, ratio));
  return (
    <span
      data-slot="reading-time-left"
      data-done={done}
      className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground", className)}
    >
      <span aria-hidden className="relative inline-flex size-5 shrink-0">
        <svg viewBox="0 0 24 24" className="size-5 -rotate-90">
          <circle cx="12" cy="12" r="9.5" fill="none" strokeWidth="2.5" className="stroke-muted" />
          <circle
            cx="12"
            cy="12"
            r="9.5"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100 - fill * 100}
            className={cn(
              "[transition:stroke_0.4s_var(--ease-soft),stroke-dashoffset_0.1s_linear]",
              done ? "stroke-chart-2" : "stroke-primary",
            )}
          />
        </svg>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "absolute inset-0.5 size-4 text-chart-2 [transition:opacity_0.3s_var(--ease-soft),transform_0.5s_var(--ease-spring)]",
            done ? "opacity-100" : "scale-40 opacity-0",
          )}
        >
          <path d={CHECK_PATH} />
        </svg>
      </span>
      <span className="sm:hidden" aria-hidden>
        {shortLabel}
      </span>
      <span className="max-sm:sr-only">{label}</span>
    </span>
  );
}

/* Lucian UX/UI Prompt #067 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#067 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import type { ReactNode } from "react";

import { cn } from "../lib/utils.ts";

/** "1:05", "0:37": the wait as a clock, the way the element shows it. */
export function formatWait(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * Lockout notice for a rate-limited form (sign in, password reset): a ring around a padlock shrinks with the time left
 * and the clock ticks down; at zero the shackle springs open and the text says the form can be sent again. The wait
 * comes from the caller (only what the server asked for, never a guess). For screen readers the region announces the
 * whole wait once and the "ready" text when it ends, not every second. The form's own submit stays the action: the
 * caller keeps it disabled while `secondsLeft > 0`.
 */
export function LockoutCountdown({
  secondsLeft,
  total,
  title,
  readyTitle,
  waitingLabel,
  action,
  className,
}: {
  secondsLeft: number;
  /** The full wait, in seconds (the ring's 100%). */
  total: number;
  /** "Too many attempts". */
  title: string;
  /** "You can try again now". */
  readyTitle: string;
  /** "Try again in 0:37" (receives the clock text). */
  waitingLabel: (clock: string) => string;
  /** Optional way out instead of waiting, e.g. a link to reset the password. */
  action?: ReactNode;
  className?: string;
}) {
  const open = secondsLeft <= 0;
  const progress = total > 0 ? Math.min(1, Math.max(0, secondsLeft / total)) : 0;
  return (
    <div
      role="status"
      data-open={open ? "" : undefined}
      className={cn("group flex items-center gap-3 rounded-md border bg-muted/50 px-3 py-3 text-sm", className)}
    >
      <span aria-hidden className="relative grid size-12 shrink-0 place-items-center">
        <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
          <circle cx="24" cy="24" r="21" className="fill-none stroke-border" strokeWidth="4" />
          <circle
            cx="24"
            cy="24"
            r="21"
            pathLength={100}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="100"
            strokeDashoffset={100 - progress * 100}
            className={cn(
              "fill-none transition-[stroke-dashoffset,stroke] duration-1000 ease-linear motion-reduce:transition-none",
              open ? "stroke-chart-2" : "stroke-primary",
            )}
          />
        </svg>
        <svg viewBox="0 0 62 70" className="size-5 overflow-visible">
          <path
            d="M16 32V22a15 15 0 0 1 30 0v10"
            className={cn(
              "origin-[46px_30px] fill-none stroke-foreground transition-transform duration-700 ease-spring",
              open && "-translate-y-2 rotate-[28deg]",
            )}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <rect
            x="6"
            y="30"
            width="50"
            height="38"
            rx="10"
            className={cn("transition-colors duration-400", open ? "fill-chart-2" : "fill-foreground")}
          />
          <circle cx="31" cy="47" r="5" className="fill-muted" />
          <rect x="29" y="49" width="4" height="9" rx="2" className="fill-muted" />
        </svg>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-medium">{open ? readyTitle : title}</p>
        {open ? null : (
          <>
            {/* The ticking clock is for the eyes; the region says the full wait once. */}
            <p aria-hidden className="text-muted-foreground tabular-nums">
              {waitingLabel(formatWait(secondsLeft))}
            </p>
            <span className="sr-only">{waitingLabel(formatWait(total))}</span>
          </>
        )}
        {action}
      </div>
    </div>
  );
}

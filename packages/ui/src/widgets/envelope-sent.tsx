/* Lucian UX/UI Prompt #064 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#064 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import type { ComponentProps } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

/**
 * "We sent you an email" picture: the letter slides down into the envelope, the flap closes, the envelope hops and a
 * check pops onto its corner. Decorative (aria-hidden). It plays once when it mounts, so mount it only as the answer
 * to something the person did (the form was sent), and give it a new `key` to play it again after a resend.
 */
export function EnvelopeSent({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative mx-auto block h-28 w-40", className)}>
      <span className="absolute inset-x-2 bottom-0 h-20 perspective-[25rem] motion-safe:animate-envelope-hop">
        {/* Inside of the envelope and the letter, clipped at the envelope's bottom edge. */}
        <span className="absolute inset-x-0 -top-18 bottom-0 overflow-hidden rounded-b-xl">
          <span className="absolute inset-x-0 bottom-0 h-20 rounded-xl bg-primary/30" />
          <span className="absolute inset-x-3 -bottom-8 h-23 rounded-md bg-card p-2.5 shadow-md motion-safe:animate-letter-tuck">
            <span className="mb-1.5 block h-1.5 w-[46%] rounded-full bg-primary" />
            <span className="mb-1.5 block h-1.5 rounded-full bg-muted" />
            <span className="block h-1.5 w-[70%] rounded-full bg-muted" />
          </span>
        </span>
        {/* Front pocket: a V cut-out over the letter. */}
        <span className="absolute inset-0 rounded-xl bg-linear-160 from-primary/70 to-primary [clip-path:polygon(0_0,50%_58%,100%_0,100%_100%,0_100%)]" />
        {/* Flap: open (folded up) at first, closes over the pocket. */}
        <span className="absolute inset-x-0 top-0 h-13 origin-top motion-safe:animate-flap-close">
          <span className="absolute inset-0 rounded-t-xl bg-primary/85 [clip-path:polygon(0_0,100%_0,50%_100%)]" />
        </span>
        <span className="absolute -top-2.5 -right-1.5 grid size-9 place-items-center rounded-full bg-chart-2 text-background ring-4 ring-card motion-safe:animate-check-badge">
          <svg viewBox="0 0 20 20" className="size-5 fill-none stroke-current stroke-3">
            <path d="M5 10.5l3.5 3.5L15 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    </span>
  );
}

/**
 * Resend button locked behind a ring that fills while `secondsLeft` counts down; it says how long is left and stays
 * focusable while locked (aria-disabled), so a keyboard user does not lose their place. `total` is the full wait.
 */
export function ResendButton({
  secondsLeft,
  total,
  label,
  waitingLabel,
  pending = false,
  onResend,
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  secondsLeft: number;
  total: number;
  /** "Resend email". */
  label: string;
  /** "Resend in 42 s". */
  waitingLabel: (seconds: number) => string;
  pending?: boolean;
  onResend: () => void;
}) {
  const locked = secondsLeft > 0 || pending;
  const progress = total > 0 ? Math.min(1, Math.max(0, 1 - secondsLeft / total)) : 1;
  return (
    <Button
      type="button"
      variant="secondary"
      aria-disabled={locked}
      onClick={() => {
        if (!locked) onResend();
      }}
      className={cn("aria-disabled:opacity-60", className)}
      {...props}
    >
      {secondsLeft > 0 ? (
        <svg viewBox="0 0 20 20" aria-hidden className="size-5 -rotate-90">
          <circle cx="10" cy="10" r="8" className="fill-none stroke-border" strokeWidth="2.5" />
          <circle
            cx="10"
            cy="10"
            r="8"
            pathLength={100}
            className="fill-none stroke-primary"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="100"
            strokeDashoffset={100 - progress * 100}
          />
        </svg>
      ) : null}
      <span className="tabular-nums">{secondsLeft > 0 ? waitingLabel(secondsLeft) : label}</span>
    </Button>
  );
}

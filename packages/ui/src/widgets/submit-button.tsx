/* Lucian UX/UI Prompt #001 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#001 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ComponentProps } from "react";

import { Button } from "../components/button.tsx";
import { increased, useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

/** How long the check and `doneLabel` stay before the label comes back (the element's 3.6 s minus its 1.6 s load). */
export const SUBMIT_DONE_MS = 2000;

/** The element's check, on the 24px grid of the Lucide icons next to it. */
const CHECK_PATH = "M5.5 12.5l4.2 4.2L18.5 8";

/**
 * A form's submit button with the element's three states (Lucian 001, without the glass): while `busy` a spinner
 * replaces the icon and `busyLabel` the label; each time `succeeded` goes up, a check draws itself next to
 * `doneLabel` for a moment, then the label comes back. The outcome is announced politely for screen readers.
 * `succeeded` is a counter the form bumps on every successful save, so the first render (and a remount) never plays
 * the check. Everything else (type, disabled, variant) passes through to the Button.
 */
export function SubmitButton({
  label,
  busyLabel,
  doneLabel,
  busy = false,
  succeeded = 0,
  disabled,
  className,
  type = "submit",
  ...props
}: Omit<ComponentProps<typeof Button>, "children" | "asChild"> & {
  label: string;
  busyLabel: string;
  doneLabel: string;
  busy?: boolean;
  /** Bumped by the form after each success (starts at 0). */
  succeeded?: number;
}) {
  const plays = useTriggerCount(succeeded, increased);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (plays === 0) return;
    setDone(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), SUBMIT_DONE_MS);
  }, [plays]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const state = busy ? "busy" : done ? "done" : "idle";
  return (
    <>
      <Button
        {...props}
        type={type}
        disabled={disabled ?? busy}
        aria-busy={busy || undefined}
        data-state={state}
        // A form that saved is often "nothing to save" right after: the check still shows at full strength.
        className={cn("gap-2", state === "done" && "disabled:opacity-100", className)}
      >
        {state === "busy" ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
        {state === "done" ? (
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 motion-safe:animate-check-pop"
          >
            <path
              data-part="check"
              d={CHECK_PATH}
              pathLength={1}
              strokeDasharray={1}
              className="animate-draw-in [animation-delay:0.15s]"
            />
          </svg>
        ) : null}
        <span key={state} className={cn(state !== "idle" || plays > 0 ? "motion-safe:animate-label-roll" : undefined)}>
          {state === "busy" ? busyLabel : state === "done" ? doneLabel : label}
        </span>
      </Button>
      <span role="status" className="sr-only">
        {state === "done" ? doneLabel : ""}
      </span>
    </>
  );
}

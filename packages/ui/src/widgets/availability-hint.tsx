/* Lucian UX/UI Prompt #300 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#300 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Check, X } from "lucide-react";

import { cn } from "../lib/utils.ts";

export type AvailabilityStatus = "idle" | "checking" | "available" | "taken";

/**
 * Live availability line under a name field: a small ring spins while the name is looked up, then a check pops in
 * ("available") or the line dims with a cross ("taken"). Advisory text only; the field's validation and the save stay
 * the real check. Screen readers hear the result (not the "checking" state) through a polite live region that is
 * always mounted, so the first answer is announced too.
 */
export function AvailabilityHint({
  status,
  labels,
  className,
}: {
  status: AvailabilityStatus;
  labels: { checking: string; available: string; taken: string };
  className?: string;
}) {
  const spoken = status === "available" ? labels.available : status === "taken" ? labels.taken : "";
  return (
    <>
      <span aria-live="polite" className="sr-only">
        {spoken}
      </span>
      {status === "idle" ? null : (
        <p
          aria-hidden
          data-status={status}
          className={cn(
            "flex items-center gap-1.5 text-sm",
            status === "taken" ? "text-destructive" : "text-muted-foreground",
            className,
          )}
        >
          {status === "checking" ? (
            <span className="size-3.5 shrink-0 rounded-full border-2 border-border border-t-primary motion-safe:animate-spin" />
          ) : status === "available" ? (
            <Check key="available" className="size-3.5 shrink-0 text-chart-2 motion-safe:animate-check-pop" />
          ) : (
            <X key="taken" className="size-3.5 shrink-0 motion-safe:animate-check-pop" />
          )}
          <span className="min-w-0">
            {status === "checking" ? labels.checking : status === "available" ? labels.available : labels.taken}
          </span>
        </p>
      )}
    </>
  );
}

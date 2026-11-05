/* Lucian UX/UI Prompt #180 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#180 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Check, X } from "lucide-react";
import type { ReactNode } from "react";

import { useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

export type SealState = "empty" | "done" | "rejected";

export interface ApprovalStep {
  key: string;
  /** "Draft", "Review", "Approved". */
  label: string;
  /** Who signed this box (shown inside the seal), or "" while it is empty. */
  name: string;
  state: SealState;
}

function Seal({ step }: { step: ApprovalStep }) {
  // The stamp plays when the box gets signed while the screen is open, never for a box that was already signed.
  const stamps = useTriggerCount(step.state, (previous, next) => previous === "empty" && next !== "empty");
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 border-r px-1 text-center last:border-r-0">
      <small className="text-xs text-muted-foreground">{step.label}</small>
      <div
        key={stamps}
        className={cn(
          "grid size-14 place-items-center rounded-full border-2 text-xs leading-tight transition-colors duration-300",
          step.state === "empty" && "border-dashed text-muted-foreground",
          step.state === "done" && "-rotate-12 border-primary bg-primary/10 text-primary",
          step.state === "rejected" && "-rotate-12 border-destructive bg-destructive/10 text-destructive",
          stamps > 0 && step.state !== "empty" && "motion-safe:animate-seal-stamp",
        )}
      >
        <span className="line-clamp-2 max-w-12 break-words">{step.name}</span>
        {step.state === "done" ? <Check aria-hidden className="size-3" /> : null}
        {step.state === "rejected" ? <X aria-hidden className="size-3" /> : null}
      </div>
    </div>
  );
}

/**
 * Sign-off line (Lucian 180): a sheet with three seals in order (drafted, review, approval). Each box shows who
 * signed it; a box signed while the screen is open is stamped down, tilted, from a larger copy. A box sent back is
 * stamped in the destructive colour. The actions (ask, approve, send back) are the caller's, below the seals.
 * The steps are also given as text (a list), so screen readers get the same information as the seals.
 */
export function ApprovalLine({
  title,
  steps,
  status,
  children,
  className,
}: {
  title: ReactNode;
  steps: readonly ApprovalStep[];
  /** One line under the seals: "Approved revision 12" / "Waiting for a sign-off"... */
  status?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("w-full max-w-md rounded-sm border bg-card p-5 shadow-[4px_4px_0_var(--muted)]", className)}>
      <h3 className="text-base font-semibold">{title}</h3>
      <ol className="my-5 flex">
        {steps.map((step) => (
          <li key={step.key} className="flex min-w-0 flex-1">
            <Seal step={step} />
          </li>
        ))}
      </ol>
      {status === undefined ? null : (
        <p role="status" className="mb-3 text-center text-sm text-muted-foreground">
          {status}
        </p>
      )}
      {children === undefined ? null : <div className="flex flex-wrap justify-center gap-2">{children}</div>}
    </section>
  );
}

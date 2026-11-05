/* Lucian UX/UI Prompt #217 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#217 */ // token-check-ignore: element number in the required license line, not a colour
/* Lucian UX/UI Prompt #127 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#127 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

/**
 * A list item that can fold away to nothing (Lucian 217: grid rows 1fr to 0fr with a fade, 0.45 s on --ease-fold).
 * Folded, it is `inert` (no tab stops, hidden from assistive tech). Put the item's spacing inside `children`, not on
 * the list (a gap or margin would stay behind when it folds). It starts in whatever state it is given: nothing moves
 * on the first render.
 */
export function FoldRow({
  folded,
  id,
  children,
  className,
}: {
  folded: boolean;
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      id={id}
      inert={folded}
      data-folded={folded || undefined}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-450 ease-fold",
        folded ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </li>
  );
}

/** The "N unchanged paragraphs" row that stands for a folded run and opens or closes it. */
export function FoldToggle({
  expanded,
  controls,
  onToggle,
  children,
  className,
}: {
  expanded: boolean;
  /** Ids of the FoldRows it opens (space separated). */
  controls: string;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-1.5 font-sans text-xs font-medium text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-safe:animate-in motion-safe:fade-in-0",
        className,
      )}
    >
      <ChevronsUpDown aria-hidden className="size-3.5" />
      {children}
    </button>
  );
}

/**
 * Previous / next change, with where you are ("Change 2 of 5") as a polite live region. The caller moves focus and
 * scrolls; `current` is -1 before the first step.
 */
export function ChangeStepper({
  current,
  total,
  status,
  previousLabel,
  nextLabel,
  onStep,
  className,
}: {
  current: number;
  total: number;
  /** The visible position text. */
  status: string;
  previousLabel: string;
  nextLabel: string;
  onStep: (index: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-8"
        aria-label={previousLabel}
        disabled={total === 0 || current <= 0}
        onClick={() => onStep(current - 1)}
      >
        <ChevronUp aria-hidden className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-8"
        aria-label={nextLabel}
        disabled={total === 0 || current >= total - 1}
        onClick={() => onStep(current + 1)}
      >
        <ChevronDown aria-hidden className="size-4" />
      </Button>
      <span aria-live="polite" className="px-1 text-xs text-muted-foreground tabular-nums">
        {status}
      </span>
    </div>
  );
}

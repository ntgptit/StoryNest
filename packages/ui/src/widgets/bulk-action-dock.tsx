/* Lucian UX/UI Prompt #178 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#178 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { X } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

/**
 * The bar for acting on several selected rows at once. It is only rendered while something is selected, so it rises
 * in (`animate-dock-in`) when the first row is picked, never on page load. It sticks to the bottom of the screen while
 * its list is in view (above the mobile BottomNav), and falls back into place after the list. The count is a polite
 * live region; Escape anywhere in the dock, or the clear button, drops the selection. The actions are the caller's
 * buttons (use `variant="secondary"` so they read on the inverted dock).
 */
export function BulkActionDock({
  count,
  summary,
  label,
  clearLabel,
  onClear,
  children,
  className,
}: {
  /** How many rows are selected; the dock renders nothing at 0. */
  count: number;
  /** The visible count text, e.g. "3 selected". */
  summary: string;
  /** Accessible name of the dock region. */
  label: string;
  clearLabel: string;
  onClear: () => void;
  children: ReactNode;
  className?: string;
}) {
  if (count === 0) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    onClear();
  };

  return (
    <div
      role="region"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "sticky bottom-above-nav z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-foreground px-3 py-2 text-background shadow-lg motion-safe:animate-dock-in md:bottom-4",
        className,
      )}
    >
      <span aria-live="polite" className="mr-auto text-sm font-medium tabular-nums">
        {summary}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={clearLabel}
        onClick={onClear}
        className="size-8 text-background hover:bg-background/15 hover:text-background"
      >
        <X aria-hidden className="size-4" />
      </Button>
    </div>
  );
}

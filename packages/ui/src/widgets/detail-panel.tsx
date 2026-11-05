/* Lucian UX/UI Prompt #273 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#273 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";

import { Button } from "../components/button.tsx";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "../components/sheet.tsx";
import { cn } from "../lib/utils.ts";

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT");

/**
 * The detail of one list row in a panel that slides in from the right (full width on phones), while the row stays
 * highlighted in the list behind it. The arrows at the top, or J (next) and K (previous), step through the list, and
 * the new content comes up from below or down from above in the direction you went (not on the first open, which is
 * the panel's own slide). Esc, the close button or a press outside closes it and Radix gives focus back to the row.
 * J/K are ignored while typing, with a modifier key, or when a dialog opened from the panel has focus.
 */
export function DetailPanel({
  open,
  onOpenChange,
  title,
  description,
  position,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  previousLabel,
  nextLabel,
  closeLabel,
  contentKey,
  direction,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Where this row is in the list, e.g. "3 of 12" (a polite live region). */
  position: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  previousLabel: string;
  nextLabel: string;
  closeLabel: string;
  /** Identifies the row shown; a new key replays the step animation. */
  contentKey: string;
  /** How the current row was reached: 1 next, -1 previous, 0 opened (no step animation). */
  direction: -1 | 0 | 1;
  children: ReactNode;
  className?: string;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target) || isEditable(event.target)) {
      return; // a nested dialog (portalled elsewhere) or a text field: its keys are its own
    }
    const key = event.key.toLowerCase();
    if (key === "j" && hasNext) {
      event.preventDefault();
      onNext();
    } else if (key === "k" && hasPrevious) {
      event.preventDefault();
      onPrevious();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        onKeyDown={onKeyDown}
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn("w-full gap-0 overflow-hidden p-0 sm:max-w-md", className)}
      >
        <div className="flex items-center gap-1 border-b px-3 py-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label={previousLabel}
            aria-keyshortcuts="K"
            disabled={!hasPrevious}
            onClick={onPrevious}
          >
            <ChevronUp aria-hidden className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label={nextLabel}
            aria-keyshortcuts="J"
            disabled={!hasNext}
            onClick={onNext}
          >
            <ChevronDown aria-hidden className="size-4" />
          </Button>
          <span aria-live="polite" className="mr-auto ml-1 text-xs text-muted-foreground tabular-nums">
            {position}
          </span>
          <SheetClose asChild>
            <Button type="button" size="icon" variant="ghost" className="size-8" aria-label={closeLabel}>
              <X aria-hidden className="size-4" />
            </Button>
          </SheetClose>
        </div>
        <div className="relative flex-1 overflow-x-hidden overflow-y-auto">
          <div
            key={contentKey}
            className={cn(
              "flex flex-col gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
              direction === 1 && "animate-detail-next",
              direction === -1 && "animate-detail-prev",
            )}
          >
            <SheetTitle className="text-base break-words">{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
            {children}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* Lucian UX/UI Prompt #264 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#264 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { TriangleAlert } from "lucide-react";

import { cn } from "../lib/utils.ts";

/** A suggested address split around the letters that differ from what was typed (those are marked). */
export interface EmailSuggestionParts {
  head: string;
  changed: string;
  tail: string;
}

/**
 * "Did you mean you@gmail.com?" under an email field, with the corrected letters marked. One press accepts it (the
 * caller puts the suggestion in the field); nothing changes unless it is pressed. It drops down when it appears and
 * should sit in an always-present aria-live="polite" container so it is announced. `before` / `after` wrap the
 * address ("Did you mean", "?").
 */
export function EmailTypoHint({
  suggestion,
  before,
  after,
  onAccept,
  className,
}: {
  suggestion: EmailSuggestionParts;
  before: string;
  after: string;
  onAccept: () => void;
  className?: string;
}) {
  return (
    <div className={cn("origin-top motion-safe:animate-hint-drop", className)}>
      <button
        type="button"
        onClick={onAccept}
        className={cn(
          "flex w-full items-center gap-2 rounded-md bg-chart-4/15 px-3 py-2 text-left text-sm outline-none",
          "transition-colors hover:bg-chart-4/25 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        )}
      >
        <TriangleAlert aria-hidden className="size-4 shrink-0 text-chart-5" />
        <span className="min-w-0 break-all">
          {before}{" "}
          <b className="font-semibold">
            {suggestion.head}
            <mark className="bg-transparent font-bold text-foreground underline decoration-chart-5 decoration-2 underline-offset-3">
              {suggestion.changed}
            </mark>
            {suggestion.tail}
          </b>
          {after}
        </span>
      </button>
    </div>
  );
}

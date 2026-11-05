/* Lucian UX/UI Prompt #295 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#295 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { cn } from "../lib/utils.ts";

/** Circumference of the ring (r = 9 in a 22 × 22 box), as in the element. */
const RING_LENGTH = 2 * Math.PI * 9;
/** From this share of the limit on, the ring turns to the warning colour (the element's 90%). */
export const CHARACTER_RING_WARN_AT = 0.9;

/**
 * A small ring beside a text box that fills with the characters typed (the message ring of Lucian 295), turning to the
 * destructive colour near the limit. The ring itself is decoration; `label` is the same count as text, and it is
 * hidden visually so the caller can point the text box's aria-describedby at `id`. The fill follows typing with a
 * short transition only, so nothing moves on first render.
 */
export function CharacterRing({
  length,
  max,
  label,
  id,
  className,
}: {
  length: number;
  max: number;
  /** The count as words for screen readers, e.g. "120 of 2,000 characters". */
  label: string;
  id?: string | undefined;
  className?: string;
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, length / max)) : 0;
  const near = ratio >= CHARACTER_RING_WARN_AT;
  return (
    <span data-slot="character-ring" className={cn("inline-flex size-[22px] shrink-0", className)}>
      <svg aria-hidden viewBox="0 0 22 22" className="size-full -rotate-90">
        <circle cx="11" cy="11" r="9" fill="none" strokeWidth="3" className="stroke-muted" />
        <circle
          data-part="fill"
          data-near={near ? "true" : undefined}
          cx="11"
          cy="11"
          r="9"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - ratio)}
          className={cn(
            "transition-[stroke-dashoffset,stroke] duration-200",
            ratio === 0 ? "stroke-transparent" : near ? "stroke-destructive" : "stroke-primary",
          )}
        />
      </svg>
      <span id={id} className="sr-only">
        {label}
      </span>
    </span>
  );
}

/* Lucian UX/UI Prompt #350 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#350 */ // token-check-ignore: element number in the required license line, not a colour
import { cn } from "../lib/utils.ts";

/**
 * A padlock that shows whether something is locked: when `open` turns on, the keyhole turns sideways like a key and
 * then the shackle lifts with one leg free; when it turns off, the shackle drops back and the keyhole turns back.
 * Only a change moves it (CSS transitions: the first render is already in place). Decorative: it is `aria-hidden`, so
 * the state must be said in text next to it. Sized and coloured by the caller (`size-4`, `text-*`).
 */
export function PadlockIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 96 112"
      aria-hidden
      data-open={open ? "" : undefined}
      className={cn("shrink-0 overflow-visible", className)}
    >
      <path
        d="M28 70 V40 a20 20 0 0 1 40 0 V60"
        fill="none"
        stroke="currentColor"
        strokeWidth={10}
        strokeLinecap="round"
        className={cn(
          "transition-transform",
          open
            ? "translate-y-[-15px] duration-480 ease-shackle delay-200"
            : "translate-y-0 duration-440 ease-in-out delay-0",
        )}
      />
      <rect x="12" y="52" width="72" height="56" rx="16" fill="currentColor" />
      <g
        className={cn(
          "origin-[48px_80px] transition-transform duration-220 ease-in-out [transform-box:view-box]",
          open ? "-rotate-90 delay-0" : "rotate-0 delay-380",
        )}
      >
        <circle cx="48" cy="76" r="7" className="fill-background" />
        <rect x="45" y="78" width="6" height="13" rx="3" className="fill-background" />
      </g>
    </svg>
  );
}

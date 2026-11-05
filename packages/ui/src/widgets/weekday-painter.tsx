/* Lucian UX/UI Prompt #109 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#109 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Check } from "lucide-react";
import { useRef, type KeyboardEvent, type PointerEvent } from "react";

import { cn } from "../lib/utils.ts";

/**
 * Weekly schedule painter (Lucian 109, one row instead of an hour grid): seven day cells that are pressed to toggle,
 * or dragged across to paint several at once (the first cell decides whether the drag paints or clears). Esc clears
 * them all. The summary under the row updates at once and is announced politely. Every cell is a real toggle button
 * (aria-pressed), so keyboard and screen readers use it without dragging; touch drags work through pointer capture.
 */
export function WeekdayPainter({
  value,
  onChange,
  dayLabels,
  dayNames,
  summary,
  label,
  disabled = false,
  className,
}: {
  /** Seven flags, Monday first. */
  value: readonly boolean[];
  onChange: (next: boolean[]) => void;
  /** Short labels shown in the cells ("Mon"). */
  dayLabels: readonly string[];
  /** Full names for screen readers ("Monday"). */
  dayNames: readonly string[];
  /** Text under the row, e.g. "Updates on Mon and Thu". */
  summary: string;
  /** Name of the group. */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const days = Array.from({ length: 7 }, (_, i) => value[i] === true);
  const drag = useRef<{ paint: boolean; pointer: number } | null>(null);
  const latest = useRef(days);
  latest.current = days;

  const set = (index: number, on: boolean) => {
    if (latest.current[index] === on) return;
    const next = [...latest.current];
    next[index] = on;
    latest.current = next;
    onChange(next);
  };

  const onPointerDown = (index: number) => (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    const paint = !latest.current[index];
    drag.current = { paint, pointer: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    set(index, paint);
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    const target = document.elementFromPoint?.(event.clientX, event.clientY);
    const cell = target instanceof HTMLElement ? target.closest<HTMLElement>("[data-day]") : null;
    if (cell?.dataset.day !== undefined) set(Number(cell.dataset.day), current.paint);
  };
  const endDrag = () => {
    drag.current = null;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || disabled || !latest.current.some(Boolean)) return;
    event.preventDefault();
    latest.current = Array.from({ length: 7 }, () => false);
    onChange(latest.current);
  };

  return (
    <div className={cn("flex w-full max-w-md flex-col gap-2", className)} onKeyDown={onKeyDown}>
      <div role="group" aria-label={label} className="grid touch-none grid-cols-7 gap-1.5">
        {days.map((on, index) => (
          <button
            key={index}
            type="button"
            data-day={index}
            aria-pressed={on}
            aria-label={dayNames[index]}
            disabled={disabled}
            onPointerDown={onPointerDown(index)}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClick={(event) => {
              // Pointer presses are handled on pointerdown; this is the keyboard (Enter / Space) path.
              if (event.detail === 0) set(index, !latest.current[index]);
            }}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-sm border text-xs font-medium transition-colors select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-muted/40 text-muted-foreground hover:bg-accent",
            )}
          >
            <span>{dayLabels[index]}</span>
            <Check aria-hidden className={cn("size-3", on ? "opacity-100" : "opacity-0")} />
          </button>
        ))}
      </div>
      <output aria-live="polite" className="text-right text-sm text-muted-foreground">
        {summary}
      </output>
    </div>
  );
}

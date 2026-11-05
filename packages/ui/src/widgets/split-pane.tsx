/* Lucian UX/UI Prompt #101 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#101 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { GripVertical } from "lucide-react";
import { useRef, useSyncExternalStore, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

export const SPLIT_MIN = 25;
export const SPLIT_MAX = 75;
export const SPLIT_STEP = 3;

/** Whether the window is at least `px` wide (false on the server and where matchMedia is missing). */
export function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  return useSyncExternalStore(
    (notify) => {
      const list = typeof window.matchMedia === "function" ? window.matchMedia(query) : null;
      list?.addEventListener("change", notify);
      return () => list?.removeEventListener("change", notify);
    },
    () => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false),
    () => false,
  );
}

/** A split percentage kept inside [min, max] and rounded to a whole number. */
export function clampSplit(value: number, min = SPLIT_MIN, max = SPLIT_MAX): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Two panes side by side with a draggable divider between them (Lucian 101). `value` is the start pane's share of
 * the width in percent; the host keeps it (and may remember it). The divider is a focusable `separator`: ←/→ move it
 * by 3, Home/End go to the limits, Esc goes back to `defaultValue`. Dragging uses pointer capture, so it keeps
 * following the pointer outside the divider; touch works too (touch-action: none on the handle only).
 */
export function SplitPane({
  start,
  end,
  value,
  defaultValue,
  onValueChange,
  separatorLabel,
  min = SPLIT_MIN,
  max = SPLIT_MAX,
  className,
}: {
  start: ReactNode;
  end: ReactNode;
  value: number;
  defaultValue: number;
  onValueChange: (value: number) => void;
  separatorLabel: string;
  min?: number;
  max?: number;
  className?: string | undefined;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const set = (next: number) => onValueChange(clampSplit(next, min, max));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next =
      event.key === "ArrowLeft"
        ? value - SPLIT_STEP
        : event.key === "ArrowRight"
          ? value + SPLIT_STEP
          : event.key === "Home"
            ? min
            : event.key === "End"
              ? max
              : event.key === "Escape"
                ? defaultValue
                : null;
    if (next === null) return;
    event.preventDefault();
    set(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // not capturable (synthetic event): the move handler checks capture and does nothing
    }
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) return;
    const box = rootRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    set(((event.clientX - box.left) / box.width) * 100);
  };

  return (
    <div
      ref={rootRef}
      data-slot="split-pane"
      className={cn("grid min-w-0 items-start", className)}
      style={{ gridTemplateColumns: `minmax(0, ${value}fr) 1.5rem minmax(0, ${100 - value}fr)` }}
    >
      <div className="min-w-0">{start}</div>
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label={separatorLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        className="group flex cursor-col-resize touch-none justify-center self-stretch rounded-md outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span
          aria-hidden
          className="sticky top-[calc(var(--app-header-offset,0px)+40dvh)] my-8 flex h-12 w-3 items-center justify-center rounded-full border bg-muted text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-foreground group-focus-visible:bg-accent"
        >
          <GripVertical className="size-3.5" />
        </span>
      </div>
      <div className="min-w-0">{end}</div>
    </div>
  );
}

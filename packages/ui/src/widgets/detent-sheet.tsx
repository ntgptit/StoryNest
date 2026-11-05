/* Lucian UX/UI Prompt #336 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#336 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

import { SheetContent } from "../components/sheet.tsx";
import { cn } from "../lib/utils.ts";

export const SHEET_DETENTS = ["peek", "half", "full"] as const;
export type SheetDetent = (typeof SHEET_DETENTS)[number];

/** Height of each detent as a share of the viewport height. */
export const DETENT_HEIGHTS: Record<SheetDetent, number> = { peek: 0.3, half: 0.55, full: 0.92 };
/** Past the highest detent (and below zero) the sheet follows the finger at this fraction (rubber band). */
const RUBBER_BAND = 0.25;
/** The release velocity carries the sheet this many seconds further before the nearest detent is picked. */
const PROJECTION_S = 0.2;
/** Dragged this far below the lowest detent (or flung down from it), the sheet closes. */
export const SHEET_DISMISS_PX = 80;
const DISMISS_VELOCITY = 1200;
const TAP_SLOP_PX = 4;

/** Rubber-band resistance outside [min, max]. */
export function rubberBand(height: number, min: number, max: number): number {
  if (height < min) return min - (min - height) * RUBBER_BAND;
  if (height > max) return max + (height - max) * RUBBER_BAND;
  return height;
}

/**
 * The detent a released drag settles on: the one nearest to where the release velocity (px/s, upward positive) would
 * carry the sheet, or null when it was pulled well below the lowest detent or flung down from it (close).
 */
export function settleDetent(height: number, velocity: number, viewport: number): SheetDetent | null {
  const lowest = DETENT_HEIGHTS.peek * viewport;
  if (height < lowest - SHEET_DISMISS_PX || (height <= lowest + 1 && velocity < -DISMISS_VELOCITY)) return null;
  const projected = height + velocity * PROJECTION_S;
  let best: SheetDetent = "peek";
  for (const detent of SHEET_DETENTS) {
    if (Math.abs(DETENT_HEIGHTS[detent] * viewport - projected) < Math.abs(DETENT_HEIGHTS[best] * viewport - projected))
      best = detent;
  }
  return best;
}

function step(detent: SheetDetent, by: 1 | -1): SheetDetent {
  const index = SHEET_DETENTS.indexOf(detent) + by;
  return SHEET_DETENTS[Math.min(SHEET_DETENTS.length - 1, Math.max(0, index))] ?? detent;
}

function useViewportHeight(): number {
  const [height, setHeight] = useState(() => (typeof window === "undefined" ? 800 : window.innerHeight));
  useEffect(() => {
    const update = () => setHeight(window.innerHeight);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return height;
}

/**
 * Bottom sheet content with three heights (peek, half, full) instead of one: drag the top of the sheet and it follows
 * the finger, then settles on the nearest height in the direction of the throw, with a little spring; past the top it
 * resists like a rubber band, and pulled down well below the lowest height it closes (`onDismiss`). The grabber is a button:
 * a press steps through the heights, ↑/↓ move one up or down, and its name says the current height. Everything else
 * is the Radix sheet: focus is trapped, Esc and the close button close it. `header` sits in the draggable top area,
 * `children` scroll below it. Use inside <Sheet>.
 */
export function DetentSheetContent({
  header,
  children,
  initialDetent = "half",
  handleLabel,
  onDismiss,
  className,
  bodyClassName,
}: {
  header: ReactNode;
  children: ReactNode;
  initialDetent?: SheetDetent;
  /** Accessible name of the grabber for the current height, e.g. (d) => `Sheet height: ${names[d]}`. */
  handleLabel: (detent: SheetDetent) => string;
  /** Called when the sheet is dragged closed. */
  onDismiss: () => void;
  className?: string;
  bodyClassName?: string;
}) {
  const viewport = useViewportHeight();
  const [detent, setDetent] = useState<SheetDetent>(initialDetent);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startHeight: number; moved: boolean; samples: [number, number][] } | null>(
    null,
  );
  const lastDragEnd = useRef(0);

  const resting = DETENT_HEIGHTS[detent] * viewport;
  const height = dragHeight ?? resting;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = {
      startY: event.clientY,
      startHeight: height,
      moved: false,
      samples: [[event.timeStamp, height]],
    };
    // Captured at once so a fast drag keeps reporting, except on the grabber, whose click a capture would swallow
    // (a drag that starts there is captured as soon as it moves).
    if (!(event.target as Element).closest("button")) event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    const raw = current.startHeight - (event.clientY - current.startY);
    if (!current.moved && Math.abs(raw - current.startHeight) > TAP_SLOP_PX) {
      current.moved = true;
      // A press on the grabber is captured only now that it is a drag (see onPointerDown).
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    if (!current.moved) return;
    // Below the lowest height it follows the finger one to one: that way leads to closing, not to a wall.
    const next = rubberBand(raw, 0, DETENT_HEIGHTS.full * viewport);
    current.samples.push([event.timeStamp, next]);
    if (current.samples.length > 6) current.samples.shift();
    setDragHeight(next);
  };

  const onPointerUp = () => {
    const current = drag.current;
    drag.current = null;
    if (!current?.moved) return;
    lastDragEnd.current = performance.now();
    const first = current.samples[0];
    const last = current.samples[current.samples.length - 1];
    const seconds = first && last ? (last[0] - first[0]) / 1000 : 0;
    const velocity = first && last && seconds > 0.001 ? (last[1] - first[1]) / seconds : 0;
    const settled = settleDetent(last?.[1] ?? height, velocity, viewport);
    setDragHeight(null);
    if (settled === null) onDismiss();
    else setDetent(settled);
  };

  const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp") setDetent((d) => step(d, 1));
    else if (event.key === "ArrowDown") setDetent((d) => step(d, -1));
    else return;
    event.preventDefault();
  };

  return (
    <SheetContent
      side="bottom"
      data-detent={detent}
      className={cn(
        "max-h-[calc(100dvh-env(safe-area-inset-top))] gap-0 overflow-hidden rounded-t-2xl",
        dragHeight === null && "[transition:height_0.5s_var(--ease-spring)]",
        className,
      )}
      style={{ height }}
    >
      <div
        data-slot="detent-sheet-handle-area"
        className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flex justify-center pt-1.5">
          <button
            type="button"
            aria-label={handleLabel(detent)}
            className="flex h-6 w-16 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onClick={() => {
              // A drag that started on the grabber ends with a click: it is not a press.
              if (performance.now() - lastDragEnd.current < 350) return;
              setDetent((d) => (d === "full" ? "peek" : step(d, 1)));
            }}
            onKeyDown={onHandleKeyDown}
          >
            <span aria-hidden className="h-1.5 w-10 rounded-full bg-border" />
          </button>
        </div>
        {header}
      </div>
      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", bodyClassName)}>{children}</div>
    </SheetContent>
  );
}

/* Lucian UX/UI Prompt #071 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#071 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

/** Pixels the row must travel left for a release to remove it (the element's 100px). */
const COMMIT_DISTANCE = 100;
/** Past the commit point the row follows the finger more slowly. */
const OVERDRAG = 0.6;
const LOCK_DISTANCE = 10;
/** Time the row takes to slide away before `onRemove` runs (matches the transform transition). */
const LEAVE_MS = 300;

type Gesture = { id: number; x: number; y: number; horizontal: boolean | null };

/**
 * Swipe a row left to remove it (Lucian 071), on touch only: the row follows the finger over a destructive layer that
 * shows the icon and the action, and letting go past 100px slides it out and calls `onRemove` (the caller hides it and
 * offers Undo). A shorter swipe springs back. The row must keep a visible button for the same action: mouse,
 * keyboard and screen readers use that, and the swipe adds nothing they cannot do.
 */
export function SwipeToRemove({
  onRemove,
  label,
  icon: Icon,
  disabled = false,
  children,
  className,
}: {
  onRemove: () => void;
  /** The action, shown on the layer behind the row ("Bỏ lưu"). */
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const gesture = useRef<Gesture | null>(null);
  const moved = useRef(false);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const leaveTimer = useRef<number | null>(null);
  useEffect(() => () => void (leaveTimer.current !== null && window.clearTimeout(leaveTimer.current)), []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    moved.current = false;
    if (disabled || leaving || event.pointerType !== "touch" || !event.isPrimary) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: null };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = gesture.current;
    if (!state || event.pointerId !== state.id) return;
    const x = event.clientX - state.x;
    const y = event.clientY - state.y;
    if (state.horizontal === null) {
      if (Math.abs(x) < LOCK_DISTANCE && Math.abs(y) < LOCK_DISTANCE) return;
      state.horizontal = Math.abs(x) > Math.abs(y) && x < 0;
      if (!state.horizontal) {
        gesture.current = null;
        return;
      }
      setDragging(true);
    }
    // The row owns this gesture: a surrounding swipe (e.g. swipe-between-tabs) must not move as well.
    event.stopPropagation();
    moved.current = true;
    const left = Math.min(0, x);
    setDx(left < -COMMIT_DISTANCE ? -COMMIT_DISTANCE + (left + COMMIT_DISTANCE) * OVERDRAG : left);
  };
  const end = (commit: boolean) => {
    const state = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (!state?.horizontal) return;
    if (commit && dx <= -COMMIT_DISTANCE) {
      setLeaving(true);
      leaveTimer.current = window.setTimeout(onRemove, LEAVE_MS);
    } else {
      setDx(0);
    }
  };
  // A swipe must not also follow the link of the card inside.
  const onClickCapture = (event: MouseEvent) => {
    if (moved.current) {
      event.preventDefault();
      event.stopPropagation();
      moved.current = false;
    }
  };

  const reveal = Math.min(1, -dx / COMMIT_DISTANCE);
  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-end gap-2 rounded-xl bg-destructive px-4 text-sm font-medium text-destructive-foreground"
        style={{ opacity: dx === 0 && !leaving ? 0 : 1 }}
      >
        <span className="truncate">{label}</span>
        <Icon
          className="size-5 shrink-0 transition-transform duration-200"
          style={{ transform: `scale(${0.6 + reveal * 0.6})` }}
        />
      </div>
      <div
        data-swiping={dragging ? "true" : undefined}
        className={cn(
          "relative h-full touch-pan-y",
          dragging ? "select-none" : "transition-transform duration-450 ease-spring",
          leaving && "pointer-events-none",
        )}
        style={{ transform: leaving ? "translateX(-110%)" : dx ? `translateX(${dx}px)` : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => {
          if (gesture.current?.horizontal) event.stopPropagation();
          end(true);
        }}
        onPointerCancel={(event) => {
          if (gesture.current?.horizontal) event.stopPropagation();
          end(false);
        }}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  );
}

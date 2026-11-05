/* Lucian UX/UI Prompt #078 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#078 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Reply } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

/** Pixels the content must travel right for a release to reply (the element's 60px). */
export const REPLY_DISTANCE = 60;
/** Past that point the content follows the finger at a third of the speed (the element's 0.3). */
const OVERDRAG = 0.3;
const LOCK_DISTANCE = 10;
/** The spring back (duration-400) plus a little. */
const SETTLE_MS = 450;

type Gesture = { id: number; x: number; y: number; horizontal: boolean | null };

/**
 * Swipe a message to the right to reply to it (Lucian 078), on touch only: the content follows the finger, a reply
 * arrow behind it grows and fills once the swipe is far enough, and letting go there calls `onReply`; the content
 * always springs back. A vertical move is left to scrolling. The message must keep a visible Reply button for the same
 * action: mouse, keyboard and screen readers use that, and the swipe adds nothing they cannot do.
 */
export function SwipeToReply({
  onReply,
  disabled = false,
  children,
  className,
}: {
  onReply: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const gesture = useRef<Gesture | null>(null);
  const moved = useRef(false);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  // While the message is moved or springs back it is clipped, so it never widens the page; at rest it is not, so the
  // focus rings of its buttons stay whole.
  const [clipped, setClipped] = useState(false);
  const settle = useRef<number | null>(null);
  useEffect(() => () => void (settle.current !== null && window.clearTimeout(settle.current)), []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    moved.current = false;
    if (disabled || event.pointerType !== "touch" || !event.isPrimary) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: null };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = gesture.current;
    if (!state || event.pointerId !== state.id) return;
    const x = event.clientX - state.x;
    const y = event.clientY - state.y;
    if (state.horizontal === null) {
      if (Math.abs(x) < LOCK_DISTANCE && Math.abs(y) < LOCK_DISTANCE) return;
      state.horizontal = Math.abs(x) > Math.abs(y) && x > 0;
      if (!state.horizontal) {
        gesture.current = null;
        return;
      }
      if (settle.current !== null) window.clearTimeout(settle.current);
      setDragging(true);
      setClipped(true);
    }
    // The message owns this gesture: a surrounding swipe (a sheet, swipe-between-tabs) must not move as well.
    event.stopPropagation();
    moved.current = true;
    const right = Math.max(0, x);
    setDx(right > REPLY_DISTANCE ? REPLY_DISTANCE + (right - REPLY_DISTANCE) * OVERDRAG : right);
  };
  const end = (commit: boolean) => {
    const state = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (!state?.horizontal) return;
    const reached = dx >= REPLY_DISTANCE;
    setDx(0);
    settle.current = window.setTimeout(() => setClipped(false), SETTLE_MS);
    if (commit && reached) onReply();
  };
  // A swipe must not also press a button or spoiler inside the message.
  const onClickCapture = (event: MouseEvent) => {
    if (moved.current) {
      event.preventDefault();
      event.stopPropagation();
      moved.current = false;
    }
  };

  const reveal = Math.min(1, dx / REPLY_DISTANCE);
  const full = dx >= REPLY_DISTANCE;
  return (
    <div className={cn("relative", clipped && "overflow-x-clip", className)}>
      <span
        aria-hidden
        data-part="arrow"
        data-full={full ? "true" : undefined}
        className={cn(
          "pointer-events-none absolute top-1/2 left-1 grid size-7 -translate-y-1/2 place-items-center rounded-full transition-colors duration-200",
          full ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
        style={{ opacity: reveal, scale: `${0.5 + reveal * 0.5}` }}
      >
        <Reply className="size-3.5" />
      </span>
      <div
        data-swiping={dragging ? "true" : undefined}
        className={cn(
          "relative touch-pan-y",
          dragging ? "select-none" : "transition-transform duration-400 ease-spring",
        )}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
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

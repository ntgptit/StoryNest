/* Lucian UX/UI Prompt #048 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#048 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";

import { cn } from "../lib/utils.ts";

/** Pixels a finger must travel before the gesture is read as horizontal (a swipe) or vertical (a scroll). */
const LOCK_DISTANCE = 10;
/** Share of the panel width, or a quick flick, that switches to the neighbouring tab. */
const COMMIT_SHARE = 0.25;
const FLICK_SPEED = 0.4; // px per ms
const FLICK_MIN = 30; // px
/** How far the panel follows the finger past the first or last tab (rubber band). */
const EDGE_RESISTANCE = 0.3;

type Gesture = { id: number; x: number; y: number; time: number; width: number; horizontal: boolean | null };

/**
 * Swipe between tab panels on touch (Lucian 048): the panel follows the finger, the tab indicator follows along
 * (pass `swipe` to TabsList), and letting go past a quarter of the width, or flicking, selects the neighbouring tab
 * through `onValueChange` (so URL-driven tabs stay URL-driven). The new panel slides in from that side. Mouse, pen
 * and keyboard keep the tabs as they are; vertical scrolling is left to the browser (`touch-action: pan-y`).
 */
export function useSwipeTabs<T extends string>({
  values,
  value,
  onValueChange,
  enabled = true,
}: {
  values: readonly T[];
  value: T;
  onValueChange: (value: T) => void;
  enabled?: boolean;
}) {
  const gesture = useRef<Gesture | null>(null);
  const [offset, setOffset] = useState<{ dx: number; width: number } | null>(null);
  const [entered, setEntered] = useState<{ from: "start" | "end"; count: number } | null>(null);
  const index = values.indexOf(value);

  const neighbour = (direction: 1 | -1): T | undefined => (index < 0 ? undefined : values[index + direction]);

  const reset = () => {
    gesture.current = null;
    setOffset(null);
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!enabled || event.pointerType !== "touch" || !event.isPrimary) return;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
      width: event.currentTarget.clientWidth || 1,
      horizontal: null,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const state = gesture.current;
    if (!state || event.pointerId !== state.id) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (state.horizontal === null) {
      if (Math.abs(dx) < LOCK_DISTANCE && Math.abs(dy) < LOCK_DISTANCE) return;
      state.horizontal = Math.abs(dx) > Math.abs(dy);
      if (!state.horizontal) return reset();
    }
    const blocked = !neighbour(dx < 0 ? 1 : -1);
    setOffset({ dx: blocked ? dx * EDGE_RESISTANCE : dx, width: state.width });
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const state = gesture.current;
    if (!state || event.pointerId !== state.id) return;
    const dx = event.clientX - state.x;
    const speed = Math.abs(dx) / Math.max(1, event.timeStamp - state.time);
    const direction: 1 | -1 = dx < 0 ? 1 : -1;
    const next = neighbour(direction);
    const far = Math.abs(dx) > state.width * COMMIT_SHARE || (speed > FLICK_SPEED && Math.abs(dx) > FLICK_MIN);
    reset();
    if (state.horizontal && far && next !== undefined) {
      setEntered((current) => ({ from: direction > 0 ? "end" : "start", count: (current?.count ?? 0) + 1 }));
      onValueChange(next);
    }
  };

  const dragging = offset !== null;
  const swipe = offset ? Math.max(-1, Math.min(1, -offset.dx / offset.width)) : 0;
  const style: CSSProperties | undefined = offset ? { transform: `translateX(${offset.dx}px)` } : undefined;

  return {
    /** Signed progress for TabsList's `swipe` prop: positive towards the next tab. */
    swipe,
    /** Spread on the element around the panels. */
    panelProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: reset,
      style,
      "data-swiping": dragging ? "true" : undefined,
      className: cn(
        "touch-pan-y",
        dragging ? "select-none" : "transition-transform duration-300 ease-soft",
        entered?.from === "end" && "motion-safe:animate-panel-from-end",
        entered?.from === "start" && "motion-safe:animate-panel-from-start",
      ),
    },
    /** Key for the panel wrapper: changes on each swiped switch so the slide-in plays again (never on load or click). */
    panelKey: `swipe-${entered?.count ?? 0}`,
  };
}

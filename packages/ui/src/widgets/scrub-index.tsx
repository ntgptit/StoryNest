/* Lucian UX/UI Prompt #296 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#296 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { cn } from "../lib/utils.ts";

/** How far (px) from the fingertip marks still bow out, and how far / how much the nearest one does (the element's). */
const REACH = 70;
const BOW_PX = 18;
const BOW_SCALE = 0.5;

/**
 * Brings `row` to the top of its scrolling list `scroller` without scrolling anything else (scrollIntoView would
 * also move the page, and the rail with it, under the finger).
 */
export function scrollRowToTop(scroller: HTMLElement, row: HTMLElement): void {
  scroller.scrollTop += row.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
}

/** Index of the mark under `y` (px from the top of a rail `height` tall holding `count` evenly spaced marks). */
export function markAt(y: number, height: number, count: number): number {
  if (count <= 0 || height <= 0) return 0;
  const f = Math.max(0, Math.min(0.9999, y / height));
  return Math.floor(f * count);
}

/** Bow-out of mark `index` for a fingertip at `y`: 0 (rest) to 1 (right under it), eased like the element. */
export function bowOf(index: number, y: number, height: number, count: number): number {
  const centre = ((index + 0.5) / count) * height;
  const w = Math.max(0, 1 - Math.abs(centre - y) / REACH);
  return Math.sin((w * Math.PI) / 2);
}

/**
 * Vertical scrub rail for a long list (adapted from Lucian 296): drag along the marks and the list jumps to the mark
 * under the finger (`onSelect`), a bubble with its label follows the fingertip and the marks nearby bow out and grow.
 * The marks are also buttons (one tab stop; ↑/↓/Home/End move and jump). `active` is the mark the list is at.
 */
export function ScrubIndex({
  label,
  marks,
  active,
  onSelect,
  markLabel,
  className,
}: {
  /** Name of the rail, e.g. "Jump to chapter". */
  label: string;
  /** Short text of each mark ("1", "51", "101"). */
  marks: readonly string[];
  active: number;
  onSelect: (index: number) => void;
  /** Accessible name of a mark ("Chapter 51"). */
  markLabel: (mark: string) => string;
  className?: string;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [finger, setFinger] = useState<{ y: number; index: number } | null>(null);
  const last = useRef(-1);

  const scrub = (event: PointerEvent<HTMLDivElement>) => {
    const box = rail.current?.getBoundingClientRect();
    if (!box) return;
    const y = event.clientY - box.top;
    const index = markAt(y, box.height, marks.length);
    setFinger({ y, index });
    if (index !== last.current) {
      last.current = index;
      onSelect(index);
    }
  };
  const release = () => {
    last.current = -1;
    setFinger(null);
  };
  const onKeyDown = (event: KeyboardEvent, i: number) => {
    const next =
      event.key === "ArrowDown"
        ? i + 1
        : event.key === "ArrowUp"
          ? i - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? marks.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    const target = Math.max(0, Math.min(marks.length - 1, next));
    buttons.current[target]?.focus();
    onSelect(target);
  };

  const height = rail.current?.getBoundingClientRect().height ?? 0;
  const shown = finger ? (marks[finger.index] ?? "") : "";
  return (
    <div
      ref={rail}
      role="group"
      aria-label={label}
      data-slot="scrub-index"
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        event.preventDefault();
        scrub(event);
      }}
      onPointerMove={(event) => {
        if (finger || event.currentTarget.hasPointerCapture?.(event.pointerId)) scrub(event);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      className={cn("relative flex w-8 touch-none flex-col items-center justify-between select-none", className)}
    >
      {marks.map((mark, i) => {
        const bow = finger ? bowOf(i, finger.y, height, marks.length) : 0;
        const on = i === active;
        return (
          <button
            key={`${i}-${mark}`}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            tabIndex={on ? 0 : -1}
            aria-label={markLabel(mark)}
            aria-current={on ? "true" : undefined}
            onClick={() => onSelect(i)}
            onKeyDown={(event) => onKeyDown(event, i)}
            className={cn(
              "flex h-5 min-w-6 items-center justify-center rounded-full px-1 text-[0.625rem] leading-none font-semibold tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [transition:translate_0.15s_var(--ease-soft),scale_0.15s_var(--ease-soft),background-color_0.2s]",
              on ? "bg-primary text-primary-foreground" : "text-primary",
            )}
            style={bow > 0 ? { translate: `${(-bow * BOW_PX).toFixed(1)}px 0`, scale: 1 + bow * BOW_SCALE } : undefined}
          >
            {mark}
          </button>
        );
      })}
      <span
        aria-hidden
        data-slot="scrub-bubble"
        className={cn(
          "pointer-events-none absolute right-10 grid size-14 -translate-y-1/2 place-items-center rounded-[50%_50%_0.5rem_50%] bg-primary text-primary-foreground shadow-lg [transition:opacity_0.2s,scale_0.3s_var(--ease-spring)]",
          finger ? "scale-100 -rotate-45 opacity-100" : "scale-40 -rotate-45 opacity-0",
        )}
        style={{ top: finger ? `${finger.y}px` : 0 }}
      >
        <b className="rotate-45 text-lg font-bold tabular-nums">{shown}</b>
      </span>
    </div>
  );
}

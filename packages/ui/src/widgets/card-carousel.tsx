/* Lucian UX/UI Prompt #339 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#339 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Children, isValidElement, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

/** Pixels a mouse drag must move before it counts as a drag (and the click on the card underneath is cancelled). */
const DRAG_THRESHOLD = 6;

type Edges = { atStart: boolean; atEnd: boolean; progress: number; visible: number };

function readEdges(track: HTMLElement): Edges {
  const max = track.scrollWidth - track.clientWidth;
  const left = track.scrollLeft;
  return {
    atStart: left <= 1,
    atEnd: left >= max - 1,
    progress: max > 0 ? left / max : 0,
    visible: track.scrollWidth > 0 ? Math.min(1, track.clientWidth / track.scrollWidth) : 1,
  };
}

const sameEdges = (a: Edges, b: Edges) =>
  a.atStart === b.atStart && a.atEnd === b.atEnd && a.progress === b.progress && a.visible === b.visible;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Horizontal row of cards with the next one peeking in: swipe (native scroll with snap points, so touch flings and
 * momentum come from the platform), drag with a mouse, press the arrows or use ←/→ on the focused row to move one card.
 * A bar under the row shows where you are; the arrows dim at the ends. Without overflow (few cards, wide screen) the
 * arrows and the bar are hidden. Children are the cards; each one becomes a list item.
 */
export function CardCarousel({
  title,
  previousLabel,
  nextLabel,
  children,
  itemClassName,
  className,
}: {
  /** Heading shown above the row; also the accessible name of the list. */
  title: string;
  previousLabel: string;
  nextLabel: string;
  children: ReactNode;
  /** Width of each card cell; defaults to a cover-card width that shows 2.3 cards on a phone. */
  itemClassName?: string;
  className?: string;
}) {
  const headingId = useId();
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState<Edges>({ atStart: true, atEnd: true, progress: 0, visible: 1 });
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const next = readEdges(track);
    setEdges((current) => (sameEdges(current, next) ? current : next));
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    update();
    track.addEventListener("scroll", update, { passive: true });
    const resizes = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    resizes?.observe(track);
    return () => {
      track.removeEventListener("scroll", update);
      resizes?.disconnect();
    };
  }, [update]);

  /** Scroll by one card (the first cell's width plus the gap). */
  const step = (direction: 1 | -1) => {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!track || !first) return;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({
      left: direction * (first.offsetWidth + gap),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  // Mouse drag (touch and pen already scroll natively). Snap is suspended while dragging so the row follows the hand.
  const onPointerDown = (event: React.PointerEvent<HTMLUListElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft, moved: false };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLUListElement>) => {
    const state = drag.current;
    if (!state) return;
    const delta = event.clientX - state.x;
    if (!state.moved && Math.abs(delta) < DRAG_THRESHOLD) return;
    if (!state.moved) {
      state.moved = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.currentTarget.dataset.dragging = "true";
    }
    event.currentTarget.scrollLeft = state.left - delta;
  };
  const endDrag = (event: React.PointerEvent<HTMLUListElement>) => {
    if (!drag.current) return;
    delete event.currentTarget.dataset.dragging; // snap points take over again and settle on the nearest card
    // Keep `moved` until the click that follows this pointerup has been cancelled.
    window.setTimeout(() => (drag.current = null), 0);
  };
  const onClickCapture = (event: React.MouseEvent) => {
    if (drag.current?.moved) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.target !== event.currentTarget) return; // arrows inside a focused card keep their meaning
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  };

  const scrollable = !(edges.atStart && edges.atEnd);
  const barWidth = `${edges.visible * 100}%`;
  const barOffset = `${(edges.progress * (1 - edges.visible) * 100) / edges.visible}%`;

  return (
    <section
      aria-labelledby={headingId}
      data-slot="card-carousel"
      className={cn("flex min-w-0 flex-col gap-3", className)}
    >
      <div className="flex items-center gap-2">
        <h2 id={headingId} className="mr-auto text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {scrollable ? (
          <>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="rounded-full"
              aria-label={previousLabel}
              disabled={edges.atStart}
              onClick={() => step(-1)}
            >
              <ChevronLeft aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="rounded-full"
              aria-label={nextLabel}
              disabled={edges.atEnd}
              onClick={() => step(1)}
            >
              <ChevronRight aria-hidden />
            </Button>
          </>
        ) : null}
      </div>
      <ul
        ref={trackRef}
        aria-labelledby={headingId}
        tabIndex={scrollable ? 0 : undefined}
        className={cn(
          "-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-1 outline-none [scrollbar-width:none] focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:gap-4 [&::-webkit-scrollbar]:hidden",
          "data-[dragging=true]:cursor-grabbing data-[dragging=true]:snap-none data-[dragging=true]:scroll-auto data-[dragging=true]:select-none",
          scrollable && "cursor-grab",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        onDragStart={(event) => event.preventDefault()}
        onKeyDown={onKeyDown}
      >
        {Children.toArray(children).map((child, index) => (
          <li
            key={isValidElement(child) && child.key != null ? child.key : index}
            className={cn("w-36 shrink-0 snap-start sm:w-40", itemClassName)}
          >
            {child}
          </li>
        ))}
      </ul>
      {scrollable ? (
        <div aria-hidden className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground/70 transition-transform duration-300 ease-soft"
            style={{ width: barWidth, transform: `translateX(${barOffset})` }}
          />
        </div>
      ) : null}
    </section>
  );
}

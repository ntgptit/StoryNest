/* Lucian UX/UI Prompt #197 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#197 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

export interface TourStep {
  id: string;
  /** The element to show through the spotlight; null skips the hole (the bubble then sits in the middle). */
  target: () => Element | null;
  title: string;
  body: string;
}

export interface SpotlightTourLabels {
  /** Accessible name of the tour dialog. */
  dialog: string;
  next: string;
  back: string;
  done: string;
  skip: string;
  /** "Step 2 of 4". */
  progress: (step: number, total: number) => string;
}

export type TourEnd = "done" | "skip";

type Box = { x: number; y: number; w: number; h: number };

const PAD = 6;
const GAP = 12;
const EDGE = 8;
const TIP_WIDTH = 288;
const GLIDE_MS = 520;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function boxOf(element: Element | null): Box | null {
  if (!element) return null;
  const r = element.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
}

/** The dim layer with a rounded hole: the whole viewport, minus the box (even-odd fill). */
export function spotlightPath(hole: Box | null, width: number, height: number): string {
  const outer = `M0 0H${width}V${height}H0Z`;
  if (!hole || hole.w <= 0 || hole.h <= 0) return outer;
  const r = Math.min(14, hole.h / 2, hole.w / 2);
  const { x, y, w, h } = hole;
  return (
    `${outer} M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}` +
    `Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`
  );
}

/** Back-out easing of the element's hole glide (overshoots a little, c = 1.4). */
function backOut(k: number): number {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
}

/**
 * A first-run tour (Lucian 197): the screen dims, the current step's control shows through a rounded hole with a
 * ring around it, and a bubble next to it explains it. Next glides the hole to the next control (a back-out curve
 * over 520 ms; it jumps under reduced motion), Back returns, Skip or Esc ends it, ←/→ step through. The bubble is a
 * modal dialog: focus moves to Next on each step, Tab stays inside, and focus goes back to where it was at the end.
 * The first step appears in place without motion; the pulse around the hole is decorative (motion-safe only).
 * The host decides when to show it and remembers that it was seen (`onEnd` says whether it was finished or skipped).
 */
export function SpotlightTour({
  steps,
  labels,
  onEnd,
}: {
  steps: readonly TourStep[];
  labels: SpotlightTourLabels;
  onEnd: (how: TourEnd) => void;
}) {
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<Box | null>(null);
  const [hole, setHole] = useState<Box | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [tip, setTip] = useState<{ left: number; top: number } | null>(null);
  const [settled, setSettled] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<Element | null>(null);
  const mounted = useRef(false);
  const holeRef = useRef<Box | null>(null);
  const tween = useRef(0);
  const titleId = useId();
  const bodyId = useId();
  const step = steps[index];
  const last = index === steps.length - 1;
  // The host may rebuild its step list on every render: effects follow the step index, not the objects.
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  holeRef.current = hole;

  // Remember where focus was, give it back when the tour goes away.
  // The give-back waits a tick and checks the tour is really gone: React's development double mount runs this cleanup
  // once without unmounting, and focusing back then would pull focus out of the bubble.
  useEffect(() => {
    mounted.current = true;
    returnFocus.current ??= document.activeElement;
    return () => {
      mounted.current = false;
      cancelAnimationFrame(tween.current);
      const back = returnFocus.current;
      setTimeout(() => {
        if (!mounted.current && back instanceof HTMLElement && back.isConnected) back.focus({ preventScroll: true });
      }, 0);
    };
  }, []);

  const measure = useCallback(() => {
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    const next = boxOf(stepsRef.current[index]?.target() ?? null);
    setTarget(next);
    return next;
  }, [index]);

  // A new step: bring its control into view, then glide the hole there (the first step is placed at once).
  useLayoutEffect(() => {
    const current = stepsRef.current[index];
    if (!current) return;
    const element = current.target();
    const reduced = prefersReducedMotion();
    if (element && "scrollIntoView" in element) {
      const r = element.getBoundingClientRect();
      if (r.top < 64 || r.bottom > window.innerHeight - 64)
        element.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    }
    const to = measure();
    const from = holeRef.current;
    cancelAnimationFrame(tween.current);
    if (!from || !to || reduced || typeof requestAnimationFrame !== "function") {
      setHole(to);
      return;
    }
    const start = performance.now();
    const frame = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - start) / GLIDE_MS));
      const e = backOut(k);
      setHole({
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        w: Math.max(0, from.w + (to.w - from.w) * e),
        h: Math.max(0, from.h + (to.h - from.h) * e),
      });
      if (k < 1) tween.current = requestAnimationFrame(frame);
    };
    tween.current = requestAnimationFrame(frame);
  }, [index, measure]);

  // Scrolling or resizing moves the control: follow it at once.
  useEffect(() => {
    let pending = 0;
    const follow = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        cancelAnimationFrame(tween.current);
        setHole(measure());
      });
    };
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      cancelAnimationFrame(pending);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [measure]);

  // Place the bubble below the control, else above, else beside it; always inside the viewport.
  useLayoutEffect(() => {
    const bubble = tipRef.current;
    if (!bubble) return;
    const width = Math.min(TIP_WIDTH, window.innerWidth - EDGE * 2);
    const height = bubble.offsetHeight;
    const vh = window.innerHeight;
    let left: number;
    let top: number;
    if (!target) {
      left = (window.innerWidth - width) / 2;
      top = (vh - height) / 2;
    } else {
      left = target.x + target.w / 2 - width / 2;
      if (target.y + target.h + GAP + height <= vh - EDGE) top = target.y + target.h + GAP;
      else if (target.y - GAP - height >= EDGE) top = target.y - GAP - height;
      else top = Math.max(EDGE, Math.min(vh - height - EDGE, target.y + target.h / 2 - height / 2));
    }
    left = Math.max(EDGE, Math.min(window.innerWidth - width - EDGE, left));
    setTip((current) => (current?.left === left && current?.top === top ? current : { left, top }));
  }, [target, index]);

  useEffect(() => {
    if (!tip || settled) return;
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, [tip, settled]);

  // Focus Next on each step, once the bubble is placed (see-through until then). Not `visibility: hidden`: the
  // buttons transition all properties, so they would stay hidden, and unfocusable, for a while after it lifts.
  const placed = tip !== null;
  useEffect(() => {
    if (!placed) return;
    nextRef.current?.focus({ preventScroll: true });
    // A browser may refuse focus in the very commit that made the bubble visible: try once more on the next frame.
    const frame = requestAnimationFrame(() => {
      if (!tipRef.current?.contains(document.activeElement)) nextRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [index, placed]);

  if (!step) return null;

  const go = (next: number) => setIndex(Math.max(0, Math.min(steps.length - 1, next)));
  const advance = () => (last ? onEnd("done") : go(index + 1));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onEnd("skip");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      advance();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === "Tab") {
      const focusable = Array.from(tipRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
      const first = focusable[0];
      const end = focusable[focusable.length - 1];
      if (!first || !end) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        end.focus();
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const glide = settled ? "[transition:left_0.45s_var(--ease-glide),top_0.45s_var(--ease-glide)]" : undefined;

  return createPortal(
    <div data-slot="spotlight-tour" className="pointer-events-none fixed inset-0 z-50" onKeyDown={onKeyDown}>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
        viewBox={`0 0 ${viewport.width || 1} ${viewport.height || 1}`}
        preserveAspectRatio="none"
      >
        <path
          d={spotlightPath(hole, viewport.width, viewport.height)}
          fillRule="evenodd"
          className="fill-scrim [pointer-events:visiblePainted]"
        />
      </svg>
      {hole ? (
        <span
          aria-hidden
          data-part="ring"
          className="pointer-events-none absolute top-0 left-0 rounded-[14px] shadow-[0_0_0_2px_var(--primary)] after:absolute after:-inset-0.5 after:rounded-[inherit] after:shadow-[0_0_0_2px_var(--primary)] motion-safe:after:animate-spotlight-pulse"
          style={{
            transform: `translate(${hole.x}px, ${hole.y}px)`,
            width: hole.w,
            height: hole.h,
            borderRadius: Math.min(14, hole.h / 2),
          }}
        />
      ) : null}
      <div
        ref={tipRef}
        role="dialog"
        aria-modal="true"
        aria-label={labels.dialog}
        aria-describedby={bodyId}
        className={cn(
          "pointer-events-auto absolute rounded-xl border bg-popover p-4 pt-3 text-popover-foreground shadow-xl",
          !tip && "opacity-0",
          glide,
        )}
        style={{ width: `min(${TIP_WIDTH}px, calc(100vw - ${EDGE * 2}px))`, left: tip?.left ?? 0, top: tip?.top ?? 0 }}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute top-1.5 right-1.5 h-7 gap-1 px-2 text-xs text-muted-foreground"
          onClick={() => onEnd("skip")}
        >
          <X aria-hidden className="size-3.5" />
          {labels.skip}
        </Button>
        <div key={index} className={cn(index > 0 && "motion-safe:animate-tour-step-in")}>
          <p className="text-xs font-semibold text-primary">{labels.progress(index + 1, steps.length)}</p>
          <h2 id={titleId} className="mt-1 pr-16 text-base font-semibold">
            {step.title}
          </h2>
          <p id={bodyId} className="mt-1 text-sm text-muted-foreground">
            {step.body}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span aria-hidden className="mr-auto flex gap-1">
            {steps.map((item, position) => (
              <i
                key={item.id}
                className={cn(
                  "h-1.5 rounded-full bg-border transition-[width,background-color] duration-300 ease-spring",
                  position === index ? "w-4 bg-primary" : "w-1.5",
                )}
              />
            ))}
          </span>
          {index > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => go(index - 1)}>
              {labels.back}
            </Button>
          ) : null}
          <Button ref={nextRef} type="button" size="sm" onClick={advance}>
            {last ? labels.done : labels.next}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

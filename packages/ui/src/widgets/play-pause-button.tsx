/* Lucian UX/UI Prompt #007 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#007 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/utils.ts";

type Point = readonly [number, number];
type Shape = readonly [readonly Point[], readonly Point[]];

/** The element's two pieces on a 40px grid: the play triangle split in two, and the two pause bars. */
const PLAY: Shape = [
  [
    [13, 8],
    [22.5, 13.6],
    [22.5, 26.4],
    [13, 32],
  ],
  [
    [22.5, 13.6],
    [32, 20],
    [32, 20],
    [22.5, 26.4],
  ],
];
const PAUSE: Shape = [
  [
    [11, 9],
    [17, 9],
    [17, 31],
    [11, 31],
  ],
  [
    [23, 9],
    [29, 9],
    [29, 31],
    [23, 31],
  ],
];

/** Duration of the morph (the element's 420ms). */
export const PLAY_PAUSE_MORPH_MS = 420;

/** `points` of both pieces at `t` (0 = play, 1 = pause; the overshooting easing goes a little past either end). */
export function playPausePoints(t: number): [string, string] {
  const piece = (k: 0 | 1) =>
    PLAY[k]
      .map((p, j) => {
        const q = PAUSE[k][j] ?? p;
        return `${(p[0] + (q[0] - p[0]) * t).toFixed(2)},${(p[1] + (q[1] - p[1]) * t).toFixed(2)}`;
      })
      .join(" ");
  return [piece(0), piece(1)];
}

/** The element's easing: a soft overshoot at the end. */
function ease(x: number): number {
  return 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;
}

/**
 * Round play/pause button (adapted from Lucian 007): the play triangle splits into two pieces that become the pause
 * bars, and a ring around it fills with `progress` (0..1). The label switches between `playLabel` and `pauseLabel`
 * (so it is not also a toggle button). The first render draws the current shape in place; only a change morphs, and
 * with reduced motion the shape changes at once.
 */
export function PlayPauseButton({
  playing,
  progress = 0,
  onToggle,
  playLabel,
  pauseLabel,
  className,
}: {
  playing: boolean;
  /** Share done, 0..1, drawn as the ring. */
  progress?: number;
  onToggle: () => void;
  playLabel: string;
  pauseLabel: string;
  className?: string;
}) {
  const left = useRef<SVGPolygonElement>(null);
  const right = useRef<SVGPolygonElement>(null);
  const shape = useRef(playing ? 1 : 0);
  // Rendered once: later frames are drawn imperatively, so React never resets the shape mid-morph.
  const [initial] = useState(() => playPausePoints(playing ? 1 : 0));

  useEffect(() => {
    const to = playing ? 1 : 0;
    const from = shape.current;
    if (from === to) return;
    const draw = (t: number) => {
      shape.current = t;
      const [l, r] = playPausePoints(t);
      left.current?.setAttribute("points", l);
      right.current?.setAttribute("points", r);
    };
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    if (reduced || typeof window.requestAnimationFrame !== "function") {
      draw(to);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const x = Math.min(1, (now - start) / PLAY_PAUSE_MORPH_MS);
      draw(from + (to - from) * ease(x));
      if (x < 1) frame = window.requestAnimationFrame(step);
      else shape.current = to;
    };
    frame = window.requestAnimationFrame(step);
    // A quick second press morphs back from wherever the shape is now.
    return () => window.cancelAnimationFrame(frame);
  }, [playing]);

  const fill = Math.min(1, Math.max(0, progress));
  return (
    <button
      type="button"
      data-slot="play-pause-button"
      data-playing={playing}
      aria-label={playing ? pauseLabel : playLabel}
      onClick={onToggle}
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full text-foreground outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-92 [transition:scale_0.5s_var(--ease-spring),background-color_0.2s]",
        className,
      )}
    >
      <svg aria-hidden viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5" className="stroke-muted" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={100 - fill * 100}
          className={cn(
            "stroke-primary [transition:stroke-dashoffset_0.4s_var(--ease-soft),opacity_0.2s]",
            fill === 0 && "opacity-0",
          )}
        />
      </svg>
      <svg aria-hidden viewBox="0 0 40 40" className="relative size-4">
        <polygon
          ref={left}
          points={initial[0]}
          className="fill-current stroke-current"
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
        <polygon
          ref={right}
          points={initial[1]}
          className="fill-current stroke-current"
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

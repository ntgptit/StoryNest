/* Lucian UX/UI Prompt #022 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#022 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import type { CSSProperties } from "react";

import { turnedOn, useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

/** The heart outline from the Lucian element above, drawn on a 52×52 grid. */
const HEART_PATH =
  "M26 45S5 33 5 18.5C5 11.6 10.4 7 16.4 7c4.3 0 7.6 2.3 9.6 5.6C28 9.3 31.3 7 35.6 7 41.6 7 47 11.6 47 18.5 47 33 26 45 26 45z";
/** Stroke on the 52×52 grid that renders like a Lucide icon (stroke 2 on 24px). */
const HEART_STROKE = 4.3;

/** Seven dot pairs around the heart: angle, outer dot colour, inner dot colour (token utilities). */
const DOTS = [
  { angle: 0, outer: "bg-current", inner: "bg-chart-4" },
  { angle: 51, outer: "bg-chart-3", inner: "bg-current" },
  { angle: 103, outer: "bg-chart-4", inner: "bg-chart-2" },
  { angle: 154, outer: "bg-current", inner: "bg-chart-3" },
  { angle: 206, outer: "bg-chart-2", inner: "bg-chart-4" },
  { angle: 257, outer: "bg-chart-5", inner: "bg-chart-3" },
  { angle: 309, outer: "bg-chart-3", inner: "bg-current" },
] as const;

/**
 * Heart icon for a like/vote toggle. When `active` turns on the heart crouches, fills and leaps while a ring and dots
 * burst out (the burst only with `motion-safe`). Already-active hearts render filled without animating; turning off
 * just empties it. Decorative: the button holding it carries the label and `aria-pressed`.
 */
export function HeartBurstIcon({ active, className }: { active: boolean; className?: string }) {
  const beat = useTriggerCount(active, turnedOn);
  const animate = active && beat > 0;

  return (
    <span
      data-slot="heart-burst"
      data-state={active ? "on" : "off"}
      aria-hidden
      className={cn("relative inline-flex size-4 shrink-0", className)}
    >
      <svg
        key={`icon-${beat}`}
        viewBox="0 0 52 52"
        fill="none"
        className={cn("size-full overflow-visible", animate && "animate-heart-beat")}
      >
        {active ? (
          <path
            data-part="fill"
            d={HEART_PATH}
            className={cn("origin-[50%_55%] fill-current", animate && "animate-heart-fill")}
          />
        ) : null}
        <path d={HEART_PATH} stroke="currentColor" strokeWidth={HEART_STROKE} strokeLinejoin="round" />
      </svg>
      {animate ? (
        <span
          key={`burst-${beat}`}
          data-part="burst"
          className="pointer-events-none absolute inset-0 hidden motion-safe:block"
        >
          <span className="absolute top-1/2 left-1/2 -mt-5.5 -ml-5.5 size-11 rounded-full border-current opacity-0 animate-heart-ring" />
          {DOTS.map((dot) => (
            <span
              key={dot.angle}
              className="absolute top-1/2 left-1/2 size-0 rotate-(--burst-angle)"
              style={{ "--burst-angle": `${dot.angle}deg` } as CSSProperties}
            >
              <span className={cn("absolute -m-0.75 size-1.5 rounded-full opacity-0 animate-heart-fly", dot.outer)} />
              <span className={cn("absolute -m-0.5 size-1 rounded-full opacity-0 animate-heart-fly-near", dot.inner)} />
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

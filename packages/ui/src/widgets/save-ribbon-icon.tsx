/* Lucian UX/UI Prompt #012 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#012 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useState, type CSSProperties } from "react";

import { cn } from "../lib/utils.ts";

/** The ribbon outline from the Lucian element above, drawn on a 44×56 grid. */
const RIBBON_PATH = "M6 4h32a2 2 0 0 1 2 2v46l-18-12L4 52V6a2 2 0 0 1 2-2z";
/** Stroke on the 44×56 grid that renders like a Lucide icon (stroke 2 on 24px) at the same box height. */
const RIBBON_STROKE = 4.5;

/**
 * Burst particles: angle around the icon and a token colour. `bg-current` follows the button text, so at least one
 * colour stays visible on both the outline and the filled (primary) button.
 */
const BURST_PARTICLES = [
  { angle: 0, color: "bg-current" },
  { angle: 45, color: "bg-chart-2" },
  { angle: 90, color: "bg-chart-4" },
  { angle: 135, color: "bg-chart-5" },
  { angle: 180, color: "bg-current" },
  { angle: 225, color: "bg-chart-2" },
  { angle: 270, color: "bg-chart-3" },
  { angle: 315, color: "bg-chart-5" },
] as const;

/**
 * Bookmark icon for a save toggle. When `saved` turns on, the fill pours down from the top, the ribbon dips and
 * bounces, and a small ring and burst fly out (the burst only with `motion-safe`). It never animates on first render
 * or when turning off, so a story that is already saved simply shows the filled ribbon. Decorative: the button that
 * holds it carries the label and `aria-pressed`.
 */
export function SaveRibbonIcon({ saved, className }: { saved: boolean; className?: string }) {
  // Adjust state while rendering (no effect): count each off→on change so `key` can replay the animation.
  const [previousSaved, setPreviousSaved] = useState(saved);
  const [saveCount, setSaveCount] = useState(0);
  if (saved !== previousSaved) {
    setPreviousSaved(saved);
    if (saved) setSaveCount((count) => count + 1);
  }
  const animate = saved && saveCount > 0;

  return (
    <span
      data-slot="save-ribbon"
      data-state={saved ? "on" : "off"}
      aria-hidden
      className={cn("relative inline-flex size-4 shrink-0", className)}
    >
      <svg
        key={`icon-${saveCount}`}
        viewBox="0 0 44 56"
        fill="none"
        className={cn("size-full overflow-visible", animate && "animate-ribbon-drop")}
      >
        {saved ? (
          <path data-part="fill" d={RIBBON_PATH} className={cn("fill-current", animate && "animate-ribbon-fill")} />
        ) : null}
        <path d={RIBBON_PATH} stroke="currentColor" strokeWidth={RIBBON_STROKE} strokeLinejoin="round" />
      </svg>
      {animate ? (
        <span
          key={`burst-${saveCount}`}
          data-part="burst"
          className="pointer-events-none absolute inset-0 hidden motion-safe:block"
        >
          <span className="absolute -inset-1 rounded-full opacity-0 ring-2 ring-current animate-ribbon-ring" />
          {BURST_PARTICLES.map((particle) => (
            <span
              key={particle.angle}
              className={cn(
                "absolute top-1/2 left-1/2 -mt-0.5 -ml-0.5 size-1 rounded-xs opacity-0 animate-ribbon-burst",
                particle.color,
              )}
              style={{ "--burst-angle": `${particle.angle}deg` } as CSSProperties}
            />
          ))}
        </span>
      ) : null}
    </span>
  );
}

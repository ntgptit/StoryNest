/* Lucian UX/UI Prompt #153 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#153 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useState } from "react";

import { cn } from "../lib/utils.ts";

export interface FlowSource {
  key: string;
  label: string;
  /** Entered the flow (first stage). */
  entered: number;
  /** Reached the second stage. */
  middle: number;
  /** Reached the last stage. */
  outcome: number;
}

export interface FlowSankeyText {
  /** Captions of the three stages ("Readers", "Kept reading", "Followed"). */
  stages: readonly [string, string, string];
  /** Name of the source picker. */
  sources: string;
  /** Status line for all sources, and for one source. */
  all: (entered: number, outcome: number) => string;
  one: (source: FlowSource, percent: string) => string;
}

const STROKES = ["stroke-chart-1", "stroke-chart-2", "stroke-chart-3", "stroke-chart-4", "stroke-chart-5"] as const;
const SWATCHES = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"] as const;
const W = 300;
const TOP = 26;
const H = 180;
const MAX_STROKE = 34;

/**
 * A three-stage Sankey (Lucian 153): one ribbon per source from where readers came in to the middle stage, as thick
 * as the readers who reached it, then on to the outcome, as thick as the readers who reached that. Press a source below to keep only its flow (its dashes
 * march, under reduced motion they stay still); press it again to see them all. The status line gives the figures.
 */
export function FlowSankey({
  sources,
  text,
  className,
}: {
  sources: readonly FlowSource[];
  text: FlowSankeyText;
  className?: string;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const max = Math.max(1, ...sources.map((s) => s.entered));
  const totalIn = sources.reduce((sum, s) => sum + s.entered, 0);
  const totalOut = sources.reduce((sum, s) => sum + s.outcome, 0);
  const band = (H - TOP) / Math.max(1, sources.length);
  const chosen = sources.find((s) => s.key === picked);
  const width = (n: number) => Math.max(2, (n / max) * MAX_STROKE);

  return (
    <div data-slot="flow-sankey" className={cn("flex w-full flex-col gap-2", className)}>
      <svg viewBox={`0 0 ${W} ${H + 10}`} aria-hidden className="block h-48 w-full overflow-visible">
        {text.stages.map((stage, i) => (
          <text
            key={stage}
            x={[4, W / 2, W - 4][i]}
            y={14}
            textAnchor={(["start", "middle", "end"] as const)[i]}
            className="fill-muted-foreground text-[11px]"
          >
            {stage}
          </text>
        ))}
        <g className="fill-none">
          {sources.map((source, i) => {
            const y0 = TOP + band * (i + 0.5);
            const y1 = TOP + (H - TOP) * (0.3 + 0.4 * ((i + 0.5) / sources.length));
            const y2 = TOP + (H - TOP) * (0.4 + 0.2 * ((i + 0.5) / sources.length));
            const on = picked === source.key;
            const dim = picked !== null && !on;
            const tone = STROKES[i % STROKES.length];
            return (
              <g
                key={source.key}
                className={cn("transition-opacity duration-500", dim ? "opacity-10" : on ? "opacity-90" : "opacity-50")}
              >
                <path
                  d={`M 18 ${y0} C 80 ${y0} 90 ${y1} ${W / 2} ${y1}`}
                  strokeWidth={width(source.middle)}
                  className={cn(tone, "transition-[stroke-width] duration-500")}
                />
                <path
                  d={`M ${W / 2} ${y1} C 210 ${y1} 220 ${y2} ${W - 18} ${y2}`}
                  strokeWidth={width(source.outcome)}
                  strokeDasharray={on ? "8 2" : undefined}
                  className={cn(tone, "transition-[stroke-width] duration-500", on && "motion-safe:animate-flow-march")}
                />
              </g>
            );
          })}
        </g>
        <g className="fill-foreground">
          <rect x={10} y={TOP} width={8} height={H - TOP} rx={3} />
          <rect x={W / 2 - 4} y={TOP + (H - TOP) * 0.2} width={8} height={(H - TOP) * 0.6} rx={3} />
          <rect x={W - 18} y={TOP + (H - TOP) * 0.3} width={8} height={(H - TOP) * 0.4} rx={3} />
        </g>
      </svg>
      <div role="group" aria-label={text.sources} className="flex flex-wrap justify-center gap-1">
        {sources.map((source, i) => (
          <button
            key={source.key}
            type="button"
            aria-pressed={picked === source.key}
            onClick={() => setPicked(picked === source.key ? null : source.key)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm transition-[background-color,transform] duration-200 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring active:scale-97 aria-pressed:bg-muted aria-pressed:font-semibold"
          >
            <span aria-hidden className={cn("h-1 w-4 rounded-full", SWATCHES[i % SWATCHES.length])} />
            {source.label}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="text-center text-sm text-muted-foreground">
        {chosen
          ? text.one(chosen, chosen.entered > 0 ? `${((chosen.outcome / chosen.entered) * 100).toFixed(1)}%` : "0%")
          : text.all(totalIn, totalOut)}
      </p>
    </div>
  );
}

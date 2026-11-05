/* Lucian UX/UI Prompt #160 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#160 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useState } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

export interface FunnelStep {
  key: string;
  /** Step name ("Chapter 3"). */
  label: string;
  /** Second line under the name (a chapter title), truncated. */
  sublabel?: string;
  /** The step's value, formatted. */
  valueText: string;
  /** Bar width, 0 to 100, relative to the widest step. */
  widthPercent: number;
  /** Change from the step before, formatted ("−18%"); none for the first step. */
  changeText?: string;
  /** The step with the largest drop: drawn in the accent colour, its change in bold. */
  highlight?: boolean;
  /** Read out (live region) when the step is pressed. */
  detail: string;
}

/**
 * A funnel of steps that narrows as fewer people carry on (Lucian 160): each step is a centred trapezoid as wide as its
 * value, with the change from the step before next to it; the step with the biggest drop is highlighted. Pressing a
 * step shows its detail in the status line (a polite live region), pressing it again returns to the summary. Long
 * funnels show their first `initialVisible` steps and a "show all" toggle.
 */
export function FunnelSteps({
  steps,
  label,
  summary,
  highlightLabel,
  initialVisible = 8,
  showAllLabel,
  showFewerLabel,
  className,
}: {
  steps: readonly FunnelStep[];
  /** Accessible name of the list of steps. */
  label: string;
  /** Status line when no step is pressed. */
  summary: string;
  /** Screen-reader tag of the highlighted step ("biggest drop"). */
  highlightLabel: string;
  initialVisible?: number;
  showAllLabel: (count: number) => string;
  showFewerLabel: string;
  className?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const collapsible = steps.length > initialVisible;
  const visible = collapsible && !expanded ? steps.slice(0, initialVisible) : steps;
  const current = steps.find((step) => step.key === selected);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ol aria-label={label} className="flex flex-col gap-1.5">
        {visible.map((step) => (
          <li key={step.key}>
            <button
              type="button"
              aria-pressed={step.key === selected}
              onClick={() => setSelected((key) => (key === step.key ? null : step.key))}
              className={cn(
                "group grid min-h-11 w-full grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left transition-[background-color,scale] duration-300 ease-soft outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-pressed:bg-muted/60 active:scale-[0.97]",
                step.highlight && "ring-1 ring-chart-1/50",
              )}
            >
              <span className="min-w-0">
                <span className="block text-xs font-medium">{step.label}</span>
                {step.sublabel ? (
                  <span className="block truncate text-[11px] text-muted-foreground">{step.sublabel}</span>
                ) : null}
              </span>
              <span aria-hidden className="flex h-8 justify-center">
                <span
                  data-slot="funnel-bar"
                  className={cn(
                    // The pressed nudge (Lucian 160: 5px, .4s) moves the bar inside its column, never the row, so a
                    // full-width step cannot push the page sideways on a phone.
                    "h-full [clip-path:polygon(0_0,100%_0,94%_100%,6%_100%)] transition-[width,filter,translate] duration-450 ease-soft group-aria-pressed:translate-x-[5px] group-aria-pressed:brightness-110",
                    step.highlight ? "bg-chart-1" : "bg-chart-2",
                  )}
                  style={{ width: `${step.widthPercent}%` }}
                />
              </span>
              <span className="flex min-w-14 flex-col items-end tabular-nums">
                <span className="text-sm font-semibold">{step.valueText}</span>
                {step.changeText ? (
                  <span
                    className={cn(
                      "text-[11px]",
                      step.highlight ? "font-bold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.changeText}
                  </span>
                ) : null}
              </span>
              {step.highlight ? <span className="sr-only">{highlightLabel}</span> : null}
            </button>
          </li>
        ))}
      </ol>
      {collapsible ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? showFewerLabel : showAllLabel(steps.length)}
        </Button>
      ) : null}
      <p aria-live="polite" data-slot="funnel-status" className="text-center text-sm text-muted-foreground">
        {current ? current.detail : summary}
      </p>
    </div>
  );
}

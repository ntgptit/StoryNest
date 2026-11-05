/* Lucian UX/UI Prompt #155 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#155 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

export interface ScatterPoint {
  key: string;
  /** Horizontal value (0 or more). */
  x: number;
  /** Vertical value (0 or more). */
  y: number;
  /** Accessible name of the dot (its figures in words). */
  label: string;
  /** Status line while the dot is picked. */
  detail: string;
}

export interface ScatterFilter {
  /** Text of the toggle ("Fade under 12 reads"). */
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  /** Points whose x is below this value are faded and cannot be picked while the toggle is on. */
  below: number;
}

/** The largest value of an axis, so a lone 0 still gets a scale (every dot then sits on the axis). */
const axisMax = (values: readonly number[]) => Math.max(0, ...values) || 1;

/**
 * A scatter plot of picks (Lucian 155): one dot per item at (x, y). Pressing a dot shows its figures in the status line
 * (a polite live region), pressing it again returns to the summary. The optional filter fades the dots below an x
 * value and shades that band. The dots are one tab stop: ←/→ (or ↓/↑) move between them in x order, Home/End jump to
 * the ends, Enter/Space pick, Esc lets go. Dots glide to new places when the data or the axis changes (never on the
 * first render); the global reduced-motion clamp stops that.
 */
export function ScatterPicker({
  points,
  label,
  hint,
  xLabel,
  yLabel,
  formatX,
  formatY,
  summary,
  filter,
  toolbar,
  className,
}: {
  points: readonly ScatterPoint[];
  /** Accessible name of the plot. */
  label: string;
  /** How to use the dots from a keyboard (read after the plot name). */
  hint: string;
  /** Caption of the horizontal axis ("Reads →"). */
  xLabel: string;
  /** Caption of the vertical axis ("↑ Likes per 100 reads"). */
  yLabel: string;
  /** Tick text of the axis ends. */
  formatX: (value: number) => string;
  formatY: (value: number) => string;
  /** Status line when no dot is picked. */
  summary: string;
  filter?: ScatterFilter;
  /** Controls drawn at the start of the top row (e.g. a choice of the vertical axis). */
  toolbar?: ReactNode;
  className?: string;
}) {
  const hintId = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const xMax = axisMax(points.map((p) => p.x));
  const yMax = axisMax(points.map((p) => p.y));
  const faded = (point: ScatterPoint) => Boolean(filter?.pressed && point.x < filter.below);
  // Keyboard order: left to right, bottom to top on a tie.
  const order = points.filter((p) => !faded(p)).sort((a, b) => a.x - b.x || a.y - b.y);
  const current = order.find((p) => p.key === selected);
  const tabStop = order.find((p) => p.key === focusKey) ?? current ?? order[0];

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (selected !== null) {
        event.preventDefault();
        setSelected(null);
      }
      return;
    }
    const index = order.findIndex((p) => p.key === tabStop?.key);
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = Math.min(order.length - 1, index + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = Math.max(0, index - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = order.length - 1;
    if (next === null) return;
    event.preventDefault();
    const target = order[next];
    if (!target) return;
    setFocusKey(target.key);
    refs.current.get(target.key)?.focus();
  };

  const bandPercent = filter ? Math.min(100, (Math.max(0, filter.below) / xMax) * 100) : 0;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {toolbar || filter ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {toolbar ?? <span />}
          {filter ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-pressed={filter.pressed}
              onClick={() => {
                filter.onPressedChange(!filter.pressed);
                setSelected(null);
              }}
              className="active:scale-[0.97] aria-pressed:bg-accent aria-pressed:text-accent-foreground aria-pressed:ring-1 aria-pressed:ring-primary"
            >
              {filter.label}
            </Button>
          ) : null}
        </div>
      ) : null}
      <span className="text-xs text-muted-foreground">{yLabel}</span>
      <div className="flex gap-2">
        <div
          aria-hidden
          className="flex w-8 shrink-0 flex-col justify-between text-right text-[11px] text-muted-foreground tabular-nums"
        >
          <span className="-translate-y-1/2">{formatY(yMax)}</span>
          <span className="translate-y-1/2">{formatY(0)}</span>
        </div>
        <div
          role="group"
          aria-label={label}
          aria-describedby={hintId}
          onKeyDown={move}
          className="relative mt-2 mr-4 h-48 min-w-0 flex-1 border-b border-l border-border bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-size-[25%_25%] [background-position:-1px_-1px]"
        >
          {filter ? (
            <span
              aria-hidden
              data-slot="scatter-band"
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 border-r border-dashed border-muted-foreground/60 bg-muted/70 transition-opacity duration-300",
                filter.pressed ? "opacity-100" : "opacity-0",
              )}
              style={{ width: `${bandPercent}%` }}
            />
          ) : null}
          {points.map((point) => {
            const isFaded = faded(point);
            const pressed = point.key === current?.key;
            return (
              <button
                key={point.key}
                ref={(node) => {
                  if (node) refs.current.set(point.key, node);
                  else refs.current.delete(point.key);
                }}
                type="button"
                aria-label={point.label}
                aria-pressed={pressed}
                disabled={isFaded}
                tabIndex={point.key === tabStop?.key ? 0 : -1}
                onFocus={() => setFocusKey(point.key)}
                onClick={() => setSelected((key) => (key === point.key ? null : point.key))}
                data-slot="scatter-point"
                className={cn(
                  // A 32px hit area around a 14px dot (Lucian 155: 32px with a 9px page-coloured border).
                  "group absolute z-10 flex size-8 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full outline-none transition-[left,bottom,opacity] duration-400 ease-soft focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none active:scale-[0.97] aria-pressed:z-20",
                  isFaded && "opacity-20",
                )}
                style={{ left: `${(point.x / xMax) * 100}%`, bottom: `${(point.y / yMax) * 100}%` }}
              >
                <span
                  aria-hidden
                  className="size-3.5 rounded-full bg-chart-2 ring-2 ring-background transition-[background-color,box-shadow] duration-300 group-aria-pressed:bg-chart-1 group-aria-pressed:shadow-[0_0_0_4px_color-mix(in_oklab,var(--chart-1)_35%,transparent)]"
                />
              </button>
            );
          })}
        </div>
      </div>
      <div aria-hidden className="flex justify-between pr-4 pl-10 text-[11px] text-muted-foreground tabular-nums">
        <span>{formatX(0)}</span>
        <span className="text-xs">{xLabel}</span>
        <span>{formatX(xMax)}</span>
      </div>
      <span id={hintId} className="sr-only">
        {hint}
      </span>
      <p aria-live="polite" data-slot="scatter-status" className="text-center text-sm text-muted-foreground">
        {current ? current.detail : summary}
      </p>
    </div>
  );
}

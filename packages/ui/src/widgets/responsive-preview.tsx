/* Lucian UX/UI Prompt #257 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#257 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { cn } from "../lib/utils.ts";

export interface ResponsivePreset {
  id: string;
  label: string;
  /** Width in CSS pixels; null fills the available space. */
  width: number | null;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

export interface ResponsivePreviewLabels {
  /** Name of the preset button group. */
  presets: string;
  /** Name of the drag handle (a slider). */
  handle: string;
  /** "375 px". */
  width: (px: number) => string;
}

/** Narrowest frame: a small phone. */
export const PREVIEW_MIN_WIDTH = 320;
/** Arrow-key step of the handle (Lucian 257: 40 px). */
export const PREVIEW_STEP = 40;
/** Breakpoints marked on the ruler (Tailwind's sm / md / lg). */
const BREAKPOINTS: readonly [number, string][] = [
  [640, "sm"],
  [768, "md"],
  [1024, "lg"],
];

/** Which side of the breakpoints a width is on (0 = below sm). */
export function breakpointZone(width: number): number {
  return BREAKPOINTS.filter(([at]) => width >= at).length;
}

/** The frame width for a requested width, kept between the minimum and what fits. */
export function frameWidth(requested: number | null, available: number): number {
  if (available <= 0) return requested ?? 0;
  const max = Math.max(PREVIEW_MIN_WIDTH, available);
  return Math.round(Math.min(max, Math.max(PREVIEW_MIN_WIDTH, requested ?? max)));
}

/**
 * Shows `children` in a frame whose width the author sets (Lucian 257): device presets, a ruler with the
 * breakpoints (a tick flashes when the width crosses it), the current width, and a handle on the frame's right edge
 * to drag, or to move with ←/→ (40 px) and Home/End. The width is in real CSS pixels and never wider than the space
 * available; the frame is a size container, so `@container` styles inside follow it. Glides between presets
 * (not while dragging, not on first render).
 */
export function ResponsivePreview({
  presets,
  labels,
  defaultPreset,
  children,
  className,
}: {
  presets: readonly ResponsivePreset[];
  labels: ResponsivePreviewLabels;
  /** id of the preset to start with (default: the last one). */
  defaultPreset?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const start = presets.find((preset) => preset.id === defaultPreset) ?? presets[presets.length - 1];
  const [requested, setRequested] = useState<number | null>(start?.width ?? null);
  const [available, setAvailable] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [settled, setSettled] = useState(false);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // The handle (1rem) sits right of the frame, inside the stage.
    const measure = () => setAvailable(Math.max(0, stage.clientWidth - 16));
    measure();
    const resizes = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    resizes?.observe(stage);
    return () => resizes?.disconnect();
  }, []);

  useEffect(() => {
    if (available === 0 || settled) return;
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, [available, settled]);

  const width = frameWidth(requested, available);
  const max = Math.max(PREVIEW_MIN_WIDTH, available);
  const zone = breakpointZone(width);
  // The tick between the old and the new zone flashes; not while the first measurement settles the width.
  const [ruler, setRuler] = useState<{ zone: number; flash: { tick: number; count: number } | null }>({
    zone,
    flash: null,
  });
  if (zone !== ruler.zone) {
    setRuler({
      zone,
      flash: settled ? { tick: Math.min(zone, ruler.zone), count: (ruler.flash?.count ?? 0) + 1 } : ruler.flash,
    });
  }
  const flash = ruler.flash;

  const set = (next: number) => setRequested(Math.round(Math.min(max, Math.max(PREVIEW_MIN_WIDTH, next))));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? width + PREVIEW_STEP
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? width - PREVIEW_STEP
          : event.key === "Home"
            ? PREVIEW_MIN_WIDTH
            : event.key === "End"
              ? max
              : null;
    if (next === null) return;
    event.preventDefault();
    set(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // synthetic event: nothing to capture
    }
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const box = stageRef.current?.getBoundingClientRect();
    if (box) set(event.clientX - box.left);
  };
  const stop = () => setDragging(false);

  const activePreset = presets.find(
    (preset) => frameWidth(preset.width, available) === width && requested === preset.width,
  );

  return (
    <div data-slot="responsive-preview" className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={labels.presets} className="flex rounded-lg border bg-card p-0.5">
          {presets.map((preset) => {
            const Icon = preset.icon;
            const pressed = activePreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={pressed}
                onClick={() => setRequested(preset.width)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  pressed && "bg-foreground text-background hover:text-background",
                )}
              >
                <Icon aria-hidden className="size-4" />
                <span className="max-sm:sr-only">{preset.label}</span>
              </button>
            );
          })}
        </div>
        <span
          aria-live="polite"
          className="ml-auto rounded-md border bg-card px-2 py-1 font-mono text-xs font-semibold tabular-nums"
        >
          {labels.width(width)}
        </span>
      </div>

      <div ref={stageRef} className="relative min-w-0">
        <div aria-hidden className="relative h-4">
          {BREAKPOINTS.filter(([at]) => at <= max).map(([at, name], position) => (
            <i
              key={flash?.tick === position ? `${name}-${flash.count}` : name}
              className={cn(
                "absolute top-0 h-4 origin-top border-l-[1.5px] border-muted-foreground pl-0.5 text-[0.55rem] leading-[0.6rem] font-semibold not-italic text-muted-foreground",
                flash?.tick === position && "motion-safe:animate-ruler-flash",
              )}
              style={{ left: at }}
            >
              {name}
            </i>
          ))}
        </div>
        <div className="flex items-stretch">
          <div
            data-part="frame"
            className={cn(
              "@container min-w-0 shrink-0 overflow-hidden rounded-xl border bg-background shadow-sm",
              settled && !dragging && "[transition:width_0.5s_var(--ease-glide)]",
            )}
            style={{ width: available > 0 ? width : "100%" }}
          >
            {children}
          </div>
          <div
            role="slider"
            tabIndex={0}
            aria-label={labels.handle}
            aria-orientation="horizontal"
            aria-valuemin={PREVIEW_MIN_WIDTH}
            aria-valuemax={max}
            aria-valuenow={width}
            aria-valuetext={labels.width(width)}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stop}
            onPointerCancel={stop}
            className="group relative flex w-4 shrink-0 cursor-ew-resize touch-none flex-col justify-center outline-none"
          >
            <span
              aria-hidden
              className="sticky top-[calc(50dvh-1.375rem)] bottom-[calc(50dvh-1.375rem)] ml-0.5 grid h-11 w-3.5 place-items-center rounded-full border bg-card shadow-sm group-focus-visible:ring-[3px] group-focus-visible:ring-ring/50"
            >
              <span className="h-4 w-1 border-x-[1.5px] border-muted-foreground" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

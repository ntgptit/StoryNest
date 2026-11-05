/* Lucian UX/UI Prompt #400 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#400 */ // token-check-ignore: element number in the required license line, not a colour
/* Lucian UX/UI Prompt #095 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#095 */ // token-check-ignore: element number in the required license line, not a colour
/* Lucian UX/UI Prompt #170 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#170 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Flag, ZoomIn, ZoomOut } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

/** Which `--chart-N` design token colours a series. */
export type ChartTone = 1 | 2 | 3 | 4 | 5;

const TONE: Record<ChartTone, string> = {
  1: "bg-chart-1",
  2: "bg-chart-2",
  3: "bg-chart-3",
  4: "bg-chart-4",
  5: "bg-chart-5",
};

export interface SmallMultipleSeries {
  key: string;
  label: string;
  /** One value per day, aligned with `days`. */
  values: readonly number[];
  tone: ChartTone;
}

export interface SmallMultipleDay {
  key: string;
  /** Long label for the readout and the table ("Thu, 5 Nov"). */
  label: string;
  /** Short label for the axis ("5/11"). */
  short: string;
  /** An event on that day (e.g. "Chapter 3 published"): drawn as a dotted flag in every chart and listed in the table. */
  note?: string;
}

export interface SyncedSmallMultiplesText {
  /** Accessible name of one chart, e.g. "Reads by day". */
  chartLabel: (series: string) => string;
  /** How to use the charts from a keyboard (read after the chart name). */
  hint: string;
  /** Date line when no day is picked: the latest day. */
  latest: (day: string) => string;
  /** Tag of the dashed average line. */
  average: string;
  showTable: string;
  hideTable: string;
  tableCaption: string;
  dayColumn: string;
  noteColumn: string;
  /** Text of the time zoom; without it the charts cannot be zoomed. */
  zoom?: SyncedSmallMultiplesZoomText;
}

export interface SyncedSmallMultiplesZoomText {
  /** Button that halves the visible days around the picked day (the touch and screen-reader way to zoom). */
  zoomIn: string;
  /** Button that shows every day again. */
  reset: string;
  /** Days being brushed, before they are zoomed into ("3 Nov – 9 Nov, 7 days. Enter to zoom"). */
  selection: (from: string, to: string, days: number) => string;
  /** Days on screen while zoomed ("3 Nov – 9 Nov, 7 of 30 days"). */
  zoomed: (from: string, to: string, days: number, total: number) => string;
}

/** Fewest days a zoom shows: a brush over fewer days is treated as a click. */
export const MIN_ZOOM_DAYS = 3;

export interface DayWindow {
  start: number;
  end: number;
}

/**
 * The window "Zoom in" shows: half the visible days (at least MIN_ZOOM_DAYS), centred on `focus` and kept inside
 * 0..count-1. Null when the view is already as narrow as a zoom goes.
 */
export function zoomInWindow(view: DayWindow, focus: number, count: number): DayWindow | null {
  const visible = view.end - view.start + 1;
  if (visible <= MIN_ZOOM_DAYS) return null;
  const span = Math.max(MIN_ZOOM_DAYS, Math.ceil(visible / 2));
  const start = Math.max(0, Math.min(count - span, Math.round(focus - (span - 1) / 2)));
  return { start, end: start + span - 1 };
}

/** Height of a bar as a share of the largest value (0 to 100); a non-zero value stays visible, nothing stays empty. */
function share(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.min(100, Math.max(2, (value / max) * 100));
}

/** Side padding of a bar slot: wide bars for a week, hairline gaps for a quarter (like Lucian 095's --pad). */
function slotPadding(count: number): string {
  if (count <= 8) return "px-1";
  if (count <= 31) return "px-0.5";
  return "px-[0.5px]";
}

/**
 * Small multiples of daily series on one day axis with a shared cursor (Lucian 400): moving a pointer or a finger over any
 * chart, or ←/→ (Home/End, Esc) on a focused chart, moves one crosshair through all of them and every chart shows that
 * day's value and its change from the day before; the day is also announced in a polite live region. Bars change shape
 * when the number of days changes (Lucian 095): each bar slot is one day counted back from the latest, so on a switch from
 * 30 to 7 days the 7 bars that stay simply widen and rescale while the others fold away. Nothing moves on first render.
 * The same numbers are available as a table behind a toggle.
 *
 * With `text.zoom`, the shared time axis can be zoomed into a few days (Lucian 170): drag across any chart with a mouse or
 * pen, or hold Shift and press ←/→ on a focused chart then Enter, to brush a range in every chart and zoom into it; on
 * touch (where a drag scrubs the cursor) and from any keyboard, "Zoom in" halves the visible days around the picked day.
 * Zooming uses the same bar morph as a range switch, each chart rescales to its busiest visible day, the cursor stays
 * shared, and "Show all" (or Esc with nothing picked) zooms back out. The table always lists every day.
 */
export function SyncedSmallMultiples({
  days,
  series,
  slots,
  formatValue,
  formatDelta,
  describeDay,
  summary,
  text,
  className,
}: {
  days: readonly SmallMultipleDay[];
  series: readonly SmallMultipleSeries[];
  /** Bar slots kept per chart (the longest range), so a range switch morphs bars instead of replacing them. */
  slots?: number;
  formatValue: (value: number) => string;
  /** Change from the previous day, e.g. "+3"; omitted, no change is shown. */
  formatDelta?: (delta: number) => string;
  /** Everything about one day in a sentence, for the live region. */
  describeDay: (index: number) => string;
  /** Text summary of the whole figure (its accessible caption). */
  summary: string;
  text: SyncedSmallMultiplesText;
  className?: string;
}) {
  const captionId = useId();
  const hintId = useId();
  const tableId = useId();
  const count = days.length;
  const slotCount = Math.max(slots ?? count, count);
  const [cursor, setCursor] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  // The zoomed window and the range being brushed, both as indices of `days` (inclusive).
  const [view, setView] = useState<DayWindow | null>(null);
  const [brush, setBrush] = useState<{ anchor: number; head: number } | null>(null);
  const drag = useRef<{ pointerId: number; anchor: number } | null>(null);

  // A new range is a new axis: drop the picked day and the zoom (adjusting state while rendering, no effect).
  const [seenCount, setSeenCount] = useState(count);
  if (seenCount !== count) {
    setSeenCount(count);
    setCursor(null);
    setView(null);
    setBrush(null);
  }

  if (count === 0) return null;
  const zoom = text.zoom && count > MIN_ZOOM_DAYS ? text.zoom : null;
  const lo = view && view.end < count ? view.start : 0;
  const hi = view && view.end < count ? view.end : count - 1;
  const visible = hi - lo + 1;
  const zoomed = visible < count;
  const clampIn = (index: number) => Math.max(lo, Math.min(hi, index));
  const active = cursor !== null && cursor >= lo && cursor <= hi ? cursor : null;
  const shown = active ?? hi;
  const marked = days.flatMap((day, index) => (day.note && index >= lo && index <= hi ? [index] : []));
  const at = (index: number) => `${((index - lo + 0.5) / visible) * 100}%`;
  const range = brush ? { from: Math.min(brush.anchor, brush.head), to: Math.max(brush.anchor, brush.head) } : null;
  const brushable = range !== null && range.to - range.from + 1 >= MIN_ZOOM_DAYS;
  const nextZoom = zoom ? zoomInWindow({ start: lo, end: hi }, active ?? (lo + hi) / 2, count) : null;

  const zoomTo = (next: DayWindow | null) => {
    setBrush(null);
    setView(next && next.end - next.start + 1 < count ? next : null);
  };

  const indexAt = (event: PointerEvent<HTMLElement>): number | null => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return null;
    return clampIn(lo + Math.floor(((event.clientX - box.left) / box.width) * visible));
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    const index = indexAt(event);
    if (index === null) return;
    setCursor(index);
    // A mouse or pen drag brushes days to zoom into; a finger keeps scrubbing the cursor ("Zoom in" is its way to zoom).
    if (zoom && event.pointerType !== "touch" && event.button === 0) {
      drag.current = { pointerId: event.pointerId, anchor: index };
      setBrush(null);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const index = indexAt(event);
    if (index === null) return;
    setCursor(index);
    const dragging = drag.current;
    if (dragging && dragging.pointerId === event.pointerId && (brush || index !== dragging.anchor)) {
      setBrush({ anchor: dragging.anchor, head: index });
    }
  };

  const endDrag = (event: PointerEvent<HTMLElement>, commit: boolean) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    drag.current = null;
    if (commit && range && brushable) zoomTo({ start: range.from, end: range.to });
    else setBrush(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const from = active ?? hi;
    if (zoom && event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      // Shift+←/→ grows a brush from the picked day (or the last visible one); Enter zooms into it.
      event.preventDefault();
      const anchor = brush?.anchor ?? from;
      const head = clampIn((brush?.head ?? from) + (event.key === "ArrowRight" ? 1 : -1));
      setBrush({ anchor, head });
      setCursor(head);
      return;
    }
    let to: number;
    switch (event.key) {
      case "ArrowRight":
        to = active === null ? hi : from + 1;
        break;
      case "ArrowLeft":
        to = from - 1;
        break;
      case "Home":
        to = lo;
        break;
      case "End":
        to = hi;
        break;
      case "Enter":
        if (!range) return;
        event.preventDefault();
        if (brushable) zoomTo({ start: range.from, end: range.to });
        else setBrush(null);
        return;
      case "Escape":
        // One step back at a time: the brush, then the picked day, then the zoom.
        if (brush) setBrush(null);
        else if (active !== null) setCursor(null);
        else if (zoom && zoomed) zoomTo(null);
        else return;
        event.preventDefault();
        return;
      default:
        return;
    }
    event.preventDefault();
    setBrush(null);
    setCursor(clampIn(to));
  };

  return (
    <figure aria-labelledby={captionId} className={cn("m-0 flex min-w-0 flex-col gap-3", className)}>
      <figcaption id={captionId} className="sr-only">
        {summary}
      </figcaption>
      <p id={hintId} className="sr-only">
        {text.hint}
      </p>
      <p className="sr-only" aria-live="polite" aria-atomic="true" data-slot="readout">
        {active === null ? "" : describeDay(active)}
      </p>

      <div
        className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCursor(null);
        }}
      >
        <p aria-hidden className="truncate text-xs font-medium text-muted-foreground tabular-nums">
          {active === null ? text.latest(days[shown]?.label ?? "") : days[shown]?.label}
          {days[shown]?.note ? ` · ${days[shown]?.note}` : null}
        </p>

        {series.map((line) => {
          // Scale and average follow the visible days, so a zoom also rescales to the busiest day in view.
          const inView = line.values.slice(lo, hi + 1);
          const max = Math.max(0, ...inView);
          const mean = inView.reduce((sum, value) => sum + value, 0) / visible;
          const value = line.values[shown] ?? 0;
          const previous = shown > 0 ? (line.values[shown - 1] ?? 0) : null;
          return (
            <div
              key={line.key}
              role="group"
              tabIndex={0}
              aria-label={text.chartLabel(line.label)}
              aria-describedby={hintId}
              data-series={line.key}
              onKeyDown={onKeyDown}
              className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <div aria-hidden className="flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className={cn("size-2 shrink-0 rounded-full", TONE[line.tone])} />
                  <span className="truncate">{line.label}</span>
                </span>
                <span className="flex items-baseline gap-1.5 tabular-nums">
                  {formatDelta && previous !== null ? (
                    <span data-slot="delta" className="text-xs text-muted-foreground">
                      {formatDelta(value - previous)}
                    </span>
                  ) : null}
                  <span data-slot="value" className="text-sm font-semibold">
                    {formatValue(value)}
                  </span>
                </span>
              </div>

              <div
                aria-hidden
                data-slot="plot"
                className="relative mt-1 h-14 cursor-crosshair touch-pan-y select-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={(event) => endDrag(event, true)}
                onPointerCancel={(event) => endDrag(event, false)}
                onLostPointerCapture={(event) => endDrag(event, true)}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse" && !drag.current) setCursor(null);
                }}
              >
                <div className="absolute inset-0 flex items-end">
                  {Array.from({ length: slotCount }, (_, slot) => {
                    const index = slot - (slotCount - count);
                    const on = index >= lo && index <= hi;
                    const height = on ? share(line.values[index] ?? 0, max) : 0;
                    return (
                      <div
                        key={slot}
                        className={cn(
                          "flex h-full basis-0 flex-col justify-end transition-[flex-grow,padding,opacity] duration-550 ease-soft",
                          on ? cn("grow", slotPadding(visible)) : "grow-0 px-0 opacity-0",
                        )}
                      >
                        <div
                          data-slot="bar"
                          className={cn(
                            "w-full rounded-t-[3px] transition-[height,opacity] duration-650 ease-spring",
                            TONE[line.tone],
                            active !== null && index !== active && "opacity-45",
                          )}
                          // The stagger (Lucian 095: 28 ms a bar) is scaled so even 90 bars settle within a quarter second.
                          style={{
                            height: `${height}%`,
                            transitionDelay: `${on ? Math.round(((index - lo) / visible) * 240) : 0}ms, 0ms`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {max > 0 ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/35 transition-[bottom] duration-600 ease-spring"
                    style={{ bottom: `${share(mean, max)}%` }}
                  >
                    <span className="absolute right-0 bottom-0.5 rounded-sm bg-background/80 px-1 text-[10px] leading-3 text-muted-foreground">
                      {text.average}
                    </span>
                  </div>
                ) : null}

                {range ? (
                  <span
                    data-slot="brush"
                    className="pointer-events-none absolute -inset-y-1 rounded-sm border-x border-foreground/50 bg-foreground/10"
                    style={{
                      left: `${((range.from - lo) / visible) * 100}%`,
                      width: `${((range.to - range.from + 1) / visible) * 100}%`,
                    }}
                  />
                ) : null}

                {marked.map((index) => (
                  <span
                    key={days[index]?.key}
                    className="pointer-events-none absolute inset-y-0 border-l border-dotted border-muted-foreground/70"
                    style={{ left: at(index) }}
                  />
                ))}

                <span
                  data-slot="crosshair"
                  className={cn(
                    "pointer-events-none absolute -inset-y-1 w-px -translate-x-1/2 bg-foreground/60 transition-opacity duration-150",
                    active === null ? "opacity-0" : "opacity-100",
                  )}
                  style={{ left: at(shown) }}
                />
              </div>
            </div>
          );
        })}

        <div aria-hidden className="flex flex-col gap-0.5">
          {marked.length > 0 ? (
            <div className="relative h-3.5">
              {marked.map((index) => (
                <Flag
                  key={days[index]?.key}
                  className="absolute top-0 size-3 -translate-x-1/2 text-muted-foreground"
                  style={{ left: at(index) }}
                />
              ))}
            </div>
          ) : null}
          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>{days[lo]?.short}</span>
            {visible > 2 ? <span>{days[lo + Math.floor((visible - 1) / 2)]?.short}</span> : null}
            <span>{days[hi]?.short}</span>
          </div>
        </div>

        {zoom ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
            <p
              data-slot="zoom-status"
              aria-live="polite"
              className="min-w-0 text-xs text-muted-foreground tabular-nums"
            >
              {range
                ? zoom.selection(days[range.from]?.label ?? "", days[range.to]?.label ?? "", range.to - range.from + 1)
                : zoomed
                  ? zoom.zoomed(days[lo]?.label ?? "", days[hi]?.label ?? "", visible, count)
                  : ""}
            </p>
            <div className="ml-auto flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={nextZoom === null}
                onClick={() => zoomTo(nextZoom)}
              >
                <ZoomIn aria-hidden />
                {zoom.zoomIn}
              </Button>
              {zoomed ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => zoomTo(null)}>
                  <ZoomOut aria-hidden />
                  {zoom.reset}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          aria-expanded={showTable}
          aria-controls={tableId}
          onClick={() => setShowTable((open) => !open)}
        >
          {showTable ? text.hideTable : text.showTable}
        </Button>
        <div id={tableId} hidden={!showTable}>
          {showTable ? (
            <div
              className="max-h-72 overflow-auto rounded-lg border"
              tabIndex={0}
              role="region"
              aria-label={text.tableCaption}
            >
              <table className="w-full text-sm">
                <caption className="sr-only">{text.tableCaption}</caption>
                <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {text.dayColumn}
                    </th>
                    {series.map((line) => (
                      <th key={line.key} scope="col" className="px-3 py-2 text-right font-medium">
                        {line.label}
                      </th>
                    ))}
                    {marked.length > 0 ? (
                      <th scope="col" className="px-3 py-2 font-medium">
                        {text.noteColumn}
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {days.map((day, index) => (
                    <tr key={day.key}>
                      <th scope="row" className="px-3 py-1.5 text-left font-normal whitespace-nowrap">
                        {day.label}
                      </th>
                      {series.map((line) => (
                        <td key={line.key} className="px-3 py-1.5 text-right tabular-nums">
                          {formatValue(line.values[index] ?? 0)}
                        </td>
                      ))}
                      {marked.length > 0 ? <td className="px-3 py-1.5 text-xs">{day.note ?? ""}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </figure>
  );
}

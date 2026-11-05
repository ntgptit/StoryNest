/* Lucian UX/UI Prompt #400 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#400 */ // token-check-ignore: element number in the required license line, not a colour
/* Lucian UX/UI Prompt #095 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#095 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Flag } from "lucide-react";
import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";

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

const centre = (index: number, count: number) => `${((index + 0.5) / count) * 100}%`;

/**
 * Small multiples of daily series on one day axis with a shared cursor (Lucian 400): moving a pointer or a finger over any
 * chart, or ←/→ (Home/End, Esc) on a focused chart, moves one crosshair through all of them and every chart shows that
 * day's value and its change from the day before; the day is also announced in a polite live region. Bars change shape
 * when the number of days changes (Lucian 095): each bar slot is one day counted back from the latest, so on a switch from
 * 30 to 7 days the 7 bars that stay simply widen and rescale while the others fold away. Nothing moves on first render.
 * The same numbers are available as a table behind a toggle.
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

  // A new range is a new axis: drop the picked day (adjusting state while rendering, no effect).
  const [seenCount, setSeenCount] = useState(count);
  if (seenCount !== count) {
    setSeenCount(count);
    setCursor(null);
  }

  if (count === 0) return null;
  const active = cursor !== null && cursor < count ? cursor : null;
  const shown = active ?? count - 1;
  const marked = days.flatMap((day, index) => (day.note ? [index] : []));

  const pick = (event: PointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    const index = Math.floor(((event.clientX - box.left) / box.width) * count);
    setCursor(Math.max(0, Math.min(count - 1, index)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const from = active ?? count - 1;
    let to: number | null;
    switch (event.key) {
      case "ArrowRight":
        to = active === null ? count - 1 : from + 1;
        break;
      case "ArrowLeft":
        to = from - 1;
        break;
      case "Home":
        to = 0;
        break;
      case "End":
        to = count - 1;
        break;
      case "Escape":
        if (active === null) return;
        event.preventDefault();
        setCursor(null);
        return;
      default:
        return;
    }
    event.preventDefault();
    setCursor(Math.max(0, Math.min(count - 1, to)));
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
          const max = Math.max(0, ...line.values);
          const mean = line.values.reduce((sum, value) => sum + value, 0) / count;
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
                onPointerDown={pick}
                onPointerMove={pick}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") setCursor(null);
                }}
              >
                <div className="absolute inset-0 flex items-end">
                  {Array.from({ length: slotCount }, (_, slot) => {
                    const index = slot - (slotCount - count);
                    const on = index >= 0;
                    const height = on ? share(line.values[index] ?? 0, max) : 0;
                    return (
                      <div
                        key={slot}
                        className={cn(
                          "flex h-full basis-0 flex-col justify-end transition-[flex-grow,padding,opacity] duration-550 ease-soft",
                          on ? cn("grow", slotPadding(count)) : "grow-0 px-0 opacity-0",
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
                            transitionDelay: `${on ? Math.round((index / count) * 240) : 0}ms, 0ms`,
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

                {marked.map((index) => (
                  <span
                    key={days[index]?.key}
                    className="pointer-events-none absolute inset-y-0 border-l border-dotted border-muted-foreground/70"
                    style={{ left: centre(index, count) }}
                  />
                ))}

                <span
                  data-slot="crosshair"
                  className={cn(
                    "pointer-events-none absolute -inset-y-1 w-px -translate-x-1/2 bg-foreground/60 transition-opacity duration-150",
                    active === null ? "opacity-0" : "opacity-100",
                  )}
                  style={{ left: centre(shown, count) }}
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
                  style={{ left: centre(index, count) }}
                />
              ))}
            </div>
          ) : null}
          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>{days[0]?.short}</span>
            {count > 2 ? <span>{days[Math.floor((count - 1) / 2)]?.short}</span> : null}
            <span>{days[count - 1]?.short}</span>
          </div>
        </div>
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

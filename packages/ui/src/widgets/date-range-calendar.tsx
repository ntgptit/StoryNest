/* Lucian UX/UI Prompt #030 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#030 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

/** An inclusive range of UTC days, `YYYY-MM-DD`. */
export interface DateRange {
  from: string;
  to: string;
}

export interface DateRangeCalendarText {
  /** Captions of the two fields at the top ("From", "To"). */
  fromLabel: string;
  toLabel: string;
  /** What an empty field shows ("Pick a day"). */
  placeholder: string;
  previousMonth: string;
  nextMonth: string;
  /** Name of the day grid. */
  gridLabel: string;
  apply: string;
  /** Summary line before a start is picked, and after a start but before an end. */
  pickStart: string;
  pickEnd: string;
  /** Summary once both ends are picked, e.g. "14 days · 3/10 – 3/23". */
  summary: (days: number, from: string, to: string) => string;
}

const DAY_MS = 86_400_000;
const toNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
const toDay = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);
const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
/** Months since January 1970, and back. */
const monthOf = (n: number) => {
  const date = new Date(n * DAY_MS);
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
};
const firstOfMonth = (month: number) => Math.round(Date.UTC(Math.floor(month / 12), month % 12, 1) / DAY_MS);
/** Monday 0 … Sunday 6 (1970-01-01, day 0, was a Thursday). */
const weekday = (n: number) => (((n + 3) % 7) + 7) % 7;

/**
 * A month calendar for picking a range of days (Lucian 030): press a first day and the band follows the pointer or the
 * arrow keys, press a second day and it locks in; the fields above and the summary below follow. Changing month
 * slides the grid sideways (only when the reader changes it, never on first render). Days outside `min`..`max`, and
 * days further than `maxSpanDays` from the first pick, are disabled, so every range it applies is one the server
 * accepts. Weeks start on Monday and days are UTC days, like the statistics they filter. Arrow keys move by a day or a
 * week across months; Enter or Space picks.
 */
export function DateRangeCalendar({
  value,
  min,
  max,
  maxSpanDays,
  locale,
  text,
  onApply,
  className,
}: {
  value: DateRange | null;
  min: string;
  max: string;
  maxSpanDays?: number;
  locale: string;
  text: DateRangeCalendarText;
  onApply: (range: DateRange) => void;
  className?: string;
}) {
  const lo = isDay(min) ? toNumber(min) : 0;
  const hi = isDay(max) ? toNumber(max) : lo;
  const initial = value && isDay(value.from) && isDay(value.to) ? [toNumber(value.from), toNumber(value.to)] : null;
  const [start, setStart] = useState<number | null>(initial?.[0] ?? null);
  const [end, setEnd] = useState<number | null>(initial?.[1] ?? null);
  const [hover, setHover] = useState<number | null>(null);
  const [month, setMonth] = useState(() => monthOf(initial?.[1] ?? hi));
  const [focusDay, setFocusDay] = useState<number>(initial?.[1] ?? hi);
  // Direction of the last month change: the grid slides in from that side; 0 = no slide (first render).
  const [slide, setSlide] = useState<{ dir: -1 | 0 | 1; n: number }>({ dir: 0, n: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  // The picked days pop only once the reader has picked something, never for the range passed in.
  const [touched, setTouched] = useState(false);

  const span = maxSpanDays ?? Number.POSITIVE_INFINITY;
  const pickingEnd = start !== null && end === null;
  const disabled = (n: number) => n < lo || n > hi || (pickingEnd && start !== null && Math.abs(n - start) > span - 1);

  const first = firstOfMonth(month);
  const daysIn = firstOfMonth(month + 1) - first;
  const offset = weekday(first);
  const cells = Array.from({ length: 42 }, (_, i) =>
    i - offset >= 0 && i - offset < daysIn ? first + i - offset : null,
  );
  const minMonth = monthOf(lo);
  const maxMonth = monthOf(hi);

  let bandFrom = start;
  let bandTo = end ?? (pickingEnd ? hover : null);
  if (bandFrom !== null && bandTo !== null && bandTo < bandFrom) [bandFrom, bandTo] = [bandTo, bandFrom];

  const long = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const short = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", timeZone: "UTC" });
  const monthName = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date((4 + i) * DAY_MS)),
  );
  const label = (n: number) => long.format(new Date(n * DAY_MS));

  const goMonth = (next: number, focus?: number) => {
    if (next < minMonth || next > maxMonth || next === month) return;
    setSlide((s) => ({ dir: next > month ? 1 : -1, n: s.n + 1 }));
    setMonth(next);
    if (focus !== undefined) setFocusDay(focus);
  };

  const pick = (n: number) => {
    if (disabled(n)) return;
    if (start === null || end !== null) {
      setStart(n);
      setEnd(null);
    } else if (n === start) {
      setEnd(n);
    } else {
      setStart(Math.min(n, start));
      setEnd(Math.max(n, start));
    }
    setHover(null);
    setFocusDay(n);
    setTouched(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = Math.min(hi, Math.max(lo, focusDay + step));
    setFocusDay(next);
    if (pickingEnd) setHover(next);
    if (monthOf(next) !== month) goMonth(monthOf(next));
    window.requestAnimationFrame(() =>
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${toDay(next)}"]`)?.focus(),
    );
  };

  // Roving tab stop: the focused day when it is in this month, else the first enabled one.
  const inMonth = cells.filter((n): n is number => n !== null && !disabled(n));
  const tabStop = inMonth.includes(focusDay) ? focusDay : (inMonth[0] ?? null);
  const range = start !== null && end !== null ? { from: start, to: end } : null;
  const complete = range !== null;

  return (
    <div data-slot="date-range-calendar" className={cn("w-full max-w-sm rounded-2xl border bg-card p-4", className)}>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {(
          [
            [text.fromLabel, start, !complete && !pickingEnd],
            [text.toLabel, end, pickingEnd],
          ] as const
        ).map(([caption, day, active]) => (
          <div
            key={caption}
            className={cn(
              "rounded-xl bg-muted px-3 py-2 ring-2 ring-transparent transition-[box-shadow,background-color] duration-300",
              active && "bg-card ring-primary",
            )}
          >
            <span className="block text-xs font-semibold text-muted-foreground">{caption}</span>
            <span
              className={cn(
                "block text-sm font-semibold tabular-nums",
                day === null && "font-normal text-muted-foreground",
              )}
            >
              {day === null ? text.placeholder : label(day)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-1 pb-2">
        <span aria-live="polite" className="overflow-hidden text-base font-semibold">
          <span
            key={`m${slide.n}`}
            className={cn(
              "block",
              slide.dir === 1 && "animate-panel-from-end",
              slide.dir === -1 && "animate-panel-from-start",
            )}
          >
            {monthName.format(new Date(first * DAY_MS))}
          </span>
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={text.previousMonth}
            disabled={month <= minMonth}
            onClick={() => goMonth(month - 1)}
            className="rounded-full active:scale-90"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={text.nextMonth}
            disabled={month >= maxMonth}
            onClick={() => goMonth(month + 1)}
            className="rounded-full active:scale-90"
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      </div>

      <div aria-hidden className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">
        {weekdays.map((name, i) => (
          <span key={i}>{name}</span>
        ))}
      </div>
      <div className="overflow-hidden">
        <div
          key={`g${slide.n}`}
          ref={gridRef}
          role="grid"
          aria-label={text.gridLabel}
          onKeyDown={onKeyDown}
          onPointerLeave={() => setHover(null)}
          className={cn(
            "grid grid-cols-7 gap-y-0.5",
            slide.dir === 1 && "animate-panel-from-end",
            slide.dir === -1 && "animate-panel-from-start",
          )}
        >
          {Array.from({ length: 6 }, (_, row) => (
            <div key={row} role="row" className="contents">
              {cells.slice(row * 7, row * 7 + 7).map((n, col) => {
                if (n === null) return <span key={col} role="gridcell" className="h-10" />;
                const inBand = bandFrom !== null && bandTo !== null && n >= bandFrom && n <= bandTo;
                const isStart = n === (bandTo === null ? start : bandFrom);
                const isEnd = bandTo !== null && n === bandTo;
                const off = disabled(n);
                return (
                  <span key={col} role="gridcell" className="relative grid h-10 place-items-center">
                    {inBand && !(isStart && isEnd) ? (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-y-1 bg-primary/15",
                          isStart ? "left-1/2" : "left-0",
                          isEnd ? "right-1/2" : "right-0",
                          col === 0 && !isStart && "rounded-l-xl",
                          col === 6 && !isEnd && "rounded-r-xl",
                        )}
                      />
                    ) : null}
                    <button
                      type="button"
                      data-day={toDay(n)}
                      tabIndex={n === tabStop ? 0 : -1}
                      disabled={off}
                      aria-label={label(n)}
                      aria-pressed={n === start || n === end}
                      onClick={() => pick(n)}
                      onPointerEnter={() => pickingEnd && !off && setHover(n)}
                      onFocus={() => setFocusDay(n)}
                      className={cn(
                        "relative size-10 rounded-full text-sm font-medium tabular-nums transition-colors duration-200 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 disabled:hover:bg-transparent",
                        (isStart || isEnd) &&
                          "bg-primary font-semibold text-primary-foreground shadow hover:bg-primary",
                        (isStart || isEnd) && touched && "animate-range-pick",
                      )}
                    >
                      {new Date(n * DAY_MS).getUTCDate()}
                      {n === hi ? (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full",
                            isStart || isEnd ? "bg-primary-foreground" : "bg-primary",
                          )}
                        />
                      ) : null}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
        <span aria-live="polite" className="text-sm text-muted-foreground">
          {range
            ? text.summary(
                range.to - range.from + 1,
                short.format(new Date(range.from * DAY_MS)),
                short.format(new Date(range.to * DAY_MS)),
              )
            : pickingEnd
              ? text.pickEnd
              : text.pickStart}
        </span>
        <Button
          type="button"
          size="sm"
          disabled={!range}
          onClick={() => range && onApply({ from: toDay(range.from), to: toDay(range.to) })}
        >
          {text.apply}
        </Button>
      </div>
    </div>
  );
}

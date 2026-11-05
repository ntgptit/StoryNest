/* Lucian UX/UI Prompt #099 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#099 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

import { turnedOn, useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";
import { RollingNumber } from "./rolling-number.tsx";

/** Ring colours, outermost first (at most three rings, like the element). */
const COLOURS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"] as const;
const RADII = [70, 51, 32] as const;
const MINI_RADII = [13, 9, 5] as const;
const STROKE = 18;
const CENTRE = 82;
/** Glow of a ring that just closed (a class, so it restarts without remounting the arc). */
const FLASH = "animate-ring-flash";

export interface ActivityRing {
  key: string;
  /** "Chapters read". */
  label: string;
  goal: number;
  /** Value with its unit for the legend and screen readers: `(value, goal) => "2 / 3 chapters"`. */
  format: (value: number, goal: number) => string;
}

export interface ActivityDay {
  key: string;
  /** Short weekday under the mini rings ("T2"). */
  abbr: string;
  /** Full date, shown in the header when the day is picked ("Today · 5 Nov"). */
  label: string;
  /** One value per ring, in ring order. */
  values: readonly number[];
}

export interface ActivityRingsText {
  title: string;
  /** Name of the legend group ("Today's rings"). */
  rings: string;
  /** Name of the day picker ("Pick a day"). */
  days: string;
  /** A day button's name, e.g. "Monday 3 Nov, chapters read 2 of 3, finished 1 of 3". */
  dayLabel: (day: ActivityDay) => string;
}

/**
 * Daily rings (adapted from Lucian 099): one ring per measure, filling toward its goal; past the goal a ring laps a
 * second time with a shadowed tip. The week's days sit below as mini rings: pick one (←/→, Home/End move between days,
 * one tab stop) and the big rings tween into that day's values one after another while the numbers roll; a ring that
 * closes on the way flashes once. Hovering or focusing a legend item dims the other rings. The first render shows the
 * picked day in place (nothing tweens in), and `summary` is a sentence under the picker.
 */
export function ActivityRings({
  rings,
  days,
  text,
  summary,
  initialDay,
  className,
}: {
  rings: readonly ActivityRing[];
  days: readonly ActivityDay[];
  text: ActivityRingsText;
  summary?: string;
  /** Index of the day picked at first (default: the last one, usually today). */
  initialDay?: number;
  className?: string;
}) {
  const shown = rings.slice(0, COLOURS.length);
  const [picked, setPicked] = useState(() => Math.min(Math.max(initialDay ?? days.length - 1, 0), days.length - 1));
  const [highlight, setHighlight] = useState<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  // Transitions switch on after the first paint, so the rings never fill in when the page loads.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setSettled(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const day = days[picked];
  const values = shown.map((_, k) => day?.values[k] ?? 0);

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = days.length - 1;
    const to =
      event.key === "ArrowRight"
        ? picked + 1
        : event.key === "ArrowLeft"
          ? picked - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (to === null) return;
    event.preventDefault();
    const next = Math.max(0, Math.min(last, to));
    setPicked(next);
    buttons.current[next]?.focus();
  };

  return (
    <section
      data-slot="activity-rings"
      aria-label={text.title}
      className={cn("flex flex-col gap-4 rounded-2xl border bg-card p-4 text-card-foreground", className)}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-extrabold tracking-tight">{text.title}</h3>
        <span className="text-xs font-semibold text-muted-foreground">{day?.label}</span>
      </header>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 164 164" aria-hidden className="size-36 shrink-0 -rotate-90 overflow-visible sm:size-44">
          {shown.map((ring, k) => (
            <Ring
              key={ring.key}
              index={k}
              ratio={ring.goal > 0 ? (values[k] ?? 0) / ring.goal : 0}
              settled={settled}
              dimmed={highlight !== null && highlight !== k}
            />
          ))}
        </svg>
        <div role="group" aria-label={text.rings} className="flex min-w-0 flex-1 flex-col gap-1.5">
          {shown.map((ring, k) => (
            <button
              key={ring.key}
              type="button"
              style={{ "--ring-colour": COLOURS[k] } as CSSProperties}
              aria-label={`${ring.label}: ${ring.format(values[k] ?? 0, ring.goal)}`}
              onPointerEnter={() => setHighlight(k)}
              onPointerLeave={(event) => document.activeElement !== event.currentTarget && setHighlight(null)}
              onFocus={() => setHighlight(k)}
              onBlur={() => setHighlight(null)}
              className={cn(
                "touch-target rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                highlight === k && "bg-muted",
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <i aria-hidden className="size-2 rounded-full bg-(--ring-colour)" />
                {ring.label}
              </span>
              <RollingNumber
                value={values[k] ?? 0}
                format={(value) => ring.format(value, ring.goal)}
                className="mt-0.5 text-base font-extrabold text-(--ring-colour)"
              />
            </button>
          ))}
        </div>
      </div>
      <div
        role="group"
        aria-label={text.days}
        onKeyDown={move}
        className="grid gap-0.5 rounded-2xl bg-muted p-1.5"
        style={{ gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, minmax(0, 1fr))` }}
      >
        {days.map((d, i) => (
          <button
            key={d.key}
            ref={(element) => {
              buttons.current[i] = element;
            }}
            type="button"
            aria-pressed={i === picked}
            aria-label={text.dayLabel(d)}
            tabIndex={i === picked ? 0 : -1}
            onClick={() => setPicked(i)}
            className={cn(
              "flex min-h-11 flex-col items-center gap-1 rounded-xl py-1.5 text-xs font-bold text-muted-foreground transition-[background-color,color,transform] duration-300 ease-spring hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:scale-92",
              i === picked && "bg-card text-foreground shadow-sm",
            )}
          >
            <svg viewBox="0 0 30 30" aria-hidden className="size-7 -rotate-90">
              {shown.map((ring, k) => {
                const r = MINI_RADII[k] ?? 5;
                const c = 2 * Math.PI * r;
                const ratio = ring.goal > 0 ? Math.min(1, (d.values[k] ?? 0) / ring.goal) : 0;
                return (
                  <g key={ring.key} style={{ stroke: COLOURS[k] }} fill="none" strokeWidth={3.4} strokeLinecap="round">
                    <circle cx={15} cy={15} r={r} strokeOpacity={0.22} />
                    {ratio > 0 ? (
                      <circle cx={15} cy={15} r={r} strokeDasharray={`${(ratio * c).toFixed(2)} ${c.toFixed(2)}`} />
                    ) : null}
                  </g>
                );
              })}
            </svg>
            {d.abbr}
          </button>
        ))}
      </div>
      {summary ? <p className="text-center text-xs font-semibold text-muted-foreground">{summary}</p> : null}
    </section>
  );
}

function Ring({ index, ratio, settled, dimmed }: { index: number; ratio: number; settled: boolean; dimmed: boolean }) {
  const r = RADII[index] ?? 32;
  const c = 2 * Math.PI * r;
  const first = Math.min(Math.max(ratio, 0), 1);
  const lap = Math.max(0, Math.min(ratio - 1, 1));
  const flash = useTriggerCount(ratio >= 1, turnedOn);
  // The flash restarts on the same arc (no remount), so the arc keeps tweening while it glows.
  const arc = useRef<SVGCircleElement>(null);
  useEffect(() => {
    const element = arc.current;
    if (flash === 0 || !element) return;
    element.classList.remove(FLASH);
    void element.getBoundingClientRect();
    element.classList.add(FLASH);
  }, [flash]);
  const motion: CSSProperties = settled
    ? {
        transitionProperty: "stroke-dasharray, transform, opacity",
        transitionDuration: "1100ms",
        transitionTimingFunction: "var(--ease-ring)",
        transitionDelay: `${index * 110}ms`,
      }
    : { transition: "none" };
  return (
    <g
      style={{ "--ring-colour": COLOURS[index], stroke: COLOURS[index] } as CSSProperties}
      className={cn("transition-opacity duration-250", dimmed && "opacity-25")}
      fill="none"
      strokeWidth={STROKE}
      strokeLinecap="round"
    >
      <circle cx={CENTRE} cy={CENTRE} r={r} strokeOpacity={0.2} />
      <circle
        ref={arc}
        cx={CENTRE}
        cy={CENTRE}
        r={r}
        strokeDasharray={`${(first * c).toFixed(2)} ${c.toFixed(2)}`}
        // At 0 the round caps would still draw a dot: hide the arc instead.
        style={{ ...motion, opacity: first > 0 ? 1 : 0 }}
      />
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={r}
        strokeDasharray={`${(lap * c).toFixed(2)} ${c.toFixed(2)}`}
        style={{ ...motion, opacity: lap > 0 ? 1 : 0 }}
      />
      {/* Shadowed tip of a lapping ring: sits at the end of the arc, turned with it. */}
      <circle
        cx={CENTRE + r}
        cy={CENTRE}
        r={STROKE / 2}
        stroke="none"
        style={{
          ...motion,
          fill: COLOURS[index],
          opacity: ratio > 1.02 ? 1 : 0,
          transform: `rotate(${(Math.min(ratio, 2) * 360).toFixed(1)}deg)`,
          transformOrigin: `${CENTRE}px ${CENTRE}px`,
          filter: "drop-shadow(0 0 2.5px var(--scrim))",
        }}
      />
    </g>
  );
}

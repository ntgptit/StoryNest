/* Lucian UX/UI Prompt #379 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#379 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Check } from "lucide-react";
import { useId } from "react";

import { increased, turnedOn, useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";
import { RollingNumber } from "./rolling-number.tsx";

export interface StreakDay {
  key: string;
  /** One-letter weekday shown over the slot ("M"). */
  abbr: string;
  /** Whole sentence for screen readers ("Monday, read"). */
  label: string;
  read: boolean;
  isToday: boolean;
}

export interface StreakFlameText {
  title: string;
  /** Text after the number ("day streak"); gets the number for plurals. */
  unit: (days: number) => string;
  /** Badge when all seven days of the week are read. */
  fullWeek: string;
  /** Name of the week row ("This week"). */
  week: string;
}

// The element's flame profile: (height fraction, half-width fraction) from the base to the tip.
const PROFILE: readonly (readonly [number, number])[] = [
  [0.05, 0.6],
  [0.19, 0.96],
  [0.37, 1],
  [0.55, 0.8],
  [0.71, 0.52],
  [0.85, 0.26],
];
const CX = 60;
const BASE = 138;

/** Closed Catmull-Rom outline through the profile: the element's flame shape, at rest (the sway is CSS). */
function flamePath(width: number, height: number): string {
  const right = PROFILE.map(([f, x]) => [CX + x * width, BASE - f * height] as const);
  const left = PROFILE.map(([f, x]) => [CX - x * width, BASE - f * height] as const).reverse();
  const tip = [CX, BASE - height] as const;
  const points = [[CX, BASE] as const, ...right, tip, tip, ...left];
  const n = points.length;
  const at = (i: number) => points[(i + n) % n] ?? tip;
  let d = `M${at(0)[0].toFixed(1)} ${at(0)[1].toFixed(1)}`;
  for (let i = 0; i < n; i += 1) {
    const [a, b, c, e] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d +=
      ` C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)}` +
      ` ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)}` +
      ` ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
  }
  return `${d}Z`;
}

const LAYERS = [
  {
    key: "outer",
    d: flamePath(40, 126),
    from: "--primary",
    to: "--destructive",
    sway: "motion-safe:animate-flame-sway-outer",
  },
  {
    key: "middle",
    d: flamePath(28, 88),
    from: "--chart-5",
    to: "--chart-4",
    sway: "motion-safe:animate-flame-sway-middle",
  },
  {
    key: "core",
    d: flamePath(15, 48),
    from: "--chart-4",
    to: "--chart-4",
    sway: "motion-safe:animate-flame-sway-core",
  },
] as const;

/**
 * Reading streak (adapted from Lucian 379): a three-layer flame over the number of days in a row, and the week's seven
 * slots below it, a check in each day that was read. The flame grows a size with every day of the week read; when the
 * streak goes up while the card is on screen the flame flares once, the number rolls and the new slot hops in, and
 * filling all seven shows a full-week badge. The layers sway gently (decorative, skipped with reduced motion); nothing
 * else moves on first render. The streak itself comes from the reader's data, there is no "done today" button.
 */
export function StreakFlame({
  streak,
  days,
  text,
  hint,
  className,
}: {
  streak: number;
  days: readonly StreakDay[];
  text: StreakFlameText;
  /** A line under the week (e.g. "Read a chapter today to keep it going"). */
  hint?: string;
  className?: string;
}) {
  const id = useId();
  const done = days.filter((d) => d.read).length;
  const fullWeek = days.length === 7 && done === 7;
  const flare = useTriggerCount(streak, increased);
  const fullWeekPop = useTriggerCount(fullWeek, turnedOn);
  const scale = 0.8 + done * 0.05;

  return (
    <section
      data-slot="streak-flame"
      aria-label={text.title}
      className={cn(
        "relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border bg-card px-4 pt-5 pb-4 text-card-foreground",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-8 left-1/2 size-48 -translate-x-1/2 rounded-full bg-radial from-chart-5/30 to-transparent to-70% transition-[opacity,scale] duration-600"
        style={{ opacity: 0.4 + done * 0.09, scale: 0.8 + done * 0.06 }}
      />
      {fullWeek ? (
        <span
          key={fullWeekPop}
          className={cn(
            "absolute top-3 right-3 rotate-6 rounded-full bg-chart-4 px-2.5 py-1 text-xs font-bold text-foreground",
            fullWeekPop > 0 && "animate-badge-pop",
          )}
        >
          {text.fullWeek}
        </span>
      ) : null}
      <div
        aria-hidden
        className="relative h-28 w-24 origin-[50%_96%] transition-transform duration-600 ease-pop"
        style={{ scale }}
      >
        <svg
          key={flare}
          viewBox="0 0 120 144"
          className={cn("size-full overflow-visible", flare > 0 && "animate-flame-flare")}
        >
          <defs>
            {LAYERS.map((layer) => (
              <linearGradient key={layer.key} id={`${id}-${layer.key}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" style={{ stopColor: `var(${layer.from})` }} />
                <stop offset="1" style={{ stopColor: `var(${layer.to})` }} />
              </linearGradient>
            ))}
          </defs>
          {LAYERS.map((layer) => (
            <path
              key={layer.key}
              d={layer.d}
              fill={`url(#${id}-${layer.key})`}
              className={cn("origin-[50%_96%] [transform-box:view-box]", layer.sway)}
            />
          ))}
        </svg>
      </div>
      <p className="relative -mt-1 flex items-baseline gap-1.5">
        <RollingNumber value={streak} live className="text-4xl font-black text-chart-5" />
        <span className="text-sm font-bold text-muted-foreground">{text.unit(streak)}</span>
      </p>
      <ol aria-label={text.week} className="relative grid w-full max-w-xs grid-cols-7 gap-1.5 text-center">
        {days.map((day) => (
          <StreakSlot key={day.key} day={day} />
        ))}
      </ol>
      {hint ? <p className="relative text-center text-xs text-muted-foreground">{hint}</p> : null}
    </section>
  );
}

function StreakSlot({ day }: { day: StreakDay }) {
  const hop = useTriggerCount(day.read, turnedOn);
  return (
    <li aria-label={day.label} className="flex flex-col items-center gap-1">
      <span aria-hidden className="text-[0.625rem] font-bold text-muted-foreground">
        {day.abbr}
      </span>
      <span
        key={hop}
        aria-hidden
        className={cn(
          "grid size-7 place-items-center rounded-full",
          day.read
            ? "bg-linear-to-br from-chart-5 to-destructive text-primary-foreground"
            : "border-2 border-dashed border-muted-foreground/35",
          day.isToday && "ring-2 ring-chart-4 ring-offset-1 ring-offset-card",
          hop > 0 && "animate-slot-pop",
        )}
      >
        {day.read ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>
    </li>
  );
}

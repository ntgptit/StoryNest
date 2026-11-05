/* Lucian UX/UI Prompt #372 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#372 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useState } from "react";

import { increased, useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";
import { RollingNumber } from "./rolling-number.tsx";

/** How long the full bar glows before a level-up rolls over (the element's 650 ms). */
export const LEVEL_UP_HOLD_MS = 650;

export interface XpBarText {
  /** Small caps over the level number ("LEVEL"). */
  level: string;
  /** Name of the progress bar ("Experience"). */
  bar: string;
  /** "60 / 100 XP". */
  progress: (into: number, needed: number) => string;
  /** "40 XP to the next level". */
  toNext: (left: number) => string;
  levelUp: string;
}

/**
 * Level and experience bar (adapted from Lucian 372): an avatar, a name and the level number, the bar of XP gathered
 * inside the level, and what earns XP as small chips below. When the XP grows while the bar is on screen a light sweeps
 * over the fill; when the level goes up the bar first fills to the end and glows, then the level number rolls, two
 * rings spread from the avatar, a "Level up" banner pops in and out, and the bar refills from the leftover XP. The
 * element's flying "+XP" chips came from press-to-earn buttons; here XP comes from reading, so the chips just list the
 * rules. The first render shows the values in place.
 */
export function XpBar({
  name,
  subtitle,
  initial,
  level,
  into,
  needed,
  total,
  rules,
  text,
  className,
}: {
  name: string;
  subtitle?: string;
  /** Letter in the avatar. */
  initial: string;
  level: number;
  into: number;
  needed: number;
  /** All XP ever gathered: a rise plays the shine. */
  total: number;
  rules?: readonly { key: string; label: string; xp: string }[];
  text: XpBarText;
  className?: string;
}) {
  const gain = useTriggerCount(total, increased);
  const up = useTriggerCount(level, increased);
  // A level-up runs in phases: "hold" (bar full and glowing, old level), "reset" (empty, no transition, one frame),
  // then "idle" again (fills to the leftover XP). "Adjust state while rendering" starts it in the same commit.
  const [phase, setPhase] = useState<"idle" | "hold" | "reset">("idle");
  const [seenUp, setSeenUp] = useState(up);
  if (seenUp !== up) {
    setSeenUp(up);
    setPhase("hold");
  }
  useEffect(() => {
    if (phase === "idle") return;
    if (phase === "reset") {
      const frame = window.requestAnimationFrame(() => setPhase("idle"));
      return () => window.cancelAnimationFrame(frame);
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    const timer = window.setTimeout(() => setPhase("reset"), reduced ? 0 : LEVEL_UP_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);
  const holding = phase === "hold";

  const percent = needed > 0 ? Math.min(100, (into / needed) * 100) : 0;
  const width = phase === "hold" ? 100 : phase === "reset" ? 0 : percent;
  const shownLevel = holding ? level - 1 : level;

  return (
    <section
      data-slot="xp-bar"
      aria-label={name}
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 text-card-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="relative grid size-14 shrink-0 place-items-center rounded-full bg-linear-to-br from-chart-3 to-chart-2 text-2xl font-black text-primary-foreground ring-2 ring-chart-3 ring-offset-2 ring-offset-card"
        >
          {initial}
          {up > 0 && !holding ? (
            <span key={up} className="contents">
              <span className="absolute -inset-1.5 rounded-full border-3 border-chart-4 opacity-0 motion-safe:animate-level-ring" />
              <span className="absolute -inset-1.5 rounded-full border-3 border-chart-4 opacity-0 [animation-delay:0.18s] motion-safe:animate-level-ring" />
            </span>
          ) : null}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-black">{name}</p>
          {subtitle ? <p className="truncate text-xs font-semibold text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="ml-auto text-center">
          <small className="block text-[0.625rem] font-extrabold tracking-[0.14em] text-muted-foreground">
            {text.level}
          </small>
          <RollingNumber value={shownLevel} live className="text-3xl leading-none font-black text-chart-4" />
        </div>
      </div>
      <div
        role="progressbar"
        aria-label={text.bar}
        aria-valuemin={0}
        aria-valuemax={needed}
        aria-valuenow={into}
        aria-valuetext={text.progress(into, needed)}
        className={cn(
          "relative h-4.5 overflow-hidden rounded-full bg-muted ring-1 ring-border transition-shadow",
          holding && "ring-2 ring-chart-4 shadow-[0_0_18px] shadow-chart-4/70",
        )}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 overflow-hidden rounded-full bg-linear-to-r from-chart-3 via-chart-2 to-chart-1",
            phase === "reset" ? "transition-none" : "transition-[width] duration-500 ease-rise",
          )}
          style={{ width: `${width}%` }}
        >
          {gain > 0 ? (
            <span
              key={gain}
              aria-hidden
              className="absolute inset-0 hidden bg-linear-to-r from-transparent via-background/60 to-transparent motion-safe:block motion-safe:animate-xp-shine"
            />
          ) : null}
        </div>
      </div>
      <div className="flex justify-between text-xs font-semibold text-muted-foreground tabular-nums">
        <span>{text.progress(holding ? needed : into, needed)}</span>
        <span>{text.toNext(holding ? 0 : Math.max(0, needed - into))}</span>
      </div>
      {up > 0 && !holding ? (
        <span
          key={up}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-r from-chart-4 to-chart-5 px-4 py-1.5 text-base font-black text-foreground opacity-0 shadow-lg animate-level-banner"
        >
          {text.levelUp}
        </span>
      ) : null}
      {rules && rules.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {rules.map((rule) => (
            <li
              key={rule.key}
              className="flex flex-col items-center gap-0.5 rounded-xl bg-muted px-1.5 py-2 text-center"
            >
              <span className="text-xs font-bold">{rule.label}</span>
              <span className="text-xs font-extrabold text-chart-2">{rule.xp}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

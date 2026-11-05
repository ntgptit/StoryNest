/* Lucian UX/UI Prompt #386 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#386 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Lock } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";

import { turnedOn, useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

/** Medal colours (theme chart colours). */
export type BadgeTone = 1 | 2 | 3 | 4 | 5;
const TONE: Record<BadgeTone, { medal: string; dot: string }> = {
  1: { medal: "from-chart-1/70 to-chart-1", dot: "bg-chart-1" },
  2: { medal: "from-chart-2/70 to-chart-2", dot: "bg-chart-2" },
  3: { medal: "from-chart-3/70 to-chart-3", dot: "bg-chart-3" },
  4: { medal: "from-chart-4/70 to-chart-4", dot: "bg-chart-4" },
  5: { medal: "from-chart-5/70 to-chart-5", dot: "bg-chart-5" },
};
const SPARKS = 14;

export interface Badge {
  key: string;
  name: string;
  /** What earns it ("Read 7 days in a row"), shown on the back of an earned badge and read with a locked one. */
  description: string;
  /** Icon drawn on the medal (e.g. a lucide icon at size-6). */
  icon: ReactNode;
  tone: BadgeTone;
  earned: boolean;
  /** "Earned 5 Nov 2026"; shown on the back. */
  earnedLabel?: string;
  /** Progress of a locked badge. */
  progress: number;
  target: number;
}

export interface AchievementBadgesText {
  title: string;
  /** "3/6 earned". */
  count: (earned: number, total: number) => string;
  /** Name of a locked badge for screen readers: "Steady, locked, 3 of 7". */
  locked: (badge: Badge) => string;
  /** Name of an earned badge's flip button, with what earned it and when ("Steady, earned 5 Nov: 7 days in a row"). */
  flip: (badge: Badge) => string;
}

/**
 * Achievement medals (adapted from Lucian 386). Locked ones are grey discs under a padlock with a bar of how far along
 * the reader is; earned ones are in colour and flip over when pressed to show what earned them and when, then flip back
 * with another press. A badge earned while the grid is on screen (the data changed, e.g. after a refetch) shakes and
 * pops, its padlock lifts off, a light sweeps across and sparks scatter; the sparks are decorative (motion-safe) and
 * nothing plays on first render. Badges are earned by the reader's reading, never by pressing anything here.
 */
export function AchievementBadges({
  badges,
  text,
  className,
}: {
  badges: readonly Badge[];
  text: AchievementBadgesText;
  className?: string;
}) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <section
      data-slot="achievement-badges"
      aria-label={text.title}
      className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4 text-card-foreground", className)}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-base font-black tracking-tight">{text.title}</h3>
        <span
          aria-live="polite"
          className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-extrabold text-muted-foreground tabular-nums"
        >
          {text.count(earned, badges.length)}
        </span>
      </header>
      <ul className="grid grid-cols-3 gap-2.5 perspective-midrange">
        {badges.map((badge) => (
          <BadgeCell key={badge.key} badge={badge} text={text} />
        ))}
      </ul>
    </section>
  );
}

function BadgeCell({ badge, text }: { badge: Badge; text: AchievementBadgesText }) {
  const [flipped, setFlipped] = useState(false);
  const unlock = useTriggerCount(badge.earned, turnedOn);
  const tone = TONE[badge.tone];
  const share = badge.target > 0 ? Math.min(1, badge.progress / badge.target) : 0;

  const front = (
    <span className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-background shadow-sm ring-1 ring-border backface-hidden">
      <span key={unlock} className={cn("relative size-13", unlock > 0 && "animate-medal-pop")}>
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 grid place-items-center rounded-full bg-linear-to-br text-primary-foreground transition-[filter,opacity] duration-500",
            tone.medal,
            !badge.earned && "opacity-30 grayscale",
          )}
        >
          <span className="absolute inset-1.5 rounded-full border border-primary-foreground/45" />
          {badge.icon}
        </span>
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 grid place-items-center text-muted-foreground transition-[transform,opacity] duration-450 ease-medal",
            badge.earned && "-translate-y-3.5 scale-140 -rotate-20 opacity-0",
          )}
        >
          <Lock className="size-6" strokeWidth={2.6} />
        </span>
        {unlock > 0 ? (
          <span aria-hidden className="pointer-events-none absolute inset-0">
            {Array.from({ length: SPARKS }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "absolute top-1/2 left-1/2 -mt-0.75 -ml-0.75 size-1.5 rounded-full opacity-0 motion-safe:animate-medal-spark",
                  i % 2 === 0 ? "bg-chart-4" : tone.dot,
                )}
                style={
                  {
                    "--spark-angle": `${(i / SPARKS) * 360}deg`,
                    "--spark-distance": `${34 + ((i * 7) % 26)}px`,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        ) : null}
      </span>
      <b className={cn("mt-1.5 px-1 text-center text-xs font-extrabold", !badge.earned && "text-muted-foreground")}>
        {badge.name}
      </b>
      {badge.earned ? null : (
        <span aria-hidden className="mt-1 flex items-center gap-1.5">
          <i className="relative h-1 w-9 overflow-hidden rounded-full bg-muted">
            <i
              className="absolute inset-0 origin-left rounded-full bg-muted-foreground/60 transition-transform duration-350 ease-out"
              style={{ transform: `scaleX(${share.toFixed(3)})` }}
            />
          </i>
          <small className="text-[0.5625rem] font-bold text-muted-foreground tabular-nums">
            {Math.min(badge.progress, badge.target)}/{badge.target}
          </small>
        </span>
      )}
      {unlock > 0 ? (
        <span
          key={`shine-${unlock}`}
          aria-hidden
          className="pointer-events-none absolute -inset-[20%] hidden bg-linear-to-r from-transparent via-background/90 to-transparent motion-safe:block motion-safe:animate-medal-shine"
        />
      ) : null}
    </span>
  );

  if (!badge.earned) {
    return (
      <li className="relative h-26" aria-label={text.locked(badge)}>
        {front}
      </li>
    );
  }
  return (
    <li className="relative h-26">
      <button
        type="button"
        aria-pressed={flipped}
        aria-label={text.flip(badge)}
        onClick={() => setFlipped((f) => !f)}
        className={cn(
          "relative size-full rounded-2xl transition-transform duration-600 ease-flip transform-3d focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
          flipped && "rotate-y-180",
        )}
      >
        {front}
        <span
          aria-hidden={!flipped}
          className="absolute inset-0 flex rotate-y-180 flex-col items-center justify-center gap-0.5 rounded-2xl bg-muted px-2 py-2.5 text-center text-foreground ring-1 ring-border backface-hidden"
        >
          <b className="flex items-center gap-1 text-xs font-black">
            <i aria-hidden className={cn("size-2 rounded-full", tone.dot)} />
            {badge.name}
          </b>
          <span className="text-[0.6875rem] leading-snug font-semibold">{badge.description}</span>
          {badge.earnedLabel ? (
            <small className="mt-0.5 text-[0.5625rem] font-semibold text-muted-foreground tabular-nums">
              {badge.earnedLabel}
            </small>
          ) : null}
        </span>
      </button>
    </li>
  );
}

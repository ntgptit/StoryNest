"use client";

import { Flame } from "lucide-react";
import { cn } from "@storynest/ui/lib/utils";
import { AppLink } from "../../_shared/platform.tsx";
import { useReadingHabits } from "../hooks/use-reading-habits.ts";
import { readingHabitsText } from "../strings.ts";

const t = readingHabitsText;

/**
 * Small streak + today's progress chip for the library header, linking to the full habits on the profile page. Shows
 * nothing until the habits are loaded (and nothing on an error: it is a shortcut, the profile page has the retry).
 */
export function ReadingStreakChip({ href = "/me" }: { href?: string }) {
  const habits = useReadingHabits();
  if (!habits.data) return null;
  const { streak, goal, history } = habits.data;
  const read = history.at(-1)?.chaptersRead ?? 0;
  return (
    <AppLink
      href={href}
      aria-label={t.chip.label(streak.current, read, goal)}
      className="inline-flex touch-target items-center gap-2 rounded-full border bg-card px-3 text-sm font-semibold text-card-foreground hover:bg-muted"
    >
      <Flame aria-hidden className={cn("size-4", streak.current > 0 ? "text-chart-5" : "text-muted-foreground")} />
      <span>{t.chip.days(streak.current)}</span>
      <span aria-hidden className="text-muted-foreground">
        ·
      </span>
      <span className={cn(read >= goal ? "text-chart-2" : "text-muted-foreground")}>{t.chip.today(read, goal)}</span>
    </AppLink>
  );
}

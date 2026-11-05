"use client";

import { BookOpen, CalendarCheck, Flame, Library, Target, Trophy, type LucideIcon } from "lucide-react";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { AchievementBadges, type Badge, type BadgeTone } from "@storynest/ui/widgets/achievement-badges";
import { ActivityRings, type ActivityDay } from "@storynest/ui/widgets/activity-rings";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { StreakFlame, type StreakDay } from "@storynest/ui/widgets/streak-flame";
import { XpBar } from "@storynest/ui/widgets/xp-bar";
import type { AchievementCode } from "@storynest/validation";
import { currentLocale } from "../../_shared/i18n.ts";
import { AppLink } from "../../_shared/platform.tsx";
import { useReadingHabits } from "../hooks/use-reading-habits.ts";
import { XP_RULES, type ReadingHabits } from "../model/habits.ts";
import { readingHabitsText } from "../strings.ts";

const t = readingHabitsText;

const BADGE_LOOK: Record<AchievementCode, { icon: LucideIcon; tone: BadgeTone }> = {
  first_chapter: { icon: BookOpen, tone: 3 },
  daily_goal: { icon: Target, tone: 2 },
  streak_7: { icon: Flame, tone: 5 },
  streak_30: { icon: CalendarCheck, tone: 1 },
  first_story: { icon: Trophy, tone: 4 },
  stories_10: { icon: Library, tone: 2 },
};

const utc = (day: string) => new Date(`${day}T00:00:00Z`);

/** Widget props from the reader's habits. Pure, so the gallery and tests can feed it fixed data. */
export function habitsView(habits: ReadingHabits, locale: string) {
  const narrow = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
  const short = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const long = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
  const earnedDate = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  const week: StreakDay[] = habits.week.map((slot) => ({
    key: slot.day,
    abbr: narrow.format(utc(slot.day)),
    label: t.streak.day(long.format(utc(slot.day)), slot.read, slot.isToday),
    read: slot.read,
    isToday: slot.isToday,
  }));

  const days: ActivityDay[] = habits.history.map((day) => ({
    key: day.day,
    abbr: short.format(utc(day.day)),
    label: day.isToday ? `${t.rings.today} · ${long.format(utc(day.day))}` : long.format(utc(day.day)),
    values: [day.chaptersRead, day.chaptersFinished],
  }));

  const badges: Badge[] = habits.achievements.map((a) => {
    const look = BADGE_LOOK[a.code];
    const Icon = look.icon;
    const item = t.badges.items[a.code];
    return {
      key: a.code,
      name: item.name,
      description: item.description,
      icon: <Icon className="relative size-6" strokeWidth={2.1} />,
      tone: look.tone,
      earned: a.earnedAt !== null,
      ...(a.earnedAt ? { earnedLabel: t.badges.earnedOn(earnedDate.format(new Date(a.earnedAt))) } : {}),
      progress: a.progress,
      target: a.target,
    };
  });

  const goalDays = habits.history.filter((d) => d.chaptersRead >= habits.goal).length;
  return { week, days, badges, goalDays };
}

/**
 * The reader's own habits on the profile page: streak, today's rings against the daily goal, reading level and badges.
 * Private: it reads only the signed-in reader's rows (RLS), and nothing here is ever shown to anybody else.
 */
export function ReadingHabitsPanel({
  name,
  locale = currentLocale(),
  settingsHref = "/settings",
}: {
  /** Name on the level card (the reader's display name); defaults to "Reading level". */
  name?: string;
  locale?: string;
  settingsHref?: string;
}) {
  const habits = useReadingHabits();
  return (
    <section aria-labelledby="reading-habits-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="reading-habits-title" className="text-lg font-semibold">
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>
      {habits.isPending ? (
        <Skeleton className="h-96 w-full rounded-2xl" aria-busy />
      ) : habits.isError ? (
        <ErrorState
          title={t.error.title}
          description={t.error.description}
          retryLabel={t.error.retry}
          onRetry={() => habits.refetch()}
        />
      ) : (
        <ReadingHabitsView habits={habits.data} locale={locale} name={name} settingsHref={settingsHref} />
      )}
    </section>
  );
}

/** The cards themselves, from loaded habits (also used by the gallery). */
export function ReadingHabitsView({
  habits,
  locale,
  name,
  settingsHref,
}: {
  habits: ReadingHabits;
  locale: string;
  name?: string | undefined;
  settingsHref?: string | undefined;
}) {
  const view = habitsView(habits, locale);
  const displayName = name ?? t.level.name;
  const ring = (label: string) => ({ label, goal: habits.goal, format: t.rings.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StreakFlame
        streak={habits.streak.current}
        days={view.week}
        text={{ title: t.streak.title, unit: t.streak.unit, fullWeek: t.streak.fullWeek, week: t.streak.week }}
        hint={`${habits.streak.readToday ? t.streak.doneToday : t.streak.keepGoing} ${t.streak.longest(habits.streak.longest)}`}
      />
      <div className="flex flex-col gap-2">
        <ActivityRings
          className="flex-1"
          rings={[
            { key: "read", ...ring(t.rings.read) },
            { key: "finished", ...ring(t.rings.finished) },
          ]}
          days={view.days}
          text={{
            title: t.rings.title,
            rings: t.rings.group,
            days: t.rings.days,
            dayLabel: (day) => t.rings.dayLabel(day.label, day.values[0] ?? 0, day.values[1] ?? 0, habits.goal),
          }}
          summary={t.rings.summary(view.goalDays)}
        />
        {settingsHref ? (
          <AppLink
            href={settingsHref}
            className="self-end text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t.rings.changeGoal}
          </AppLink>
        ) : null}
      </div>
      <XpBar
        className="sm:col-span-2"
        name={displayName}
        subtitle={t.level.subtitle(habits.totals.chaptersRead, habits.totals.readingDays)}
        initial={Array.from(displayName)[0]?.toUpperCase() ?? "?"}
        level={habits.level.level}
        into={habits.level.into}
        needed={habits.level.needed}
        total={habits.level.total}
        rules={[
          { key: "read", label: t.level.rules.chapterRead, xp: t.level.xp(XP_RULES.chapterRead) },
          { key: "finished", label: t.level.rules.chapterFinished, xp: t.level.xp(XP_RULES.chapterFinished) },
          { key: "story", label: t.level.rules.storyFinished, xp: t.level.xp(XP_RULES.storyFinished) },
        ]}
        text={{
          level: t.level.level,
          bar: t.level.bar,
          progress: t.level.progress,
          toNext: t.level.toNext,
          levelUp: t.level.levelUp,
        }}
      />
      <AchievementBadges
        className="sm:col-span-2"
        badges={view.badges}
        text={{
          title: t.badges.title,
          count: t.badges.count,
          locked: (b) => t.badges.locked(b.name, Math.min(b.progress, b.target), b.target),
          flip: (b) => t.badges.flip(b.name, b.earnedLabel ?? "", b.description),
        }}
      />
    </div>
  );
}

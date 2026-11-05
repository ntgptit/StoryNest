// Reading habits as the app shows them (BR-HAB-001..006). Pure functions over the rows the reader may read; nothing
// here writes anything: days, finished counts and badges are maintained by the database (20261106020000).
import {
  ACHIEVEMENT_CODES,
  ACHIEVEMENT_THRESHOLDS,
  DAILY_GOAL,
  type AchievementCode,
  type AchievementMeasure,
} from "@storynest/validation";

/** user_reading_stats as selected (no row yet = nothing read since the feature exists). */
export interface StatsRow {
  current_streak: number;
  longest_streak: number;
  last_read_day: string | null;
  reading_days: number;
  chapters_read: number;
  chapters_finished: number;
  stories_finished: number;
}
export interface DayRow {
  read_day: string;
  chapters_read: number;
  chapters_finished: number;
}
export interface AchievementRow {
  code: string;
  earned_at: string;
}

export const STATS_COLUMNS =
  "current_streak, longest_streak, last_read_day, reading_days, chapters_read, chapters_finished, stories_finished";
export const DAY_COLUMNS = "read_day, chapters_read, chapters_finished";
export const ACHIEVEMENT_COLUMNS = "code, earned_at";

/** How many days back the rings' day picker reaches (today included). */
export const HISTORY_DAYS = 7;

// --- Days: every day is a UTC day, the boundary the server counts on (BR-HAB-001). -------------------------------------
const DAY_MS = 86_400_000;
/** "YYYY-MM-DD" of the UTC day `offset` days after the day of `now`. */
export function utcDay(now: Date, offset = 0): string {
  return new Date(now.getTime() + offset * DAY_MS).toISOString().slice(0, 10);
}
const dayIndex = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);

// --- Streak (BR-HAB-002) -------------------------------------------------------------------------------------------------
export interface Streak {
  /** Days in the run that is still alive: it ended today or yesterday. 0 once a whole day was missed. */
  current: number;
  longest: number;
  /** Whether a chapter was read today (otherwise the streak is waiting for today's read). */
  readToday: boolean;
}

export function toStreak(stats: StatsRow | null, now: Date): Streak {
  if (!stats || stats.last_read_day === null)
    return { current: 0, longest: stats?.longest_streak ?? 0, readToday: false };
  const gap = dayIndex(utcDay(now)) - dayIndex(stats.last_read_day);
  return {
    current: gap <= 1 ? stats.current_streak : 0,
    longest: stats.longest_streak,
    readToday: gap <= 0,
  };
}

export interface WeekSlot {
  day: string;
  /** 0 = Monday ... 6 = Sunday. */
  weekday: number;
  read: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/** The current Monday-to-Sunday week (UTC), each day marked read or not. */
export function toWeek(days: readonly DayRow[], now: Date): WeekSlot[] {
  const read = new Set(days.filter((d) => d.chapters_read > 0).map((d) => d.read_day));
  const weekday = (now.getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const day = utcDay(now, i - weekday);
    return { day, weekday: i, read: read.has(day), isToday: i === weekday, isFuture: i > weekday };
  });
}

// --- Daily goal and the rings (BR-HAB-003) ---------------------------------------------------------------------------------
export interface DayProgress {
  day: string;
  isToday: boolean;
  chaptersRead: number;
  chaptersFinished: number;
}

/** The last HISTORY_DAYS days, oldest first, today last; a day without a row is a day without reading. */
export function toHistory(days: readonly DayRow[], now: Date): DayProgress[] {
  const byDay = new Map(days.map((d) => [d.read_day, d]));
  return Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const day = utcDay(now, i - (HISTORY_DAYS - 1));
    const row = byDay.get(day);
    return {
      day,
      isToday: i === HISTORY_DAYS - 1,
      chaptersRead: row?.chapters_read ?? 0,
      chaptersFinished: row?.chapters_finished ?? 0,
    };
  });
}

export const clampGoal = (goal: number) =>
  Math.min(DAILY_GOAL.max, Math.max(DAILY_GOAL.min, Math.round(Number.isFinite(goal) ? goal : DAILY_GOAL.default)));

// --- XP and level (BR-HAB-004): derived, never stored ----------------------------------------------------------------------
export const XP_RULES = { chapterRead: 10, chapterFinished: 20, storyFinished: 100 } as const;

export function xpFor(stats: StatsRow | null): number {
  if (!stats) return 0;
  return (
    stats.chapters_read * XP_RULES.chapterRead +
    stats.chapters_finished * XP_RULES.chapterFinished +
    stats.stories_finished * XP_RULES.storyFinished
  );
}

/** XP needed to go from `level` to the next one: 100, 150, 200... */
export const xpToNext = (level: number) => 100 + 50 * (level - 1);

export interface Level {
  level: number;
  /** XP gathered inside the current level. */
  into: number;
  /** XP the current level takes in total. */
  needed: number;
  total: number;
}

export function levelFor(xp: number): Level {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp));
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level += 1;
  }
  return { level, into: rest, needed: xpToNext(level), total: Math.max(0, Math.floor(xp)) };
}

// --- Achievements (BR-HAB-005) ---------------------------------------------------------------------------------------------
export interface Achievement {
  code: AchievementCode;
  earnedAt: string | null;
  /** How far along a locked badge is (capped at the target); a badge the server has not awarded is never shown earned. */
  progress: number;
  target: number;
}

function measured(measure: AchievementMeasure, stats: StatsRow | null, history: readonly DayProgress[], goal: number) {
  switch (measure) {
    case "chaptersFinished":
      return stats?.chapters_finished ?? 0;
    case "longestStreak":
      return stats?.longest_streak ?? 0;
    case "storiesFinished":
      return stats?.stories_finished ?? 0;
    case "dailyGoal": {
      const today = history.at(-1)?.chaptersRead ?? 0;
      return today >= goal ? 1 : 0;
    }
  }
}

export function toAchievements(
  rows: readonly AchievementRow[],
  stats: StatsRow | null,
  history: readonly DayProgress[],
  goal: number,
): Achievement[] {
  const earned = new Map(rows.map((r) => [r.code, r.earned_at]));
  return ACHIEVEMENT_CODES.map((code) => {
    const { measure, target } = ACHIEVEMENT_THRESHOLDS[code];
    const earnedAt = earned.get(code) ?? null;
    return {
      code,
      earnedAt,
      target,
      progress: earnedAt ? target : Math.min(target, measured(measure, stats, history, goal)),
    };
  });
}

// --- Everything the habits panel shows ---------------------------------------------------------------------------------------
export interface ReadingHabits {
  goal: number;
  streak: Streak;
  week: WeekSlot[];
  history: DayProgress[];
  level: Level;
  achievements: Achievement[];
  totals: { readingDays: number; chaptersRead: number; chaptersFinished: number; storiesFinished: number };
}

export function toReadingHabits(
  input: {
    stats: StatsRow | null;
    days: readonly DayRow[];
    achievements: readonly AchievementRow[];
    goal: number | null;
  },
  now: Date,
): ReadingHabits {
  const goal = clampGoal(input.goal ?? DAILY_GOAL.default);
  const history = toHistory(input.days, now);
  return {
    goal,
    streak: toStreak(input.stats, now),
    week: toWeek(input.days, now),
    history,
    level: levelFor(xpFor(input.stats)),
    achievements: toAchievements(input.achievements, input.stats, history, goal),
    totals: {
      readingDays: input.stats?.reading_days ?? 0,
      chaptersRead: input.stats?.chapters_read ?? 0,
      chaptersFinished: input.stats?.chapters_finished ?? 0,
      storiesFinished: input.stats?.stories_finished ?? 0,
    },
  };
}

/** The same habits with another daily goal (optimistic update): only the goal and the daily-goal badge's progress move. */
export function withGoal(habits: ReadingHabits, goal: number): ReadingHabits {
  const next = clampGoal(goal);
  const today = habits.history.at(-1)?.chaptersRead ?? 0;
  return {
    ...habits,
    goal: next,
    achievements: habits.achievements.map((a) =>
      a.code === "daily_goal" && a.earnedAt === null ? { ...a, progress: today >= next ? 1 : 0 } : a,
    ),
  };
}

/** The earliest day the panel needs: the Monday of this week or the first day of the history, whichever is earlier. */
export function oldestDayNeeded(now: Date): string {
  const weekday = (now.getUTCDay() + 6) % 7;
  return utcDay(now, -Math.max(weekday, HISTORY_DAYS - 1));
}

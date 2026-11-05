// Reading habits (migration 20261106020000_reading_habits.sql): the fixed achievement set, its thresholds and the daily
// goal's bounds. The codes are checked against the schema's CHECK enum; the numbers against the migration text.
import { z } from "zod";

export const ACHIEVEMENT_CODES = [
  "first_chapter",
  "daily_goal",
  "streak_7",
  "streak_30",
  "first_story",
  "stories_10",
] as const;
export type AchievementCode = (typeof ACHIEVEMENT_CODES)[number];
export const achievementCodeSchema = z.enum(ACHIEVEMENT_CODES);

export const ACHIEVEMENT_CODE = {
  FIRST_CHAPTER: "first_chapter",
  DAILY_GOAL: "daily_goal",
  STREAK_7: "streak_7",
  STREAK_30: "streak_30",
  FIRST_STORY: "first_story",
  STORIES_10: "stories_10",
} as const satisfies Record<string, AchievementCode>;

/** What a badge measures, and how much of it earns the badge (the server awards it; the app only shows progress). */
export type AchievementMeasure = "chaptersFinished" | "dailyGoal" | "longestStreak" | "storiesFinished";
export const ACHIEVEMENT_THRESHOLDS: Record<AchievementCode, { measure: AchievementMeasure; target: number }> = {
  first_chapter: { measure: "chaptersFinished", target: 1 },
  daily_goal: { measure: "dailyGoal", target: 1 },
  streak_7: { measure: "longestStreak", target: 7 },
  streak_30: { measure: "longestStreak", target: 30 },
  first_story: { measure: "storiesFinished", target: 1 },
  stories_10: { measure: "storiesFinished", target: 10 },
};

/** user_settings.daily_chapter_goal: chapters a day (CHECK 1..20, default 3). */
export const DAILY_GOAL = { min: 1, max: 20, default: 3 } as const;
export const dailyGoalSchema = z.number().int().min(DAILY_GOAL.min).max(DAILY_GOAL.max);

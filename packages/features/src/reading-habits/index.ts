// Public API of the "reading-habits" feature: the reader's own streak, daily goal, level and badges (all private).
export { readingHabitsKeys } from "./keys.ts";
export { readingHabitsText } from "./strings.ts";
export { useReadingHabits, useSaveDailyGoal } from "./hooks/use-reading-habits.ts";
export { ReadingHabitsPanel, ReadingHabitsView } from "./screens/reading-habits-panel.tsx";
export { ReadingStreakChip } from "./screens/reading-streak-chip.tsx";
export { DailyGoalSetting } from "./screens/daily-goal-setting.tsx";
export {
  XP_RULES,
  levelFor,
  toReadingHabits,
  xpFor,
  xpToNext,
  type DayRow,
  type ReadingHabits,
  type StatsRow,
} from "./model/habits.ts";

import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import {
  ACHIEVEMENT_COLUMNS,
  DAY_COLUMNS,
  STATS_COLUMNS,
  oldestDayNeeded,
  toReadingHabits,
  type ReadingHabits,
} from "../model/habits.ts";

/**
 * The signed-in reader's habits: summary, recent days, badges and daily goal. RLS returns only the caller's own rows
 * (another account's habits are never readable); the user filter is there for the index, not for privacy.
 */
export async function getReadingHabits(client: DataClient, userId: string, now = new Date()): Promise<ReadingHabits> {
  const [stats, days, achievements, settings] = await Promise.all([
    client.from("user_reading_stats").select(STATS_COLUMNS).eq("user_id", userId).maybeSingle(),
    client
      .from("user_reading_days")
      .select(DAY_COLUMNS)
      .eq("user_id", userId)
      .gte("read_day", oldestDayNeeded(now))
      .order("read_day", { ascending: true }),
    client.from("user_achievements").select(ACHIEVEMENT_COLUMNS).eq("user_id", userId),
    client.from("user_settings").select("daily_chapter_goal").eq("user_id", userId).maybeSingle(),
  ]);
  return toReadingHabits(
    {
      stats: unwrap(stats),
      days: unwrap(days) ?? [],
      achievements: unwrap(achievements) ?? [],
      goal: unwrap(settings)?.daily_chapter_goal ?? null,
    },
    now,
  );
}

/** Saves the daily goal: only that column of the reader's settings row (the other settings keep their values). */
export async function saveDailyGoal(client: DataClient, userId: string, goal: number): Promise<void> {
  unwrap(
    await client.from("user_settings").upsert({ user_id: userId, daily_chapter_goal: goal }, { onConflict: "user_id" }),
  );
}

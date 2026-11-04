import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import {
  toChapterStat,
  toDailyPoint,
  type ChapterStat,
  type ChapterStatRow,
  type DailyPoint,
  type DailyRow,
} from "../model/stats.ts";

/** The counters of each published chapter in reading order, with how many readers carried on from the chapter before. */
export async function getChapterStats(client: DataClient, storyId: string): Promise<ChapterStat[]> {
  const rows = unwrap(await client.rpc("author_chapter_stats", { p_story_id: storyId })) ?? [];
  return (rows as ChapterStatRow[]).flatMap((row) => toChapterStat(row) ?? []);
}

/** One point per day for the last `days` days (zero-filled by the server), oldest first. */
export async function getDailyStats(client: DataClient, storyId: string, days: number): Promise<DailyPoint[]> {
  const rows = unwrap(await client.rpc("author_story_daily", { p_story_id: storyId, p_days: days })) ?? [];
  return (rows as DailyRow[]).flatMap((row) => toDailyPoint(row) ?? []);
}

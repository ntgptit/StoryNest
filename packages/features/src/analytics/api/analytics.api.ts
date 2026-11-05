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
import {
  TERMS_PER_MONTH,
  toCohorts,
  toReaderSplit,
  toReadSources,
  toTermMonths,
  type Cohort,
  type CohortRowData,
  type DayRange,
  type ReaderSplit,
  type ReadSources,
  type SourceRow,
  type SplitRow,
  type TermMonth,
  type TermRow,
} from "../model/insights.ts";

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

/** The daily series for a chosen range of UTC days (inclusive), zero-filled by the server, oldest first. */
export async function getDailyRange(client: DataClient, storyId: string, range: DayRange): Promise<DailyPoint[]> {
  const rows =
    unwrap(await client.rpc("author_story_daily_range", { p_story_id: storyId, p_from: range.from, p_to: range.to })) ??
    [];
  return (rows as DailyRow[]).flatMap((row) => toDailyPoint(row) ?? []);
}

/** Weekly reader cohorts of the last `weeks` weeks (small cohorts come back without counts). */
export async function getReaderCohorts(client: DataClient, storyId: string, weeks: number): Promise<Cohort[]> {
  const rows = unwrap(await client.rpc("author_reader_cohorts", { p_story_id: storyId, p_weeks: weeks })) ?? [];
  return toCohorts(rows as CohortRowData[]);
}

/** Reads and readers of the last `days` days, split into signed-in and anonymous. */
export async function getReaderSplit(client: DataClient, storyId: string, days: number): Promise<ReaderSplit> {
  const rows = unwrap(await client.rpc("author_reader_split", { p_story_id: storyId, p_days: days })) ?? [];
  return toReaderSplit((rows as SplitRow[])[0]);
}

/** The most frequent terms of the story's visible comments, per month of the last `months` months. */
export async function getCommentTerms(client: DataClient, storyId: string, months: number): Promise<TermMonth[]> {
  const rows =
    unwrap(
      await client.rpc("author_comment_terms", { p_story_id: storyId, p_months: months, p_limit: TERMS_PER_MONTH }),
    ) ?? [];
  return toTermMonths(rows as TermRow[], months);
}

/** Where the readers of the last `days` days came from, and how many read on and followed. */
export async function getReadSources(client: DataClient, storyId: string, days: number): Promise<ReadSources> {
  const rows = unwrap(await client.rpc("author_read_sources", { p_story_id: storyId, p_days: days })) ?? [];
  return toReadSources(rows as SourceRow[]);
}

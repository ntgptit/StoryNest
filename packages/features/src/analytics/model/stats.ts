import { analyticsText } from "../strings.ts";

/** Row of `author_chapter_stats` (every field is nullable in the generated type). */
export interface ChapterStatRow {
  chapter_id: string | null;
  slug: string | null;
  sort_order: number | null;
  title: string | null;
  reads: number | null;
  votes: number | null;
  comments: number | null;
  retention: number | null;
}

export interface ChapterStat {
  chapterId: string;
  slug: string;
  number: number;
  title: string;
  reads: number;
  votes: number;
  comments: number;
  /** Reads of this chapter divided by reads of the one before it; null for the first chapter or when that has no reads. */
  retention: number | null;
}

/** Row of `author_story_daily`. */
export interface DailyRow {
  day: string | null;
  reads: number | null;
  votes: number | null;
  comments: number | null;
}

export interface DailyPoint {
  day: string;
  reads: number;
  votes: number;
  comments: number;
}

export const RANGE_DAYS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_DAYS)[number];
export const DEFAULT_RANGE: RangeDays = 30;

export const isRangeDays = (value: number): value is RangeDays => (RANGE_DAYS as readonly number[]).includes(value);

/** A row without an id or a day cannot be drawn, so it is dropped; counts may arrive as strings (bigint). */
export function toChapterStat(row: ChapterStatRow): ChapterStat | null {
  if (!row.chapter_id || row.slug === null) return null;
  return {
    chapterId: row.chapter_id,
    slug: row.slug,
    number: Number(row.sort_order ?? 0),
    title: row.title ?? row.slug,
    reads: Number(row.reads ?? 0),
    votes: Number(row.votes ?? 0),
    comments: Number(row.comments ?? 0),
    retention: row.retention === null ? null : Number(row.retention),
  };
}

export function toDailyPoint(row: DailyRow): DailyPoint | null {
  if (!row.day) return null;
  return {
    day: row.day,
    reads: Number(row.reads ?? 0),
    votes: Number(row.votes ?? 0),
    comments: Number(row.comments ?? 0),
  };
}

export interface Totals {
  reads: number;
  votes: number;
  comments: number;
}

export function sumDaily(points: readonly DailyPoint[]): Totals {
  return points.reduce<Totals>(
    (sum, p) => ({ reads: sum.reads + p.reads, votes: sum.votes + p.votes, comments: sum.comments + p.comments }),
    { reads: 0, votes: 0, comments: 0 },
  );
}

/** "50%" for 0.5; a chapter that kept more readers than the one before shows more than 100%; no basis shows a dash. */
export function formatRetention(retention: number | null): string {
  if (retention === null) return analyticsText.chapters.noRetention;
  return `${Math.round(retention * 100)}%`;
}

/** Height or width of a bar as a share of the largest value, 0 to 100 (a lone zero is an empty bar, not a full one). */
export function barPercent(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.min(100, Math.max(2, Math.round((value / max) * 100))); // a tiny value stays visible
}

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
/** Days of the reads heatmap: the most `author_story_daily` returns (it refuses more than 90). */
export const HEATMAP_DAYS = 90;

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

const DAY_MS = 86_400_000;
/** Longest axis `alignDaily` will fill (the server sends at most 90 days), so a stray date cannot blow it up. */
const MAX_AXIS_DAYS = 366;

/** Days since the epoch of a `YYYY-MM-DD` UTC day, or null when it is not one. */
function dayNumber(day: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const time = Date.parse(`${day}T00:00:00Z`);
  return Number.isNaN(time) ? null : Math.round(time / DAY_MS);
}

const dayString = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);

/** The three daily series as parallel arrays on one day axis (index i of every array is `days[i]`). */
export interface DailySeries {
  days: string[];
  reads: number[];
  votes: number[];
  comments: number[];
}

/**
 * Puts the daily points on one gap-free, oldest-first UTC day axis so the small multiples can share a cursor by index:
 * points are sorted, a day sent twice is added up, a missing day between the first and the last is a zero, and a point
 * whose day is not a `YYYY-MM-DD` date is dropped. The server already zero-fills, so this normally changes nothing.
 */
export function alignDaily(points: readonly DailyPoint[]): DailySeries {
  const byDay = new Map<number, Totals>();
  for (const point of points) {
    const n = dayNumber(point.day);
    if (n === null) continue;
    const sum = byDay.get(n) ?? { reads: 0, votes: 0, comments: 0 };
    byDay.set(n, {
      reads: sum.reads + point.reads,
      votes: sum.votes + point.votes,
      comments: sum.comments + point.comments,
    });
  }
  const series: DailySeries = { days: [], reads: [], votes: [], comments: [] };
  if (byDay.size === 0) return series;
  const last = Math.max(...byDay.keys());
  const first = Math.max(Math.min(...byDay.keys()), last - MAX_AXIS_DAYS + 1);
  for (let n = first; n <= last; n += 1) {
    const day = byDay.get(n);
    series.days.push(dayString(n));
    series.reads.push(day?.reads ?? 0);
    series.votes.push(day?.votes ?? 0);
    series.comments.push(day?.comments ?? 0);
  }
  return series;
}

/** A published chapter as the story's chapter list gives it (`first_published_at`). */
export interface PublishedChapter {
  number: number;
  publishedAt: string | null;
}

/**
 * The chapters first published on each day of the axis, keyed by UTC day (the series' days are UTC days too), numbers
 * in order. Chapters published outside the axis, or never, are left out. A chapter that was unpublished and published
 * again keeps its first date (`first_published_at`).
 */
export function publishedByDay(
  days: readonly string[],
  chapters: readonly PublishedChapter[],
): Record<string, number[]> {
  const onAxis = new Set(days);
  const result: Record<string, number[]> = {};
  for (const chapter of chapters) {
    if (!chapter.publishedAt) continue;
    const time = Date.parse(chapter.publishedAt);
    if (Number.isNaN(time)) continue;
    const day = new Date(time).toISOString().slice(0, 10);
    if (!onAxis.has(day)) continue;
    (result[day] ??= []).push(chapter.number);
  }
  for (const numbers of Object.values(result)) numbers.sort((a, b) => a - b);
  return result;
}

/** A UTC day for people: "T5, 5 thg 11" / "Thu, Nov 5" (long) or "5/11" / "11/5" (short). */
export function formatDay(day: string, locale: string, style: "long" | "short"): string {
  const n = dayNumber(day);
  if (n === null) return day;
  const options: Intl.DateTimeFormatOptions =
    style === "long"
      ? { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }
      : { day: "numeric", month: "numeric", timeZone: "UTC" };
  return new Intl.DateTimeFormat(locale, options).format(new Date(n * DAY_MS));
}

/** Shade of a heatmap day: 0 for no reads, else the quarter of the busiest day the value falls in (1 to 4). */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export function heatLevel(value: number, max: number): HeatLevel {
  if (value <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4))) as HeatLevel;
}

/**
 * The whole numbers each shade stands for, for the legend: level 0 is 0, level L covers (max·(L−1)/4, max·L/4]. A level
 * no whole number can reach (a busiest day of 1 to 3) is left out, so the legend never shows a range that cannot occur.
 */
export function heatLegend(max: number): { level: HeatLevel; from: number; to: number }[] {
  const legend: { level: HeatLevel; from: number; to: number }[] = [{ level: 0, from: 0, to: 0 }];
  for (const level of [1, 2, 3, 4] as const) {
    const from = Math.floor((max * (level - 1)) / 4) + 1;
    const to = Math.floor((max * level) / 4);
    if (from <= to) legend.push({ level, from, to });
  }
  return legend;
}

/** Monday 0 … Sunday 6 of a day number (1970-01-01, day 0, was a Thursday). */
const weekdayOf = (n: number) => (((n + 3) % 7) + 7) % 7;

/** The days of an aligned axis laid out as weeks (Monday first) for the heatmap. */
export interface WeekGrid {
  /** One entry per week, oldest first, each with 7 slots Monday to Sunday: an index into the axis, or null. */
  columns: (number | null)[][];
  /** The Monday of each week (`YYYY-MM-DD`), which may fall before the first day of the axis. */
  weekStarts: string[];
  /** Per week, the first day of a month that falls in it (`YYYY-MM-DD`); the first week gets its own month unless a
   * month starts in one of the next two weeks (the labels would collide); otherwise null. */
  monthStarts: (string | null)[];
}

/** Lays a gap-free, oldest-first day axis (as `alignDaily` returns) out week by week; malformed days give no grid. */
export function weekColumns(days: readonly string[]): WeekGrid {
  const grid: WeekGrid = { columns: [], weekStarts: [], monthStarts: [] };
  const first = days[0] === undefined ? null : dayNumber(days[0]);
  if (first === null) return grid;
  const offset = weekdayOf(first);
  const weeks = Math.ceil((offset + days.length) / 7);
  for (let week = 0; week < weeks; week += 1) {
    grid.columns.push(
      Array.from({ length: 7 }, (_, weekday) => {
        const index = week * 7 + weekday - offset;
        return index >= 0 && index < days.length ? index : null;
      }),
    );
    grid.weekStarts.push(dayString(first - offset + week * 7));
  }
  const starts = grid.columns.map((column) => {
    const day = column.flatMap((index) => (index === null ? [] : [days[index] ?? ""])).find((d) => d.endsWith("-01"));
    return day ?? null;
  });
  grid.monthStarts = starts.map((start, week) =>
    week === 0 && start === null && starts[1] === null && starts[2] === null ? (days[0] ?? null) : start,
  );
  return grid;
}

/** Month of a UTC day for an axis label: "thg 11" / "Nov". */
export function formatMonth(day: string, locale: string): string {
  const n = dayNumber(day);
  if (n === null) return day;
  return new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(n * DAY_MS));
}

/** Weekday names Monday to Sunday: long ("Thứ Hai" / "Monday") and short ("Th 2" / "Mon"). */
export function weekdayNames(locale: string): { long: string; short: string }[] {
  const long = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
  const short = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  // 1970-01-05 (day 4) was a Monday.
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date((4 + i) * DAY_MS);
    return { long: long.format(date), short: short.format(date) };
  });
}

/** One chapter of the read-through funnel. */
export interface FunnelStepStat {
  chapterId: string;
  number: number;
  title: string;
  /** All-time reads of the chapter (one reader × one chapter × one UTC day), not distinct readers. */
  reads: number;
  /** Reads ÷ reads of the first chapter; null when the first chapter has no reads. */
  ofFirst: number | null;
  /** Reads ÷ reads of the chapter before (the same ratio as BR-STAT-003 retention); null for the first step or after 0. */
  fromPrevious: number | null;
  /** 1 − fromPrevious: share of the previous chapter's reads that did not reach this one (negative = more reads). */
  dropOff: number | null;
  /** Bar width relative to the most-read chapter, 0 to 100. */
  widthPercent: number;
}

export interface ReadThroughFunnel {
  steps: FunnelStepStat[];
  /** Index (in `steps`) of the largest positive drop-off; the earliest on a tie; null when no step loses reads. */
  biggestDrop: number | null;
  /** Reads of the last chapter ÷ reads of the first; null with fewer than two chapters or no reads in the first. */
  overall: number | null;
  totalReads: number;
}

/**
 * Chapter-by-chapter read-through from the per-chapter counters (BR-STAT-011). Steps follow reading order and every
 * ratio is derived from `reads` alone, so nothing is estimated: a later chapter may have more reads than the one before
 * (a reader who comes back on another day counts again), which shows as a negative drop-off instead of being clamped.
 */
export function readThroughFunnel(chapters: readonly ChapterStat[]): ReadThroughFunnel {
  const ordered = [...chapters].sort((a, b) => a.number - b.number);
  const firstReads = ordered[0]?.reads ?? 0;
  const maxReads = Math.max(0, ...ordered.map((chapter) => chapter.reads));
  const steps = ordered.map((chapter, index): FunnelStepStat => {
    const previous = index > 0 ? ordered[index - 1] : undefined;
    const fromPrevious = previous && previous.reads > 0 ? chapter.reads / previous.reads : null;
    return {
      chapterId: chapter.chapterId,
      number: chapter.number,
      title: chapter.title,
      reads: chapter.reads,
      ofFirst: firstReads > 0 ? chapter.reads / firstReads : null,
      fromPrevious,
      dropOff: fromPrevious === null ? null : 1 - fromPrevious,
      widthPercent: barPercent(chapter.reads, maxReads),
    };
  });
  let biggestDrop: number | null = null;
  let biggest = 0;
  steps.forEach((step, index) => {
    if (step.dropOff !== null && step.dropOff > biggest) {
      biggest = step.dropOff;
      biggestDrop = index;
    }
  });
  return {
    steps,
    biggestDrop,
    overall: steps.length >= 2 ? (steps.at(-1)?.ofFirst ?? null) : null,
    totalReads: ordered.reduce((sum, chapter) => sum + chapter.reads, 0),
  };
}

/** A ratio as a whole percent: 0.684 -> "68%". */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** What the vertical axis of the chapter scatter shows: likes per 100 reads, or retention (BR-STAT-003). */
export const SCATTER_METRICS = ["likesPer100", "retention"] as const;
export type ScatterMetric = (typeof SCATTER_METRICS)[number];

/** Share of the most-read chapter's reads under which the scatter's filter fades a chapter (its ratio is noisy). */
export const LOW_READS_SHARE = 0.1;

export interface ChapterScatterPoint {
  chapterId: string;
  number: number;
  title: string;
  reads: number;
  votes: number;
  /** The vertical value: likes ÷ reads × 100, or retention as a ratio (0.8 = 80%). */
  value: number;
}

/**
 * The chapters as dots of reads (x) against `metric` (y), in reading order (BR-STAT-015). A chapter without a value is
 * left out and counted in `omitted`: for likes per 100 reads one with no reads (nothing to divide by), for retention
 * the first chapter and any chapter after one with no reads (BR-STAT-003 gives no basis).
 */
export function chapterScatter(
  chapters: readonly ChapterStat[],
  metric: ScatterMetric,
): { points: ChapterScatterPoint[]; omitted: number } {
  const ordered = [...chapters].sort((a, b) => a.number - b.number);
  const points = ordered.flatMap((chapter): ChapterScatterPoint[] => {
    const value =
      metric === "retention" ? chapter.retention : chapter.reads > 0 ? (chapter.votes / chapter.reads) * 100 : null;
    if (value === null || !Number.isFinite(value)) return [];
    return [
      {
        chapterId: chapter.chapterId,
        number: chapter.number,
        title: chapter.title,
        reads: chapter.reads,
        votes: chapter.votes,
        value,
      },
    ];
  });
  return { points, omitted: ordered.length - points.length };
}

/**
 * Reads under which the scatter's filter fades a chapter: `LOW_READS_SHARE` of the most-read chapter, rounded up; 0
 * (no filter) when that would not exceed 1 read, since fading chapters under 1 read means nothing.
 */
export function lowReadsThreshold(chapters: readonly ChapterStat[]): number {
  const threshold = Math.ceil(Math.max(0, ...chapters.map((chapter) => chapter.reads)) * LOW_READS_SHARE);
  return threshold > 1 ? threshold : 0;
}

/** A drop-off as a signed change: 0.18 -> "−18%", −0.05 (more reads) -> "+5%", anything that rounds to 0 -> "0%". */
export function formatChange(dropOff: number): string {
  const percent = Math.round(Math.abs(dropOff) * 100);
  if (percent === 0) return "0%";
  return `${dropOff > 0 ? "−" : "+"}${percent}%`;
}

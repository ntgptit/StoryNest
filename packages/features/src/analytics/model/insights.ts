// Audience insights of batch 4: custom date range, weekly cohorts, signed-in / anonymous split, comment terms and read
// sources. Mappers from the RPC rows (every field nullable in the generated types, bigints may arrive as strings) and
// the pure helpers the components draw from.
import { AUDIENCE_LIMITS, type ReadSource } from "@storynest/validation";

const DAY_MS = 86_400_000;

/** Today as a UTC day (`YYYY-MM-DD`): the server's days are UTC days. */
export function utcToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** `day` moved by `delta` days, both `YYYY-MM-DD` UTC days. */
export function addDays(day: string, delta: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS).toISOString().slice(0, 10);
}

/** The days a custom range may cover (author_story_daily_range refuses anything else): the last 90 days. */
export function rangeBounds(today: string = utcToday()): { min: string; max: string } {
  return { min: addDays(today, -(AUDIENCE_LIMITS.maxRangeDays - 1)), max: today };
}

export interface DayRange {
  from: string;
  to: string;
}

/** Whether a range is one the server accepts: real days, in order, inside the bounds. */
export function isValidRange(range: DayRange, today: string = utcToday()): boolean {
  const { min, max } = rangeBounds(today);
  const ok = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
  return ok(range.from) && ok(range.to) && range.from <= range.to && range.from >= min && range.to <= max;
}

// --- cohorts -----------------------------------------------------------------------------------------------------------

/** Row of `author_reader_cohorts`. */
export interface CohortRowData {
  cohort_week: string | null;
  cohort_size: number | string | null;
  week_offset: number | null;
  active_readers: number | string | null;
  suppressed: boolean | null;
}

export interface Cohort {
  /** Monday of the week the readers started, `YYYY-MM-DD`. */
  week: string;
  /** Readers who started that week; null when the cohort is too small to show. */
  size: number | null;
  suppressed: boolean;
  /** Share still reading per week offset (0 = the starting week), 0 to 1; null when hidden or the cohort is empty. */
  shares: (number | null)[];
  /** The readers behind each share, same order. */
  active: (number | null)[];
}

export const COHORT_WEEKS = 8;

/** Groups the cells by cohort week (oldest first) and turns counts into shares of the cohort. */
export function toCohorts(rows: readonly CohortRowData[]): Cohort[] {
  const byWeek = new Map<string, Cohort>();
  for (const row of rows) {
    if (!row.cohort_week || row.week_offset === null) continue;
    const size = row.cohort_size === null ? null : Number(row.cohort_size);
    const cohort = byWeek.get(row.cohort_week) ?? {
      week: row.cohort_week,
      size,
      suppressed: row.suppressed === true,
      shares: [],
      active: [],
    };
    const active = row.active_readers === null ? null : Number(row.active_readers);
    cohort.active[row.week_offset] = active;
    cohort.shares[row.week_offset] = active === null || !size ? null : Math.min(1, active / size);
    byWeek.set(row.cohort_week, cohort);
  }
  return [...byWeek.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((c) => ({
      ...c,
      shares: Array.from(c.shares, (v) => v ?? null),
      active: Array.from(c.active, (v) => v ?? null),
    }));
}

// --- signed-in / anonymous split -----------------------------------------------------------------------------------------

/** Row of `author_reader_split`. */
export interface SplitRow {
  signed_in_reads: number | string | null;
  anonymous_reads: number | string | null;
  signed_in_readers: number | string | null;
  anonymous_readers: number | string | null;
}

export interface ReaderSplit {
  signedInReads: number;
  anonymousReads: number;
  signedInReaders: number;
  anonymousReaders: number;
}

export function toReaderSplit(row: SplitRow | undefined): ReaderSplit {
  return {
    signedInReads: Number(row?.signed_in_reads ?? 0),
    anonymousReads: Number(row?.anonymous_reads ?? 0),
    signedInReaders: Number(row?.signed_in_readers ?? 0),
    anonymousReaders: Number(row?.anonymous_readers ?? 0),
  };
}

// --- comment terms ---------------------------------------------------------------------------------------------------------

/** Row of `author_comment_terms`. */
export interface TermRow {
  month: string | null;
  term: string | null;
  mentions: number | string | null;
  commenters: number | string | null;
  rank_position: number | null;
}

export interface TermMonth {
  /** First day of the month, `YYYY-MM-01`. */
  month: string;
  terms: { term: string; mentions: number; commenters: number }[];
}

export const TERM_MONTHS = 3;
export const TERMS_PER_MONTH = 24;

/**
 * One entry per month of the window, oldest first, including months without any term (so the switch always offers the
 * same months); terms in rank order.
 */
export function toTermMonths(rows: readonly TermRow[], months: number, today: string = utcToday()): TermMonth[] {
  const [year = 1970, month = 1] = today.split("-").map(Number);
  const keys = Array.from({ length: months }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1 - (months - 1 - i), 1));
    return date.toISOString().slice(0, 10);
  });
  const result = new Map<string, TermMonth>(keys.map((key) => [key, { month: key, terms: [] }]));
  const ordered = [...rows].sort((a, b) => Number(a.rank_position ?? 0) - Number(b.rank_position ?? 0));
  for (const row of ordered) {
    if (!row.month || !row.term) continue;
    result.get(row.month)?.terms.push({
      term: row.term,
      mentions: Number(row.mentions ?? 0),
      commenters: Number(row.commenters ?? 0),
    });
  }
  return [...result.values()];
}

// --- read sources ------------------------------------------------------------------------------------------------------------

/** Row of `author_read_sources`. */
export interface SourceRow {
  source: string | null;
  readers: number | string | null;
  continued: number | string | null;
  followed: number | string | null;
  suppressed: boolean | null;
}

export type SourceKey = ReadSource | "unknown";

export interface ReadSourceStat {
  source: SourceKey;
  readers: number;
  continued: number;
  followed: number;
}

export interface ReadSources {
  /** Sources with enough readers to show, most readers first. */
  shown: ReadSourceStat[];
  /** How many sources were withheld because they had too few readers. */
  hidden: number;
}

const SOURCE_KEYS: readonly string[] = [
  "story_page",
  "next_chapter",
  "library",
  "search",
  "discover",
  "ranking",
  "notification",
  "profile",
  "other",
  "unknown",
];

export function toReadSources(rows: readonly SourceRow[]): ReadSources {
  const shown: ReadSourceStat[] = [];
  let hidden = 0;
  for (const row of rows) {
    if (!row.source || !SOURCE_KEYS.includes(row.source)) continue;
    if (row.suppressed || row.readers === null) {
      hidden += 1;
      continue;
    }
    shown.push({
      source: row.source as SourceKey,
      readers: Number(row.readers),
      continued: Number(row.continued ?? 0),
      followed: Number(row.followed ?? 0),
    });
  }
  shown.sort((a, b) => b.readers - a.readers);
  return { shown, hidden };
}

/** Number of days in an inclusive range. */
export function rangeDays(range: DayRange): number {
  return Math.round((Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / DAY_MS) + 1;
}

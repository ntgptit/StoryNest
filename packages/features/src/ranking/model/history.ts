// Ranking history (ranking_history): daily snapshots of the top stories, for the bar race (Lucian 246) and the slope
// chart (Lucian 359).

export const HISTORY_DAYS = 7;
export const HISTORY_STORIES = 10;

/** Row of `ranking_history`. */
export interface HistoryRow {
  day: string | null;
  story_id: string | null;
  rank_position: number | null;
  score: number | string | null;
  reads: number | string | null;
  votes: number | string | null;
}

export interface HistoryEntry {
  storyId: string;
  rank: number;
  score: number;
}

export interface HistoryDay {
  day: string;
  /** In rank order. */
  entries: HistoryEntry[];
}

/** Snapshot days oldest first, each in rank order; rows without a day or a story are dropped. */
export function toHistoryDays(rows: readonly HistoryRow[]): HistoryDay[] {
  const byDay = new Map<string, HistoryEntry[]>();
  for (const row of rows) {
    if (!row.day || !row.story_id || row.rank_position === null) continue;
    const entries = byDay.get(row.day) ?? [];
    entries.push({ storyId: row.story_id, rank: Number(row.rank_position), score: Number(row.score ?? 0) });
    byDay.set(row.day, entries);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, entries]) => ({ day, entries: entries.sort((a, b) => a.rank - b.rank) }));
}

export interface RankMove {
  storyId: string;
  /** Rank on the first snapshot day, or null when the story was not in the list then. */
  from: { rank: number; score: number } | null;
  to: { rank: number; score: number };
}

/** The stories of the last day with where they stood on the first day: what the slope chart draws. */
export function rankMoves(days: readonly HistoryDay[]): RankMove[] {
  const first = days[0];
  const last = days.at(-1);
  if (!first || !last || days.length < 2) return [];
  const before = new Map(first.entries.map((entry) => [entry.storyId, entry]));
  return last.entries.map((entry) => {
    const old = before.get(entry.storyId);
    return {
      storyId: entry.storyId,
      from: old ? { rank: old.rank, score: old.score } : null,
      to: { rank: entry.rank, score: entry.score },
    };
  });
}

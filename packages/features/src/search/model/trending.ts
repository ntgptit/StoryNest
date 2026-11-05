// Trending searches (trending_searches): the public top terms of the last 7 days with their rank change.

export const TRENDING_LIMIT = 10;

/** Row of `trending_searches`. */
export interface TrendingRow {
  term: string | null;
  searchers: number | string | null;
  rank_position: number | null;
  previous_rank: number | null;
  rank_change: number | null;
}

export interface TrendingSearch {
  term: string;
  rank: number;
  searchers: number;
  /** Places gained since the 7 days before (positive = up); null = new in the list. */
  change: number | null;
}

export function toTrendingSearches(rows: readonly TrendingRow[]): TrendingSearch[] {
  return rows
    .flatMap((row) =>
      row.term && row.rank_position !== null
        ? [
            {
              term: row.term,
              rank: Number(row.rank_position),
              searchers: Number(row.searchers ?? 0),
              change: row.previous_rank === null ? null : Number(row.rank_change ?? 0),
            },
          ]
        : [],
    )
    .sort((a, b) => a.rank - b.rank);
}

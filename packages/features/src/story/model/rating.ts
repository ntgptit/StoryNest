import type { AppError } from "../../_shared/errors.ts";
import { storyText } from "../strings.ts";

/** One row of get_story_rating / set_story_rating (set_story_rating has no reading fields). */
export interface RatingRow {
  rating_avg: number | string | null;
  rating_count: number | string | null;
  my_stars: number | null;
  chapters_read?: number | null;
  chapters_needed?: number | null;
}

export interface StoryRating {
  /** Average of all ratings, 2 decimals; null while nobody rated. */
  average: number | null;
  count: number;
  /** My stars (1-5), or null. */
  mine: number | null;
  chaptersRead: number;
  chaptersNeeded: number;
}

export const EMPTY_RATING: StoryRating = { average: null, count: 0, mine: null, chaptersRead: 0, chaptersNeeded: 1 };

export function toRating(row: RatingRow | null | undefined, previous: StoryRating = EMPTY_RATING): StoryRating {
  if (!row) return previous;
  const average = row.rating_avg === null ? null : Number(row.rating_avg);
  return {
    average: average !== null && Number.isFinite(average) ? average : null,
    count: Number(row.rating_count ?? 0),
    mine: row.my_stars ?? null,
    chaptersRead: row.chapters_read ?? previous.chaptersRead,
    chaptersNeeded: row.chapters_needed ?? previous.chaptersNeeded,
  };
}

/** The reader has opened enough chapters to rate (decision: 1, a server setting). */
export function canRate(rating: StoryRating): boolean {
  return rating.chaptersRead >= rating.chaptersNeeded;
}

/** The average as the page shows it: one decimal, in the reader's locale. */
export function formatAverage(average: number, locale: string): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(average);
}

/** What the server says (as the hint of a refusal) when the reader may not rate. */
export const RATING_HINT = { OWN_STORY: "own_story", READ_FIRST: "read_first" } as const;

export function ratingErrorMessage(error: AppError): string {
  if (error.kind === "forbidden" && error.details === RATING_HINT.OWN_STORY) return storyText.rating.ownStory;
  if (error.kind === "forbidden" && error.details === RATING_HINT.READ_FIRST) return storyText.rating.readFirst;
  return error.kind === "network" ? storyText.rating.network : storyText.rating.failed;
}

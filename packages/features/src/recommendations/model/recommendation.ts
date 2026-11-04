import type { StorySummary } from "../../discovery/index.ts";
import { recommendationText } from "../strings.ts";

/** The reasons the database gives (similar_stories, recommend_for_me). */
export const REASON = {
  SHARED_TAGS: "shared_tags",
  SAME_CATEGORY: "same_category",
  CO_READERS: "co_readers",
  FOLLOWED_AUTHOR: "followed_author",
  LIBRARY_SIMILAR: "library_similar",
} as const;
export type Reason = (typeof REASON)[keyof typeof REASON];

export const SIMILAR_LIMIT = 6;
export const FOR_ME_LIMIT = 8;

export interface RecommendationRow {
  story_id: string;
  reason: string;
  detail: string | null;
  score: number | string;
}

export interface Recommendation {
  story: StorySummary;
  reason: string;
  detail: string | null;
  score: number;
}

/** Pairs rows with their stories, in the order the database ranked them; a story hidden between the two requests is dropped. */
export function toRecommendations(
  rows: readonly RecommendationRow[],
  stories: ReadonlyMap<string, StorySummary>,
): Recommendation[] {
  return rows.flatMap((row) => {
    const story = stories.get(row.story_id);
    return story ? [{ story, reason: row.reason, detail: row.detail, score: Number(row.score) }] : [];
  });
}

/**
 * The sentence that says why a story is suggested, or null for a reason this version does not know (a newer database
 * may add one: the story is still shown, just without a sentence, instead of showing a wrong one).
 */
export function reasonText(recommendation: Pick<Recommendation, "reason" | "detail">): string | null {
  const t = recommendationText.reasons;
  const detail = recommendation.detail ?? "";
  switch (recommendation.reason) {
    case REASON.SHARED_TAGS:
      return detail ? t.sharedTags(detail) : null;
    case REASON.SAME_CATEGORY:
      return detail ? t.sameCategory(detail) : null;
    case REASON.CO_READERS:
      return t.coReaders;
    case REASON.FOLLOWED_AUTHOR:
      return detail ? t.followedAuthor(detail) : null;
    case REASON.LIBRARY_SIMILAR:
      return detail ? t.librarySimilar(detail) : null;
    default:
      return null;
  }
}

// TanStack Query keys of the recommendations feature. Personal ones belong to one reader; the reader's choice about
// adult stories is part of every key.
export const recommendationKeys = {
  all: ["recommendations"] as const,
  similar: (storyId: string, mature: boolean) => ["recommendations", "similar", storyId, mature] as const,
  forMe: (userId: string, mature: boolean) => ["recommendations", "for-me", userId, mature] as const,
};

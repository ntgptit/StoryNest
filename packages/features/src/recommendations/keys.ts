// TanStack Query keys of the recommendations feature. Personal ones belong to one reader.
export const recommendationKeys = {
  all: ["recommendations"] as const,
  similar: (storyId: string) => ["recommendations", "similar", storyId] as const,
  forMe: (userId: string) => ["recommendations", "for-me", userId] as const,
};

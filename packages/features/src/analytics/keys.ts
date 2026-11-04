// TanStack Query keys of the analytics feature. The viewer is part of the key, so an account switch never shows another
// account's figures.
export const analyticsKeys = {
  all: ["analytics"] as const,
  chapters: (userId: string, storyId: string) => ["analytics", "chapters", userId, storyId] as const,
  daily: (userId: string, storyId: string, days: number) => ["analytics", "daily", userId, storyId, days] as const,
};

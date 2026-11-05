// TanStack Query keys of the analytics feature. The viewer is part of the key, so an account switch never shows another
// account's figures.
export const analyticsKeys = {
  all: ["analytics"] as const,
  chapters: (userId: string, storyId: string) => ["analytics", "chapters", userId, storyId] as const,
  daily: (userId: string, storyId: string, days: number) => ["analytics", "daily", userId, storyId, days] as const,
  dailyRange: (userId: string, storyId: string, from: string, to: string) =>
    ["analytics", "daily-range", userId, storyId, from, to] as const,
  cohorts: (userId: string, storyId: string, weeks: number) =>
    ["analytics", "cohorts", userId, storyId, weeks] as const,
  split: (userId: string, storyId: string, days: number) => ["analytics", "split", userId, storyId, days] as const,
  terms: (userId: string, storyId: string, months: number) => ["analytics", "terms", userId, storyId, months] as const,
  sources: (userId: string, storyId: string, days: number) => ["analytics", "sources", userId, storyId, days] as const,
};

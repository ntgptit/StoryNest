// TanStack Query keys of the ranking feature. The period is part of the key, so each tab has its own cache.
export const rankingKeys = {
  all: ["ranking"] as const,
  top: (period: string) => ["ranking", "top", period] as const,
  freshness: () => ["ranking", "freshness"] as const,
};

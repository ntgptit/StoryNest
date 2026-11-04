// TanStack Query keys of the ranking feature. The period is part of the key, so each tab has its own cache; so is the
// reader's choice about adult stories.
export const rankingKeys = {
  all: ["ranking"] as const,
  top: (period: string, mature: boolean) => ["ranking", "top", period, mature] as const,
  freshness: () => ["ranking", "freshness"] as const,
};

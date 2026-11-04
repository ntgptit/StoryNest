// TanStack Query keys of the history feature (private, per-chapter data of people who may edit it).
export const historyKeys = {
  all: ["history"] as const,
  versions: (chapterId: string) => ["history", "versions", chapterId] as const,
  blocks: (versionId: string) => ["history", "blocks", versionId] as const,
};

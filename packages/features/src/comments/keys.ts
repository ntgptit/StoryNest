// TanStack Query keys of the comments feature. Everything of one chapter starts with ["comments", chapterId], so one
// invalidation refreshes lists, replies and margin counts. The viewer is part of the key of what depends on them
// (my likes), so an account switch never shows the previous account's state.
export const commentKeys = {
  chapter: (chapterId: string) => ["comments", chapterId] as const,
  list: (chapterId: string, blockId: string | null, newestFirst: boolean, userId: string | null) =>
    ["comments", chapterId, "list", blockId ?? "chapter", newestFirst ? "new" : "old", userId ?? "guest"] as const,
  replies: (chapterId: string, parentId: string, userId: string | null) =>
    ["comments", chapterId, "replies", parentId, userId ?? "guest"] as const,
  counts: (chapterId: string) => ["comments", chapterId, "counts"] as const,
  canModerate: (chapterId: string, userId: string | null) =>
    ["comments", chapterId, "can-moderate", userId ?? "guest"] as const,
};

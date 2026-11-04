// TanStack Query keys of the lists feature. One prefix per list lets a single invalidation refresh a list and the
// "my lists" overview. The viewer is part of the key of what depends on them.
export const listKeys = {
  all: ["lists"] as const,
  mine: (userId: string) => ["lists", "mine", userId] as const,
  detail: (listId: string, userId: string | null) => ["lists", "detail", listId, userId ?? "guest"] as const,
  membership: (storyId: string, userId: string) => ["lists", "membership", storyId, userId] as const,
};

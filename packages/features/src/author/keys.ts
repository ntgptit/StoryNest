// TanStack Query keys of the author feature. The viewer is part of what depends on them (is_following, the feed).
export const authorKeys = {
  all: ["author"] as const,
  profile: (username: string, userId: string | null) =>
    ["author", "profile", username.toLowerCase(), userId ?? "guest"] as const,
  /** Every feed of this reader, whatever the choice about adult stories (what a follow invalidates). */
  followedAll: (userId: string) => ["author", "followed-stories", userId] as const,
  followed: (userId: string, mature: boolean) => ["author", "followed-stories", userId, mature] as const,
};

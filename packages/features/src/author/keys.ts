// TanStack Query keys of the author feature. The viewer is part of what depends on them (is_following, the feed).
export const authorKeys = {
  all: ["author"] as const,
  profile: (username: string, userId: string | null) =>
    ["author", "profile", username.toLowerCase(), userId ?? "guest"] as const,
  followed: (userId: string) => ["author", "followed-stories", userId] as const,
};

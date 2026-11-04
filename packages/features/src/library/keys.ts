// TanStack Query keys of the library feature (private, per-user data: never prefetched on the server).
export const libraryKeys = {
  all: ["library"] as const,
  reading: (userId: string) => ["library", "reading", userId] as const,
  saved: (userId: string) => ["library", "saved", userId] as const,
  following: (userId: string) => ["library", "following", userId] as const,
};

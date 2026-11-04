export const en = {
  title: "Library",
  description: "Stories you're reading, have saved and are following.",
  tabsLabel: "Library sections",
  tabs: { reading: "Reading", saved: "Saved", following: "Following", lists: "Lists" },
  listLabel: (tab: string) => `${tab} stories`,
  empty: {
    reading: {
      title: "You haven't read any stories yet",
      description: "Stories you open will appear here so you can pick up where you left off.",
    },
    saved: { title: "No saved stories yet", description: 'Tap "Save to library" on a story page to keep it.' },
    following: {
      title: "You aren't following any stories yet",
      description: "Follow a story to get notified when there's a new chapter.",
    },
  },
  error: {
    title: "Couldn't load your library",
    description: "Check your connection and try again.",
    retry: "Try again",
  },
  continueReading: (number: number) => `Continue with chapter ${number}`,
  openStory: "Open story",
  readAt: (relative: string) => `Read ${relative}`,
  savedAt: (relative: string) => `Saved ${relative}`,
  followedAt: (relative: string) => `Followed ${relative}`,
  remove: { reading: "Remove from reading", saved: "Unsave", following: "Unfollow" },
  removed: { reading: "Removed from your reading list.", saved: "Unsaved.", following: "Unfollowed." },
  unavailable: {
    title: "Story no longer available",
    description: "The story was deleted, made private, or you no longer have permission to view it.",
  },
  errors: {
    network: "No connection. Check your network and try again.",
    generic: "That didn't work. Please try again.",
  },
};

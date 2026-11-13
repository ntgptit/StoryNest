export const en = {
  title: "Library",
  description: "Stories you're reading, have saved and get new-chapter notifications for.",
  tabsLabel: "Library sections",
  tabs: { reading: "Reading", saved: "Saved", following: "Notifications", lists: "Lists" },
  listLabel: (tab: string) => `${tab} stories`,
  empty: {
    reading: {
      title: "You haven't read any stories yet",
      description: "Stories you open will appear here so you can pick up where you left off.",
    },
    saved: { title: "No saved stories yet", description: 'Tap "Save to library" on a story page to keep it.' },
    following: {
      title: "No stories with notifications on",
      description: 'Tap "Get new chapters" on a story page to be told about new chapters.',
    },
  },
  error: {
    title: "Couldn't load your library",
    description: "Check your connection and try again.",
    retry: "Try again",
  },
  continueReading: (number: number) => `Continue with chapter ${number}`,
  openStory: "Open story",
  loadMore: "Load more",
  readAt: (relative: string) => `Read ${relative}`,
  savedAt: (relative: string) => `Saved ${relative}`,
  followedAt: (relative: string) => `Notifications on ${relative}`,
  remove: { reading: "Remove from reading", saved: "Unsave", following: "Turn off notifications" },
  removed: { reading: "Removed from Reading.", saved: "Unsaved.", following: "Notifications turned off." },
  undo: "Undo",
  restored: { saved: "Saved again.", following: "Notifications on again." },
  unavailable: {
    title: "Story no longer available",
    description: "The story was deleted, made private, or you no longer have permission to view it.",
  },
  errors: {
    network: "No connection. Check your network and try again.",
    generic: "That didn't work. Please try again.",
  },
};

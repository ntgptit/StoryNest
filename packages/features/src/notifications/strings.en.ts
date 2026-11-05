// English text of the in-app notifications. Same keys as strings.ts (the completeness test compares them).
export const en = {
  title: "Notifications",
  description: "New chapters, comment replies and collaboration invites.",
  bell: {
    label: "Notifications",
    withUnread: (count: number) => `Notifications, ${count} unread`,
  },
  listLabel: "Notification list",
  unread: "Unread",
  markAll: "Mark all as read",
  markedAll: "All notifications marked as read.",
  filter: {
    label: "Filter by type",
    all: "All",
    chapters: "New chapters",
    replies: "Replies",
    team: "Team",
    unreadOnly: "Unread only",
    showing: (shown: number, loaded: number) => `Showing ${shown} of ${loaded} loaded notifications`,
    noMatch: "None of the loaded notifications match.",
    noMatchMore: "None of the loaded notifications match. Load more to look further.",
  },
  loadMore: "Load more",
  loadingMore: "Loading…",
  empty: { title: "No notifications yet", description: "New chapters and invites will show up here." },
  error: {
    title: "Couldn't load notifications",
    description: "Check your connection and try again.",
    retry: "Try again",
  },
  someone: "Someone",
  generic: "You have a new notification.",
  text: {
    chapterPublished: (storyTitle: string, chapterNumber: number, chapterTitle: string) =>
      `"${storyTitle}" just published chapter ${chapterNumber}: ${chapterTitle}`,
    commentReplied: (actor: string, excerpt: string) =>
      excerpt === "" ? `${actor} replied to your comment` : `${actor} replied to your comment: "${excerpt}"`,
    commentMentioned: (actor: string, excerpt: string) =>
      excerpt === "" ? `${actor} mentioned you in a comment` : `${actor} mentioned you: "${excerpt}"`,
    collaborationInvited: (actor: string, storyTitle: string) => `${actor} invited you to co-author "${storyTitle}"`,
    collaborationAccepted: (actor: string, storyTitle: string) =>
      `${actor} accepted your invitation to co-author "${storyTitle}"`,
    collaborationDeclined: (actor: string, storyTitle: string) =>
      `${actor} declined your invitation to co-author "${storyTitle}"`,
    reviewRequested: (actor: string, chapterTitle: string, storyTitle: string) =>
      `${actor} asked you to review "${chapterTitle}" in "${storyTitle}"`,
    reviewApproved: (actor: string, chapterTitle: string) => `${actor} approved "${chapterTitle}"`,
    reviewChangesRequested: (actor: string, chapterTitle: string) => `${actor} sent "${chapterTitle}" back for changes`,
  },
  errors: {
    network: "No connection. Check your network and try again.",
    generic: "Couldn't complete that. Please try again.",
  },
};

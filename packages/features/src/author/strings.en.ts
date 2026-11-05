export const en = {
  followers: (n: string) => `${n} follower${n === "1" ? "" : "s"}`,
  stories: (n: string) => `${n} stor${n === "1" ? "y" : "ies"}`,
  storiesTitle: "Author's stories",
  noBio: "This author hasn't written a bio yet.",
  readMore: "Show more",
  readLess: "Show less",
  follow: "Follow",
  following: "Following",
  followedToast: "You're now following this author.",
  unfollowedToast: "Unfollowed.",
  emptyStories: {
    title: "No public stories yet",
    description: "When the author publishes a story, it will appear here.",
  },
  notFound: {
    title: "Author not found",
    description: "The author doesn't exist or the account is no longer visible.",
  },
  error: {
    title: "Couldn't load the author page",
    description: "Check your connection and try again.",
    retry: "Try again",
  },
  loadMore: "Load more",
  endOfList: "No more stories.",
  errors: {
    limit: "You're following the maximum of 1000 authors. Unfollow some before following more.",
    gone: "This author is no longer visible.",
    generic: "That didn't work. Please try again.",
  },
  feed: {
    title: "From authors you follow",
    description: "Recently updated stories from the authors you follow.",
    empty: {
      title: "No stories yet",
      description: "Follow a few authors and their updated stories will show up here.",
    },
    link: "From authors you follow",
    error: { title: "Couldn't load the list", description: "Check your connection and try again.", retry: "Try again" },
  },
};

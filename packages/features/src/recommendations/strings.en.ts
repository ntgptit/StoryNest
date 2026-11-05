export const en = {
  similarTitle: "You might also like",
  forMeTitle: "Recommended for you",
  listLabel: (title: string) => title,
  previous: "Previous stories",
  next: "More stories",
  reasons: {
    sharedTags: (tags: string) => `Shared tags: ${tags}`,
    sameCategory: (category: string) => `Same category: ${category}`,
    coReaders: "Readers of this story also read",
    followedAuthor: (author: string) => `From an author you follow: ${author}`,
    librarySimilar: (title: string) => `Because you saved or followed “${title}”`,
  },
};

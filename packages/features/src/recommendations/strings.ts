// Text of the recommendation lists. Single module so WBS WP 0.4 (i18n) can replace it in one change.
export const recommendationText = {
  similarTitle: "Có thể bạn cũng thích",
  forMeTitle: "Gợi ý cho bạn",
  listLabel: (title: string) => title,
  reasons: {
    sharedTags: (tags: string) => `Cùng thẻ ${tags}`,
    sameCategory: (category: string) => `Cùng thể loại ${category}`,
    coReaders: "Người đọc truyện này cũng đọc",
    followedAuthor: (author: string) => `Từ tác giả bạn theo dõi: ${author}`,
    librarySimilar: (title: string) => `Vì bạn đã lưu hoặc theo dõi “${title}”`,
  },
} as const;

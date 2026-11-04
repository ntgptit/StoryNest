// Text of the in-app notifications. Single module so WBS WP 0.4 (i18n) can replace it in one change.
export const notificationText = {
  title: "Thông báo",
  description: "Chương mới của truyện bạn theo dõi và lời mời cộng tác.",
  bell: {
    label: "Thông báo",
    withUnread: (count: number) => `Thông báo, ${count} chưa đọc`,
  },
  listLabel: "Danh sách thông báo",
  unread: "Chưa đọc",
  markAll: "Đánh dấu tất cả đã đọc",
  markedAll: "Đã đánh dấu tất cả là đã đọc.",
  loadMore: "Tải thêm",
  loadingMore: "Đang tải…",
  empty: { title: "Chưa có thông báo nào", description: "Khi có chương mới hoặc lời mời, bạn sẽ thấy ở đây." },
  error: { title: "Không tải được thông báo", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  someone: "Một người dùng",
  generic: "Bạn có thông báo mới.",
  text: {
    chapterPublished: (storyTitle: string, chapterNumber: number, chapterTitle: string) =>
      `"${storyTitle}" vừa đăng chương ${chapterNumber}: ${chapterTitle}`,
    collaborationInvited: (actor: string, storyTitle: string) => `${actor} mời bạn cộng tác truyện "${storyTitle}"`,
    collaborationAccepted: (actor: string, storyTitle: string) =>
      `${actor} đã chấp nhận lời mời cộng tác truyện "${storyTitle}"`,
    collaborationDeclined: (actor: string, storyTitle: string) =>
      `${actor} đã từ chối lời mời cộng tác truyện "${storyTitle}"`,
  },
  errors: {
    network: "Không có kết nối. Kiểm tra mạng và thử lại.",
    generic: "Không thực hiện được. Vui lòng thử lại.",
  },
} as const;

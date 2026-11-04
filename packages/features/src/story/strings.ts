// Text of the story page. Single module so WBS WP 0.4 (i18n) can replace it in one change.
export const storyText = {
  startReading: "Bắt đầu đọc",
  noChaptersYet: "Truyện chưa có chương nào được đăng.",
  chaptersTitle: "Danh sách chương",
  chapterCount: (count: number) => `${count} chương`,
  chapterLabel: (number: number) => `Chương ${number}`,
  words: (count: string) => `${count} từ`,
  synopsisTitle: "Giới thiệu",
  noSynopsis: "Tác giả chưa viết phần giới thiệu.",
  byAuthor: "Tác giả",
  tagsLabel: "Thẻ",
  stats: { reads: "Lượt đọc", votes: "Lượt bình chọn", comments: "Bình luận", followers: "Người theo dõi" },
  notFound: {
    title: "Không tìm thấy truyện",
    description: "Truyện không tồn tại, đã bị gỡ hoặc đang ở chế độ riêng tư.",
  },
  error: { title: "Không tải được truyện", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  chaptersError: { title: "Không tải được danh sách chương", retry: "Thử lại" },
} as const;

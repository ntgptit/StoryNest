// Text of the story page. Single module so WBS WP 0.4 (i18n) can replace it in one change.
import { defineText } from "../_shared/i18n.ts";

const vi = {
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
  tagLink: (name: string) => `Xem truyện có thẻ ${name}`,
  library: {
    follow: "Theo dõi",
    following: "Đang theo dõi",
    save: "Lưu vào thư viện",
    saved: "Đã lưu",
    guestHint: "Đăng nhập để theo dõi hoặc lưu truyện",
    followed: "Đã theo dõi. Bạn sẽ nhận thông báo khi có chương mới.",
    unfollowed: "Đã bỏ theo dõi.",
    savedToast: "Đã lưu vào thư viện.",
    removedToast: "Đã bỏ khỏi thư viện.",
    errors: {
      forbidden: "Bạn không thể theo dõi hoặc lưu truyện này.",
      network: "Không có kết nối. Kiểm tra mạng và thử lại.",
      generic: "Không thực hiện được. Vui lòng thử lại.",
    },
  },
  stats: { reads: "Lượt đọc", votes: "Lượt bình chọn", comments: "Bình luận", followers: "Người theo dõi" },
  notFound: {
    title: "Không tìm thấy truyện",
    description: "Truyện không tồn tại, đã bị gỡ hoặc đang ở chế độ riêng tư.",
  },
  error: { title: "Không tải được truyện", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  chaptersError: { title: "Không tải được danh sách chương", retry: "Thử lại" },
} as const;

export const storyText = defineText("story", vi);

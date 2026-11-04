// Text of the library page. Single module so WBS WP 0.4 (i18n) can replace it in one change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  title: "Thư viện",
  description: "Truyện bạn đang đọc, đã lưu và đang theo dõi.",
  tabsLabel: "Các phần của thư viện",
  tabs: { reading: "Đang đọc", saved: "Đã lưu", following: "Đang theo dõi", lists: "Danh sách" },
  listLabel: (tab: string) => `Truyện ${tab.toLowerCase()}`,
  empty: {
    reading: { title: "Bạn chưa đọc truyện nào", description: "Truyện bạn mở đọc sẽ xuất hiện ở đây để đọc tiếp." },
    saved: { title: "Chưa có truyện nào được lưu", description: 'Bấm "Lưu vào thư viện" ở trang truyện để giữ lại.' },
    following: {
      title: "Bạn chưa theo dõi truyện nào",
      description: "Theo dõi một truyện để nhận thông báo khi có chương mới.",
    },
  },
  error: { title: "Không tải được thư viện", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  continueReading: (number: number) => `Đọc tiếp chương ${number}`,
  openStory: "Mở truyện",
  readAt: (relative: string) => `Đọc ${relative}`,
  savedAt: (relative: string) => `Lưu ${relative}`,
  followedAt: (relative: string) => `Theo dõi ${relative}`,
  remove: { reading: "Xóa khỏi đang đọc", saved: "Bỏ lưu", following: "Bỏ theo dõi" },
  removed: { reading: "Đã xóa khỏi danh sách đang đọc.", saved: "Đã bỏ lưu.", following: "Đã bỏ theo dõi." },
  unavailable: {
    title: "Truyện không còn khả dụng",
    description: "Truyện đã bị xóa, đã chuyển sang riêng tư hoặc bạn không còn quyền xem.",
  },
  errors: {
    network: "Không có kết nối. Kiểm tra mạng và thử lại.",
    generic: "Không thực hiện được. Vui lòng thử lại.",
  },
} as const;

export const libraryText = defineText("library", vi, en);

// Text of the chapter reader. Single module so WBS WP 0.4 (i18n) can replace it in one change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  backToStory: "Về trang truyện",
  chapterLabel: (number: number) => `Chương ${number}`,
  toc: { open: "Mục lục", title: "Mục lục", description: "Chọn chương để đọc." },
  nav: { label: "Chuyển chương", previous: "Chương trước", next: "Chương sau", none: "Hết" },
  progress: "Tiến độ đọc chương",
  timeLeft: {
    long: (minutes: number) => `${minutes} phút còn lại`,
    short: (minutes: number) => `${minutes} phút`,
    done: "Đã đọc hết",
  },
  backToTop: "Lên đầu trang",
  image: {
    open: "Xem ảnh toàn màn hình",
    title: "Ảnh trong chương",
    hint: "Chụm hai ngón, chạm đúp hoặc nhấn + và − để phóng to. Kéo xuống hoặc nhấn Esc để đóng.",
    close: "Đóng ảnh",
  },
  quote: {
    toolbar: "Công cụ trích dẫn",
    copy: "Chép trích dẫn",
    copied: "Đã chép",
    copyFailed: "Không chép được trích dẫn.",
    comment: "Bình luận đoạn này",
    text: (quote: string, source: string, url: string) => `“${quote}”\n— ${source}\n${url}`,
    source: (story: string, chapter: string) => `${story}, ${chapter}`,
  },
  settings: {
    open: "Hiển thị",
    title: "Tùy chọn đọc",
    description: "Thay đổi áp dụng ngay và được nhớ cho lần sau.",
    fontSize: "Cỡ chữ",
    smaller: "Giảm cỡ chữ",
    larger: "Tăng cỡ chữ",
    lineHeight: "Giãn dòng",
    font: "Phông chữ",
    theme: "Nền",
    lineHeights: { compact: "Gọn", normal: "Vừa", relaxed: "Thoáng" },
    fonts: { sans: "Không chân", serif: "Có chân" },
    themes: { site: "Theo giao diện", light: "Sáng", sepia: "Sepia", dark: "Tối" },
    sizeNames: { s: "Nhỏ", m: "Vừa", l: "Lớn", xl: "Rất lớn" },
    focus: "Chế độ tập trung",
    focusHint: "Làm mờ các đoạn khác, chỉ giữ rõ đoạn đang đọc. Dùng ↑/↓ để chuyển đoạn. Chỉ lưu trên thiết bị này.",
  },
  vote: {
    add: "Bình chọn cho chương này",
    remove: "Bỏ bình chọn",
    count: (count: string) => `${count} lượt bình chọn`,
    guest: "Đăng nhập để bình chọn",
    errors: {
      forbidden: "Bạn không thể bình chọn chương này.",
      network: "Không có kết nối. Kiểm tra mạng và thử lại.",
      generic: "Không bình chọn được. Vui lòng thử lại.",
    },
  },
  endOfChapter: "Hết chương",
  emptyChapter: "Chương này chưa có nội dung.",
  notFound: { title: "Không tìm thấy chương", description: "Chương không tồn tại, chưa được đăng hoặc đã bị gỡ." },
  error: { title: "Không tải được chương", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
} as const;

export const readerText = defineText("reader", vi, en);

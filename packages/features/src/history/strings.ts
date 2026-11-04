// Text of the version history and the preview. Single module so WBS WP 0.4 (i18n) can replace it in one change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  title: "Lịch sử phiên bản",
  description: (chapterTitle: string) =>
    `Các lần đăng của chương "${chapterTitle}". Phiên bản cũ không bao giờ bị sửa.`,
  backToEditor: "Về trình soạn",
  versionLabel: (n: number) => `Phiên bản ${n}`,
  listLabel: "Các phiên bản",
  live: "Đang hiển thị với độc giả",
  by: (name: string) => `bởi ${name}`,
  words: (count: string) => `${count} từ`,
  publishedAt: (relative: string) => `Đăng ${relative}`,
  untitled: "(chưa có tên)",
  empty: { title: "Chương chưa được đăng lần nào", description: "Mỗi lần đăng sẽ tạo một phiên bản để xem lại ở đây." },
  select: "Chọn một phiên bản để xem.",
  view: { content: "Nội dung", compare: "So sánh" },
  viewerLabel: (n: number) => `Nội dung phiên bản ${n}`,
  emptyVersion: "Phiên bản này không có nội dung.",
  compare: {
    against: "So sánh với",
    draft: "Bản nháp hiện tại",
    version: (n: number) => `Phiên bản ${n}`,
    summary: (added: number, removed: number, changed: number) =>
      `${added} đoạn thêm, ${removed} đoạn xóa, ${changed} đoạn sửa`,
    identical: "Hai bản giống hệt nhau.",
    added: "Thêm",
    removed: "Xóa",
    changed: "Sửa",
    before: "Trước đó:",
    caption: (n: number, base: string) => `So với ${base}, phiên bản ${n} có những thay đổi sau.`,
  },
  restore: {
    action: "Khôi phục vào bản nháp",
    title: "Khôi phục phiên bản này vào bản nháp?",
    description:
      "Bản nháp hiện tại sẽ được thay bằng nội dung phiên bản này. Phiên bản cũ và bản đang đăng không thay đổi; độc giả chỉ thấy khi bạn đăng lại.",
    confirm: "Khôi phục",
    cancel: "Hủy",
    done: "Đã khôi phục vào bản nháp.",
    openEditor: "Mở trình soạn",
    nothingToRestore: "Phiên bản này không có nội dung để khôi phục.",
  },
  error: { title: "Không tải được lịch sử", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  notFound: { title: "Không tìm thấy chương", description: "Chương không tồn tại hoặc bạn không có quyền truy cập." },
  errors: {
    conflict: "Bản nháp vừa được sửa ở nơi khác. Hãy mở lại trình soạn rồi khôi phục lại.",
    forbidden: "Bạn không có quyền khôi phục chương này.",
    notFound: "Không tìm thấy chương.",
    invalid: "Nội dung phiên bản này không khôi phục được.",
    network: "Không có kết nối. Kiểm tra mạng và thử lại.",
    generic: "Đã có lỗi xảy ra. Vui lòng thử lại.",
  },
  preview: {
    title: "Xem trước",
    banner: "Đây là bản nháp, đúng như độc giả sẽ thấy khi bạn đăng. Chưa ai nhìn thấy nó.",
    empty: "Bản nháp chưa có nội dung.",
    backToEditor: "Về trình soạn",
  },
  links: { history: "Lịch sử phiên bản", preview: "Xem trước" },
} as const;

export const historyText = defineText("history", vi, en);

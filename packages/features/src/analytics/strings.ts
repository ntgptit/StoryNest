// Text of the author statistics. Single module so WBS WP 0.4 (i18n) can replace it in one change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  title: "Thống kê truyện",
  description: "Người đọc truyện của bạn và nơi họ dừng lại.",
  back: "Về Studio",
  signIn: "Đăng nhập để xem thống kê.",
  signInLink: "Đăng nhập",
  noAccess: {
    title: "Bạn không xem được thống kê này",
    description: "Chỉ chủ truyện và đồng tác giả xem được thống kê.",
  },
  notFound: { title: "Không tìm thấy truyện", description: "Truyện không tồn tại hoặc bạn không quản lý truyện này." },
  error: { title: "Không tải được thống kê", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  range: {
    label: "Khoảng thời gian",
    options: { 7: "7 ngày", 30: "30 ngày", 90: "90 ngày" },
  },
  totals: {
    title: "Trong khoảng đã chọn",
    reads: "Lượt đọc",
    votes: "Lượt thích mới",
    comments: "Bình luận mới",
  },
  daily: {
    title: "Theo ngày",
    chartLabel: (days: number, reads: number, votes: number, comments: number) =>
      `Biểu đồ ${days} ngày: ${reads} lượt đọc, ${votes} lượt thích, ${comments} bình luận`,
    barTitle: (day: string, reads: string) => `${day}: ${reads} lượt đọc`,
    note: "Lượt đọc theo ngày chỉ có trong 90 ngày gần nhất. Ngày tính theo giờ UTC.",
    empty: "Chưa có hoạt động nào trong khoảng này.",
  },
  chapters: {
    title: "Theo chương",
    note: "“Giữ chân” là số lượt đọc của chương so với chương liền trước.",
    empty: "Chưa có chương nào được đăng.",
    columns: {
      chapter: "Chương",
      reads: "Lượt đọc",
      votes: "Thích",
      comments: "Bình luận",
      retention: "Giữ chân",
    },
    chapterLabel: (number: number) => `Chương ${number}`,
    noRetention: "—",
  },
} as const;

export const analyticsText = defineText("analytics", vi, en);

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
    note: "Lượt đọc theo ngày chỉ có trong 90 ngày gần nhất. Ngày tính theo giờ UTC. Chạm hoặc rê qua biểu đồ để xem từng ngày; cờ đánh dấu ngày đăng chương.",
    empty: "Chưa có hoạt động nào trong khoảng này.",
    series: { reads: "Lượt đọc", votes: "Lượt thích", comments: "Bình luận" },
    seriesChart: (series: string) => `${series} theo ngày`,
    hint: "Dùng phím ← và → để xem từng ngày, Home và End để về ngày đầu và ngày cuối, Esc để bỏ chọn. Ba biểu đồ dùng chung một con trỏ.",
    latest: (day: string) => `Gần nhất · ${day}`,
    average: "TB",
    showTable: "Xem dạng bảng",
    hideTable: "Ẩn bảng",
    tableCaption: (days: number) => `Số liệu ${days} ngày theo giờ UTC`,
    dayColumn: "Ngày",
    publishedColumn: "Chương đăng",
    published: (numbers: readonly number[]) => `Đăng chương ${numbers.join(", ")}`,
    readout: (day: string, reads: number, votes: number, comments: number, published: string | null) =>
      `${day}: ${reads} lượt đọc, ${votes} lượt thích, ${comments} bình luận${published ? `. ${published}` : ""}`,
  },
  funnel: {
    title: "Đọc tiếp qua từng chương",
    label: "Lượt đọc của từng chương theo thứ tự đọc",
    note: "Mỗi bậc là tổng lượt đọc của một chương từ trước đến nay (một người đọc được tính một lần mỗi ngày), không phải số người đọc riêng biệt. Chương mới đăng có ít thời gian hơn để có lượt đọc.",
    empty: "Chưa có lượt đọc nào để vẽ phễu.",
    single: "Mới có một chương: cần ít nhất hai chương để thấy người đọc dừng ở đâu.",
    summary: (last: number, first: number, overall: string) =>
      `Chương ${last} có ${overall} số lượt đọc của chương ${first}.`,
    noBasis: (first: number) => `Chương ${first} chưa có lượt đọc nên chưa so sánh được.`,
    biggestDrop: (number: number, change: string) =>
      `Rơi nhiều nhất ở chương ${number}: ${change} so với chương liền trước.`,
    noDrop: "Không chương nào có ít lượt đọc hơn chương liền trước.",
    highlight: "rơi nhiều nhất",
    showAll: (count: number) => `Xem cả ${count} chương`,
    showFewer: "Thu gọn",
    detail: (step: {
      number: number;
      title: string;
      reads: string;
      first: number;
      ofFirst: string | null;
      previous: number | null;
      change: string | null;
    }) =>
      [
        `Chương ${step.number} · ${step.title}: ${step.reads} lượt đọc`,
        step.ofFirst && step.number !== step.first ? `bằng ${step.ofFirst} của chương ${step.first}` : null,
        step.change && step.previous !== null ? `${step.change} so với chương ${step.previous}` : null,
      ]
        .filter(Boolean)
        .join(", ") + ".",
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

// Text of the ranking screen. Single module so WBS WP 0.4 (i18n) can replace it in one change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  title: "Xếp hạng",
  description: "Truyện được đọc và bình chọn nhiều nhất.",
  periodsLabel: "Khoảng thời gian",
  periods: { day: "Hôm nay", week: "Tuần này", month: "Tháng này", all: "Mọi lúc" },
  updated: (relative: string) => `Cập nhật ${relative}`,
  listLabel: (period: string) => `Xếp hạng ${period}`,
  rank: (position: number) => `Hạng ${position}`,
  inPeriod: (reads: string, votes: string) => `${reads} lượt đọc · ${votes} bình chọn`,
  loadMore: "Tải thêm",
  endOfList: "Đã hết bảng xếp hạng.",
  empty: { title: "Chưa có xếp hạng", description: "Khi có người đọc và bình chọn, truyện sẽ xuất hiện ở đây." },
  error: { title: "Không tải được bảng xếp hạng", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
} as const;

export const rankingText = defineText("ranking", vi, en);

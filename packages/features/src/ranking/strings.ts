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
  history: {
    title: "Thứ hạng 7 ngày qua",
    race: "Đua thứ hạng",
    slope: "Lên xuống",
    views: "Cách xem",
    raceLabel: "Thứ hạng theo ngày",
    play: "Phát",
    pause: "Tạm dừng",
    scrubber: "Ngày",
    bar: (rank: number, title: string, score: string) => `${rank}. ${title}, ${score} điểm`,
    fromLabel: "7 ngày trước",
    toLabel: "Hôm nay",
    slopeLabel: "Thứ hạng hôm nay so với ngày đầu của khoảng",
    modes: "Trục",
    rank: "Hạng",
    score: "Điểm",
    move: (title: string, from: number | null, to: number) =>
      from === null
        ? `${title}: mới vào, hạng ${to}`
        : from === to
          ? `${title}: giữ hạng ${to}`
          : `${title}: hạng ${from} → ${to}`,
    idle: "Chọn một truyện để xem nó lên xuống bao nhiêu bậc.",
    untitled: "Truyện",
    building: "Lịch sử xếp hạng được ghi mỗi ngày một lần; cần ít nhất hai ngày để so sánh.",
    note: "Mỗi ngày bảng xếp hạng được chụp lại một lần; điểm = lượt đọc + 5 × bình chọn trong khoảng thời gian đang chọn.",
  },
  featured: {
    title: "Nổi bật tuần này",
    seeAll: "Xem bảng xếp hạng",
    pause: "Tạm dừng tự chuyển",
    play: "Tiếp tục tự chuyển",
    dots: "Chọn truyện nổi bật",
    slide: (position: number, count: number, title: string) => `Truyện ${position}/${count}: ${title}`,
  },
} as const;

export const rankingText = defineText("ranking", vi, en);

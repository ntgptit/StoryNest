// Text of the search screens. Single module so WBS WP 0.4 (i18n) can replace it in one change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  title: "Tìm kiếm",
  inputLabel: "Tìm truyện, tác giả hoặc thẻ",
  placeholder: "Tìm truyện, tác giả, thẻ…",
  submit: "Tìm",
  openSearch: "Mở tìm kiếm",
  closeSearch: "Đóng tìm kiếm",
  hint: (min: number) => `Nhập ít nhất ${min} ký tự để tìm. Có dấu hay không dấu đều được.`,
  tooLong: (max: number) => `Từ khóa dài tối đa ${max} ký tự.`,
  tabs: { stories: "Truyện", authors: "Tác giả", tags: "Thẻ" },
  resultsFor: (term: string) => `Kết quả cho “${term}”`,
  seeAll: (term: string) => `Xem tất cả kết quả cho “${term}”`,
  suggestionsLabel: "Gợi ý",
  searching: "Đang tìm…",
  loadMore: "Tải thêm",
  endOfResults: "Đã hết kết quả.",
  capReached: "Chỉ hiển thị những kết quả đầu tiên. Hãy tìm cụ thể hơn.",
  empty: {
    stories: { title: "Không thấy truyện phù hợp", description: "Thử từ khóa ngắn hơn hoặc viết khác đi." },
    authors: { title: "Không thấy tác giả phù hợp", description: "Thử tên hiển thị hoặc tên người dùng." },
    tags: { title: "Không thấy thẻ phù hợp", description: "Thử một từ khóa khác." },
  },
  error: { title: "Không tìm được lúc này", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  trending: {
    title: "Đang được tìm",
    open: "Xem các từ khóa đang được tìm nhiều",
    close: "Ẩn các từ khóa đang được tìm",
    list: "Từ khóa được tìm nhiều trong 7 ngày qua",
    isNew: "mới",
    up: (places: number) => `lên ${places} bậc`,
    down: (places: number) => `xuống ${places} bậc`,
    same: "giữ hạng",
    pick: (term: string) => `Tìm “${term}”`,
    note: "Từ khóa được ít nhất 3 người tìm trong 7 ngày qua. Không lưu ai đã tìm gì.",
  },
  storiesCount: (n: number) => `${n} truyện`,
  tagStoriesCount: (n: number) => `${n} truyện`,
} as const;

export const searchText = defineText("search", vi, en);

// Text of the discovery screens. Single module so WBS WP 0.4 (i18n) can replace it in one change.
export const discoveryText = {
  title: "Mới cập nhật",
  categoriesLabel: "Thể loại",
  popularTagsLabel: "Thẻ phổ biến",
  tagFilter: { label: (name: string) => `Đang lọc theo thẻ #${name}`, clear: "Bỏ lọc thẻ" },
  allCategories: "Tất cả",
  loadMore: "Tải thêm",
  endOfList: "Bạn đã xem hết truyện.",
  empty: { title: "Chưa có truyện nào", description: "Hãy quay lại sau, hoặc thử một thể loại khác." },
  emptyTag: { title: "Chưa có truyện với thẻ này", description: "Thử bỏ lọc thẻ, hoặc chọn thẻ khác." },
  error: { title: "Không tải được danh sách truyện", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  mature: "18+",
  unknownAuthor: "Tác giả ẩn danh",
  status: {
    draft: "Bản nháp",
    ongoing: "Đang ra",
    completed: "Hoàn thành",
    hiatus: "Tạm ngưng",
  },
  card: {
    reads: "Lượt đọc",
    votes: "Lượt bình chọn",
    updated: (relative: string) => `Cập nhật ${relative}`,
  },
} as const;

// Text of the studio (author workspace). Single module so WBS WP 0.4 (i18n) can replace it in one change.
export const studioText = {
  title: "Studio",
  description: "Truyện bạn đang viết và truyện bạn được mời cộng tác.",
  view: "Xem trang truyện",
  chapterCount: (count: number) => `${count} chương`,
  updated: (relative: string) => `Cập nhật ${relative}`,
  visibility: { private: "Riêng tư", unlisted: "Chỉ người có liên kết", public: "Công khai" },
  role: { owner: "Chủ sở hữu", co_author: "Đồng tác giả", editor: "Biên tập viên" },
  empty: { title: "Bạn chưa có truyện nào", description: "Truyện bạn tạo hoặc được mời cộng tác sẽ xuất hiện ở đây." },
  error: { title: "Không tải được danh sách truyện", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  listLabel: "Truyện của tôi",
} as const;

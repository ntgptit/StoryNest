// Text of the author screens. Single module so WBS WP 0.4 (i18n) can replace it in one change.
export const authorText = {
  followers: (n: string) => `${n} người theo dõi`,
  stories: (n: string) => `${n} truyện`,
  storiesTitle: "Truyện của tác giả",
  noBio: "Tác giả chưa viết giới thiệu.",
  follow: "Theo dõi",
  following: "Đang theo dõi",
  followedToast: "Đã theo dõi tác giả.",
  unfollowedToast: "Đã bỏ theo dõi.",
  emptyStories: {
    title: "Chưa có truyện công khai",
    description: "Khi tác giả đăng truyện, truyện sẽ xuất hiện ở đây.",
  },
  notFound: {
    title: "Không tìm thấy tác giả",
    description: "Tác giả không tồn tại hoặc tài khoản không còn hiển thị.",
  },
  error: { title: "Không tải được trang tác giả", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  loadMore: "Tải thêm",
  endOfList: "Đã hết truyện.",
  errors: {
    limit: "Bạn đã theo dõi tối đa 1000 tác giả. Hãy bỏ bớt trước khi theo dõi thêm.",
    gone: "Tác giả này không còn hiển thị.",
    generic: "Không thực hiện được. Hãy thử lại.",
  },
  feed: {
    title: "Từ tác giả bạn theo dõi",
    description: "Truyện mới cập nhật của những tác giả bạn đang theo dõi.",
    empty: { title: "Chưa có truyện nào", description: "Hãy theo dõi vài tác giả, truyện họ cập nhật sẽ hiện ở đây." },
    link: "Từ tác giả bạn theo dõi",
    error: { title: "Không tải được danh sách", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  },
} as const;

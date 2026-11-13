// Text owned by the web app shell. `appText` is what the SERVER writes (page titles, metadata): always Vietnamese for now (a
// per-language address and hreflang are future work). `homeText` is shown by the client and follows the language.
import { defineText } from "@storynest/features";

export const appText = {
  siteName: "StoryNest",
  siteDescription: "Đọc và đăng truyện trực tuyến.",
  titleTemplate: "%s · StoryNest",
  pageTitle: {
    login: "Đăng nhập",
    register: "Đăng ký",
    forgotPassword: "Quên mật khẩu",
    resetPassword: "Đặt mật khẩu mới",
    profile: "Hồ sơ",
    editProfile: "Chỉnh sửa hồ sơ",
    studio: "Studio",
    library: "Thư viện",
    list: "Danh sách đọc",
    search: "Tìm kiếm",
    ranking: "Xếp hạng",
    author: "Tác giả",
    following: "Từ tác giả bạn theo dõi",
    myReports: "Báo cáo của tôi",
    notifications: "Thông báo",
    settings: "Cài đặt",
    moderation: "Kiểm duyệt",
    newStory: "Truyện mới",
    editStory: "Chỉnh sửa truyện",
    chapters: "Quản lý chương",
    team: "Cộng tác viên",
    stats: "Thống kê truyện",
    history: "Lịch sử phiên bản",
    preview: "Xem trước",
    editChapter: "Soạn chương",
    storyFallback: "Truyện",
    chapterFallback: "Chương",
    notFound: "Không tìm thấy trang",
  },
  /** Title of a chapter page: "<chapter> · <story>" (the site name is appended by the layout template). */
  chapterTitle: (chapter: string, story: string) => `${chapter} · ${story}`,
} as const;

export const homeText = defineText(
  "app.home",
  {
    heading: "Nơi những câu chuyện được viết và được đọc.",
    intro: "Khám phá truyện mới cập nhật và theo dõi tác giả yêu thích của bạn.",
  },
  {
    heading: "Where stories are written and read.",
    intro: "Discover newly updated stories and follow the authors you love.",
  },
);

// Text owned by the web app shell (metadata and the home hero). Feature screens keep their own strings.ts; WBS WP 0.4
// replaces all of these modules with the i18n catalogue in one change.
export const appText = {
  siteName: "StoryNest",
  siteDescription: "Đọc và đăng truyện trực tuyến.",
  titleTemplate: "%s · StoryNest",
  home: {
    heading: "Nơi những câu chuyện được viết và được đọc.",
    intro: "Khám phá truyện mới cập nhật và theo dõi tác giả yêu thích của bạn.",
  },
  pageTitle: {
    login: "Đăng nhập",
    register: "Đăng ký",
    forgotPassword: "Quên mật khẩu",
    resetPassword: "Đặt mật khẩu mới",
    profile: "Hồ sơ",
    editProfile: "Chỉnh sửa hồ sơ",
    studio: "Studio",
    newStory: "Truyện mới",
    editStory: "Chỉnh sửa truyện",
    chapters: "Quản lý chương",
    team: "Cộng tác viên",
    editChapter: "Soạn chương",
    storyFallback: "Truyện",
    chapterFallback: "Chương",
  },
  /** Title of a chapter page: "<chapter> · <story>" (the site name is appended by the layout template). */
  chapterTitle: (chapter: string, story: string) => `${chapter} · ${story}`,
} as const;

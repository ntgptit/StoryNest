// Text of the app frame. Single module so WBS WP 0.4 (i18n) can replace it in one change.
export const shellText = {
  appName: "StoryNest",
  signIn: "Đăng nhập",
  accountMenu: "Menu tài khoản",
  profile: "Hồ sơ",
  studio: "Studio",
  signOut: "Đăng xuất",
  signOutFailed: "Không đăng xuất được. Vui lòng thử lại.",
  mainNavigation: "Điều hướng chính",
  nav: { home: "Trang chủ", studio: "Viết", me: "Tôi" },
  me: {
    title: "Hồ sơ của bạn",
    edit: "Chỉnh sửa hồ sơ",
    description: "Thông tin tài khoản.",
    email: "Email",
    username: "Tên người dùng",
    displayName: "Tên hiển thị",
    bio: "Giới thiệu",
    noBio: "Chưa có giới thiệu.",
    missingProfile: "Chưa tìm thấy hồ sơ cho tài khoản này.",
  },
} as const;

// Text of the app frame. Single module so WBS WP 0.4 (i18n) can replace it in one change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  appName: "StoryNest",
  signIn: "Đăng nhập",
  accountMenu: "Menu tài khoản",
  profile: "Hồ sơ",
  studio: "Studio",
  library: "Thư viện",
  settings: "Cài đặt",
  moderation: "Kiểm duyệt",
  signOut: "Đăng xuất",
  signOutFailed: "Không đăng xuất được. Vui lòng thử lại.",
  mainNavigation: "Điều hướng chính",
  loading: "Đang tải trang…",
  language: {
    label: "Ngôn ngữ",
    switchTo: (name: string) => `Chuyển sang ${name}`,
    names: { vi: "Tiếng Việt", en: "English" },
  },
  nav: { home: "Trang chủ", library: "Thư viện", studio: "Viết", me: "Tôi" },
  // Desktop navigation row (from md up): the bottom-nav items plus browsing, ranking and following.
  desktopNav: {
    browse: "Khám phá",
    ranking: "Xếp hạng",
    following: "Theo dõi",
    categories: "Thể loại",
    allStories: "Tất cả truyện",
    popularTags: "Thẻ phổ biến",
    periods: "Khoảng thời gian",
  },
  // Mobile full-screen menu (below md): what the bottom nav has no room for.
  mobileMenu: {
    open: "Mở menu",
    close: "Đóng menu",
    title: "Menu",
    browse: "Thể loại",
  },
  // Strip under the header when the device loses its connection.
  connection: {
    offlineTitle: "Bạn đang ngoại tuyến",
    offlineBody: "Nội dung mới sẽ tải lại khi có mạng.",
    backTitle: "Đã có mạng trở lại",
    backBody: "Đang tải lại phần bị lỗi.",
  },
  // Pull-to-refresh in the installed app.
  pullRefresh: {
    pull: "Kéo xuống để tải lại",
    release: "Thả ra để tải lại",
    refreshing: "Đang tải lại…",
  },
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
  // Command palette (Ctrl/Cmd+K, desktop): go to a section or open a story suggestion.
  palette: {
    title: "Bảng lệnh",
    input: "Tìm trang hoặc truyện",
    placeholder: "Đi tới trang hoặc tìm truyện…",
    results: "Kết quả",
    empty: "Không có kết quả phù hợp",
    goTo: "Đi tới",
    stories: "Truyện",
    searchAll: (term: string) => `Xem mọi kết quả cho “${term}”`,
    notifications: "Thông báo",
    newStory: "Viết truyện mới",
    hints: { move: "↑↓ chọn", run: "Enter mở", close: "Esc đóng" },
  },
  // Intro shown once on this device after sign-up (skippable).
  intro: {
    pages: {
      read: {
        title: "Đọc theo cách của bạn",
        body: "Mở một truyện và đọc từng chương. Chỗ bạn đọc dở được ghi nhớ để lần sau đọc tiếp.",
      },
      follow: {
        title: "Theo dõi và lưu vào Thư viện",
        body: "Theo dõi truyện và tác giả bạn thích, lưu truyện vào Thư viện để luôn tìm lại được.",
      },
      write: {
        title: "Viết trong Studio",
        body: "Tạo truyện mới, soạn từng chương và đăng khi bạn sẵn sàng.",
      },
    },
    next: "Tiếp",
    done: "Bắt đầu",
    skip: "Bỏ qua",
    step: (page: number, total: number) => `Trang ${page}/${total}`,
  },
  // Page for an address that leads nowhere: suggests the closest real page, or a search for the words in it.
  notFound: {
    title: "Không tìm thấy trang",
    description: "Địa chỉ này không tồn tại hoặc trang đã bị gỡ.",
    didYouMean: "Có phải ý bạn là",
    searchFor: (term: string) => `Tìm “${term}”`,
    searchAuthors: (term: string) => `Tìm tác giả “${term}”`,
    home: "Về trang chủ",
  },
} as const;

export const shellText = defineText("shell", vi, en);

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
  language: {
    label: "Ngôn ngữ",
    switchTo: (name: string) => `Chuyển sang ${name}`,
    names: { vi: "Tiếng Việt", en: "English" },
  },
  nav: { home: "Trang chủ", library: "Thư viện", studio: "Viết", me: "Tôi" },
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

export const shellText = defineText("shell", vi, en);

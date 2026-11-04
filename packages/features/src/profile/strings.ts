// Text of the profile screens. Single module so WBS WP 0.4 (i18n) can replace it in one change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  edit: {
    title: "Chỉnh sửa hồ sơ",
    description: "Thông tin này hiển thị công khai trên trang của bạn.",
    displayName: "Tên hiển thị",
    username: "Tên người dùng",
    usernameHint: "Chữ, số và dấu gạch dưới, 3-30 ký tự. Đổi tên sẽ đổi địa chỉ hồ sơ của bạn.",
    bio: "Giới thiệu",
    bioHint: "Tối đa 1000 ký tự.",
    submit: "Lưu thay đổi",
    submitting: "Đang lưu…",
    cancel: "Hủy",
    saved: "Đã lưu hồ sơ.",
    signInRequired: "Bạn cần đăng nhập để chỉnh sửa hồ sơ.",
    signIn: "Đăng nhập",
    missingProfile: "Chưa tìm thấy hồ sơ cho tài khoản này.",
  },
  avatar: {
    add: "Thêm ảnh đại diện",
    change: "Đổi ảnh",
    remove: "Gỡ ảnh",
    uploading: "Đang tải lên…",
    inputLabel: "Chọn ảnh đại diện",
    hint: "JPG, PNG hoặc WebP, tối đa 10 MB. Ảnh được cắt vuông ở giữa.",
    saved: "Đã cập nhật ảnh đại diện.",
    removed: "Đã gỡ ảnh đại diện.",
    errors: {
      type: "Chỉ dùng được ảnh JPG, PNG hoặc WebP.",
      tooLarge: "Ảnh quá lớn (tối đa 10 MB).",
      unreadable: "Không đọc được ảnh này. Hãy thử ảnh khác.",
      rejected: "Máy chủ không nhận ảnh này. Hãy thử ảnh khác.",
    },
  },
  validation: {
    usernameInvalid: "Tên người dùng chỉ gồm chữ, số, dấu gạch dưới (3-30 ký tự).",
    displayNameRequired: "Vui lòng nhập tên hiển thị.",
    displayNameTooLong: "Tên hiển thị tối đa 100 ký tự.",
    bioTooLong: "Phần giới thiệu tối đa 1000 ký tự.",
  },
  errors: {
    usernameTaken: "Tên người dùng này đã có người dùng.",
    forbidden: "Bạn không có quyền sửa hồ sơ này.",
    notFound: "Không tìm thấy hồ sơ.",
    network: "Không có kết nối. Kiểm tra mạng và thử lại.",
    generic: "Đã có lỗi xảy ra. Vui lòng thử lại.",
  },
} as const;

export const profileText = defineText("profile", vi, en);

// Text of the settings page. Single module so WBS WP 0.4 (i18n) can replace it in one change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  title: "Cài đặt",
  description: "Lưu trong tài khoản, dùng trên mọi thiết bị.",
  signIn: "Đăng nhập để chỉnh cài đặt.",
  signInLink: "Đăng nhập",
  error: { title: "Không tải được cài đặt", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  saveFailed: "Không lưu được cài đặt. Đã trả về giá trị cũ.",
  language: {
    title: "Ngôn ngữ",
    label: "Ngôn ngữ giao diện",
    description: "Chọn ngôn ngữ giao diện. Phần chưa dịch hiển thị bằng tiếng Việt.",
    options: { vi: "Tiếng Việt", en: "English" },
  },
  theme: {
    title: "Giao diện",
    description: "Lưu trên thiết bị này. Khi đọc chương, màu nền trong cài đặt đọc được ưu tiên.",
    label: "Chủ đề",
    options: { system: "Theo thiết bị", light: "Sáng", dark: "Tối" },
    darkSwitch: "Giao diện tối",
  },
  reading: {
    title: "Đọc truyện",
    description: "Cỡ chữ, giãn dòng, phông và màu nền của trang đọc.",
  },
  adult: {
    title: "Nội dung người lớn (18+)",
    label: "Hiện truyện 18+",
    description: "Mặc định ẩn. Bật nghĩa là bạn xác nhận từ 18 tuổi trở lên.",
    confirmTitle: "Hiện truyện dành cho người lớn?",
    confirmDescription: "Chỉ bật nếu bạn từ 18 tuổi trở lên. Truyện 18+ sẽ xuất hiện trong các danh sách.",
    confirm: "Tôi từ 18 tuổi trở lên, hiện truyện 18+",
    cancel: "Giữ ẩn",
  },
  notifications: {
    title: "Thông báo",
    description:
      "Chọn thông báo trong ứng dụng bạn muốn nhận. Bật một mục để xem tùy chọn chi tiết. Lời mời cộng tác gửi cho bạn luôn được gửi.",
    summary: (on: number, total: number) => (on === 0 ? "Đã tắt hết" : `Bật ${on}/${total}`),
    turnAllOff: "Tắt tất cả",
    channels: {
      inApp: "Trong ứng dụng",
      inAppOn: "Bật",
      other: "Email và thông báo đẩy",
      unavailable: "Chưa có: StoryNest chưa gửi email hay thông báo đẩy.",
    },
    types: {
      collaboration_accepted: { label: "Nhận lời", description: "Người được mời nhận lời cộng tác." },
      collaboration_declined: { label: "Từ chối", description: "Người được mời từ chối." },
    },
    invitedAlwaysOn: { label: "Lời mời gửi cho bạn", description: "Luôn được gửi vì cần bạn trả lời." },
    alwaysOn: "Luôn bật",
    chapterPublished: { label: "Chương mới", description: "Truyện bạn theo dõi có chương mới." },
    commentReplied: {
      label: "Trả lời và nhắc tên",
      description: "Có người trả lời bình luận của bạn hoặc nhắc @tên bạn trong bình luận.",
    },
    collaborationAnswers: {
      label: "Phản hồi lời mời",
      description: "Người được bạn mời cộng tác nhận hoặc từ chối.",
    },
  },
} as const;

export const settingsText = defineText("settings", vi, en);

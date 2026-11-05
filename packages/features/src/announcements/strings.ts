// Text of the announcements feature (banner, home popup, moderator list). Single module so WBS WP 0.4 (i18n) can
// replace it in one change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  banner: {
    region: "Thông báo",
    roleDescription: "dải thông báo luân phiên",
    tag: "Mới",
    next: "Thông báo tiếp theo",
    close: "Đóng thông báo",
    reopen: "Hiện lại thông báo",
  },
  popup: {
    dialog: "Sự kiện",
    dontShowToday: "Không hiện hôm nay",
    close: "Đóng",
    reopen: "Xem lại sự kiện",
    seeYouTomorrow: "Hẹn gặp lại ngày mai",
    position: (index: number, count: number) => `${index} / ${count}`,
    open: "Xem chi tiết",
    until: (date: string) => `Đến ${date}`,
  },
  manage: {
    title: "Thông báo",
    description:
      "Dải thông báo hiện ở đầu mọi trang, popup hiện ở trang chủ. Người đọc chỉ thấy thông báo trong khoảng thời gian từ lúc bắt đầu đến lúc kết thúc.",
    listLabel: "Danh sách thông báo",
    empty: "Chưa có thông báo nào.",
    kinds: { banner: "Dải thông báo", popup: "Popup trang chủ" },
    states: { scheduled: "Đã lên lịch", active: "Đang hiện", ended: "Đã kết thúc" },
    window: (start: string, end: string) => `${start} – ${end}`,
    allLanguages: "Mọi ngôn ngữ",
    languages: { vi: "Tiếng Việt", en: "English" },
    end: "Kết thúc ngay",
    delete: "Xóa",
    deleteTitle: "Xóa thông báo này?",
    deleteDescription: "Thông báo biến mất với mọi người ngay lập tức. Không thể hoàn tác.",
    cancel: "Hủy",
    ended: "Đã kết thúc thông báo.",
    deleted: "Đã xóa thông báo.",
    created: "Đã tạo thông báo.",
    error: { title: "Không tải được thông báo", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
    form: {
      title: "Thông báo mới",
      kind: "Hiện ở",
      headline: "Tiêu đề",
      headlineHint: "Tối đa 80 ký tự. Dải thông báo hiện trên một dòng.",
      body: "Nội dung (không bắt buộc)",
      bodyHint: "Tối đa 280 ký tự.",
      link: "Liên kết (không bắt buộc)",
      linkHint: "Một trang của StoryNest như /ranking, hoặc địa chỉ https://.",
      locale: "Ngôn ngữ",
      startsAt: "Bắt đầu",
      endsAt: "Kết thúc",
      submit: "Tạo thông báo",
      submitting: "Đang tạo…",
      errors: {
        title_required: "Nhập tiêu đề.",
        title_too_long: "Tiêu đề tối đa 80 ký tự.",
        body_too_long: "Nội dung tối đa 280 ký tự.",
        link_too_long: "Liên kết tối đa 500 ký tự.",
        link_invalid: "Dùng đường dẫn bắt đầu bằng / hoặc địa chỉ https://.",
        start_invalid: "Chọn thời điểm bắt đầu.",
        end_invalid: "Chọn thời điểm kết thúc.",
        end_before_start: "Thời điểm kết thúc phải sau thời điểm bắt đầu.",
      },
    },
    failed: {
      forbidden: "Chỉ người kiểm duyệt mới thay đổi được thông báo.",
      invalid: "Thông báo bị từ chối. Kiểm tra thời gian và liên kết.",
      generic: "Không lưu được. Vui lòng thử lại.",
    },
  },
} as const;

export const announcementsText = defineText("announcements", vi, en);

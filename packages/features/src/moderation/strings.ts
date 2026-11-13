// Text of reporting and the moderation console. Single module so WBS WP 0.4 (i18n) can replace it in one change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  report: {
    button: "Báo cáo",
    title: "Báo cáo nội dung",
    description: "Cho chúng tôi biết vì sao nội dung này không phù hợp. Người điều hành sẽ xem xét.",
    reasonLabel: "Lý do",
    detailsLabel: "Chi tiết (không bắt buộc)",
    detailsPlaceholder: "Mô tả ngắn điều bạn thấy…",
    detailsCount: (length: number, max: number) => `${length}/${max} ký tự`,
    /** What helps a moderator for each reason: a hint under the details box and an example inside it. */
    reasonHelp: {
      spam: {
        hint: "Cho biết nội dung quảng cáo hoặc bị lặp lại là gì, nếu chưa rõ.",
        placeholder: "Ví dụ: cùng một đường link được đăng dưới mọi chương",
      },
      harassment: {
        hint: "Cho biết ai bị nhắm đến và bằng cách nào. Trích lại lời lẽ sẽ giúp ích.",
        placeholder: "Ví dụ: bình luận xúc phạm một độc giả khác bằng tên",
      },
      hate: {
        hint: "Cho biết nhóm người nào bị công kích và bằng cách nào.",
        placeholder: "Ví dụ: chương truyện chế giễu người khác vì tôn giáo",
      },
      sexual: {
        hint: "Cho biết nội dung nằm ở đâu: chương, đoạn văn hay hình ảnh.",
        placeholder: "Ví dụ: ảnh bìa có hình ảnh khiêu dâm",
      },
      violence: {
        hint: "Cho biết nội dung nằm ở đâu và có đe dọa người thật không.",
        placeholder: "Ví dụ: lời đe dọa nhắm vào một độc giả khác",
      },
      copyright: {
        hint: "Nêu tác phẩm gốc và nơi tác phẩm được đăng lần đầu.",
        placeholder: "Ví dụ: chép từ tiểu thuyết … đăng tại …",
      },
      other: {
        hint: "Cho biết điều gì không ổn. Càng cụ thể, người điều hành càng xử lý nhanh.",
        placeholder: "Mô tả ngắn điều bạn thấy…",
      },
    },
    submit: "Gửi báo cáo",
    submitting: "Đang gửi…",
    cancel: "Hủy",
    sent: "Đã gửi báo cáo. Cảm ơn bạn.",
    viewMine: "Xem báo cáo của tôi",
    reported: "Đã báo cáo",
    kinds: {
      story: "truyện",
      chapter: "chương",
      comment: "bình luận",
      user: "người dùng",
    },
    reasons: {
      spam: "Spam hoặc quảng cáo",
      harassment: "Quấy rối, xúc phạm",
      hate: "Thù ghét, phân biệt đối xử",
      sexual: "Nội dung khiêu dâm",
      violence: "Bạo lực",
      copyright: "Vi phạm bản quyền",
      other: "Lý do khác",
    },
    errors: {
      forbidden: "Bạn không thể gửi báo cáo lúc này.",
      notFound: "Nội dung này không còn tồn tại hoặc bạn không xem được.",
      conflict: "Không thể báo cáo nội dung này.",
      invalid: "Bạn không thể báo cáo nội dung của chính mình, hoặc thông tin chưa hợp lệ.",
      rateLimited: "Bạn đã gửi quá nhiều báo cáo hôm nay. Hãy thử lại sau.",
      network: "Không có kết nối. Kiểm tra mạng và thử lại.",
      generic: "Đã có lỗi xảy ra. Vui lòng thử lại.",
    },
  },
  mine: {
    title: "Báo cáo của tôi",
    description: "Các báo cáo bạn đã gửi và kết quả. Chúng tôi không nêu tên người xử lý.",
    error: { title: "Không tải được báo cáo", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
    empty: { title: "Bạn chưa gửi báo cáo nào", description: "Báo cáo bạn gửi sẽ hiện ở đây cùng trạng thái xử lý." },
    listLabel: "Danh sách báo cáo của tôi",
    sentAt: (relative: string) => `Gửi ${relative}`,
    status: {
      pending: "Đang chờ xử lý",
      reviewing: "Đang được xem xét",
      resolved: "Đã đóng: đã xử lý",
      dismissed: "Đã đóng: không phát hiện vi phạm",
    },
  },
  console: {
    title: "Kiểm duyệt",
    description: "Hàng đợi báo cáo. Mọi hành động đều được ghi lại cùng lý do.",
    noAccess: { title: "Bạn không có quyền xem trang này", description: "Trang này dành cho người điều hành." },
    signIn: "Đăng nhập để tiếp tục.",
    signInLink: "Đăng nhập",
    tabs: { open: "Đang chờ", closed: "Đã xử lý" },
    empty: { open: "Không có báo cáo nào đang chờ.", closed: "Chưa có báo cáo nào được xử lý." },
    error: { title: "Không tải được hàng đợi", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
    loadMore: "Tải thêm",
    panel: {
      previous: "Báo cáo trước",
      next: "Báo cáo sau",
      close: "Đóng chi tiết",
      position: (n: number, total: number) => `${n}/${total}`,
      reportedAt: (relative: string) => `Báo cáo ${relative}`,
      keys: "J / K: báo cáo sau / trước · Esc: đóng",
    },
    openDetails: "Bấm tiêu đề để mở chi tiết; J / K chuyển báo cáo trong khung chi tiết.",
    loadingMore: "Đang tải…",
    openReports: (count: number) => (count > 1 ? `${count} báo cáo đang chờ về mục này` : "1 báo cáo"),
    reportedBy: (name: string) => `Báo cáo bởi ${name}`,
    openTarget: "Mở nội dung",
    stateLabel: "Trạng thái",
    kinds: { story: "Truyện", chapter: "Chương", comment: "Bình luận", user: "Tài khoản" },
    states: {
      visible: "Đang hiển thị",
      hidden: "Đã ẩn",
      removed: "Đã gỡ",
      deleted: "Đã xóa",
      active: "Đang hoạt động",
      suspended: "Đã khóa",
      deactivated: "Đã vô hiệu hóa",
    },
    statuses: {
      pending: "Chờ xử lý",
      reviewing: "Đang xem xét",
      resolved: "Đã xử lý",
      dismissed: "Đã bác bỏ",
    },
    actions: {
      hide_comment: "Ẩn bình luận",
      restore_comment: "Hiện lại bình luận",
      remove_story: "Gỡ truyện",
      restore_story: "Khôi phục truyện",
      suspend_user: "Khóa tài khoản",
      reinstate_user: "Mở khóa tài khoản",
      review_report: "Đang xem xét",
      resolve_report: "Đánh dấu đã xử lý",
      dismiss_report: "Bác bỏ báo cáo",
    },
    history: {
      show: "Xem lịch sử xử lý",
      hide: "Ẩn lịch sử xử lý",
      title: "Lịch sử xử lý của mục này",
      empty: "Chưa có hành động kiểm duyệt nào về mục này.",
      error: "Không tải được lịch sử.",
      moderator: "Người điều hành",
    },
    // What the action does, said before it is confirmed (and recorded with the reason).
    consequences: {
      hide_comment:
        "Bình luận bị ẩn với mọi độc giả và trích đoạn của nó trong thông báo bị xóa. Các báo cáo về bình luận này được đóng. Có thể hiện lại sau.",
      restore_comment: "Bình luận hiện lại với độc giả. Trích đoạn đã xóa khỏi thông báo cũ không được khôi phục.",
      remove_story:
        "Truyện biến mất với độc giả và khỏi tìm kiếm. Chủ truyện không tự khôi phục được; chỉ người điều hành khôi phục. Các báo cáo về truyện và chương của nó được đóng.",
      restore_story: "Truyện hiện lại với độc giả theo cài đặt hiển thị của chủ truyện.",
      suspend_user:
        "Tài khoản bị chặn các thao tác cần tài khoản đang hoạt động, như bình luận và báo cáo. Các báo cáo về tài khoản này được đóng.",
      reinstate_user: "Tài khoản hoạt động trở lại.",
      review_report: "Báo cáo chuyển sang đang xem xét. Người báo cáo thấy trạng thái này.",
      resolve_report: 'Báo cáo được đóng là đã xử lý. Người báo cáo thấy "Đã đóng: đã xử lý", không thấy tên bạn.',
      dismiss_report:
        'Báo cáo được đóng là không phát hiện vi phạm. Người báo cáo thấy "Đã đóng: không phát hiện vi phạm", không thấy tên bạn.',
    },
    dialog: {
      reasonLabel: "Lý do (bắt buộc, được ghi lại)",
      reasonPlaceholder: "Ví dụ: vi phạm quy định về quấy rối",
      confirm: "Xác nhận",
      confirming: "Đang thực hiện…",
      cancel: "Hủy",
      tooShort: "Lý do cần ít nhất 3 ký tự.",
      tooLong: "Lý do tối đa 1000 ký tự.",
    },
    done: "Đã thực hiện.",
    errors: {
      forbidden: "Bạn không có quyền thực hiện hành động này.",
      notFound: "Mục này không còn tồn tại.",
      conflict: "Trạng thái đã thay đổi hoặc hành động không áp dụng được. Hãy tải lại.",
      invalid: "Không thể thực hiện hành động này với mục đã chọn.",
      network: "Không có kết nối. Kiểm tra mạng và thử lại.",
      generic: "Đã có lỗi xảy ra. Vui lòng thử lại.",
    },
  },
} as const;

export const moderationText = defineText("moderation", vi, en);

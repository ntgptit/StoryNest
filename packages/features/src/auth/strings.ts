// All user-facing text of the auth screens, in one place so WBS WP 0.4 (i18n) can replace it in a single change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  appName: "StoryNest",
  signIn: {
    title: "Đăng nhập",
    description: "Chào mừng bạn quay lại.",
    email: "Email",
    password: "Mật khẩu",
    submit: "Đăng nhập",
    submitting: "Đang đăng nhập…",
    forgot: "Quên mật khẩu?",
    noAccount: "Chưa có tài khoản?",
    toSignUp: "Đăng ký",
  },
  signUp: {
    title: "Tạo tài khoản",
    errorSummary: (count: number) => `${count} mục cần sửa`,
    description: "Đọc, viết và chia sẻ truyện của bạn.",
    email: "Email",
    password: "Mật khẩu",
    passwordHint: "Ít nhất 8 ký tự.",
    username: "Tên người dùng (không bắt buộc)",
    usernameHint: "Chữ, số và dấu gạch dưới, 3-30 ký tự. Để trống để tự tạo.",
    // Live hint while typing. A taken name is not refused: the account gets it with a random ending added.
    usernameAvailability: {
      checking: "Đang kiểm tra tên…",
      available: "Tên này có vẻ còn trống",
      taken: "Tên này đã có người dùng. Hãy chọn tên khác, nếu không tên sẽ được thêm một đuôi ngẫu nhiên.",
    },
    displayName: "Tên hiển thị (không bắt buộc)",
    submit: "Đăng ký",
    submitting: "Đang tạo tài khoản…",
    haveAccount: "Đã có tài khoản?",
    toSignIn: "Đăng nhập",
    checkEmailTitle: "Kiểm tra email của bạn",
    checkEmailBody: "Chúng tôi đã gửi liên kết xác nhận. Mở email và nhấn vào liên kết để hoàn tất đăng ký.",
    checkEmailHint:
      "Không thấy email? Hãy xem thư mục Spam hoặc Quảng cáo. Nếu nhập nhầm địa chỉ, hãy dùng email khác.",
    differentEmail: "Dùng email khác",
  },
  forgot: {
    title: "Quên mật khẩu",
    description: "Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.",
    email: "Email",
    submit: "Gửi liên kết",
    submitting: "Đang gửi…",
    back: "Quay lại đăng nhập",
    sentTitle: "Đã gửi hướng dẫn",
    // Same text whether or not the address has an account: never reveal which emails are registered.
    sentBody: "Nếu email này có tài khoản, bạn sẽ nhận được liên kết đặt lại mật khẩu trong ít phút.",
    spamHint: "Không thấy email? Hãy xem thư mục Spam hoặc Quảng cáo.",
    resend: "Gửi lại email",
    resendIn: (seconds: number) => `Gửi lại sau ${seconds} giây`,
    resent: "Đã gửi lại email.",
    differentEmail: "Dùng email khác",
  },
  reset: {
    title: "Đặt mật khẩu mới",
    description: "Chọn mật khẩu mới cho tài khoản của bạn.",
    password: "Mật khẩu mới",
    confirm: "Nhập lại mật khẩu",
    submit: "Đổi mật khẩu",
    submitting: "Đang lưu…",
    success: "Đã đổi mật khẩu.",
    invalidLinkTitle: "Liên kết không hợp lệ hoặc đã hết hạn",
    invalidLinkBody: "Hãy yêu cầu một liên kết đặt lại mật khẩu mới.",
    requestNew: "Yêu cầu liên kết mới",
  },
  notices: {
    callbackFailed: "Liên kết đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
  },
  // Advisory meter under a new password: information only, the only rule is the minimum length.
  strength: {
    title: "Độ mạnh",
    note: "chỉ để tham khảo",
    levels: { none: "", weak: "Yếu", fair: "Tạm được", good: "Khá", strong: "Mạnh" },
    checks: {
      length: (min: number) => `Ít nhất ${min} ký tự`,
      mixedCase: "Chữ hoa và chữ thường",
      number: "Có chữ số",
      symbol: "Có ký hiệu",
    },
    met: "đã đạt",
    hints: {
      common: "Đây là mật khẩu phổ biến, dễ bị đoán.",
      sequence: "Tránh chuỗi liền như 1234 hay abcd.",
      repeat: "Tránh lặp một ký tự nhiều lần.",
      longer: "Từ 12 ký tự trở lên sẽ mạnh hơn.",
    },
  },
  // Countdown when the server asked to wait a set number of seconds (rate limit).
  lockout: {
    title: "Bạn đã thử quá nhiều lần",
    waiting: (clock: string) => `Thử lại sau ${clock}`,
    ready: "Bạn có thể thử lại ngay bây giờ",
    resetInstead: "Đặt lại mật khẩu thay vì chờ",
  },
  // Suggestion under an email field when the domain looks mistyped (never applied without a press).
  emailTypo: { before: "Có phải ý bạn là", after: "?" },
  showPassword: "Hiện mật khẩu",
  hidePassword: "Ẩn mật khẩu",
  validation: {
    emailInvalid: "Email không hợp lệ.",
    passwordRequired: "Vui lòng nhập mật khẩu.",
    passwordTooShort: "Mật khẩu cần ít nhất 8 ký tự.",
    passwordTooLong: "Mật khẩu quá dài (tối đa 72 byte).",
    usernameInvalid: "Tên người dùng chỉ gồm chữ, số, dấu gạch dưới (3-30 ký tự).",
    displayNameTooLong: "Tên hiển thị tối đa 100 ký tự.",
    confirmMismatch: "Mật khẩu nhập lại không khớp.",
  },
  errors: {
    invalidCredentials: "Email hoặc mật khẩu không đúng.",
    emailNotConfirmed: "Email chưa được xác nhận. Hãy mở liên kết trong email đăng ký.",
    emailTaken: "Email này đã được đăng ký.",
    weakPassword: "Mật khẩu quá yếu hoặc từng bị lộ. Hãy chọn mật khẩu khác.",
    samePassword: "Mật khẩu mới phải khác mật khẩu cũ.",
    rateLimited: "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút.",
    network: "Không có kết nối. Kiểm tra mạng và thử lại.",
    sessionExpired: "Liên kết đã hết hạn. Hãy yêu cầu liên kết mới.",
    generic: "Đã có lỗi xảy ra. Vui lòng thử lại.",
  },
} as const;

export const authText = defineText("auth", vi, en);

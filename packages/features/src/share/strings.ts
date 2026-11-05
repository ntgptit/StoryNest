// Text of sharing (copy link, share dialog). Single module so WBS WP 0.4 (i18n) can replace it in one change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  open: "Chia sẻ",
  title: (name: string) => `Chia sẻ “${name}”`,
  linkLabel: "Liên kết để chia sẻ",
  copy: "Sao chép",
  copied: "Đã sao chép",
  copyFailed: "Không sao chép được. Hãy chọn liên kết và sao chép thủ công.",
  native: "Chia sẻ qua ứng dụng khác",
  nativeFailed: "Không mở được bảng chia sẻ. Hãy sao chép liên kết.",
  story: { description: "Ai có liên kết đều mở được trang truyện này." },
  author: { description: "Gửi trang tác giả này cho bạn bè." },
} as const;

export const shareText = defineText("share", vi, en);

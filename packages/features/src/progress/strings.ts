// Text of the reading-progress UI. Single module so WBS WP 0.4 (i18n) can replace it in one change.
import { defineText } from "../_shared/i18n.ts";

const vi = {
  continueReading: (chapterNumber: number) => `Đọc tiếp · Chương ${chapterNumber}`,
} as const;

export const progressText = defineText("progress", vi);

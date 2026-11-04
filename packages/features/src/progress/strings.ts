// Text of the reading-progress UI. Single module so WBS WP 0.4 (i18n) can replace it in one change.
export const progressText = {
  continueReading: (chapterNumber: number) => `Đọc tiếp · Chương ${chapterNumber}`,
} as const;

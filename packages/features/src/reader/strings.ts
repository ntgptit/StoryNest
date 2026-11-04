// Text of the chapter reader. Single module so WBS WP 0.4 (i18n) can replace it in one change.
export const readerText = {
  backToStory: "Về trang truyện",
  chapterLabel: (number: number) => `Chương ${number}`,
  toc: { open: "Mục lục", title: "Mục lục", description: "Chọn chương để đọc." },
  nav: { label: "Chuyển chương", previous: "Chương trước", next: "Chương sau", none: "Hết" },
  progress: "Tiến độ đọc chương",
  endOfChapter: "Hết chương",
  emptyChapter: "Chương này chưa có nội dung.",
  notFound: { title: "Không tìm thấy chương", description: "Chương không tồn tại, chưa được đăng hoặc đã bị gỡ." },
  error: { title: "Không tải được chương", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
} as const;

// Text of the chapter editor. Single module so WBS WP 0.4 (i18n) can replace it in one change.
export const editorText = {
  title: "Soạn chương",
  backToChapters: "Về danh sách chương",
  chapterTitle: "Tên chương",
  chapterTitlePlaceholder: "Tên chương",
  bodyLabel: "Nội dung chương",
  words: (count: string) => `${count} từ`,
  save: "Lưu nháp",
  saving: "Đang lưu…",
  saved: "Đã lưu bản nháp.",
  unsaved: "Có thay đổi chưa lưu",
  toolbar: {
    label: "Định dạng",
    paragraph: "Đoạn văn",
    heading: "Tiêu đề",
    bold: "In đậm",
    italic: "In nghiêng",
    underline: "Gạch chân",
    strike: "Gạch ngang",
    divider: "Đường phân cách",
    undo: "Hoàn tác",
    redo: "Làm lại",
  },
  notFound: {
    title: "Không tìm thấy chương",
    description: "Chương không tồn tại hoặc bạn không có quyền soạn chương này.",
  },
  cannotOpen: {
    title: "Không mở được bản nháp",
    description: "Nội dung bản nháp có định dạng không đọc được nên chưa mở để tránh ghi đè mất dữ liệu.",
  },
  error: { title: "Không tải được bản nháp", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  validation: {
    titleRequired: "Vui lòng nhập tên chương.",
    titleTooLong: "Tên chương tối đa 200 ký tự.",
    unsupported: "Nội dung có phần không lưu được. Hãy xóa phần đó rồi thử lại.",
  },
  conflict: {
    title: "Bản nháp đã được sửa ở nơi khác",
    description:
      "Ai đó (hoặc bạn ở thiết bị khác) đã lưu bản nháp này sau khi bạn mở. Tải lại để lấy bản mới; thay đổi chưa lưu ở đây sẽ mất.",
    reload: "Tải lại bản mới",
  },
  errors: {
    forbidden: "Bạn không có quyền sửa chương này.",
    network: "Không có kết nối. Kiểm tra mạng và thử lại.",
    generic: "Đã có lỗi xảy ra. Vui lòng thử lại.",
  },
} as const;

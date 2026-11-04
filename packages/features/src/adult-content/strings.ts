// Text of the adult-content filter. Single module so WBS WP 0.4 (i18n) can replace it in one change.
export const adultContentText = {
  button: "Nội dung người lớn (18+)",
  dialog: {
    title: "Nội dung dành cho người lớn",
    hiddenDescription: "Truyện 18+ đang được ẩn khỏi mọi danh sách. Chỉ bật nếu bạn từ 18 tuổi trở lên.",
    shownDescription: "Truyện 18+ đang được hiển thị trong các danh sách.",
    deviceNote:
      "Lựa chọn này được lưu trên thiết bị này; khi đăng nhập, nó được lưu cả vào tài khoản để dùng trên mọi thiết bị.",
    enable: "Tôi từ 18 tuổi trở lên, hiện truyện 18+",
    keepHidden: "Giữ ẩn",
    disable: "Ẩn lại truyện 18+",
    close: "Đóng",
  },
  gate: {
    title: "Truyện dành cho người lớn",
    description: "Tác giả đã đánh dấu truyện này là 18+. Hãy xác nhận bạn từ 18 tuổi trở lên để xem.",
    confirm: "Tôi từ 18 tuổi trở lên, tiếp tục",
    back: "Quay lại",
  },
} as const;

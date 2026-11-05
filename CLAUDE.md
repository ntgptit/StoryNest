# StoryNest: hướng dẫn cho agent

Nguồn sự thật, đọc trước khi sửa code:

- Kiến trúc, ranh giới package, quyết định đã chốt: `docs/WBS.md` (mục 1 và 4).
- Lệnh, quy ước và gate trước khi merge: `README.md` (mục "Công cụ phát triển"). Chỉ merge khi `pnpm gate` xanh.
- **Quy tắc performance (bắt buộc cho mọi thay đổi): `docs/PERFORMANCE.md`.** Hiện trạng và kế hoạch sửa: `docs/perf-audit-2026-11-04.md`.
- Next.js 16 có thay đổi so với kiến thức cũ: tra `apps/web/node_modules/next/dist/docs/` trước khi kết luận về hành vi của Next (xem `apps/web/AGENTS.md`).

Tóm tắt các quy tắc performance hay bị vi phạm (chi tiết và lý do ở `docs/PERFORMANCE.md`):

- Đo trên production build (`build` + `start`), không kết luận từ `next dev`. Thay đổi vì performance phải có số before/after, nguyên nhân gốc và test chống regression.
- Request độc lập chạy song song. Không thêm request tuần tự vào đường đi nóng.
- Query: cột cụ thể, có giới hạn hoặc cursor, có index hỗ trợ (kèm EXPLAIN cho đường đi nóng).
- Dữ liệu công khai đọc bằng client ẩn danh để cache được. Dữ liệu cá nhân không bao giờ cache ở server.
- Mutation invalidate đúng key, không invalidate cả feature.
- Đổi filter hay tab của cùng màn hình dùng `AppLink shallow`.
- Code chạy trên mọi trang không kéo editor hay zod vào bundle. Không tăng JS first-load của route quá 5% mà không có lý do.

## Thay đổi

<!-- Làm gì, vì sao. -->

## Kiểm chứng

- [ ] `pnpm gate` xanh

## Performance ([docs/PERFORMANCE.md](../docs/PERFORMANCE.md), mục 14)

<!-- Mục không áp dụng ghi N/A. -->

<!-- PR nhằm cải thiện performance: bắt buộc đủ 6 mục dưới đây, thiếu là chưa đạt. -->
<!-- Nguyên nhân gốc: -->
<!-- Baseline (production build, route, cách đo): -->
<!-- Thay đổi: -->
<!-- Cải thiện đo được (cùng cách đo): -->
<!-- Test (chức năng + chống regression): -->
<!-- Rollback: -->

- [ ] Không thêm request tuần tự vào đường đi nóng; request độc lập chạy song song
- [ ] Query mới: cột cụ thể, có giới hạn/cursor, có index hỗ trợ (EXPLAIN nếu là đường đi nóng)
- [ ] Mutation mới: invalidate đúng key; dữ liệu cá nhân không cache ở server
- [ ] Không `"use client"` mới ở route file, không Dynamic API mới ở layout
- [ ] JS first-load của route không tăng quá 5% (số từ `apps/web/.next/diagnostics/route-bundle-stats.json` nếu đổi code client)
- [ ] Đổi filter/tab trên cùng màn hình dùng shallow link; click có phản hồi ≤ 100 ms
- [ ] Ảnh có kích thước; ảnh trong màn hình đầu không lazy
- [ ] Đụng auth/cache/hydration: test chức năng xanh trước khi đo tốc độ
- [ ] Không `unstable_cache` mới, không `experimental.staleTimes`

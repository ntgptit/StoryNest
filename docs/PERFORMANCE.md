# Quy tắc performance (bắt buộc)

Bộ quy tắc này áp dụng cho mọi thay đổi trong StoryNest (Next.js 16 App Router + React 19 + TypeScript + Supabase). Nó là **performance quality gate** cho mỗi PR và mỗi đợt release, bên cạnh `pnpm gate`. Kết quả audit lần đầu và hiện trạng: [`perf-audit-2026-11-04.md`](perf-audit-2026-11-04.md).

## 0. Cách áp dụng

1. **Đo trước, tối ưu sau.** Chỉ tối ưu khi đã xác định bottleneck bằng số liệu.
   - **Điều kiện chấp nhận (pass/fail) của mỗi PR performance:** mô tả PR phải có đủ 6 mục. Thiếu mục nào là chưa đạt:
     1. nguyên nhân gốc;
     2. baseline (số đo trước);
     3. thay đổi;
     4. cải thiện đo được (cùng cách đo, cùng route);
     5. test (chức năng và chống regression);
     6. cách rollback.
   - **Thay đổi đụng tới authentication, cache hoặc hydration:** test chức năng phải có và xanh trước khi đánh giá tốc độ.
   - **Mỗi PR chỉ sửa một nhóm nguyên nhân.** Không gộp các sửa không liên quan.
2. **Không kết luận từ `next dev`.** Dev mode compile theo yêu cầu và có runtime khác. Mọi số liệu dùng `pnpm --filter @storynest/web build && pnpm --filter @storynest/web start` (xem mục 12).
3. **Mỗi PR** tự kiểm theo checklist ở mục 14 (cũng có trong `.github/pull_request_template.md`). Mục nào không áp dụng thì ghi "N/A"; mục nào có rủi ro thì ghi số đo.
4. **Mức ưu tiên.** P0 (critical): chậm nghiêm trọng, quá tải hoặc lỗi production, sửa trước khi merge tính năng mới trên cùng đường đi. P1 (high): ảnh hưởng trực tiếp tốc độ và khả năng mở rộng, xếp vào sprint gần nhất. P2 (medium): làm khi P0/P1 đã xử lý.
5. **Thứ tự xử lý khi audit:** P0 backend và database → P1 rendering/hydration → P1 bundle và tải trang → P2 trải nghiệm phát triển.

---

## 1. Rendering & Server Components (P0–P1)

Kiểm:

- [ ] Không có `"use client"` ở `page.tsx`/`layout.tsx` hay component cấp cao không cần thiết.
- [ ] Không chuyển Server Component thành Client Component khi không cần state, event handler hay browser API.
- [ ] Trang có thể static/cache thì không SSR mỗi request.
- [ ] `cookies()`, `headers()` và các Dynamic API chỉ gọi ở phạm vi cần thiết.
- [ ] Server Component không làm tác vụ nặng trong lúc render.
- [ ] Có `Suspense`/streaming để cả trang không phải chờ một API chậm.
- [ ] Không truyền dữ liệu lớn từ server xuống client (kể cả dehydrated state).
- [ ] Hydration không chậm vì cây component lớn hay nhiều logic phía client.
- [ ] Root layout không lấy dữ liệu.

Quy tắc của dự án:

- **Screen trong `packages/features` là client component** theo quyết định Q1 (dùng chung web và mobile). Bù lại, route file trong `apps/web/src/app` luôn là Server Component mỏng: đọc params, prefetch, render Screen. Không thêm `"use client"` vào route file.
- **Root layout và `(main)/layout.tsx` không gọi `cookies()`/`headers()` và không fetch.** Chỉ page cần người dùng mới gọi `createSupabaseServerClient()` hoặc `requireUser()`.
- **Dữ liệu công khai** (truyện, chương, danh mục, tag, xếp hạng, sitemap, OG) đọc bằng client ẩn danh (không cookie). Chỉ dùng client gắn cookie khi kết quả phụ thuộc người xem. Lý do: client gắn cookie làm route dynamic và không cache được.
- **Trang cá nhân tải dữ liệu ban đầu trên server** (quyết định Q8). Dùng client gắn cookie (`requireUser` + RLS) và QueryClient theo request, rồi `HydrationBoundary`. Không bao giờ dùng cache dùng chung cho dữ liệu này.
- **Mỗi route group có loading boundary** (`loading.tsx`) để click có phản hồi ngay và Next prefetch được layout + skeleton. Route nặng có thể thêm boundary riêng gần nội dung hơn.
- **Server prefetch chỉ chờ phần quyết định HTTP status** (404, redirect, metadata). Phần còn lại prefetch song song hoặc để client lấy.
- **Không thay DOM của SSR sau hydration** (ví dụ đổi `key` ở provider cấp cao để áp dụng cài đặt). Giá trị ảnh hưởng nội dung phải có trên server. Ngôn ngữ của trang public lấy từ URL (`/vi/...`, `/en/...`, quyết định Q9); cookie hoặc profile chỉ là preference.

## 2. Data fetching & API (P0)

Kiểm:

- [ ] Các request độc lập chạy song song (`Promise.all`), cả trên server lẫn bên trong hàm `api/`.
- [ ] Không nhiều component gọi lặp lại cùng dữ liệu mà không dedupe (cùng query key, hoặc React `cache()` trên server).
- [ ] Server Component không gọi Route Handler nội bộ qua HTTP.
- [ ] Không fetch lại toàn bộ khi chỉ một phần nhỏ thay đổi.
- [ ] Payload không lớn hơn nhu cầu hiển thị.
- [ ] Mọi danh sách có giới hạn: `limit` hoặc cursor.
- [ ] Có timeout cho dependency ngoài.
- [ ] Không dùng Server Action để đọc dữ liệu.
- [ ] Không có waterfall phía client sau khi trang render (query B chờ query A khi không thật sự phụ thuộc).
- [ ] Có theo dõi latency của dependency ngoài (mục 10).

Quy tắc của dự án:

- **Query key và query function đặt ở `keys.ts` và `queries.ts` của feature**, dùng chung cho server prefetch và hook. Không tự viết key ở nơi khác.
- **`select()` liệt kê cột cụ thể**, không dùng `*`. Danh sách (card) không lấy cột lớn như synopsis đầy đủ, block nội dung hay body bản nháp.
- **Danh sách tăng trưởng dùng keyset/cursor** `(ts, id)` với một dòng dư để biết còn trang. Cursor phải có điều kiện dùng được index (`lte(ts)` trước `or(...)`). Offset chỉ dùng cho tập nhỏ, có trần.
- **Mọi Supabase client có timeout** (custom `fetch` với `AbortSignal.timeout`), ở cả server, browser, proxy và client ẩn danh.
- **Không thêm vòng gọi tuần tự vào đường đi nóng** (trang chủ, trang truyện, trình đọc, header). Nếu buộc phải tuần tự, ghi lý do bằng comment.

## 3. Caching & revalidation (P0)

Kiểm:

- [ ] Có chiến lược cache rõ cho từng loại dữ liệu (bảng dưới).
- [ ] Không truy vấn lại DB mỗi request cho dữ liệu ít thay đổi.
- [ ] Dữ liệu cá nhân không bị cache sai phạm vi.
- [ ] Invalidation chạy sau create/update/delete.
- [ ] Dữ liệu thay đổi thì UI không giữ cache cũ.
- [ ] TTL hợp với tần suất cập nhật.
- [ ] Phân biệt rõ cache server, CDN và client router.
- [ ] Có kiểm cache hit/miss và chi phí revalidation.
- [ ] Không giả định cache bộ nhớ được chia sẻ giữa các serverless instance.

Hiện trạng cấu hình: **chưa bật Cache Components**, nên `fetch` mặc định không cache và route dùng `cookies()` là dynamic.

Quyết định Q10:

- Cache phía server cho dữ liệu public dùng **Cache Components + `"use cache"`** (`cacheLife`, `cacheTag`, `revalidateTag`/`updateTag`).
- **Không thêm `unstable_cache` mới.**
- Cache Components được bật trong một PR riêng, có đánh giá tương thích và rollout từng phần. Không bật kèm trong PR khác.
- **Không dùng `experimental.staleTimes`.** Tài liệu Next ghi đây là tính năng experimental, không khuyến nghị cho production. Đừng nhầm với `staleTime` của TanStack Query, là cấu hình phía client và được phép.

Tra tài liệu trong `apps/web/node_modules/next/dist/docs/`, không dựa vào trí nhớ.

Chiến lược mặc định theo loại dữ liệu (thay đổi phải ghi lý do trong PR):

| Dữ liệu | Server (`"use cache"` + `cacheLife`, sau khi bật Cache Components) | Client (TanStack `staleTime`) | Invalidate khi (`cacheTag`/query key) |
| --- | --- | --- | --- |
| Danh mục | 10 phút | 10 phút | migration/seed |
| Tag phổ biến, xếp hạng | 5 phút (khớp cron refresh) | 5 phút | cron refresh |
| Trang đầu feed công khai | ~60 giây theo bộ lọc | 30 giây | đăng/sửa truyện (tag) |
| Chi tiết truyện, danh sách chương | ~60 giây, tag `story:{id}` | 5 phút | sửa truyện/chương, publish |
| Nội dung chương đã publish | tag `chapter:{id}` | `Infinity` | publish/rename/delete |
| Dữ liệu cá nhân (tiến độ, thư viện, studio, thông báo, cài đặt) | **không bao giờ** | mặc định 30 giây | mutation tương ứng |
| Sitemap, robots, OG | `revalidate` 3600 / 1 ngày | không áp dụng | không cần |

Quy tắc của dự án:

- **Không cache dữ liệu cá nhân ở server** (không `"use cache"`, không CDN). Query key của dữ liệu cá nhân phải chứa user id. Khi đăng xuất hoặc đổi user, cache phía client của người trước phải bị xóa trước khi màn hình của người sau render. Đây là yêu cầu **cô lập dữ liệu (P0)**, không chỉ là tối ưu.
- **Mutation chỉ invalidate đúng key bị ảnh hưởng.** Không dùng `["feature"]` cho cả feature nếu biết key cụ thể. Không viết key bằng chuỗi literal. Cập nhật lạc quan đã chính xác thì không refetch toàn bộ.
- **Không đặt `dynamic = "force-dynamic"`** cho route có `revalidate` (force-dynamic vô hiệu hóa revalidate).
- **Không dựa vào biến module làm cache dùng chung.** Mỗi serverless instance có bộ nhớ riêng; ngoại lệ hợp lệ duy nhất hiện có là JWKS của `auth-js` (TTL 10 phút).

## 4. React rendering & state (P0–P1)

Kiểm:

- [ ] Không re-render thừa khi state đổi.
- [ ] Context Provider không giữ quá nhiều state.
- [ ] Selector (Zustand/Redux/`select` của TanStack) không trả object mới mỗi lần.
- [ ] `useEffect` không tạo vòng lặp state hay gọi API liên tục.
- [ ] Effect, subscription, listener, timer đều được cleanup.
- [ ] Không filter/sort/map nặng trong mỗi lần render.
- [ ] Search, scroll, resize có debounce/throttle.
- [ ] Danh sách hàng nghìn item có virtualization.
- [ ] Key ổn định (id/slug, không index cho danh sách thay đổi thứ tự).
- [ ] Không lạm dụng `useMemo`/`useCallback` khi chưa đo.

Quy tắc của dự án:

- **Tùy chọn truyền cho thư viện bên ngoài** (Tiptap `useEditor`, observer…) là hằng số module hoặc được tạo một lần. Không tạo object/array mới mỗi render.
- **Việc tốn O(kích thước tài liệu)** (serialize, đếm từ, diff) không chạy mỗi phím gõ. Gộp vào timer/debounce đã có.
- **Scroll handler không đọc layout của mọi phần tử mỗi frame.** Dùng IntersectionObserver hoặc đo theo nhịp ghi.
- **`Intl.*Format` được cache theo locale**, không tạo mới trong vòng lặp render.
- **Danh sách không có trần** (chương, bình luận, thông báo, lịch sử) phải phân trang. Dùng virtualization khi một trang thực tế vượt ~200 item.

## 5. JavaScript bundle & dependencies (P1)

Kiểm:

- [ ] Client bundle không chứa thư viện chỉ cần ở server.
- [ ] Không import cả package lớn chỉ để dùng vài utility.
- [ ] Thư viện nặng (editor, chart, markdown, PDF) không tải ngay khi mở trang.
- [ ] Chức năng nặng, ít dùng được dynamic import.
- [ ] Không có dependency trùng chức năng.
- [ ] Barrel export không kéo module thừa.
- [ ] Third-party script không chạy quá sớm.
- [ ] Kiểm bundle size sau khi thêm dependency.

Quy tắc của dự án:

- **Package trong `packages/*` khai báo `"sideEffects"`** (chỉ file CSS là side effect). Module không có side effect ở top-level, ngoại trừ đăng ký catalog bằng `defineText` (chỉ phục vụ test). Lý do: nếu thiếu khai báo, barrel `@storynest/features` kéo mọi feature (kể cả Tiptap) vào mọi route (đo được +38% JS, xem audit).
- **Code chạy trên mọi trang** (providers, shell, `_shared`, `errors.ts`) không import `zod` hay schema của `@storynest/validation`. Hằng số enum và mã lỗi RPC nằm trong module không phụ thuộc zod.
- **Editor (Tiptap/ProseMirror) chỉ có trên route studio/editor.** Không import `editor/` từ feature khác ngoài qua `index.ts`, và không import từ code chạy trên mọi trang.
- **Ngân sách JS first-load (gzip, đo theo mục 12):** không PR nào làm tăng quá **5%** ở bất kỳ route nào mà không có lý do trong PR. Mục tiêu: route thường ≤ 350 KB sau P0, hướng tới ≤ 250 KB; route editor ≤ 450 KB.
- **Thêm dependency** thì PR ghi kích thước gzip và route bị ảnh hưởng.

## 6. Database & backend (P0)

Kiểm:

- [ ] Không có N+1.
- [ ] Có index cho cột WHERE/JOIN/ORDER BY thường dùng, kể cả predicate của partial index phải khớp query.
- [ ] Query không lấy mọi cột khi UI chỉ dùng vài cột.
- [ ] Count/aggregate/search trên bảng lớn không chạy quá thường xuyên.
- [ ] Không dùng offset pagination trên bảng lớn.
- [ ] Đã chạy `EXPLAIN ANALYZE` cho query nóng.
- [ ] Connection pool phù hợp.
- [ ] Database và app server cùng region.
- [ ] Có đo query latency, lock contention, connection saturation.
- [ ] Realtime/polling không tạo quá nhiều request hay event.

Quy tắc của dự án:

- **Mỗi query hoặc RPC mới trên đường đi nóng phải kèm index hỗ trợ** (hoặc giải thích vì sao không cần), và kèm `EXPLAIN (ANALYZE, BUFFERS)` trên dữ liệu có quy mô thực tế. Dữ liệu dev hiện chỉ có vài chục dòng, không đủ để kết luận.
- **Count chính xác (`count: "exact"`) chỉ dùng khi thật sự cần con số.** Badge dùng count có trần; số liệu hiển thị dùng counter do trigger duy trì cộng job reconcile.
- **RPC đọc nhiều dòng tránh gọi hàm RLS trên từng dòng.** Ưu tiên RPC `SECURITY DEFINER` kiểm quyền một lần cho cả tập; trong policy, đặt điều kiện rẻ trước.
- **Aggregate nặng** (tag phổ biến, xếp hạng, gợi ý) tính trước bằng cron hoặc materialized view, không tính theo từng lượt xem.
- **Không làm index vô dụng cho HOT update** trên bảng ghi nhiều (progress, stats, read events). Mỗi index trên cột hay cập nhật phải có query dùng nó.
- **App chỉ dùng supabase-js Data API** (không driver PostgreSQL trực tiếp, nên không cần pool riêng). Nếu sau này thêm kết nối trực tiếp từ serverless thì bắt buộc dùng Supavisor transaction pooling.
- **Region:** Supabase ở `ap-southeast-1` (Singapore). Function của web phải chạy cùng region (Vercel `sin1` hoặc tương đương) khi deploy.
- **Migration thêm index trên bảng đã có dữ liệu** dùng `CREATE INDEX CONCURRENTLY` (migration riêng, không trong transaction).

## 7. Images, fonts, CSS & UI (P1)

Kiểm:

- [ ] Ảnh đã nén và đúng kích thước hiển thị.
- [ ] Có cơ chế tối ưu ảnh phù hợp.
- [ ] Ảnh dưới màn hình đầu tiên được lazy load.
- [ ] Ảnh hero/LCP không bị tải trễ.
- [ ] Ảnh có kích thước hoặc aspect ratio (tránh layout shift).
- [ ] Font không tải weight/subset thừa.
- [ ] CSS và animation không gây layout thrashing hay repaint nhiều.
- [ ] Animation không giật trên mobile.
- [ ] Đã kiểm trên thiết bị Android/iOS tầm trung (hoặc giả lập CPU 4x).

Quy tắc của dự án:

- **Screen dùng chung không dùng `next/image`** (Q1). Ảnh dùng `<img>` với kích thước hoặc container `aspect-*`, `decoding="async"`. Ảnh trong màn hình đầu (2–4 card đầu, bìa trang truyện) phải `loading="eager"` và `fetchPriority="high"`; còn lại `loading="lazy"`.
- **Ảnh upload đã được resize khi tải lên** (avatar 256px, bìa 600px webp). Ảnh block trong chương lưu width/height để render đúng kích thước.
- **Font dùng system stack** (`tokens.css`). Thêm webfont phải qua quyết định và dùng `next/font`.
- **Không đặt `backdrop-blur` trên phần tử sticky hoặc fixed** khi nền đã gần đục. Thanh tiến độ animate bằng `transform`, không bằng `width`.

## 8. Routing & navigation (P1)

Kiểm:

- [ ] Chuyển trang nội bộ không dùng full page navigation.
- [ ] Không prefetch quá nhiều route.
- [ ] Loading UI đặt đúng route segment.
- [ ] Layout hay dữ liệu cấp cao không bị xử lý lại khi chuyển trang.
- [ ] Query param và filter không gây request thừa.
- [ ] Parallel routes hay nested layout không quá phức tạp.
- [ ] Router cache và server cache được đồng bộ sau mutation.

Quy tắc của dự án:

- **Link nội bộ luôn qua `AppLink`/`useNavigation`.** Không dùng `<a href>` hay `window.location` cho route nội bộ.
- **Đổi bộ lọc, tab hay sắp xếp của cùng một màn hình** (filter trang chủ, tab ranking/search…) dùng `AppLink shallow` (web: `history.pushState`, không render server, không prefetch, không cuộn lên đầu). Màn hình đọc giá trị từ URL qua `useSearchParams` ở view của `apps/web`. URL vẫn chia sẻ được; lần vào đầu vẫn SSR.
- **Khi đổi bộ lọc,** danh sách giữ dữ liệu cũ (mờ, `aria-busy`) bằng `placeholderData: keepPreviousData` thay vì quay về skeleton.
- **Mục tiêu phản hồi:** click → có thay đổi trên màn hình ≤ 100 ms (loading UI, trạng thái active, optimistic update); nội dung mới ≤ 1 s ở p75 production.
- **Danh sách link dài** (card, mục lục chương) cân nhắc prefetch theo hover/intent thay vì theo viewport.

## 9. Development & build (P1–P2)

Kiểm:

- [ ] `next dev` compile lần đầu không quá chậm.
- [ ] HMR không mất nhiều giây sau mỗi lần sửa.
- [ ] TypeScript checking không kéo dài bất thường.
- [ ] `next build` không dùng quá nhiều RAM (không OOM).
- [ ] Không import icon library hay barrel file khổng lồ.
- [ ] Tailwind không quét thư mục không cần thiết.
- [ ] Không có custom Webpack plugin/loader làm chậm compile.
- [ ] Không dùng Docker bind mount trên Windows/macOS cho thư mục dự án.
- [ ] Antivirus không quét liên tục file dự án và build output.
- [ ] CI không chạy lặp `install`/`lint`/`typecheck`/`test`/`build`.
- [ ] CI có dependency cache và build cache.
- [ ] Phân biệt rõ vấn đề chỉ có ở dev với vấn đề có ở production.

Quy tắc của dự án:

- **Tailwind `@source` chỉ trỏ vào `packages/ui/src` và `packages/features/src`.** Không mở rộng sang thư mục khác.
- **Theo dõi thời gian build và RAM** (baseline trong audit). Tăng hơn 20% giữa hai PR là phải tìm nguyên nhân.
- **Gate chạy kiểm tra rẻ trước**, và không type-check hai lần nếu `typecheck` đã chạy (xem kế hoạch trong audit).

## 10. Production, infrastructure & scalability (P0–P1)

Kiểm:

- [ ] Có đo TTFB.
- [ ] Cold start của serverless không làm response đầu quá chậm.
- [ ] Region deploy phù hợp với người dùng và database.
- [ ] Static asset có CDN và cache header.
- [ ] Endpoint dễ bị spam có rate limit.
- [ ] Có giám sát CPU, memory, throughput, error rate.
- [ ] Có tracing để biết request chậm ở Next.js, backend hay database.
- [ ] Có kiểm tải đồng thời.
- [ ] Có performance regression test trước khi deploy.
- [ ] Có số liệu thực tế từ người dùng production (RUM).

Quy tắc của dự án:

- **Trước khi có production phải có:**
  - `instrumentation.ts` (tracing server).
  - Báo cáo Web Vitals (Speed Insights hoặc `useReportWebVitals`, đặt ở `apps/web`, không trong screen dùng chung).
  - `onError` của QueryClient gửi lỗi về hệ thống giám sát (WBS 8.2).
- **Mọi RPC ghi do người dùng kích hoạt và có thể bị spam** (vote, follow, like, invite, report, comment, upload) đi qua `enforce_rate_limit`. Tìm kiếm ẩn danh cần giới hạn ở tầng edge hoặc ở RPC.

## 11. Chỉ số và ngưỡng

Core Web Vitals (Google, percentile 75, đo riêng mobile và desktop):

| Chỉ số | Ngưỡng | Đo khía cạnh |
| --- | --- | --- |
| LCP | ≤ 2.5 s | Loading |
| INP | ≤ 200 ms | Interaction |
| CLS | ≤ 0.1 | Layout stability |

Chỉ số nội bộ:

| Chỉ số | Mục tiêu |
| --- | --- |
| API latency p95 | ≤ 500 ms |
| Database query p95 (query đơn giản) | ≤ 100 ms |
| Long task trên main thread | hạn chế task > 50 ms; tổng long task khi tải trang (mobile, CPU 4x) ≤ 300 ms |
| Navigation latency | phản hồi ≤ 100 ms; nội dung ≤ 1 s p75 theo route |
| Client JS first-load | theo budget ở mục 5, theo route |
| Build | `next build` không tăng > 20% giữa các PR |

Các mục tiêu nội bộ là gợi ý; điều chỉnh khi có số liệu production.

## 12. Cách đo (lệnh của dự án)

- **Build production cục bộ:** `pnpm --filter @storynest/web build`, rồi `pnpm --filter @storynest/web start`.
- **JS first-load theo route (raw):** sau build, đọc `apps/web/.next/diagnostics/route-bundle-stats.json` (trường `firstLoadUncompressedJsBytes`). Đây là con số so sánh trong PR.
- **Thành phần bundle:** `pnpm --filter @storynest/web exec next experimental-analyze` (giao diện), hoặc thêm `-o` để ghi ra đĩa, rồi `next experimental-analyze export --route /login` để xuất JSON Lines theo module.
- **Navigation, Web Vitals, long task:** dùng Playwright có sẵn trong môi trường. Giả lập mobile bằng viewport 390×844 và CDP `Emulation.setCPUThrottlingRate` 4. Giả lập độ trễ Supabase bằng một mock HTTP có delay để thấy waterfall. Đo hai thời điểm: click → thay đổi đầu tiên trên màn hình, và click → nội dung mới.
- **Database:**
  - `get_advisors` (performance) của Supabase.
  - `extensions.pg_stat_statements` (mean/max/calls).
  - `EXPLAIN (ANALYZE, BUFFERS)` chạy trong `BEGIN; SET LOCAL ROLE anon|authenticated; …; ROLLBACK;` để tính cả RLS.
- **Công cụ trình duyệt:** Chrome DevTools Performance/Network, React DevTools Profiler, Lighthouse.

## 13. Những điều đã biết về môi trường (đừng đo lại sai)

- **JWT của project dev ký ES256.** `getClaims()` kiểm tra cục bộ bằng JWKS cache 10 phút, không gọi mạng mỗi request. Một môi trường dùng secret HS256 (ví dụ Supabase CLI local khi chưa cấu hình signing keys, hoặc mock) thì mỗi `getClaims()` là một request tới Auth. Số đo về auth trong môi trường đó bi quan hơn thực tế; kiểm tra `alg` trong header access token trước khi kết luận.
- **Dữ liệu dev rất nhỏ** (khoảng 9 truyện), nên seq scan và advisor "unused index" trên dev chưa có ý nghĩa.
- **Dừng server cũ trước khi `next start` bản build mới.** Nếu không, chunk trả 500, trang không hydrate và mọi click thành full reload (số đo sai hoàn toàn).

## 14. Checklist cho mỗi PR

- [ ] Không thêm request tuần tự vào đường đi nóng. Request độc lập chạy song song.
- [ ] Query mới: cột cụ thể, có giới hạn hoặc cursor, có index hỗ trợ (kèm EXPLAIN nếu là đường đi nóng).
- [ ] Mutation mới: invalidate đúng key, không quá rộng. Dữ liệu cá nhân không cache ở server.
- [ ] Không có `"use client"` mới ở route file. Không có Dynamic API mới ở layout.
- [ ] Không có dependency hoặc import mới làm tăng JS first-load của route quá 5% (ghi số từ `route-bundle-stats.json` nếu có thay đổi ở client).
- [ ] Đổi filter hay tab trên cùng màn hình dùng shallow link. Click có phản hồi ≤ 100 ms.
- [ ] Ảnh có kích thước. Ảnh trong màn hình đầu không lazy.
- [ ] Nếu PR nhằm cải thiện performance: mô tả có đủ 6 mục (nguyên nhân gốc, baseline, thay đổi, cải thiện đo được, test, rollback).
- [ ] Nếu đụng authentication, cache hoặc hydration: test chức năng xanh trước khi đo tốc độ.
- [ ] Không dùng `unstable_cache` mới, không dùng `experimental.staleTimes`.

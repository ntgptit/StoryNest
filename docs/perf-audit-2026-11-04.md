# Audit performance toàn dự án (2026-11-04)

Đối chiếu theo checklist trong [`PERFORMANCE.md`](PERFORMANCE.md). Phạm vi: `apps/web`, `packages/*`, `supabase/migrations`, cấu hình build và CI. Trạng thái code: `main` sau #50, cộng nhánh `claude/intelligent-bardeen-cfr2j0` (filter trang chủ dạng shallow, chưa merge).

**Cách làm**

- Đo trên production build cục bộ: Playwright, mobile 390×844 với CPU 4x, mock Supabase 100–300 ms mỗi request.
- Dùng `next experimental-analyze` và `route-bundle-stats.json` cho bundle.
- Database dev, chỉ đọc: Supabase advisors, `pg_stat_statements`, `cron.job`.
- Đọc toàn bộ code và 30 migration.

**Cách đọc nhãn**

- **Đã đo:** có số liệu.
- **Đã xác minh:** đọc code hoặc SQL thấy rõ.
- **Giả thuyết:** cần đo trên dữ liệu thật; có ghi cách đo.

## 1. Tóm tắt

Có ba nút thắt lớn nhất, đều đã có số liệu hoặc đã xác minh:

1. **Mọi route tải cùng một bundle khoảng 565 KB gzip (1,9 MB raw).**
   - `/login` cũng tải cả Tiptap/ProseMirror, studio, moderation, lists, comments…
   - Nguyên nhân gốc: các package không khai báo `sideEffects`, nên barrel `@storynest/features` kéo mọi feature vào mọi trang.
   - Đã thử khai báo: còn 338–361 KB (**−38%**), 1140 test vẫn xanh.
   - Trên mobile CPU 4x, long task khi tải mỗi trang là 540–770 ms.
2. **Database: nhiều đường đi nóng không có index phù hợp hoặc tính aggregate theo từng lượt xem.**
   - Danh sách và đếm bình luận khi mở chương.
   - `similar_stories` trên trang truyện.
   - `popular_tags` trên trang chủ.
   - Feed trang chủ.
   - Thông báo.
   - Job cron mỗi phút.

   Dữ liệu dev quá nhỏ nên chưa thấy chậm; với vài nghìn truyện và vài trăm nghìn lượt đọc, các query này thành seq scan hoặc hash join toàn bảng.
3. **Không có cache cross-request nào.**
   - Mọi trang công khai (truyện, chương, OG, sitemap, robots) dùng client gắn cookie, nên route luôn dynamic và trả `private, no-store`. Mỗi lượt xem, kể cả bot, truy vấn lại DB.
   - Sitemap đặt `revalidate = 3600` nhưng `force-dynamic` vô hiệu hóa nó.

Những việc đã sửa trước audit này:

- `loading.tsx` cho `(main)`.
- Prefetch trang chủ và trang chương chạy song song (#49).
- Filter trang chủ dạng shallow (nhánh hiện tại).

## 2. Baseline đo được

Production build, `next start`, mock Supabase.

| Route | JS gz (KB) trước | JS gz sau `sideEffects` (thử) | LCP mobile 4x (ms) | Long task mobile 4x (số/tổng ms) |
| --- | --- | --- | --- | --- |
| `/` | 566 | 344 | 668 | 4 / 758 |
| `/ranking` | 565 | 344 | 1380 | 3 / 634 |
| `/search?q=a` | 565 | 343 | 156 | 3 / 660 |
| `/login` | 567 | 359 | 128 | 2 / 539 |
| `/story/…` | 565 | 361 | 1376 | 3 / 631 |
| `/library` | 565 | 358 | 1576 | 3 / 680 |
| `/studio` | 565 | 352 | 748 | 5 / 770 |
| `/notifications` | 564 | 339 | 1676 | 4 / 730 |

Ghi chú:

- Cột LCP và long task là số trước khi sửa.
- LCP phụ thuộc độ trễ mock (100 ms/request); chỉ dùng để so sánh tương đối.
- CLS mọi route ≤ 0.04.

Các số đo khác:

- **Thành phần JS của `/login`** (trước khi sửa, gzip):
  - `next`/React: 212 KB
  - zod: 39 KB
  - prosemirror-view: 30 KB
  - @tiptap/core: 27 KB
  - auth-js: 25 KB
  - code `studio`: 24 KB
  - prosemirror-model: 14 KB
  - react-hook-form: 13 KB
  - realtime-js: 11 KB
  - …
- **Build:** 23,6 s wall, RAM đỉnh khoảng 1,6 GB (tổng các tiến trình node). Trong đó compile 11,3 s và TypeScript 9,3 s. `pnpm gate` type-check hai lần: `typecheck`, rồi `next build`.
- **Navigation** (đã sửa ở #49 và nhánh hiện tại, giữ làm baseline):
  - Click → màn hình phản hồi: 40–100 ms.
  - Đổi filter trang chủ: chip phản hồi khoảng 80 ms, nội dung khoảng 390 ms; Back tức thì.
- **Database dev:**
  - Dữ liệu: 9 truyện, 25 chương, 1,7k block.
  - Cron mỗi phút: `publish_due_chapters` 8,4 ms, `aggregate_reads` 9,7 ms, `process_outbox` 6,5 ms (mean). `refresh_rankings` mỗi 5 phút: 47 ms mean với chỉ 9 truyện.
  - Advisor: 19 foreign key không có index, 13 index "chưa dùng" (chưa có ý nghĩa vì dữ liệu nhỏ).
- **Ngôn ngữ:** với người đọc chọn English, `<main>` của SSR bị thay mới sau hydration (đã đo: phần tử DOM khác).

## 3. Phát hiện theo mức ưu tiên

Mỗi dòng: mã, mục checklist, bằng chứng, hướng sửa, nhãn.

### P0

| Mã | Mục | Phát hiện | Bằng chứng | Hướng sửa | Nhãn |
| --- | --- | --- | --- | --- | --- |
| P0-1 | §5 | Mọi route tải toàn bộ feature, kể cả editor | `packages/features/package.json`, `packages/ui/package.json` không có `sideEffects`; `providers.tsx`, `(main)/layout.tsx` import từ barrel `@storynest/features` | Khai báo `"sideEffects": ["*.css"]` cho `features`, `ui`, `utils`, `validation`, rồi đo lại; thêm budget bundle vào gate | Đã đo: −38% |
| P0-2 | §6 | `list_comments` và `comment_counts_by_block` không dùng được index; `comment_to_card` (plpgsql) chạy trên mọi bình luận gốc trước `LIMIT` | `init_schema.sql:355` index partial `WHERE status='visible'`, nhưng query không lọc status; `comments.sql:157` `block_id IS NOT DISTINCT FROM` | Index `(chapter_id, block_id, created_at DESC, id DESC) WHERE parent_comment_id IS NULL`; tách nhánh NULL/không NULL; `LIMIT` trước rồi mới `LATERAL comment_to_card`; về sau dùng counter like/reply | Đã xác minh |
| P0-3 | §6 | `similar_stories` (trang truyện) hash join toàn bộ `chapter_read_events`; CTE `eligible` quét mọi truyện công khai | `recommendations.sql:49-58`; không có index bắt đầu bằng `reader_id` | Bảng `story_similarity` tính hằng đêm trên 30 ngày gần nhất; tối thiểu thêm index `(reader_id, story_id)` | Đã xác minh |
| P0-4 | §6, §3 | `popular_tags` (mỗi lượt vào trang chủ) đếm toàn bộ `story_tags` với RLS `can_read_story()` trên từng dòng (SECURITY INVOKER) | `tags.sql:100-121` | Materialized `tag_usage`, refresh cùng `refresh_rankings`; RPC đọc bảng đó (SECURITY DEFINER); `search_tags` tương tự | Đã xác minh; chi phí là giả thuyết |
| P0-5 | §3, §10 | Sitemap và robots truy vấn DB mỗi request, kèm `count: "exact"` và offset | `app/sitemap.ts:9-10` (`revalidate` bị `force-dynamic` vô hiệu); `robots.ts:27,34` (hai count tuần tự); `sitemap-data.ts:25,49` | Bỏ `force-dynamic`; bỏ `count` khỏi query danh sách; count song song hoặc bằng RPC `sitemap_counts()`; phân trang keyset theo id; kiểm giới hạn max-rows 1000 của PostgREST với trang 5000 | Đã xác minh |

### P1

| Mã | Mục | Phát hiện | Bằng chứng | Hướng sửa | Nhãn |
| --- | --- | --- | --- | --- | --- |
| P1-1 | §3, §1 | Trang công khai không cache được: dữ liệu public đọc bằng client gắn cookie, nên route dynamic | `lib/story/load-story.ts:28`, `load-chapter.ts:23`, `(main)/page.tsx:27`, hai `opengraph-image.tsx` | Client ẩn danh + `unstable_cache` theo tag (`story:{id}`, `chapter:{id}`), `revalidate` khoảng 60 s; chỉ fallback về client gắn cookie khi kết quả ẩn danh là null (truyện riêng tư, nhóm) | Đã xác minh |
| P1-2 | §3 | OG image chương tải cả truyện, danh sách chương và mọi block chỉ để vẽ tiêu đề; không cache | `[chapterSlug]/opengraph-image.tsx:19` | Query nhẹ chỉ lấy tiêu đề, client ẩn danh, đặt `revalidate` | Đã xác minh |
| P1-3 | §1, §2 | Mỗi lần chuyển chương lại tải và gửi lại toàn bộ danh sách chương (không giới hạn) dù client đã có | `story.api.ts:43-52` (không `.limit`); `load-chapter.ts` chờ `loadStory` | Trang chương chỉ chờ story + chapter; danh sách chương lấy phía client với `staleTime` dài, hoặc chỉ lấy chương trước/sau; phân trang danh sách trên trang truyện | Đã xác minh |
| P1-4 | §4 | `LanguageProvider` đổi `key` sau hydration nên remount toàn bộ cây (DOM SSR, realtime channel, editor, khôi phục vị trí đọc) với người dùng không chọn tiếng Việt | `_shared/language.tsx:27,35` | Gửi ngôn ngữ trong cookie và render trên server (cần bỏ biến module `current` khỏi đường render server); tối thiểu không dùng remount cho lần áp dụng đầu | Đã đo |
| P1-5 | §4 | Editor cấu hình lại và serialize toàn bộ tài liệu mỗi phím gõ | `chapter-editor-screen.tsx:191-201`: `extensions: editorExtensions()` và `editorProps` tạo mới mỗi render; `setWords(wordCountOf(getJSON()))` trong `onUpdate` | Hằng số module cho extensions/props; content ban đầu tạo một lần; đếm từ trong timer 500 ms đã có | Đã xác minh; độ trễ là giả thuyết |
| P1-6 | §8 | Tab kỳ của ranking và tab/submit của search gây render server cho trang không có dữ liệu server | `ranking-screen.tsx:45` (`navigation.replace`); `search-screen.tsx:58,87` | Dùng pattern shallow như filter trang chủ; view đọc `useSearchParams` | Đã xác minh |
| P1-7 | §2, §3 | `staleTime` 30 s cộng `refetchOnWindowFocus` nên quay lại tab trình đọc gây khoảng 8 request; infinite list refetch mọi trang đã tải, tuần tự | `_shared/query.ts:25-28`; `reader/queries.ts` không đặt `staleTime` | Nội dung chương `staleTime: Infinity` (publish sẽ invalidate); truyện và danh sách chương 5 phút; infinite list: `refetchOnWindowFocus: false` hoặc `maxPages` | Đã xác minh |
| P1-8 | §2 | Không Supabase client nào có timeout (server, browser, proxy, ẩn danh) | `supabase/server.ts`, `client.ts`, `session.ts`, `sitemap-data.ts` | `global.fetch` bọc `AbortSignal.timeout(8000)` | Đã xác minh |
| P1-9 | §2 | Trang tác giả: hai request client tuần tự sau hydration, không SSR | `author-screen.tsx:61` (feed chờ profile) | Prefetch server; feed lọc theo `owner!inner(username)` để không phải chờ profile | Đã xác minh |
| P1-10 | §6 | Feed trang chủ không có index khớp thứ tự sắp xếp; cursor `OR` không làm điều kiện index được; bộ lọc tag là subplan theo từng truyện | `init_schema.sql:344` (`idx_stories_discover` bắt đầu bằng `language_code`); `discovery.api.ts:86` | Partial index `(updated_at DESC, id DESC)` và `(category_id, updated_at DESC, id DESC)`; thêm `.lte("updated_at", …)` trước `.or`; RPC lọc theo tag trả id | Đã xác minh |
| P1-11 | §6 | Hàm RLS chạy trên từng dòng: `can_read_chapter` mỗi chương trong danh sách, chuỗi hàm mỗi block khi đọc chương | `auth_and_rls.sql:232,257-258` | RPC `SECURITY DEFINER` kiểm quyền một lần rồi `jsonb_agg` blocks; đưa `is_live_version()` lên đầu policy | Đã xác minh; mức độ là giả thuyết |
| P1-12 | §6 | Danh sách thông báo không có index khớp (index partial chỉ cho chưa đọc); badge dùng `count: "exact"`; không có job dọn | `init_schema.sql:369`; `notifications.api.ts:26,43` | Index `(recipient_id, created_at DESC, id DESC)`; count có trần 10; purge theo tuổi | Đã xác minh |
| P1-13 | §6 | `publish_due_chapters` (mỗi phút) không có index trên `status`/`scheduled_for` | `publish_chapter_rpc.sql:321` | Partial index `(scheduled_for) WHERE status='scheduled' AND deleted_at IS NULL` | Đã xác minh |
| P1-14 | §6 | Refresh xếp hạng mỗi 5 phút quét `chapter_read_events` (90 ngày) và toàn bộ `chapter_votes`; `top_stories` sắp xếp cả kỳ | `rankings.sql:22-45,97-110`; đã đo 47 ms mean với 9 truyện | Rollup ngày `story_daily_stats` do `aggregate_reads`/trigger vote ghi; xây view từ rollup; `top_stories` dùng `ORDER BY … OFFSET/LIMIT` | Đã xác minh |
| P1-15 | §6 | Trang tác giả seq scan `app_users` vì `lower(username)` bỏ qua index citext | `author_follows.sql:50`; `collaboration_invitations.sql:76`; trigger đăng ký | So sánh `username = v_name::citext`; counter follower | Đã xác minh |
| P1-16 | §6 | Ghi nhiều trên đường đi nóng: index chặn HOT update (`idx_user_chapter_progress_recent`, `idx_story_stats_ranking`), index trùng trên `chapter_read_events`; `story_stats` là hot row | `init_schema.sql:368,372`; `chapter_reads.sql:107-155` | Bỏ index không dùng (sau khi xác nhận bằng `pg_stat_user_indexes` trên prod); upsert có điều kiện; về sau aggregate deferred cho counter | Đã xác minh; contention là giả thuyết |
| P1-17 | §5 | zod và mọi schema RPC nằm trong bundle mọi trang (`_shared/errors.ts` import `ZodError` và `@storynest/validation`; `lib/env.ts` dùng zod trong providers) | `errors.ts:1-2`, `validation/src/rpc.ts`, `enums.ts`, `apps/web/src/lib/env.ts` | Tách mã lỗi RPC và enum sang module không dùng zod; kiểm `ZodError` theo cấu trúc; env kiểm bằng `URL.canParse` | Đã xác minh; dung lượng còn lại sau P0-1 phải đo lại |
| P1-18 | §10 | Không có giám sát: không `instrumentation.ts`, không Web Vitals/RUM, QueryClient không có `onError` | không tìm thấy trong repo; `providers.tsx:29` | WBS 8.2: OTel/Sentry + Speed Insights hoặc `useReportWebVitals` ở `apps/web` | Đã xác minh |
| P1-19 | §10 | Rate limit chỉ có cho comment/report. Vote, like, follow, invite, upload và search ẩn danh không giới hạn | `abuse_limits.sql:52-56`; `search.sql:149` | Thêm action vào `enforce_rate_limit`; giới hạn search ở edge hoặc trong RPC | Đã xác minh |
| P1-20 | §3 | Dữ liệu cá nhân có thể hiện trong tối đa 5 phút sau khi đổi tài khoản trong cùng tab: chỉ `authKeys` bị xóa khi đăng xuất; nhiều key cá nhân không chứa user id | `_shared/auth.tsx:65`; `progressKeys`, `studioKeys`, `historyKeys` | `queryClient.clear()` khi `SIGNED_OUT` hoặc khi user id đổi | Đã xác minh |
| P1-21 | §6, §10 | Region: Supabase `ap-southeast-1`; chưa có cấu hình region deploy (chưa có project Vercel) | `list_projects`; không có `vercel.json`/`preferredRegion` | Khi tạo project deploy: chọn `sin1` | Đã xác minh |
| P1-22 | §1, §8 | Trang cá nhân (library, studio, settings…): một vòng server chỉ để kiểm đăng nhập, rồi mới có waterfall fetch phía client | `(main)/library/page.tsx:12` v.v. | **Cần quyết định.** WBS ghi "dữ liệu cá nhân không prefetch ở server". Lựa chọn: (a) giữ nguyên, chấp nhận 2 vòng; (b) prefetch truy vấn đầu tiên ở server (không cache, dehydrate) | Đã xác minh |

### P2

| Mã | Phát hiện và hướng sửa (tóm tắt) |
| --- | --- |
| P2-1 | Gọi tuần tự có thể gộp: `getStoryForEdit` (3 lần gọi tuần tự), `getList`, `getChapterPublishState`, `getStoryProgress`; add-to-list chờ `useMyLists` (không giới hạn); `useRestoreVersion` tải cả body chỉ để lấy `revision`. |
| P2-2 | Payload thừa: `STORY_COLUMNS` gửi synopsis đầy đủ (tới 5000 ký tự) và `story_tags` cho mọi card; card chỉ hiển thị 120 ký tự và không hiện tag. |
| P2-3 | Danh sách không giới hạn: `listMyLists`, items của list (tới 500), `listDeletedStories`, `listStudioChapters`, `listChapterVersions`, `listCollaborators`. Tab thư viện dừng ở 50 mà không có trang sau. |
| P2-4 | Truy vấn trùng: `user_settings` đọc bởi hai query (`staleTime 0`, `gcTime 0`); tùy chọn trình đọc refetch mỗi lần mở chương và mỗi lần focus; `/me` đọc profile ở server lẫn client; badge chưa đọc refetch khi focus dù realtime đã cập nhật. |
| P2-5 | Invalidate quá rộng: follow tác giả invalidate `discovery.all`; publish invalidate `["studio"]` (literal) nhưng bỏ sót `readerKeys.chapter`; lists invalidate `lists.all` kể cả khi chỉ reorder; quản lý chương invalidate `studio.all` + `story.all` mỗi lần kéo thả; mark-read refetch sau optimistic update đã chính xác. Bảng đầy đủ ở Phụ lục A. |
| P2-6 | Ảnh: card đầu ở trang chủ lazy (LCP); không có `fetchPriority`/`decoding`; ảnh block trong chương không có width/height (CLS, khôi phục vị trí đọc lệch); Radix Avatar preload mọi ảnh trong danh sách bình luận. |
| P2-7 | Paint/scroll: ba lớp `backdrop-blur` trên phần tử sticky hoặc fixed; thanh tiến độ animate `width`; `use-reading-tracker` gọi `getBoundingClientRect` cho mọi block mỗi frame. |
| P2-8 | Render: mở sheet bình luận re-render mọi block; `Intl.*` tạo mới mỗi lần format; `chapter-manager` dùng `indexOf` trong `map` (O(n²)); `diffBlocks` của history chạy mỗi render, không memo; không có virtualization cho danh sách dài. |
| P2-9 | Navigation: `(auth)` không có `loading.tsx`, và `login/page.tsx` await `searchParams` nên không prefetch được; `/me/edit` gọi `replace` rồi `refresh` (2 lần render). Prefetch theo viewport cho mọi card/chương: đếm request `next-router-prefetch` mỗi lượt xem rồi cân nhắc prefetch theo hover (giả thuyết). |
| P2-10 | Dev/CI: `gate` type-check hai lần (tốn khoảng 9 s); kiểm tra rẻ (`check:*`) chạy sau test; `db:types:check` và `db:verify` mỗi bước tự khởi động một cluster PostgreSQL; CI không cache `.next/cache`; chỉ `apps/web` bật `incremental`. |
| P2-11 | Realtime `postgres_changes` cho thông báo: RLS được kiểm cho mỗi subscriber ở mỗi insert, và publish một chương tạo N sự kiện. Chuyển sang Broadcast khi người dùng tăng (giả thuyết). |
| P2-12 | Database khác: 19 foreign key không có index (ảnh hưởng khi xóa hoặc ẩn danh tài khoản); `story_follows(user_id, created_at DESC)` và `reading_lists(owner_id, updated_at DESC)` chưa có index; `idx_stories_title_trgm` trùng; hai job 03:41 chạy cùng lúc; `recommend_for_me` quét mọi truyện công khai (giả thuyết). |

## 4. Mục đã kiểm và đạt

- **Rendering:**
  - Không có `"use client"` ở route file hay layout.
  - Root và `(main)` layout không gọi Dynamic API và không fetch.
  - Provider ổn định: value memo, state tạo một lần.
  - `generateMetadata` và page dùng chung một lần tải (React `cache()`).
- **React:**
  - Cleanup đúng cho realtime channel, listener, timer, rAF, autosaver.
  - Key là id/slug; search có debounce.
  - Không lạm dụng `useMemo`/`useCallback` (16 chỗ dùng).
- **Routing:**
  - Không có `<a href>` hay `window.location` cho route nội bộ.
  - Một nested layout; không có parallel/intercepting route.
  - Không dùng Server Action hay `revalidatePath`. Router cache của trang dynamic là 0 s nên không bị cũ sau mutation.
- **Data:**
  - Không N+1 phía client: card dùng embed; RPC trả id rồi một lần `.in()`.
  - Không gọi Route Handler nội bộ qua HTTP.
  - Không có QueryClient dùng chung trên server.
  - Feed, thông báo, bình luận, moderation dùng keyset cursor.
- **Database:**
  - Chỉ dùng supabase-js Data API (không pool riêng).
  - `auth.uid()` bọc `(SELECT …)` trong policy; hàm helper đều STABLE.
  - Search dùng GIN trigram (có test EXPLAIN).
  - Lượt đọc được gộp mỗi phút (không tạo hot row khi đọc).
- **Auth:** JWT ES256 nên `getClaims()` kiểm cục bộ với JWKS cache 10 phút.
- **Bundle và assets:**
  - Không có dependency trùng phiên bản hay trùng chức năng; không có third-party script.
  - `radix-ui`/`lucide-react` tree-shake được.
  - Font là system stack.
  - Tailwind `@source` có phạm vi hẹp.
  - Ảnh upload đã resize, có cache 1 năm và key duy nhất.
  - `_next/static` immutable.

## 5. Kế hoạch sửa (đề xuất, mỗi dòng một PR)

Thứ tự theo mục 13 của checklist, nhưng ưu tiên việc rẻ mà có số đo lớn. Mỗi PR phải có số đo before/after và test chống regression.

| PR | Nội dung | Mã | Kiểm chứng |
| --- | --- | --- | --- |
| A. Bundle | `sideEffects` cho các package; tách zod khỏi `_shared`/env; budget bundle tự động trong `gate` (đọc `route-bundle-stats.json`) | P0-1, P1-17, P2-10 (một phần) | `route-bundle-stats.json` before/after; script budget fail khi vượt |
| B. Sửa nhanh an toàn | Timeout Supabase; `queryClient.clear()` khi đổi user; bỏ `force-dynamic` ở sitemap/robots và count song song; `staleTime` theo loại dữ liệu; ranking/search shallow | P0-5, P1-6, P1-7, P1-8, P1-20 | Unit test cho từng hành vi; curl header; Playwright đếm request khi focus |
| C. Dữ liệu seed quy mô lớn | Script seed (ví dụ 10k truyện, 200k chương, 1M lượt đọc, 200k bình luận) cho PostgreSQL local (hạ tầng `db:verify`) và bộ `EXPLAIN` chuẩn | điều kiện để chạy D, E | Plan và thời gian của từng query nóng (baseline) |
| D. Index và rewrite query | Bình luận, feed + cursor, thông báo, `scheduled_for`, citext author, FK index, bỏ index chặn HOT | P0-2, P1-10, P1-12, P1-13, P1-15, P1-16, P2-12 | EXPLAIN before/after trên seed của PR C; test DB hiện có |
| E. Tính trước aggregate | `tag_usage`, `story_similarity`, rollup xếp hạng, RPC đọc chương/danh sách chương kiểm quyền một lần | P0-3, P0-4, P1-11, P1-14 | EXPLAIN và thời gian cron trên seed |
| F. Cache dữ liệu công khai | Client ẩn danh + `unstable_cache` cho trang chủ, truyện, chương, OG; danh sách chương không chờ trên trang chương | P1-1, P1-2, P1-3 | Header cache; đếm request Supabase mỗi lượt xem |
| G. Rendering | Ngôn ngữ từ cookie (không remount); editor | P1-4, P1-5 | Playwright: DOM SSR giữ nguyên; Performance panel khi gõ |
| H. Quan sát | `instrumentation.ts`, Web Vitals, `onError` của QueryClient (WBS 8.2) | P1-18 | Sự kiện xuất hiện ở công cụ giám sát |
| I. Rate limit | Action mới trong `enforce_rate_limit`; search | P1-19 | Test DB |
| J. Còn lại | Các mục P2 | P2-* | Theo từng mục |

Cần người phụ trách quyết định:

- **P1-22:** prefetch dữ liệu cá nhân trên server hay giữ nguyên quyết định hiện tại.
- **P1-4:** ngôn ngữ theo cookie, hay theo URL (ảnh hưởng SEO/hreflang, WBS 0.4).
- **Bật Cache Components hay dùng `unstable_cache`** (PR F).

## Phụ lục A. Mutation → key bị invalidate

| Hook | Key invalidate/cập nhật | Đánh giá |
| --- | --- | --- |
| Đăng nhập/đăng ký/đặt lại mật khẩu | không (trang gọi `router.refresh`) | Đạt |
| `useFollowAuthor` | set `author.profile`; invalidate `author.followed-stories(user)`, `discovery.all` | Quá rộng (refetch cả feed của tác giả); thiếu `recommendations.forMe` |
| Đăng/sửa/xóa/ẩn bình luận | `comments[chapterId]` | Đúng, nhưng refetch mọi trang đã tải và mọi luồng trả lời đang mở |
| Like bình luận, vote chương, follow/lưu truyện | optimistic `setQueryData` | Đạt |
| `useSaveChapterDraft`, `useRestoreVersion` | không / `editor.draft` | Đạt |
| `usePublishAction` | publish-state, `["studio"]` (literal), `story.all`, `discovery.all` | Quá rộng; thiếu `readerKeys.chapter` (nội dung cũ tới 30 s) |
| `useRemoveFromLibrary` | `library.all`, `story.all` | Quá rộng (chỉ cần `story.library(id)`, `detail(id)`) |
| Tạo/sửa/xóa/thêm/bớt/sắp xếp reading list | `lists.all` | Quá rộng (mọi list và mọi membership refetch) |
| Moderation, report | `moderation.all` / không | Đạt |
| Đánh dấu đã đọc thông báo | optimistic rồi `notifications.all` | Thừa: refetch mọi trang sau cập nhật đã chính xác |
| Sửa profile/avatar | set `auth.profile` | Thiếu `authorKeys.profile` |
| Lưu cài đặt | optimistic | Đạt |
| Tạo/sắp xếp/lưu trữ/đổi tên/xóa chương | `studio.chapters(id)`, `studio.all`, `story.all` | Quá rộng (mỗi lần kéo thả refetch `getStoryForEdit`, 3 lần gọi tuần tự); đổi tên/xóa thiếu `readerKeys` |
| Lời mời cộng tác, collaborator | collaborators, invitations, `studio.all`, `story.all` | Đạt |
| Tạo/sửa/xóa truyện, tag, bìa | `studio.all`, `story.all`, `discovery.all` | Quá rộng (refetch categories đang dùng trong form, popular tags); thiếu ranking, search, recommendations, author, card trong library/list |

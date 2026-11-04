# StoryNest

Ứng dụng đọc/đăng truyện kiểu Wattpad. Web (SEO/SSR) và mobile (Capacitor) dùng chung phần lớn UI và business logic.

## Tech stack

| Thành phần | Công nghệ |
| --- | --- |
| Framework | Next.js (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| UI | shadcn/ui (Radix UI / Base UI tùy component), Lucide React |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Data fetching / state | TanStack Query / Zustand |
| Validation | Zod |
| Rich text | Tiptap |
| Mobile | Capacitor (Android/iOS) |
| Hosting / tooling | Vercel / pnpm workspaces |

> Kế hoạch triển khai chi tiết (WBS, mốc, quyết định cần chốt): [`docs/WBS.md`](docs/WBS.md).

## Cấu trúc

```text
apps/web              Next.js SSR + SEO
apps/mobile           Capacitor static shell (client-side navigation)
packages/ui           shadcn + shared components (StoryCard, ChapterList, ReaderToolbar, ReadingProgress, CommentThread)
packages/design-tokens Tailwind theme / design tokens
packages/features     Feature logic dùng chung web + mobile
packages/database     Supabase generated types
packages/validation   Zod schemas
supabase/migrations   SQL migrations (nguồn sự thật của schema)
supabase/functions    Edge functions
```

`android/` và `ios/` sẽ được sinh bởi Capacitor khi khởi tạo `apps/mobile`.

## Nguyên tắc UI

- Màn hình nghiệp vụ chỉ dùng shared components và design tokens; không tự định nghĩa màu, spacing, radius.
- Mobile-first: bottom navigation, touch target, safe area. Web: responsive, độ rộng văn bản tối ưu cho đọc.
- Next.js SSR không export tĩnh nguyên trạng sang Capacitor: mobile dùng static shell + client navigation, phần cần server gọi Supabase/API từ xa.

## Database

Schema nằm ở `supabase/migrations/20261103000000_init_schema.sql` (25 bảng, PostgreSQL 15+).
Kiểm chứng migration trên cluster PostgreSQL tạm: `pnpm db:verify`.

### Auth + RLS (`20261103000100_auth_and_rls.sql`)

- `app_users.id` tham chiếu `auth.users(id)`; trigger `on_auth_user_created` tự tạo profile (username lấy từ metadata/email, chuẩn hóa và chống trùng).
- RLS bật trên cả 25 bảng; quyền của `anon`/`authenticated` bị thu hồi rồi cấp lại theo bảng/cột. Thiếu policy hoặc grant nghĩa là bị từ chối.
- Client **không** ghi trực tiếp: `chapters.status/published_version_id`, `chapter_versions`, `chapter_version_blocks`, stats, notifications, categories/tags, `app_users.account_status`. Các thao tác này đi qua `service_role` hoặc RPC.
- Moderator được xác định bằng JWT claim `app_metadata.role = 'moderator'` (chỉ server đặt được).
- Story `unlisted` đọc được bởi bất kỳ ai biết id/slug; truy vấn discovery phải lọc `visibility = 'public'`.
- Xóa tài khoản đi qua deactivation, không `DELETE` trên `auth.users` (đang bị `stories.owner_id ON DELETE RESTRICT` chặn).

Kiểm chứng: `pnpm db:verify` nạp shim `auth`/roles (`supabase/scripts/supabase-shim.sql`, chỉ dùng local), áp mọi migration rồi chạy `supabase/tests/*.sql`.
Test mới chạy trên PostgreSQL thuần với shim, **chưa** chạy trên Supabase thật.

### Publish chapter (`20261103000200_publish_chapter_rpc.sql`)

Client không ghi trực tiếp trạng thái publish; mỗi lệnh gọi RPC là một transaction:

| RPC | Quyền | Việc làm |
| --- | --- | --- |
| `publish_chapter(chapter_id, expected_revision?)` | owner / co_author / editor | Validate draft → snapshot version + blocks (bất biến) → trỏ `published_version_id` → ghi outbox. Trả về version id. |
| `schedule_chapter(chapter_id, scheduled_for, expected_revision?)` | như trên | Validate draft, đặt `status='scheduled'`. Snapshot được chụp từ draft **tại thời điểm đến hạn**. |
| `unpublish_chapter(chapter_id)` | owner / co_author | Về `draft` (hoặc hủy lịch). Giữ version và `first_published_at`. |
| `publish_due_chapters(limit?)` | chỉ `service_role` | Publish các chapter đến hạn; lỗi một chapter chỉ log WARNING và thử lại ở lần chạy sau. |

- Lỗi (SQLSTATE): `42501` không được phép, `PT404` không tìm thấy (kể cả khi không có quyền, để không lộ sự tồn tại), `PT409` xung đột (revision cũ, sai trạng thái), `22023` draft/tham số không hợp lệ. PostgREST map `PT404`/`PT409` sang HTTP 404/409.
- `expected_revision` là optimistic lock: truyền `chapter_drafts.revision` client đang giữ để tránh publish nhầm bản đã bị thay đổi, đồng thời chống bấm đúp.
- Publish lần đầu: story `draft` chuyển sang `ongoing`, tạo `chapter_stats`/`story_stats` nếu chưa có, ghi sự kiện `chapter.published` vào `outbox_events` (chỉ một lần cho mỗi chapter; publish lại bản sửa không báo lại).
- Hợp đồng `chapter_drafts.body`: xem đầu file migration. `chapter_blocks` thiếu sẽ được tạo trong RPC; block id thuộc chapter khác bị từ chối.
- Migration này cũng sửa trigger `deny_published_block_mutation` (tham chiếu bảng không có schema nên vỡ khi `search_path` rỗng).
- Chạy job định kỳ bằng `pg_cron` (`select public.publish_due_chapters();`) hoặc Edge Function dùng service role. **Chưa** lên lịch.

### Outbox worker + cron (`20261103000300_outbox_worker_and_cron.sql`)

- `process_outbox(limit?)` (chỉ `service_role`): lấy sự kiện chưa xử lý bằng `FOR UPDATE SKIP LOCKED`, nên nhiều worker chạy song song vẫn an toàn. Mỗi sự kiện chạy trong subtransaction riêng: một sự kiện lỗi không chặn hàng đợi.
- Retry theo backoff lũy thừa (2, 4, 8… phút, tối đa 256 phút); sau 5 lần lỗi sự kiện bị đánh dấu `failed_at` (dead letter) kèm `last_error`. Sự kiện lạ (typo) vào dead letter ngay sau 5 lần thay vì lặp mãi. Đưa lại hàng đợi sau khi sửa nguyên nhân:
  `UPDATE outbox_events SET failed_at = NULL, attempts = 0, available_at = now() WHERE id = '...';`
- Giao hàng *at-least-once*; handler phải idempotent. `chapter.published` tạo notification `chapter_published` cho mọi follower đang `active` của story (trừ người publish); `dedupe_key` theo từng người nhận nên replay không tạo bản trùng. Nếu chapter đã bị unpublish/xóa trước khi xử lý thì không gửi gì.
- `purge_outbox(retention?)`: xóa sự kiện đã xử lý quá 14 ngày; dead letter được giữ lại.
- Lịch (`pg_cron`, tên job có tiền tố `storynest-`): `publish_due_chapters` và `process_outbox` mỗi phút, `purge_outbox` lúc 03:17 hằng ngày. Migration bật `pg_cron` nếu nền tảng hỗ trợ; nếu không chỉ in NOTICE và bạn cần gọi 3 lệnh đó từ nơi khác (Edge Function cron…). `cron.schedule` theo tên là upsert nên chạy lại migration không nhân đôi job.
- Giám sát nhanh: `SELECT count(*) FILTER (WHERE failed_at IS NOT NULL) AS dead, count(*) FILTER (WHERE processed_at IS NULL AND failed_at IS NULL) AS pending FROM outbox_events;`

### Type TypeScript và schema Zod

| Package | Nội dung |
| --- | --- |
| `@storynest/database` | `database.types.ts` **sinh tự động** từ migration (cùng generator với Supabase CLI, chạy trên DB local, không cần project Supabase hay Docker) + helper `RpcArgs<>`, `RpcReturns<>`. |
| `@storynest/validation` | Zod: enum, giới hạn độ dài, `chapterBodySchema` (hợp đồng `chapter_drafts.body`), tham số RPC, payload ghi (story, chapter, draft, comment, reading list, report), payload notification, `classifyRpcError`. |

Lệnh (từ thư mục gốc): `pnpm install`, `pnpm db:types` (sinh lại), `pnpm db:types:check` (CI: báo lỗi nếu file đã commit bị cũ), `pnpm typecheck`, `pnpm test`.

Chống lệch giữa DB và code (khi migration đổi, một trong các bước này sẽ fail):
- `db-contract.generated.json` (cũng được sinh ra) chứa giá trị CHECK-enum và độ dài varchar thật của schema; test Zod so sánh với nó, vì type sinh ra chỉ coi các cột đó là `string`.
- `db-conformance.ts` ép kiểu: output của Zod phải gán được vào `TablesInsert<...>` và tham số RPC của `Database`, nên đổi tên cột/tham số sẽ làm `pnpm typecheck` fail.
- `chapterBodySchema` chặt hơn RPC có chủ đích (bắt buộc `type`, cấm key lạ, giới hạn số block/độ dài, `marks` phải nằm trong text). Các bản nháp lỗi mà test SQL chứng minh RPC từ chối cũng được test Zod từ chối; hai danh sách này đang được giữ đồng bộ bằng tay.
- Payload ghi **không** có cột định danh (`owner_id`, `author_id`...): caller thêm `auth.uid()`, RLS từ chối giá trị khác. Type `Insert` của `Database` mô tả bảng chứ không mô tả quyền của API role.

Giới hạn tầng ứng dụng (DB không giới hạn): `APP_LIMITS` trong `limits.ts` (bio, synopsis, số block, độ dài text...) là giá trị tạm, chỉnh được.

### Web (`apps/web`)

Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, TypeScript strict.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # điền URL + publishable key của Supabase
pnpm --filter @storynest/web dev                # http://localhost:3000
pnpm --filter @storynest/web build
```

- **Design tokens** (`@storynest/design-tokens/tokens.css`): nơi duy nhất định nghĩa màu, radius, font. Mỗi màu chỉ khai báo một lần bằng `light-dark()`; mặc định theo hệ điều hành, ép bằng class `light`/`dark` trên `<html>`. Tên biến theo shadcn/ui nên component thêm bằng shadcn CLI dùng được ngay. Có sẵn utility `pt-safe`/`pb-safe`/`px-safe` (safe area của Capacitor), `touch-target` (tối thiểu 44px), `reader-prose` (độ rộng đọc ~66ch). Màn hình nghiệp vụ chỉ dùng utility ngữ nghĩa (`bg-background`, `text-muted-foreground`...), không dùng màu thô.
- **`@storynest/ui`**: shadcn/ui (kiểu new-york) và `cn`; hiện có `Button` (thêm biến thể `size="touch"`). `components.json` trỏ CSS vào package token, nên `shadcn add <component>` chạy trong `packages/ui` sẽ ghi vào đúng chỗ. Web import dạng `@storynest/ui/components/button`.
- **Supabase**: `lib/supabase/{client,server,session}.ts` có type `Database`; `src/proxy.ts` (Next 16 đổi tên từ `middleware`) làm mới cookie phiên bằng `getClaims()` (kiểm chữ ký JWT) và áp header `Cache-Control` từ `@supabase/ssr`. Thiếu biến môi trường: dev vẫn chạy UI, **production trả 500** thay vì lặng lẽ bỏ qua xác thực.
- Font dùng system stack (không tải font lúc build, chạy offline trong Capacitor). Chưa có ESLint (`next lint` đã bị gỡ ở Next 16).

### Dự án Supabase dev và hardening

- Project `storynest-dev` (ref `kqhztlatrizexskwmpsn`, ap-southeast-1). Điền URL + publishable key vào `apps/web/.env.local` (xem `.env.example`; không commit).
- `*_hardening_and_indexes.sql` xử lý các cảnh báo advisor lần đầu: `search_path` cố định cho hàm trigger, các index khóa ngoại thật sự cần (có lý do từng index trong đầu file), gộp hai policy UPDATE của `comments` thành một. `40_hardening.test.sql` giữ các điều này không thụt lùi.
- Lịch sử migration trên project được áp theo từng phần nhỏ (do popup xác nhận của công cụ Supabase với lệnh `DROP`), nên tên/số lượng migration ở đó khác thư mục `supabase/migrations`; trạng thái cuối cùng là một.
- Việc còn mở về hạ tầng: bật Google OAuth + Redirect URL, tạo Storage bucket, chuyển các hàm helper `can_*`/`story_role` ra schema không expose.

### Công cụ phát triển

- `pnpm lint` (ESLint, gồm quy tắc **ranh giới package**: `utils`/`database` không phụ thuộc gì, `validation` chỉ zod + type DB, `ui` không dữ liệu/Next, `features` không `next/*`, cấm import xuyên vào `src/` của package khác), `pnpm format` / `pnpm format:check` (Prettier).
- `pnpm gen:feature <tên-kebab-case>` tạo feature mới theo đúng layout (`api/ hooks/ screens/ components/ model/ keys.ts index.ts` + test).
- `@storynest/utils`: hàm thuần có test (slugify tiếng Việt, formatCount, thời gian tương đối, cursor phân trang, URL Storage an toàn, debounce, Result).
- `@storynest/features/_shared`: hạ tầng dùng chung cho mọi feature. `DataProvider` (client Supabase), `QueryProvider`, `PlatformProvider` (điều hướng/`isNative`/mở link ngoài qua adapter; web dùng `apps/web/src/lib/platform/next-adapter.tsx`), `AuthProvider` + `useAuth` (chỉ để hiển thị: phân quyền thật là RLS và proxy), `AppError`/`toAppError` (ánh xạ lỗi Postgres/PostgREST/Auth/Zod/mạng thành `kind` để UI quyết định), `ErrorBoundary`, `ToastProvider` (port, chưa mount).
- `pnpm check:tokens`: chặn màu thô (hex, màu palette Tailwind, `bg-white`, giá trị tùy ý) trong `apps/` và `packages/`; chỉ dùng token. Ngoại lệ bắt buộc phải có chú thích `token-check-ignore: <lý do>` trên cùng dòng.
- `pnpm check:hardcode`: chặn hardcode trong mã nguồn (ngoài test): (1) chữ tiếng Việt hiển thị cho người dùng phải nằm trong `strings.ts` (WP 0.4 sẽ thay các module này bằng i18n một lần); (2) giá trị lọc truy vấn viết thẳng như `.eq("status", "published")` phải dùng hằng enum `STORY_STATUS`, `CHAPTER_STATUS`, `VISIBILITY`, `BLOCK_TYPE` của `@storynest/validation` (test giữ chúng khớp schema); (3) `aria-label`/`placeholder`/`alt`/`title` viết chữ trực tiếp. Comment được bỏ qua. Ngoại lệ bắt buộc phải có chú thích `hardcode-check-ignore: <lý do>` trên cùng dòng. Cần giá trị enum mới thì thêm hằng vào `packages/validation/src/enums.ts`.
- Thêm component shadcn: `shadcn add <tên>` trong một thư mục tạm (cấu hình chuẩn `@/components/ui`) rồi chuyển file vào `packages/ui/src/components` và sửa import (CLI hiểu nhầm alias `utils` của monorepo thành package `cn`). `/dev/gallery` (chỉ dev) hiển thị mọi primitive/widget để rà bằng mắt.
- **Auth (email + mật khẩu)**: màn hình trong `packages/features/src/auth` (router-agnostic), trang trong `apps/web/src/app/(auth)`, `GET /auth/callback` đổi `code` lấy phiên rồi chuyển tới `next` (chỉ nhận đường dẫn nội bộ, xem `safeRedirectPath`). Thông điệp lỗi của schema là **mã ổn định** (`password_too_short`...), UI dịch qua `auth/strings.ts` nên i18n (WP 0.4) chỉ thay một file. Khi thêm package có class Tailwind mới, nhớ thêm `@source` vào `apps/web/src/app/globals.css` (nếu không class chỉ dùng ở package đó sẽ không được sinh ra).
- **Bảo vệ route**: danh sách trang cần đăng nhập nằm ở một chỗ (`apps/web/src/lib/auth/route-guard.ts`, khớp theo đoạn đường dẫn nên `/members` không bị `/me` chặn nhầm). Proxy chỉ chuyển hướng "lạc quan" (giữ nguyên cookie phiên); mọi trang bảo vệ vẫn gọi `requireUser(path)` (kiểm chữ ký JWT bằng `getClaims`), và RLS là ranh giới thật. Thêm trang riêng tư mới = thêm tiền tố vào `PROTECTED_PREFIXES` + gọi `requireUser` trong trang.
- **Form dùng chung**: `translateErrors(zodResolver(schema), translate)` (`features/_shared`) dịch mã lỗi của schema thành văn bản của feature; lỗi từ server gắn đúng trường (vd. username trùng) bằng `form.setError`, các lỗi còn lại hiện ở banner `role="alert"`.
- **Gate trước khi merge (giai đoạn dev, CI trên GitHub đang tắt):** chạy `pnpm gate` ở local (format, lint, typecheck, test, check:hardcode, check:tokens, db:types:check, db:verify, build web; cần PostgreSQL server cho `db:verify`). Chỉ merge khi gate xanh. Muốn bật lại CI: khôi phục `push:` và `pull_request:` trong phần `on:` của `.github/workflows/ci.yml`.
- **Performance (bắt buộc):** mọi PR áp dụng [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) (checklist, quy tắc dự án, budget, cách đo trên production build). Mỗi thay đổi vì performance cần số liệu before/after, nguyên nhân gốc và test chống regression. Hiện trạng và kế hoạch sửa: [`docs/perf-audit-2026-11-04.md`](docs/perf-audit-2026-11-04.md).
- CI (`.github/workflows/ci.yml`, hiện chỉ chạy tay): job `checks` (format, lint, typecheck, test, build web) và job `database` (`db:verify`, `db:types:check` trên PostgreSQL).
- TypeScript ghim **6.0.3**: `typescript-eslint` chưa hỗ trợ 7.x. Nâng lên khi có hỗ trợ.

### Dữ liệu seed cho dev

`supabase/seed/dev_seed.sql`: dữ liệu mẫu để phát triển và e2e (**không bao giờ chạy trên production**; nằm ngoài `migrations/` có chủ đích).

- Chạy lại an toàn (id cố định, `ON CONFLICT DO NOTHING`, không có `DELETE`; chương chỉ được publish khi chưa publish nên không sinh phiên bản/sự kiện mới). Các chương được publish bằng chính RPC `publish_chapter` với tư cách tác giả.
- Chốt chặn môi trường: seed từ chối chạy nếu phiên chưa `SET storynest.environment = 'dev';` (shim local tự đặt `local`; trên Supabase không dùng được `ALTER DATABASE ... SET` nên đặt `SET` ngay trong phiên chạy seed).
- Local: `pnpm db:verify` áp seed hai lần trong test `50_seed` (đúng số lượng, khách đọc được gì, chạy lại không đổi gì, chốt chặn môi trường).
- Tác giả demo (`demo_an`, `demo_binh`, `demo_chi`) không đăng nhập được (mật khẩu băm ngẫu nhiên, không có identity). Muốn dọn: `delete from auth.users where email like '%@seed.storynest.test'` (hồ sơ, truyện, chương xóa theo; cần xóa truyện trước vì `stories.owner_id` là RESTRICT).

### Việc còn lại

1. **Auth UI**: đăng nhập/đăng ký (Supabase Auth), guard route, trang hồ sơ; bảo vệ route bằng kiểm tra quyền ở server (RLS vẫn là lớp chính).
2. **Shared components** trong `packages/ui`: `StoryCard`, `ChapterList`, `ReaderToolbar`, `ReadingProgress`, `CommentThread`, bottom navigation; thêm component shadcn khi cần.
3. **Trang đọc** `/{story}/{chapter}` (SSR + SEO), danh sách khám phá, TanStack Query/Zustand khi có nhu cầu thật.
4. **ESLint** (flat config) và **CI**: `pnpm db:verify`, `pnpm db:types:check`, `pnpm typecheck`, `pnpm test`, `pnpm --filter @storynest/web build` (cần PostgreSQL server trên runner).
5. **`apps/mobile`** (Capacitor static shell) và chiến lược export tĩnh cho phần không phụ thuộc server.
6. **Chuyển đổi Tiptap JSON <-> `chapter_drafts.body`** (và đếm từ bằng `countWords`) khi làm editor.
7. **Push notification** (FCM/APNs): cần Edge Function hoặc event outbox riêng; thêm handler outbox khi có tính năng mới.
8. **Kiểm tra `image_storage_key`**: cần chốt quy ước đường dẫn Supabase Storage + policy bucket. **Đếm lượt đọc** có dedupe và archive chapter.
9. **Tags**: hiện chỉ `service_role` tạo được tag mới. **Comment trên truyện của mình**: tác giả chưa ẩn/xóa được comment của người khác.
10. **Trên Supabase thật**: kiểm tra `citext`/`gin_trgm_ops` khi extension nằm ở schema `extensions`, xác nhận `pg_cron` bật và job chạy, chạy `get_advisors`, đối chiếu type với `generate_typescript_types`.

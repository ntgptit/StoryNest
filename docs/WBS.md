# StoryNest: WBS và kế hoạch triển khai

Trạng thái tài liệu: **đã chốt 7 quyết định** ở mục 4 (2026-11-03); nội dung còn lại vẫn là kế hoạch, có thể điều chỉnh. Mọi con số ước lượng (tổng ~172 ngày công) là **ước tính thô, sai số ±30%**, tính cho 1 fullstack developer có AI agent hỗ trợ, đã gồm test và tài liệu, **chưa gồm** thiết kế UX/UI, vận hành kiểm duyệt nội dung, pháp lý. Cập nhật cột trạng thái ở đây sau mỗi work package hoàn thành.

Ký hiệu: ✅ xong · 🟡 một phần · ⬜ chưa làm · ⚠️ cần quyết định.

---

## 0. Hiện trạng (đã có trong repo)

| Hạng mục | Trạng thái | Ghi chú |
| --- | --- | --- |
| Schema 25 bảng + `outbox_events` | ✅ | `supabase/migrations/*_init_schema.sql` |
| Auth ↔ profile (trigger), RLS toàn bộ bảng, grant theo cột | ✅ | có 3 bộ test SQL, mutation-tested |
| RPC publish / schedule / unpublish / due job | ✅ | một transaction, lỗi theo SQLSTATE |
| Outbox worker + cron + notification `chapter_published` | ✅ | retry/backoff, dead letter |
| Type TS sinh từ migration + contract enum/độ dài | ✅ | `pnpm db:types`, `db:types:check` |
| `@storynest/validation` (Zod) | ✅ | body chapter, RPC args, payload ghi |
| `@storynest/design-tokens`, `@storynest/ui` (Button) | 🟡 | token xong, mới 1 component |
| `apps/web` shell: Supabase client, proxy, trang chủ placeholder | 🟡 | chưa có route nghiệp vụ nào |
| **Chạy trên Supabase thật** | ⬜ | **chưa từng làm**: mọi test DB chạy trên PostgreSQL thuần + shim |
| CI, ESLint, e2e | ⬜ | |

**Khoảng trống DB đã biết** (cần làm trong các work package bên dưới, không phải việc "có thể sau"):

| # | Thiếu | Ảnh hưởng | WP |
| --- | --- | --- | --- |
| D1 | Không có gì cập nhật `story_stats`/`chapter_stats` (votes, comments, followers, saves, reads); mới chỉ tạo dòng rỗng khi publish | Số liệu hiển thị và xếp hạng luôn bằng 0 | 4.8 |
| D2 | Chưa có bảng sự kiện đọc (dedupe) | Không có lượt đọc, không có trending theo thời gian | 2.6 |
| D3 | Storage bucket + policy (cover, avatar, ảnh chapter) và quy ước `*_storage_key` | Không upload được; RPC chưa kiểm `image_storage_key` | 1.5, 3.3 |
| D4 | Tạo tag chỉ `service_role`; chưa có seed category | Tác giả không gắn tag, trang khám phá trống | 2.1, 5.2 |
| D5 | Reorder chapter, archive chapter chưa có RPC (`sort_order` unique) | Studio không sắp xếp lại được an toàn | 3.4 |
| D6 | Tác giả chưa ẩn/xóa comment của người khác trên truyện mình | Thiếu công cụ cơ bản của tác giả | 6.2 |
| D7 | Tìm kiếm mới có index trigram cho `title` | Không tìm theo mô tả, tag, tác giả | 5.1 |
| D8 | Xóa/ẩn tài khoản đi qua deactivation nhưng chưa có luồng | `auth.users` không xóa được khi còn story (RESTRICT) | 6.4 |
| D9 | Owner thêm collaborator không cần đồng ý | Có thể bị lạm dụng | 3.8 |
| D10 | Slug story chỉ unique theo `(owner_id, slug)` | URL công khai không thể chỉ dùng slug | Q2 (đã chốt: id + slug) |

---

## 1. Kiến trúc thư mục và quy tắc

### 1.1 Quyết định kiến trúc then chốt (đã chốt: Q1)

> Web (Next.js SSR) và mobile (Capacitor static shell) phải dùng chung **màn hình**, không chỉ component. Muốn vậy, code dùng chung **không được phụ thuộc `next/*`**.

- `packages/features` chứa **Screen** (ví dụ `StoryScreen`, `ReaderScreen`) là client component nhận tham số qua props (`storyId`, `chapterId`...), không import `next/navigation`, `next/link`, `next/image`.
- Điều hướng đi qua adapter `PlatformProvider` (`Link`, `useNavigate`, `useParams`-thay-thế, `isNative`, `openExternal`). Web cung cấp bản dùng Next, mobile cung cấp bản dùng router client.
- Dữ liệu đi qua `DataProvider` (Supabase client) + TanStack Query. Web **prefetch ở server** rồi `HydrationBoundary` để vẫn có SSR/SEO; mobile fetch phía client.
- `apps/web` = route file mỏng: lấy params, prefetch, render Screen. `apps/mobile` = Vite + router client, ánh xạ cùng Screen. Không dùng Next `output: export` cho mobile vì route động (`/story/[id]`) không liệt kê trước được.
- Chi phí đổi ý sau này rất lớn (phải bóc `next/*` khỏi mọi feature), nên chốt **ngay**.

### 1.2 Cây thư mục đích

```text
storynest/
├── apps/
│   ├── web/src/
│   │   ├── app/
│   │   │   ├── (marketing)/            trang chủ, giới thiệu, điều khoản
│   │   │   ├── (auth)/                 login, register, forgot, auth/callback
│   │   │   ├── (main)/                 AppShell: browse, search, story, author, library, lists, notifications, settings
│   │   │   ├── (reader)/               trình đọc toàn màn hình (không shell)
│   │   │   ├── (studio)/studio/        khu tác giả: stories, chapters, editor, analytics
│   │   │   ├── (admin)/moderation/     hàng đợi báo cáo (chỉ moderator)
│   │   │   └── api/                    og image, sitemap, health
│   │   ├── lib/                        supabase clients, env, adapter Next (PlatformProvider)
│   │   └── proxy.ts
│   └── mobile/src/                     Vite + router client + adapter Capacitor
├── packages/
│   ├── ui/src/{components,lib,hooks}   shadcn + widget thuần giao diện (không biết Supabase)
│   ├── design-tokens/                  tokens.css
│   ├── utils/src/                      TS thuần, không React: slugify, format, date, id, cursor, result
│   ├── validation/                     Zod (đã có)
│   ├── database/                       type sinh ra (đã có)
│   └── features/src/
│       ├── _shared/                    providers (Data, Query, Platform, Auth, I18n), error model, hooks chung
│       ├── auth/  profile/  discovery/  story/  reader/  library/
│       ├── studio/  editor/  engagement/  notifications/  search/
│       ├── moderation/  settings/  analytics/
│       └── <feature>/
│           ├── api/        hàm truy vấn thuần: (client, args) => data
│           ├── keys.ts     query keys
│           ├── hooks/      useX bọc TanStack Query
│           ├── screens/    XScreen (router-agnostic)
│           ├── components/ chỉ dùng trong feature này
│           ├── model/      mapping, helper nghiệp vụ, Zod cục bộ
│           ├── index.ts    API công khai duy nhất của feature
│           └── *.test.ts
├── supabase/{migrations,functions,tests,scripts}
├── docs/WBS.md
└── android/ ios/                       sinh bởi Capacitor
```

### 1.3 Quy tắc phụ thuộc (kiểm bằng ESLint `no-restricted-imports`, WP 0.1)

| Package | Được import | Không được import |
| --- | --- | --- |
| `utils`, `validation`, `database`, `design-tokens` | chỉ thư viện thuần | React, Next, Supabase client, package khác trong repo (trừ `database`→không gì; `validation`→`database` ở dev) |
| `ui` | `utils`, `design-tokens` | `features`, `database`, Supabase, `next/*` |
| `features` | `ui`, `utils`, `validation`, `database` | `next/*`, `apps/*`; feature khác chỉ qua `index.ts` |
| `apps/web`, `apps/mobile` | mọi package | import ngược lẫn nhau |

Quy ước khác: business logic nằm ở `api/` và `model/`, không nằm trong component hay hook; mọi ghi quan trọng đi qua RPC hoặc `api/` có test; không màu/spacing thô (chỉ token); chuỗi UI qua i18n; một feature = một PR/vertical slice gồm cả DB (nếu cần) → validation → api → UI → test.

---

## 2. Cách đọc WBS

- Mỗi WP có: **mã, đầu ra, phụ thuộc, ước lượng (ngày), tiêu chí hoàn thành (DoD)**. DoD chung cho mọi WP: typecheck + test qua, không màu/spacing thô, i18n, trạng thái loading/empty/error, kiểm tra thủ công trên mobile 390px và desktop, README/WBS cập nhật.
- **Thứ tự = từ core ra ngoại vi**: Core (Phase 1–3) → Tương tác (4) → Khám phá/xã hội (5) → Xung quanh (6) → Mobile (7). Phase 8 chạy song song.
- Widget dùng chung được **xây cùng slice đầu tiên cần nó** (tránh xây UI chưa có người dùng), nhưng hợp đồng và vị trí đã định ở WP 0.5.

---

## Phase 0. Nền tảng (còn lại) · ~18 ngày

| WP | Đầu ra | Phụ thuộc | Ngày | DoD đặc thù |
| --- | --- | --- | --- | --- |
| **0.0** ⬜ | **Dựng project Supabase dev/staging**: áp migration, bật `pg_cron`, kiểm `citext`/`pg_trgm` (schema `extensions`), chạy `get_advisors` (security + performance), cấu hình Auth (email, redirect URL, OAuth Google), tạo bucket Storage | Quyết định của owner về org/billing | 1.5 | Advisors không có cảnh báo security mức cao; test SQL và `db:types:check` vẫn qua; ghi lại sai khác với PostgreSQL thuần |
| **0.1** ✅ | ESLint flat config + quy tắc ranh giới (1.3); Prettier; CI GitHub Actions: `db:verify`, `db:types:check`, `typecheck`, `test`, `build web` _Đã làm: ESLint flat config, Prettier, workflow CI; TypeScript ghim 6.0.3 vì typescript-eslint chưa hỗ trợ 7.x._ | — | 2 | CI xanh trên PR; vi phạm ranh giới làm CI đỏ |
| **0.2** ✅ | Tách `packages/utils`; dựng khung `packages/features` + template feature (1.2) + script `pnpm gen:feature <name>` _Đã làm: `@storynest/utils`, khung `@storynest/features`, `pnpm gen:feature <tên>`._ | 0.1 | 1.5 | Sinh feature mới compile được, có test mẫu |
| **0.3** ✅ | **Common code** trong `features/_shared`: `DataProvider`, `QueryProvider` (cấu hình retry/staleTime), `PlatformProvider` + adapter Next, `AuthProvider` (session, user, profile), mô hình lỗi (`AppError` ← SQLSTATE `42501/PT404/PT409/22023`, lỗi mạng, validation), `useAppToast`, error boundary _Đã làm: `AppError` + `toAppError`/`unwrap` (một nguồn sự thật với `classifyRpcError`), `createQueryClient` (không retry lỗi vĩnh viễn, mutation không retry), `QueryProvider`, `DataProvider`, `PlatformProvider` + adapter Next (`apps/web/src/lib/platform`), `AuthProvider`/`useAuth`, `ToastProvider`/`useAppToast` (port; **chưa mount**, vào cùng WP 0.5 khi có sonner), `ErrorBoundary`. `useAutosave` dời sang WP 3.6._ | 0.2, Q1 | 4 | Có test cho ánh xạ lỗi; web render được Screen mẫu qua adapter |
| **0.4** ⬜ | **I18n** (Q4: thư viện không phụ thuộc Next) vi (mặc định) + en: cơ chế chọn ngôn ngữ, định dạng ngày/số/số nhiều, lint chặn chuỗi cứng trong screens | 0.3 | 1.5 | Đổi ngôn ngữ không reload; kiểm tra thiếu key bằng test |
| **0.5** ✅ | **Shared widget, lớp primitive**: shadcn `Input, Textarea, Label, Form, Select, Checkbox, Switch, Dialog, Sheet, Drawer, DropdownMenu, Tabs, Tooltip, Sonner(toast), Skeleton, Avatar, Badge, Separator, ScrollArea, Sidebar`; widget khung: `AppShell` (header + sidebar desktop + `BottomNav` mobile), `PageHeader`, `EmptyState`, `ErrorState`, `InfiniteList`, `StatPill`, `ConfirmDialog` _Đã làm: primitive shadcn (Input, Textarea, Label, Form, Select, Checkbox, Switch, Dialog, Sheet, DropdownMenu, Tabs, Tooltip, Sonner, Skeleton, Avatar, Badge, Separator, ScrollArea) lấy bằng shadcn CLI; widget `AppShell`, `BottomNav`, `PageHeader`, `EmptyState`, `ErrorState`, `StatPill`, `InfiniteList`, `ConfirmDialog`; trang `/dev/gallery` (404 ở production); `ToastProvider` + Toaster đã mount; `pnpm check:tokens` chặn màu thô trong CI. **Sidebar desktop chưa làm** (chỉ cần khi có bố cục desktop có sidebar; làm khi đến Studio/WP 3.1)._ | 0.1 | 3.5 | Mỗi widget dùng token; có trang `/dev/gallery` (chỉ dev) hiển thị mọi trạng thái sáng/tối, desktop/mobile |
| **0.6** ✅ | **Utils** (`packages/utils`, có test): `slugify` (bỏ dấu tiếng Việt), `formatCount` (1,2K), ngày giờ (tương đối, múi giờ), `excerpt`, `buildStorageUrl`, `newId` (UUID phía client cho offline), `debounce`/`useAutosave`, mã hóa/giải mã cursor phân trang, `isNative`/safe-area hook, `Result` _Đã làm: slugify, formatCount, formatRelativeTime, excerpt, newId/isUuid, cursor, URL Storage, debounce, Result. `isNative`/safe-area và `useAutosave` (cần React) chuyển sang WP 0.3._ | 0.2 | 2 | Phủ test các trường hợp biên (dấu, emoji, rỗng) |
| **0.7** ⬜ | Hạ tầng test: Vitest + Testing Library cho `features`; Playwright e2e smoke chạy với project Supabase dev (seed + user test) | 0.0, 0.3 | 2 | `pnpm test:e2e` chạy được cục bộ và trên CI |

---

## Phase 1. CORE A: Tài khoản · ~9 ngày

Không có tài khoản thì không ghi được gì, nên đi trước. DB đã xong, còn lại là UI + luồng.

| WP | Đầu ra | Phụ thuộc | Ngày | DoD đặc thù |
| --- | --- | --- | --- | --- |
| **1.1** 🟡 | Đăng ký / đăng nhập email + mật khẩu, Google OAuth; xác minh email; quên/đặt lại mật khẩu; callback route _Đã làm (email + mật khẩu): đăng ký (xác nhận email), đăng nhập, quên và đặt lại mật khẩu, `/auth/callback` (PKCE, `next` luôn qua `safeRedirectPath`), mã lỗi Supabase thật hiển thị đúng. **Chưa làm: Google OAuth** (cần client ID/secret). Kiểm chứng đăng nhập thành công + `handle_new_user` trên Supabase thật cần một tài khoản test và SMTP, sẽ làm ở WP 0.7._ | 0.0, 0.3, 0.5 | 3 | Lỗi hiển thị đúng (sai mật khẩu, email trùng, link hết hạn); mọi form dùng Zod |
| **1.2** ✅ | Đăng xuất; guard route phía server (redirect có `next`); `AuthProvider` đồng bộ phiên giữa tab _Đã làm: proxy chuyển khách khỏi trang cần đăng nhập tới `/login?next=…` và chuyển thành viên khỏi `/login`/`/register` (`route-guard.ts`, khớp theo từng đoạn đường dẫn), `requireUser()` kiểm lại ở server bằng `getClaims()`; chạy thật trên Supabase: đăng nhập, giữ phiên sau khi tải lại, đăng xuất._ | 1.1 | 1.5 | Truy cập `/studio` khi chưa đăng nhập → login rồi quay lại đúng trang |
| **1.3** ✅ | `AppShell` biết trạng thái đăng nhập (menu người dùng, nút Đăng nhập) _Đã làm: feature `shell` (`MainShell`, `SiteHeader`, `UserMenu` với đăng xuất), trang chủ và `/me` dùng chung khung `(main)`; thanh điều hướng dưới chỉ có Trang chủ và Tôi cho tới khi có thêm màn hình._ | 0.5, 1.2 | 1 | |
| **1.4** ✅ | Hồ sơ cá nhân: xem/sửa `username`, `display_name`, `bio` (kiểm tra trùng username, thông báo lỗi rõ) _Đã làm: `/me/edit` (`EditProfileScreen`), schema `profileFormSchema` (mã lỗi ổn định, bio rỗng = NULL), trùng username (không phân biệt hoa thường) hiện ngay trên trường; kiểm chứng trên Supabase thật gồm cả thử sửa hồ sơ người khác / tự đổi `account_status` qua REST (bị chặn)._ | 1.3 | 1.5 | RLS cấm sửa `account_status` đã có test; UI không gửi cột đó |
| **1.5** ⬜ | Upload avatar: bucket `avatars`, policy (chỉ ghi vào thư mục `{uid}/`), crop/resize phía client, `avatar_storage_key` | 0.0 (D3), 1.4 | 2 | Policy có test; không upload được vào thư mục người khác; giới hạn dung lượng/định dạng |

**M1a (cuối Phase 1)**: đăng ký → xác minh → đăng nhập → sửa hồ sơ trên web.

---

## Phase 2. CORE B: Đọc truyện · ~18 ngày

Có thể làm song song với Phase 3 nếu có 2 người (đọc dùng dữ liệu seed). Với 1 người: làm 2.1–2.5 trước để có thứ để xem, rồi sang Phase 3.

| WP | Đầu ra | Phụ thuộc | Ngày | DoD đặc thù |
| --- | --- | --- | --- | --- |
| **2.1** ✅ | **Seed**: category (có cây cha/con), tag mẫu, vài story + chapter đã publish (qua RPC thật) cho dev/e2e _Đã làm: `supabase/seed/dev_seed.sql` (8 category, 7 tag, 3 tác giả demo không đăng nhập được, 6 truyện gồm 1 truyện người lớn và 1 truyện riêng tư, 16 chương; 14 chương publish bằng RPC thật). Chạy lại an toàn, không có DELETE, từ chối chạy nếu phiên chưa `SET storynest.environment = 'dev'`; test `50_seed` chạy trong CI; đã áp lên `storynest-dev` và số liệu khớp bản local. Lưu ý cho WP 2.2: nhúng `app_users` từ `stories` phải chỉ rõ khóa ngoại (`owner:app_users!stories_owner_id_fkey(...)`) vì có nhiều quan hệ._ | 0.0, D4 | 1.5 | Một lệnh nạp lại được; không dùng cho production |
| **2.2** ✅ | Trang chủ/Khám phá cơ bản: "mới cập nhật" theo `updated_at` (cursor pagination, dùng `idx_stories_discover`), lọc theo category/ngôn ngữ; widget `StoryCard`, `StoryCover` | _Đã làm: feature `discovery` (một query lấy story + tác giả + thống kê; keyset `(updated_at, id)` có tie-break; lọc category gồm cả con, ngôn ngữ, ẩn truyện người lớn mặc định), widget `StoryCard`, trang chủ SSR prefetch + hydrate (đã kiểm chứng HTML server chứa thẻ truyện trên Supabase thật). `StoryCover` chưa tách riêng (bìa nằm trong `StoryCard`). Lưu ý: `queries.ts` KHÔNG được có `"use client"` (có test bảo vệ) vì Server Component gọi `prefetchDiscovery`._ 2.1, 0.5 | 3 | Phân trang cursor ổn định khi dữ liệu thay đổi; không N+1 (một query lấy story + author + stats) |
| **2.3** ✅ | **Trang story** (SSR + SEO): bìa, tên, tác giả, mô tả, tag, thống kê, danh sách chương (`ChapterList`), nút "Đọc tiếp"/"Bắt đầu đọc", trạng thái hiển thị theo `visibility`/`status`/`is_mature` | 2.2 | 3 | Metadata/OG đúng; story private/draft trả 404 cho người lạ (đã có RLS); `unlisted` có `noindex` | _Đã làm: feature `story` (`getStory` một query kèm tác giả/thể loại/thống kê/thẻ; `listStoryChapters` chỉ chương đã đăng, đúng thứ tự), route `/story/{id}/{slug}` SSR + hydrate, `generateMetadata` (title/description/OG, canonical), slug sai → 308 về URL chuẩn, truyện không tồn tại/riêng tư/không phải uuid → 404 thật, `unlisted`/`private` → `noindex`; widget `StoryCover` dùng chung với `StoryCard`. Đã kiểm chứng trên Supabase dev thật (HTML server, 404, 308, ảnh chụp desktop + mobile, không lỗi console). Quyết định URL chương: `/story/{id}/{slug}/{chapterSlug}` (slug chương duy nhất trong truyện); trang đọc làm ở WP 2.4 nên link chương hiện chưa mở được. Nút "Đọc tiếp" cần tiến độ (WP 2.5) nên hiện chỉ có "Bắt đầu đọc". Chưa kiểm chứng ca `unlisted` trên dữ liệu thật vì seed không có truyện unlisted (đã có test đơn vị)._
| **2.4** ✅ | **Trình đọc chương** (SSR): render `chapter_version_blocks` (paragraph, heading, image, divider, marks), chương trước/sau, thanh công cụ `ReaderToolbar`, mục lục chương, `ReadingProgress` | 2.3 | 4 | Mỗi `block_id` có anchor ổn định (cho bình luận theo đoạn); chương chưa publish/đã gỡ → 404; cỡ chữ tối ưu ~66ch | _Đã làm: feature `reader` (`getChapterContent` một query lấy chương + bản đã đăng + các block; chuẩn hóa block lạ/hỏng thay vì làm hỏng cả chương; `RichText` render mark bằng node React, không dùng HTML thô; mỗi block có anchor `b-{block_id}`), route `/story/{id}/{slug}/{chapterSlug}` SSR + hydrate chung query client với trang truyện, 404 thật cho chương không có/chưa đăng/truyện ẩn, 308 khi sai slug truyện, `noindex` theo visibility; `ReaderToolbar` (về truyện, mục lục dạng sheet), `ReadingProgress` (widget ui, rAF), chương trước/sau, cột đọc 66ch. Đã kiểm chứng trên Supabase dev thật (200/308/404, rel prev/next, nút bị vô hiệu ở chương đầu/cuối). Lỗi tìm ra nhờ chạy thật: chuỗi select thiếu dấu phẩy (`first_published_atversion`) mà mock không bắt được → test đã siết. Chưa kiểm chứng: ảnh trong chương (chưa có bucket `chapter-images`, WP 3.3), mark in đậm/nghiêng trên dữ liệu thật (seed không có mark; có test đơn vị)._
| **2.5** ✅ | **Tiến độ đọc**: lưu `user_chapter_progress` (đoạn cuối, %) và `user_story_progress`, debounce, khôi phục vị trí khi mở lại; xử lý chương đã đổi phiên bản (`last_version_id`) | 2.4, 1.2 | 2 | Khách (chưa đăng nhập) không lỗi; ghi tối đa 1 lần/vài giây; có test debounce | _Đã làm: RPC `save_reading_progress(chapter, percent, block?)` (migration `20261104000000`, SECURITY INVOKER nên RLS vẫn áp dụng; một transaction ghi cả `user_chapter_progress` và `user_story_progress`; server tự chọn `last_version_id` = bản đang đăng, bỏ `last_block_id` nếu block không thuộc bản đó, `completed_at` đặt khi ≥95% và không bị xóa khi đọc lùi); test DB `60_progress` (khách bị chặn, percent sai, chương chưa đăng/truyện riêng tư → PT404, cập nhật tại chỗ, hoàn thành bền, block lạ, republish, riêng tư giữa người dùng). Feature `progress`: writer giới hạn 1 lần ghi/5s (ghi ngay lần đầu, 1 lần cuối với vị trí mới nhất, không ghi lặp, lỗi thì thử lại lần sau), flush khi ẩn tab/rời trang, khách không gọi gì; khôi phục vị trí khi mở lại (ưu tiên block, rơi về % nếu block đã mất vì republish, bỏ qua nếu chương đã xong hoặc URL có `#anchor`); trang truyện hiện "Đọc tiếp · Chương N" (chương đang đọc, hoặc chương kế nếu đã xong). Đã áp lên `storynest-dev` và kiểm chứng bằng trình duyệt thật với user thử: ghi khi mở và khi cuộn, tải lại về đúng chỗ (238→228px), sticky completion, nút "Đọc tiếp" đổi đúng. Chưa kiểm chứng: ca republish trên dữ liệu thật (chỉ test DB), tải lại khi block ảnh làm lệch bố cục._
| **2.6** ✅ | **Ghi nhận lượt đọc có dedupe (D2)**: bảng sự kiện đọc + RPC ghi (một lượt/người/chương/khoảng thời gian, khách theo cookie ẩn danh), job gom vào `chapter_stats`/`story_stats` | 2.4, 0.0 | 2.5 | Refresh trang không tăng lượt đọc; có test dedupe; không ghi counter trực tiếp trên mỗi request | _Đã làm: migration `20261104000100_chapter_reads`: bảng `chapter_read_events` (khóa duy nhất người đọc × chương × ngày UTC, không FK tới `app_users` để sống sót khi ẩn danh hóa tài khoản, RLS bật và không cấp quyền), RPC `record_chapter_read(chapter, anon_id?)` (anon + đăng nhập; người đăng nhập tính theo tài khoản, bỏ qua anon id; chương không đọc được → PT404), `aggregate_reads` (gom theo lô `FOR UPDATE SKIP LOCKED` vào `chapter_stats`/`story_stats` trong một câu lệnh, đánh dấu đã gom nên chạy lại không cộng thêm) và `purge_read_events` (chỉ xóa sự kiện đã gom quá 90 ngày), pg_cron mỗi phút / hằng ngày; test DB `70_reads` (dedupe, ngày mới tính lại, ranh giới quyền, lô, purge) và sửa `30_outbox` đếm job theo tên. Client: `useReadRecorder` chỉ báo sau 10 giây tab hiển thị (ẩn tab thì dừng và tính lại), chờ biết session trước để không đếm một người hai lần (khách rồi thành viên), anon id ngẫu nhiên trong localStorage (không dùng cookie: cùng tác dụng dedupe, không cần server; có fallback khi storage bị chặn). Đã áp lên `storynest-dev`, kiểm chứng bằng trình duyệt thật: khách lần đầu `true`, hai lần tải lại `false`, thoát trước 10 giây không gọi gì, thành viên gọi không kèm anon id, job cron gom đúng (chương/truyện +1). Hạn chế đã biết: anon id do client tự chọn nên có thể bị làm giả để tăng lượt đọc (lượt đọc là tín hiệu phổ biến, không phải tiền; cần id do server cấp nếu điều đó thay đổi). Chưa làm: trending theo thời gian (sự kiện đã có `created_at`, dùng ở phase sau)._
| **2.7** ✅ | Tùy chọn đọc: cỡ chữ, giãn dòng, font, nền (sáng/sepia/tối); lưu cục bộ, đồng bộ vào hồ sơ khi đăng nhập | 2.4 | 1.5 | Áp dụng tức thì, không nháy giao diện khi tải | _Đã làm: `ReaderPreferences` (cỡ chữ 4 mức, giãn dòng 3 mức, phông có/không chân, nền theo giao diện/sáng/sepia/tối) định nghĩa một chỗ trong `@storynest/validation` (schema `.catch` từng trường về mặc định nên giá trị lạ/hỏng không phá được trình đọc) cùng hằng có tên; bản trên thiết bị ở localStorage qua external store (đổi là áp ngay, đồng bộ giữa các tab, chặn storage vẫn dùng được trong phiên); áp dụng bằng thuộc tính `data-reader-*` trên `<html>` chỉ khi đang mở trình đọc (đóng là xóa sạch, giao diện site trở lại), CSS nằm trong `design-tokens` (sepia là bộ biến màu mới, `check:tokens` vẫn sạch); không nháy giao diện: script nhỏ trong `<head>` của layout gốc áp tùy chọn trước khi vẽ, chỉ ở đường dẫn chương (`CHAPTER_PATH_PATTERN`, có test), điều hướng client dùng layout effect; bản trên tài khoản: bảng `user_reader_preferences` (migration `20261104000200`, RLS chỉ chủ sở hữu, JSON object ≤512 byte), tài khoản có bản lưu thì thiết bị nhận bản đó, chưa có mà thiết bị đã tùy chỉnh thì tải lên, sau đó mỗi thay đổi lưu sau 1,5 giây; lỗi/khách không ảnh hưởng gì. Lỗi tìm ra nhờ chạy thật: upsert cần quyền `UPDATE (user_id)` (RLS vẫn chặn đổi chủ), test DB `80` đã thêm ca upsert; cảnh báo React về thẻ `<script>` trong cây client đã loại bằng cách đặt script ở layout gốc. Kiểm chứng trên Supabase dev thật: chọn sepia/có chân/cỡ lớn áp ngay (24px, nền đổi), chỉ script bootstrap cũng áp đúng khi chặn toàn bộ JS bundle, SPA vào/ra trình đọc áp rồi xóa đúng, thành viên chọn Tối rồi thiết bị mới đăng nhập nhận Tối, không lỗi console. Chưa kiểm chứng: Safari/iOS (light-dark() cần trình duyệt mới), tương phản màu sepia theo WCAG chưa đo._

**M1b (cuối Phase 2)**: người dùng duyệt, mở story, đọc chương, thoát ra vào lại vẫn đọc tiếp đúng chỗ.

---

## Phase 3. CORE C: Viết và đăng (Studio) · ~28 ngày

Phần lớn rủi ro kỹ thuật nằm ở editor. Đây là vòng lặp còn lại của core: tác giả đăng, người đọc thấy ngay.

| WP | Đầu ra | Phụ thuộc | Ngày | DoD đặc thù |
| --- | --- | --- | --- | --- |
| **3.1** ✅ | Khung Studio (`/studio`): danh sách story của tôi (draft/ongoing/...), trạng thái, thao tác nhanh | 1.2, 0.5 | 2 | Chỉ thấy story của mình + story được mời | _Đã làm: feature `studio` + route `/studio` (proxy chuyển khách về đăng nhập, `requireUser` kiểm lại, RLS quyết định dữ liệu): danh sách truyện của tôi gồm truyện sở hữu và truyện được mời (hai truy vấn lọc rõ theo người dùng vì RLS còn cho đọc truyện công khai của người khác; không lấy truyện đã xóa mềm; số chương bằng embed `chapters(count)`), gộp một lần, mới cập nhật trước, chủ sở hữu thắng nếu trùng, vai trò lạ bị bỏ; mỗi dòng có bìa, trạng thái, hiển thị (riêng tư/liên kết/công khai), 18+, nhãn vai trò (không gắn nhãn cho chủ sở hữu), số chương, thời gian cập nhật và liên kết "Xem trang truyện"; mục "Studio" trong menu tài khoản và "Viết" trong thanh điều hướng dưới. Đã kiểm chứng trên Supabase dev thật với user thử: khách bị chuyển về `/login?next=/studio`, thành viên thấy đúng 2 truyện (sở hữu + được mời, không thấy truyện công khai của người khác), mở trang truyện từ Studio được, khách vào truyện riêng tư nhận 404. Chưa có: nút tạo truyện/chỉnh sửa/quản lý chương (WP 3.2 trở đi), danh sách truyện đã xóa mềm để khôi phục (WP 3.2), phân trang (chưa cần khi số truyện của một tác giả còn nhỏ)._
| **3.2** ✅ | Tạo/sửa story: tiêu đề, slug (tự sinh, kiểm tra trùng theo owner), mô tả, category, ngôn ngữ, mature, visibility, status; soft-delete/khôi phục | 3.1, 0.6 | 3 | Form dùng `storyCreateSchema`; slug trùng báo lỗi rõ; UUID sinh phía client | _Đã làm: route `/studio/new` và `/studio/story/{id}` (bảo vệ hai lớp), form dùng `storyFormSchema` (mã lỗi ổn định, UI dịch) rồi qua `storyCreateSchema`/`storyUpdateSchema` trước khi gửi nên lệch hợp đồng sẽ lỗi ngay; id sinh phía client một lần cho mỗi lần mở form (thử lại sau khi mất phản hồi dùng lại đúng id nên không thể tạo hai truyện); slug tự sinh từ tên ("Đừng Bỏ Cuộc" → `dung-bo-cuoc`) cho tới khi tác giả sửa, và không bao giờ tự đổi khi đang sửa truyện đã có; slug trùng theo chủ sở hữu (ràng buộc duy nhất `(owner_id, slug)`, nhận biết bằng mã `23505`) báo ngay trên ô đường dẫn thay vì thông báo chung; thể loại hiển thị cây cha › con, ngôn ngữ, tình trạng, hiển thị (kèm giải thích), 18+; chỉnh sửa chỉ khi dữ liệu thay đổi mới bật nút lưu; biên tập viên chỉ xem (đúng chính sách RLS), chỉ chủ sở hữu mới xóa; xóa mềm có hộp xác nhận, khôi phục từ trang truyện hoặc từ mục "Truyện đã xóa" của Studio (ẩn sau nút bật/tắt); không có xóa cứng. Sau mỗi thay đổi làm mới danh sách Studio, trang truyện và bảng tin trang chủ. Đã kiểm chứng trên Supabase dev thật với user thử: tạo truyện (id do client sinh), slug trùng báo đúng ô, sửa (slug giữ nguyên), xóa → khôi phục; thử tấn công qua REST: tạo truyện với `owner_id` người khác 403, sửa truyện người khác không khớp dòng nào, đổi `owner_id` truyện của mình 403. Chưa làm: kiểm tra trùng slug ngay khi gõ (hiện báo khi lưu), cover (WP 3.3), chuyển truyện sang người khác._
| **3.3** 🟡 | Upload cover (bucket `covers`, policy theo `{story_id}`, resize), **quy ước `image_storage_key` + kiểm tra trong RPC publish** (D3) | 3.2, 0.0 | 2.5 | RPC từ chối key không thuộc story/người dùng; có test SQL | _Đã làm một phần (phần DB của D3, không cần khóa): quy ước khóa `<scope_id>/<tên_file>` (scope = id truyện cho `covers` và `chapter-images`, id người dùng cho `avatars`; tên file một đoạn `[A-Za-z0-9._-]` bắt đầu bằng chữ/số, tối đa 200 ký tự); migration `20261104000300`: hàm thuần `is_valid_storage_key`, ràng buộc CHECK trên `stories.cover_storage_key` và `app_users.avatar_storage_key` (scope là id của chính dòng), trigger trên `chapter_version_blocks` chặn khóa ảnh ngoài thư mục truyện của chương với mã 22023 (mọi đường publish đều qua đây: publish ngay, hẹn giờ, job đến hạn; bản nháp vẫn thoáng để autosave không bao giờ lỗi); test SQL `90_storage_keys` (hàm, cover, avatar, publish từ chối, không để lại phiên bản dở dang, job đến hạn không đăng chương có ảnh ngoại lai). Phía client `isValidStorageKey` / `buildStorageKey` trong `@storynest/utils` (tên file sinh ngẫu nhiên, không lấy từ tên file người dùng), có test hợp đồng đọc thẳng quy tắc từ migration nên hai bên không lệch. Đã áp lên `storynest-dev` và thử qua REST: cover trỏ sang truyện khác 400, traversal 400, khóa đúng 204. **Chưa làm (cần thiết lập Storage, đang bỏ qua theo chỉ dẫn)**: tạo bucket `covers`/`chapter-images`/`avatars` và policy ghi theo thư mục, giao diện upload + resize cover; làm cùng WP 0.0 (bucket) và WP 1.5._
| **3.4** ✅ | Quản lý chương: danh sách, tạo, đổi tên slug, **reorder (RPC mới, D5)**, soft-delete/khôi phục, **archive** | 3.2 | 3 | Reorder an toàn với unique `(story_id, sort_order)` (deferrable); test đồng thời | _Đã làm: migration `20261104000400` với 4 RPC `SECURITY DEFINER` kiểm vai trò tường minh: `create_chapter` (nối vào cuối ở vị trí kế tiếp và tạo luôn bản nháp có tên trong cùng giao dịch), `reorder_chapters` (nhận đúng toàn bộ chương chưa xóa theo thứ tự mới; thiếu/thừa/trùng/chương của truyện khác/đã xóa đều bị từ chối 22023 nên màn hình cũ không thể âm thầm làm mất hay sống lại chương; đánh số lại 1..n, chương đã xóa nằm sau; khóa duy nhất `(story_id, sort_order)` hoãn kiểm tra nên không vấp chính nó), `archive_chapter`/`unarchive_chapter` (cất chương khỏi người đọc mà không xóa, gỡ con trỏ bản đã đăng và lịch hẹn giống unpublish; bỏ lưu trữ trả về bản nháp; chỉ chủ sở hữu/đồng tác giả) và trigger chặn đăng/hẹn giờ chương đang lưu trữ (PT409) ở mọi đường. Mỗi hàm khóa dòng truyện trước nên các lệnh đồng thời chạy lần lượt. Test SQL `100_chapter_management` (vai trò, các ca từ chối, không để lại dữ liệu dở khi lỗi, xóa mềm/khôi phục, lưu trữ rồi đăng lại) và **kiểm tra đồng thời thật** `supabase/scripts/concurrency-checks.sh` chạy trong `db:verify`: hai tác giả cùng nối chương (vị trí phải ra 1..N không trùng, không khoảng trống, không lỗi) và cùng sắp xếp theo hai thứ tự ngược nhau (mọi lệnh thành công, kết quả là đúng một trong hai thứ tự, không trộn). Thử phá: bỏ khóa trong `create_chapter` làm bài kiểm tra đồng thời vỡ (duplicate key); bỏ khóa trong `reorder_chapters` thì không vỡ vì khóa dòng ở từng UPDATE đã tuần tự hóa hai lệnh sắp xếp, khóa truyện ở đó là lớp phòng thủ cho xen kẽ với tạo/xóa (chưa có bài kiểm tra riêng cho xen kẽ đó). Giao diện `/studio/story/{id}/chapters`: danh sách, thêm chương (id sinh một lần cho mỗi lần điền nên thử lại không tạo hai chương, slug tự sinh), lên/xuống bằng nút (cập nhật lạc quan, hoàn lại nếu máy chủ từ chối, rồi tải lại để khớp thực tế), đổi đường dẫn bằng hộp thoại (trùng báo ngay trên ô), lưu trữ/bỏ lưu trữ, xóa mềm/khôi phục có xác nhận; biên tập viên chỉ thêm/sắp xếp/đổi đường dẫn, không lưu trữ hay xóa. Đã kiểm chứng trên Supabase dev thật với user thử: thêm 3 chương, đưa chương 3 lên, đổi đường dẫn trùng báo đúng, lưu trữ → bỏ lưu trữ, xóa → khôi phục (chương đã xóa nằm cuối rồi trở về đúng chỗ), dữ liệu trong DB khớp. Lưu ý: số chương theo thứ tự nên sau khi xóa có thể còn khoảng trống cho tới khi tác giả sắp xếp lại (đã ghi chú trên màn hình). Chưa có: liên kết soạn nội dung chương (WP 3.5)._
| **3.5** 🟡 | **Editor Tiptap**: heading, paragraph, bold/italic/underline/strike, divider, ảnh (upload `chapter-images`); **bộ chuyển đổi Tiptap JSON ↔ `chapter_drafts.body`** giữ `block_id` ổn định (block mới = UUID mới, block sửa giữ id); đếm từ bằng `countWords` | 3.4, 3.3 | 7 | Round-trip test (JSON→body→JSON không mất dữ liệu); sao chép/dán, undo/redo không đổi `block_id` của đoạn còn lại; `chapterBodySchema` luôn qua trước khi lưu | _Đã làm (trừ ảnh): thêm Tiptap 3.32.2 (core, react, pm, starter-kit, extension-unique-id; ghim phiên bản). **Bộ chuyển đổi** `docToBody`/`bodyToDoc` (thuần, có test): mỗi node cấp cao mang `blockId` nên block sửa nội dung giữ id, block mới nhận UUID mới, id trùng được đánh số lại (cái đầu giữ), mark lưu theo khoảng UTF-16 (đúng đơn vị của RPC và trình đọc; mark chạy xuyên các đoạn định dạng khác nhau được gộp, mark chồng nhau được giữ), xuống dòng cứng là `\n`; gặp nội dung body không biểu diễn được thì ném `UnsupportedContentError` thay vì âm thầm bỏ; round-trip body → doc → body không đổi, kể cả qua một Editor thật. **Editor** chỉ cho đúng những gì body chứa: đoạn, một cấp tiêu đề, in đậm/nghiêng/gạch chân/gạch ngang, ngắt dòng, đường phân cách, khối ảnh (đã tắt danh sách, trích dẫn, mã, liên kết); `UniqueID` cấp id cho khối mới, tách đoạn giữ id ở nửa đầu, dán (đường dán thật qua sự kiện paste) cho bản sao id mới còn bản gốc giữ nguyên, hoàn tác/làm lại không đổi id các đoạn còn lại. Màn hình `/studio/story/{id}/chapter/{chapterId}` (liên kết "Soạn nội dung" ở danh sách chương): tên chương, thanh công cụ có trạng thái theo con trỏ, đếm từ bằng `countWords`, nút lưu nháp so sánh `revision` (chỉ ghi nếu vẫn là bản mình đã mở; bản cũ → xung đột, giữ nguyên chữ trên màn hình, chỉ tải lại khi tác giả yêu cầu), body và tiêu đề luôn qua `chapterDraftSaveSchema`/`chapterBodySchema` trước khi gửi, bản nháp có body không đọc được thì không mở (tránh ghi đè mất dữ liệu). Đã kiểm chứng trên Supabase dev thật bằng trình duyệt: gõ chữ, tiêu đề, in đậm, đường phân cách, lưu → DB có 5 khối với 5 id khác nhau và mark bold đúng khoảng; mở hai tab, tab hai lưu rồi tab một lưu → cảnh báo xung đột, chữ ở tab một vẫn còn; gọi RPC `publish_chapter` với `expected_revision` thành công và trình đọc hiển thị đúng chữ đậm, tiêu đề, đường phân cách, 5 neo `b-…`. **Chưa làm**: chèn ảnh (cần Storage, WP 0.0/3.3; nút chèn chưa có, nhưng chương đã chứa ảnh vẫn mở và lưu không mất); tự động lưu, giữ bản nháp cục bộ khi mất mạng, cảnh báo rời trang (WP 3.6); kiểm thử bằng bàn phím thật (IME tiếng Việt) chưa làm._
| **3.6** ✅ | **Autosave + xung đột**: lưu nháp theo `revision`, trạng thái "đã lưu/đang lưu/lỗi", cảnh báo khi rời trang, xử lý hai thiết bị cùng sửa (so `revision`) | 3.5 | 3 | Mất mạng giữa chừng không mất nội dung (giữ cục bộ, đồng bộ lại); test xung đột | _Đã làm: `createAutosaver` (thuần, có test giờ giả): lưu sau 2 giây không thay đổi và chậm nhất 10 giây khi gõ liên tục, một yêu cầu tại một thời điểm, chỉnh sửa trong lúc đang lưu kích hoạt lần lưu kế ngay khi lần đang chạy xong (không mất), lỗi (mất mạng, máy chủ) thử lại với khoảng nghỉ gấp đôi tối đa 30 giây và thử ngay khi trình duyệt báo `online`, xung đột thì dừng hẳn (không lặp lại một xung đột), nội dung không hợp lệ không thử lại cho tới lần sửa kế. Trạng thái hiển thị ở chân trình soạn: chưa lưu (sẽ tự lưu) / đang lưu / đã lưu / chưa lưu được đang thử lại / xung đột / kiểm tra lại tên và nội dung; nút Lưu vẫn có và báo bằng toast, tự lưu thì im lặng. Mất mạng giữa chừng không mất chữ: bản sao trên thiết bị (`localStorage`, theo từng chương, kèm `baseRevision`; đọc lại thì kiểm tra bằng `chapterBodySchema`, hỏng/không tin được thì bỏ qua; lỗi storage không bao giờ làm gián đoạn) được ghi sau mỗi 0,5 giây, khi rời trang, khi ẩn tab và khi xung đột, xóa khi đã lưu xong; mở lại mà có bản sao khác bản trên máy chủ thì hiện khung khôi phục (có cảnh báo nếu bản đó dựa trên phiên bản cũ hơn, vì khôi phục sẽ ghi đè thay đổi mới hơn) hoặc bỏ. Xung đột (hai thiết bị cùng sửa, so `revision`): chữ đang gõ vẫn còn trên màn hình, bản sao được ghi lại phòng khi tải lại, tải lại chỉ khi tác giả bấm, rồi bản của mình được đề nghị khôi phục lên trên bản mới. Cảnh báo khi rời trang (`beforeunload`) chỉ khi còn chữ chưa lưu; lưu ngay khi tab bị ẩn. Lỗi tìm ra nhờ chạy thật trên dev: bộ tự lưu tạo trong `useMemo` bị hủy bởi vòng dọn dẹp của React Strict Mode (chế độ phát triển) rồi chết luôn, nên tự lưu không bao giờ chạy trong môi trường dev dù test jsdom qua; đã chuyển tạo trong `useEffect` và thêm test chạy dưới `StrictMode` (bắt đúng lỗi cũ). Kiểm chứng trên Supabase dev thật bằng trình duyệt: gõ → "sẽ tự lưu" → sau 3 giây "Đã lưu" không bấm gì; tắt mạng, gõ tiếp → bản sao có trong thiết bị; bật lại → tự lưu xong và bản sao được xóa; mở lại với bản sao cũ → khung khôi phục kèm cảnh báo phiên bản cũ → khôi phục → tự lưu. Chưa kiểm chứng: một lần đóng tab thật khi đang offline (chỉ mô phỏng bằng bản sao ghi tay), đồng bộ bản sao giữa nhiều tab của cùng một trình duyệt._
| **3.7** ✅ | **Publish / hẹn giờ / gỡ**: nút và trạng thái theo vai trò, truyền `expected_revision`, ánh xạ lỗi SQLSTATE sang thông báo, chọn thời gian theo múi giờ người dùng | 3.6, 0.3 | 2.5 | Bấm đúp không tạo 2 phiên bản; editor không thấy nút gỡ; kiểm thử đủ 4 mã lỗi | _Đã làm: bảng "Đăng chương" trong trình soạn: trạng thái hiện tại (bản nháp / hẹn giờ kèm giờ theo múi giờ của người dùng / đã đăng / đã lưu trữ), nút Đăng chương (hoặc Đăng bản mới nếu đã đăng), Hẹn giờ… (hộp thoại `datetime-local`, hiện múi giờ, đổi giờ địa phương sang thời điểm UTC đúng, từ chối bỏ trống/quá khứ/chưa tới 1 phút trước khi hỏi máy chủ) và Gỡ chương (hoặc Hủy hẹn giờ) có xác nhận, chỉ chủ sở hữu/đồng tác giả (biên tập viên chỉ đăng và hẹn giờ; vai trò lấy từ chính hàm `story_role` của DB). Mọi thao tác dựa trên bản nháp đã lưu: chữ chưa lưu được lưu trước rồi mới đăng với đúng `expected_revision` (bản nháp bị đổi ở nơi khác thì bị từ chối PT409 chứ không bị đăng đè); lưu không được (tên trống, nội dung không hợp lệ, mất mạng) thì không đăng và báo rõ; chương lưu trữ không đăng/hẹn giờ được (có hướng dẫn bỏ lưu trữ). Bốn mã lỗi của hợp đồng RPC (42501, PT404, PT409, 22023) mỗi mã một thông báo riêng, không lộ chữ thô của máy chủ. Nút khóa từ lần bấm đầu tới khi có trả lời (cả khoảng giữa hai lần render, test bấm ba lần trong một `act`), nên bấm đúp chỉ đăng một lần; **lưu ý: chống bấm đúp hiện chỉ ở client, máy chủ không tự khử trùng lặp** (hai yêu cầu cùng `expected_revision` tới cùng lúc vẫn tạo hai phiên bản). Thử phá 11 chỗ: bắt hết sau khi siết ba ca (bỏ khóa cần ba lần bấm trong một `act`; cách đổi giờ cần chạy ở múi giờ khác UTC nên test đặt `TZ=Asia/Ho_Chi_Minh`; phần kiểm tra xung đột thừa nên đã gỡ). Kiểm chứng trên Supabase dev thật bằng trình duyệt (múi giờ Asia/Saigon): đăng bản mới sau khi sửa (phiên bản 2), gỡ, hẹn 2 phút sau (hiện đúng giờ địa phương và múi giờ), chờ cron: chương tự đăng đúng 10:37 giờ Việt Nam = 03:37:00 UTC (phiên bản 3). Chưa kiểm chứng trên dữ liệu thật: vai trò biên tập viên (chỉ có test đơn vị và test SQL), bốn mã lỗi bằng trình duyệt (đã có test; mã thật đã thấy ở các WP trước)._
| **3.8** ✅ | Cộng tác: **luồng mời + chấp nhận (D9)** thay vì thêm thẳng, vai trò `co_author`/`editor`, giao diện quản lý | 3.2, 1.2 | 2.5 | Người bị mời có thể từ chối; policy + test mới | _Đã làm: migration `…000500_collaboration_invitations` — bảng `story_invitations` (RLS: chỉ chủ truyện và người được mời đọc, không ghi trực tiếp), RPC `invite_collaborator`/`respond_invitation`/`cancel_invitation`/`list_my_invitations`/`list_story_invitations`; **đóng đường thêm thẳng** (bỏ policy và quyền INSERT trên `story_collaborators`); tối đa 20 lời mời đang chờ/truyện, không mời chính mình/người đã cộng tác/đang chờ, mời lại được sau khi từ chối hoặc hủy; thông báo `collaboration_invited/accepted/declined`. Test `110_collaboration` + mutation (giới hạn 20, kiểm tra chủ truyện, đóng đường INSERT). Giao diện: `/studio/story/{id}/team` (chủ truyện: danh sách cộng tác, lời mời đã gửi + hủy, form mời theo tên người dùng + vai trò, gỡ có xác nhận), hộp thư "Lời mời cộng tác" ở đầu Studio (chấp nhận/từ chối), enum `INVITATION_STATUS` trong `@storynest/validation`. Đã kiểm thử trình duyệt thật với hai tài khoản trên dev (mời, tên sai/chính mình/trùng, chấp nhận, từ chối, hủy, gỡ, mời lại; editor không thấy nút Chỉnh sửa/Cộng tác viên và bị chặn ở trang team; chèn thẳng `story_collaborators`/`story_invitations` bằng API bị 403). **Còn thiếu:** đổi vai trò cộng tác viên đã có, hiển thị thông báo trong ứng dụng (WP 4.7). Lưu ý: áp migration lên dev bằng tay (Supabase MCP không ghi được)._ |
| **3.9** ✅ | Lịch sử phiên bản (xem chỉ đọc, so sánh, khôi phục vào bản nháp) và xem trước (preview đúng như trình đọc) | 3.7, 2.4 | 2.5 | Khôi phục tạo draft mới, không sửa version cũ (bất biến) | _Đã làm: không cần migration (RLS cho phép người sửa được đọc `chapter_versions`/`chapter_version_blocks`). Feature `history`: `/studio/story/{id}/chapter/{chapterId}/history` — danh sách phiên bản (mới nhất trước, đánh dấu bản đang hiển thị với độc giả, tác giả, số từ), xem chỉ đọc bằng chính `BlockView` của trình đọc, **so sánh** theo `block_id` (thêm/xóa/sửa; với bản nháp hoặc phiên bản khác; đoạn bị xóa hiện đúng chỗ cũ), **khôi phục vào bản nháp** có xác nhận: chỉ ghi `chapter_drafts` tại revision vừa đọc (xung đột → báo, không ghi đè), giữ nguyên `block_id`, xóa bản sao lưu cục bộ cũ; phiên bản cũ và bản đang đăng không đổi. `/studio/story/{id}/chapter/{chapterId}/preview` — bản nháp vẽ bằng `BlockView` + `ReaderSettingsSheet` + class `reader-text` của trình đọc, có ghi chú "chưa đăng". Nút "Xem trước"/"Lịch sử phiên bản" ở trình soạn. 19 test + 8 mutation; kiểm thử trình duyệt thật trên dev (3 phiên bản; so sánh; hủy xác nhận; khôi phục; số phiên bản vẫn 3, bản đang đăng vẫn là v3, draft revision tăng)._ |

**M1 = MVP core (cuối Phase 3)**: tác giả tạo story, viết chương, đăng; người khác đọc được ngay. **Mốc quan trọng nhất**, tương đương ~73 ngày công tính từ hiện tại (gồm cả nền tảng). Dừng ở đây để dùng thử với người thật trước khi đầu tư tiếp.

---

## Phase 4. Tương tác quanh core · ~21,5 ngày

| WP | Đầu ra | Phụ thuộc | Ngày | DoD đặc thù |
| --- | --- | --- | --- | --- |
| **4.1** ✅ | Vote chương (optimistic UI, hoàn tác khi lỗi) | 2.4 | 1.5 | Thao tác lặp không lỗi; số vote khớp sau refresh | _Đã làm: migration `…000600_chapter_votes` — RPC `set_chapter_vote(chapter_id, voted)` (SECURITY INVOKER: RLS của người gọi quyết định ai bình chọn được; lặp lại không đổi gì, trả về số vote), trigger `chapter_votes_count` cập nhật `chapter_stats.votes`/`story_stats.votes` cùng transaction (chỉ UPDATE khi xóa, không âm), `reconcile_vote_counts()` (chỉ service_role) sửa lệch — phần đầu của WP 4.8. Test `120_votes` + mutation. Giao diện: `VoteButton` cuối chương: cập nhật tức thì, khóa nút khi đang gửi, hoàn tác và báo lỗi khi bị từ chối, số của server thay số đoán; khách bấm thì sang `/login?next=` rồi quay lại chương; khóa truy vấn gồm user nên không lẫn trạng thái giữa tài khoản. 11 test + 7 mutation; trình duyệt thật trên dev: khách, đăng nhập quay lại, optimistic khi server chậm 1,5s, tải lại, khách khác thấy cùng số, bỏ bình chọn; DB khớp (0 dòng, bộ đếm 0, không âm)._ |
| **4.2** ✅ | **Bình luận**: theo chương và **theo đoạn (inline, bám `block_id`)**, trả lời lồng, like, sửa, xóa mềm, phân trang; widget `CommentThread` | 2.4, 1.2 | 6 | Bình luận bị ẩn bởi moderator hiển thị đúng cho tác giả bình luận; chống gửi trùng; giới hạn độ sâu trả lời | _Đã làm (phần cơ sở dữ liệu, migration `…000700_comments`, đã áp lên dev): `post_comment` (idempotent theo `id`; cùng nội dung, cùng chỗ, cùng người trong 30 giây trả về bình luận đầu thay vì tạo trùng), `edit_comment`, `delete_comment` (xóa mềm, lặp lại không lỗi), `set_comment_like` (idempotent, trả số like), `list_comments`/`list_replies` (phân trang keyset theo `(created_at, id)`, tối đa 51 dòng/trang), `comment_counts_by_block` (số bình luận mỗi đoạn); trả lời **một cấp**, trả lời nằm cùng đoạn với cha (trigger `comments_check_parent` chặn cả insert trực tiếp); bình luận bị moderator ẩn vẫn hiện cho tác giả với `status = hidden`; bình luận đã xóa/ẩn nhưng còn trả lời hiển thị dạng chỗ giữ (không nội dung, không tác giả). Test `130_comments` + 12 mutation (2 mutation tương đương: sửa bởi người khác vẫn bị RLS chặn). Giao diện (feature `comments`): `CommentThread` (ô viết bình luận có id ổn định cho mỗi lần gửi nên gửi lại không đăng trùng; danh sách phân trang "Tải thêm"; khách xem được và được dẫn sang `/login?next=` khi viết/like), `CommentItem` (thích tức thì + hoàn tác khi lỗi và cập nhật mọi danh sách chứa bình luận đó; trả lời một cấp, mở tự động sau khi trả lời; sửa/xóa qua menu chỉ cho tác giả, xóa có xác nhận; "đã sửa"; chỗ giữ cho bình luận đã xóa còn trả lời; ghi chú cho bình luận bị moderator ẩn chỉ tác giả thấy). Trình đọc: phần "Bình luận" cuối chương và nút bình luận cuối mỗi đoạn (kèm số) mở Sheet bình luận theo `block_id`. 27 test + 14 mutation; trình duyệt thật trên dev với hai tài khoản: phân trang 20 + tải thêm không trùng không sót, đăng/đăng lại cùng nội dung chỉ một, like, sửa, trả lời, xem trả lời, bình luận theo đoạn và số ở lề sau khi tải lại, xóa thành chỗ giữ. **Còn thiếu (không thuộc 4.2):** giới hạn tốc độ gửi, báo cáo/ẩn bình luận cho moderator, thông báo khi có người trả lời (4.7), bộ đếm bình luận (4.8). Dữ liệu thử đã xóa mềm._ |
| **4.3** ✅ | Follow story, lưu vào thư viện (hai khái niệm tách biệt như schema) | 2.3 | 1.5 | Follow đẩy notification khi có chương mới (đã có worker) | _Đã làm: migration `…000800_story_follows_saves` — `set_story_follow` / `set_story_save` (SECURITY INVOKER, RLS của người gọi quyết định truyện nào theo dõi/lưu được; lặp lại không đổi gì và trả về số hiện tại), trigger cập nhật `story_stats.followers` và `story_stats.saves` cùng transaction (chỉ UPDATE khi xóa, không âm), `reconcile_library_counts()` (chỉ service_role) — phần tiếp theo của WP 4.8. Follow và lưu **độc lập**: lưu không nhận thông báo, theo dõi không tự lưu (có test cho thông báo qua outbox). Test `140_follows_saves` + 8 mutation. Giao diện: `StoryActions` ở trang truyện (nút Theo dõi và nút Lưu vào thư viện; hiện ngay + hoàn tác khi bị từ chối, số người theo dõi trên trang cũng đổi theo; khóa nút khi đang gửi; khách bấm thì sang `/login?next=`). 17 test mới + 9 mutation. Trình duyệt thật trên dev: khách, đăng nhập, optimistic khi server chậm, tải lại giữ trạng thái, khách khác thấy cùng số, bỏ theo dõi giữ nguyên "đã lưu"; đầu-cuối: sau khi chủ truyện đăng chương, cron outbox tạo thông báo `chapter_published` đúng cho người theo dõi. **Còn thiếu:** trang Thư viện (WP 4.4)._ |
| **4.4** ⬜ | Trang **Thư viện**: đang đọc (tiếp tục), đã lưu, đang theo dõi; tiếp tục đọc một chạm | 2.5, 4.3 | 2.5 | Sắp xếp theo `last_read_at`; story bị gỡ hiển thị trạng thái hợp lệ |
| **4.5** ⬜ | **Reading lists**: CRUD, thêm/bớt story qua sheet "Thêm vào danh sách", sắp xếp, trang công khai | 4.4 | 3 | `private/unlisted/public` đúng quyền |
| **4.6** ⬜ | **Thông báo trong ứng dụng**: danh sách, chấm chưa đọc, đánh dấu đã đọc, realtime (Supabase Realtime) | 0.3 | 3 | Realtime tự kết nối lại; không rò thông báo người khác |
| **4.7** ⬜ | Thông báo cho loại sự kiện mới (có người trả lời bình luận, mời cộng tác) qua outbox | 4.2, 3.8, 4.6 | 1.5 | Handler idempotent, có test |
| **4.8** ⬜ | **Bộ đếm thống kê (D1)**: cập nhật `votes/comments/followers/saves` bằng trigger tăng/giảm trong cùng transaction (hoặc tính lại định kỳ); script đối soát lệch | 4.1–4.3 | 2.5 | Test: thêm/xóa nhiều lần vẫn đúng; job đối soát báo 0 lệch |

**M2 (cuối Phase 4)**: sản phẩm có cảm giác "xã hội": vote, bình luận, theo dõi, thư viện, thông báo.

---

## Phase 5. Khám phá và xã hội · ~17 ngày

| WP | Đầu ra | Phụ thuộc | Ngày | DoD đặc thù |
| --- | --- | --- | --- | --- |
| **5.1** ⬜ | **Tìm kiếm** truyện/tác giả/tag (Q3): RPC dùng `unaccent` + trigram (tiếng Việt không dấu vẫn tìm được), mở rộng index (D7); trang kết quả, gợi ý khi gõ | 2.2 | 4 | Tìm "doc truyen" ra "Đọc truyện"; có `EXPLAIN` chứng minh dùng index; chặn truy vấn quá ngắn |
| **5.2** ⬜ | Duyệt theo category/tag; **RPC tạo tag có kiểm soát (D4)** (chuẩn hóa slug, giới hạn số tag/story, chống spam) | 2.2 | 2.5 | Tag trùng được gộp; tác giả không tạo quá hạn mức |
| **5.3** ⬜ | **Xếp hạng**: top/trending theo cửa sổ thời gian (dựa sự kiện đọc 2.6 + vote), materialized view làm mới bằng cron | 2.6, 4.8 | 3 | Làm mới không khóa đọc (`CONCURRENTLY`); có chỉ số độ trễ |
| **5.4** ⬜ | **Trang tác giả** + follow tác giả, nguồn tin "từ tác giả bạn theo dõi" | 4.3 | 3 | Số follower khớp; tài khoản suspended không hiển thị |
| **5.5** ⬜ | Gợi ý đơn giản (cùng category/tag, từ tác giả đang theo dõi, người đọc cùng story) | 5.3, 5.4 | 2 | Có giải thích "vì sao gợi ý"; không gợi ý nội dung private/mature khi không phù hợp |
| **5.6** ⬜ | Lọc nội dung người lớn (`is_mature`): xác nhận tuổi, tùy chọn ẩn, áp dụng nhất quán ở search/rank/feed | 2.2, 6.3 | 2.5 | Mặc định ẩn với khách; không lọt ở bất kỳ danh sách nào |

---

## Phase 6. Chức năng xung quanh · ~29 ngày

| WP | Đầu ra | Phụ thuộc | Ngày | DoD đặc thù |
| --- | --- | --- | --- | --- |
| **6.1** ⬜ | **Báo cáo + console kiểm duyệt** (`/moderation`): gửi báo cáo từ story/chương/bình luận/người dùng; hàng đợi, xem ngữ cảnh, hành động (ẩn bình luận, gỡ story, suspend tài khoản) qua RPC có **nhật ký kiểm toán** | 4.2 | 6 | Mọi hành động ghi audit (ai, khi nào, lý do); chỉ role moderator; có test quyền |
| **6.2** ⬜ | Tác giả kiểm duyệt bình luận trên truyện của mình (D6) | 4.2 | 1.5 | Không "bỏ ẩn" được bình luận do moderator ẩn |
| **6.3** ⬜ | Cài đặt: ngôn ngữ, tùy chọn đọc, tùy chọn thông báo (email/push/in-app), nội dung người lớn | 2.7, 4.6 | 2 | Lưu server-side, áp dụng trên mọi thiết bị |
| **6.4** ⬜ | **Vòng đời tài khoản (D8, Q7)**: vô hiệu hóa; xóa = **ẩn danh hóa, giữ nội dung** (RPC xóa dữ liệu cá nhân, hiển thị "Người dùng đã xóa"); xuất dữ liệu cá nhân | 1.4 | 3 | Không hard-delete `auth.users`; không còn dữ liệu cá nhân sau khi xóa; story/bình luận vẫn hiển thị đúng; có test quyền và test ẩn danh hóa |
| **6.5** ⬜ | **Thống kê cho tác giả**: lượt đọc/vote/bình luận theo chương và theo thời gian, tỉ lệ rời bỏ giữa các chương | 2.6, 4.8 | 4 | Số khớp `*_stats`; truy vấn có index, không quét bảng sự kiện |
| **6.6** ⬜ | SEO và chia sẻ: sitemap động, OG image, JSON-LD (Book/Chapter), canonical, `robots`/`noindex` cho unlisted | 2.3, 2.4 | 2.5 | Lighthouse SEO ≥ 95 cho story/chương |
| **6.7** ⬜ | **Push notification** (FCM/APNs): bảng token thiết bị, Edge Function gửi từ outbox, tôn trọng tùy chọn 6.3 | 4.7, 7.2 | 4 | Token hết hạn được dọn; không gửi trùng |
| **6.8** ⬜ | Chống lạm dụng: giới hạn tần suất (bình luận, đăng ký, báo cáo), captcha khi đăng ký, kiểm tra nội dung spam cơ bản | 1.1, 4.2 | 3 | Có test giới hạn; ngưỡng cấu hình được |
| **6.9** ⬜ | Trang tĩnh pháp lý: điều khoản, quyền riêng tư, DMCA/khiếu nại bản quyền | — | 1 | Cần nội dung từ người phụ trách pháp lý |
| **6.10** ⬜ | Hoàn thiện tiếng Anh (en) và kiểm tra bố cục với chuỗi dài | 0.4 | 2 | Không còn chuỗi cứng; không vỡ layout |

---

## Phase 7. Mobile (Capacitor) · ~18 ngày

Phụ thuộc quyết định 1.1. Chỉ nên bắt đầu khi Phase 2 và 3 đã dùng được trên web, để mobile là lớp vỏ chứ không phải thiết kế lại.

| WP | Đầu ra | Phụ thuộc | Ngày | DoD đặc thù |
| --- | --- | --- | --- | --- |
| **7.1** ⬜ | `apps/mobile`: Vite + router client, adapter `PlatformProvider` cho Capacitor, ánh xạ các Screen hiện có (đọc, thư viện, tìm kiếm, studio rút gọn) | Phase 2, 3 | 4 | Không có `next/*` trong bundle mobile; build tĩnh chạy offline phần vỏ |
| **7.2** ⬜ | Khởi tạo `android/`, `ios/`; deep link và luồng OAuth/đặt lại mật khẩu; lưu phiên an toàn (Keychain/Keystore) | 7.1, 1.1 | 3 | Mở link từ email quay lại đúng màn hình |
| **7.3** ⬜ | Tích hợp native: safe area, status bar, bàn phím, nút back, chia sẻ, haptics, `BottomNav` chuẩn mobile | 7.1 | 2.5 | Không bị che bởi notch/home indicator; touch target ≥ 44px |
| **7.4** ⬜ | **Đọc offline**: tải chương về máy, cache ảnh, hàng đợi đồng bộ tiến độ/vote khi có mạng | 7.1, 2.5 | 5 | Chế độ máy bay vẫn đọc được chương đã tải; đồng bộ không mất/ghi đè sai |
| **7.5** ⬜ | Build, ký, phát hành: CI build APK/AAB/IPA, TestFlight/Internal testing, icon/splash, mô tả store | 7.2–7.4 | 3.5 | Bản test cài được trên thiết bị thật |

---

## Phase 8. Chất lượng, vận hành, phát hành (song song, ~14 ngày cộng dồn)

| WP | Đầu ra | Ngày |
| --- | --- | --- |
| **8.1** | CI/CD: Vercel preview, **triển khai migration có kiểm soát** (nhánh Supabase/preview DB), quy trình rollback | 2 |
| **8.2** | Giám sát: Sentry (web + mobile), log Supabase, cảnh báo cho outbox dead letter và cron thất bại | 2 |
| **8.3** | Rà soát bảo mật: RLS audit lại sau mỗi phase, `get_advisors`, kiểm tra quyền Storage, secret scanning, header bảo mật/CSP | 3 |
| **8.4** | Hiệu năng: ngân sách (LCP/INP/bundle), kiểm tra N+1 và kế hoạch truy vấn cho trang nóng, test tải trên đường đọc | 3 |
| **8.5** | Trợ năng: kiểm WCAG 2.1 AA trên các màn core (bàn phím, tương phản, screen reader, cỡ chữ) | 2 |
| **8.6** | Sao lưu/khôi phục (PITR), kịch bản sự cố, danh sách kiểm tra phát hành | 2 |

---

## 3. Mốc, đường găng, song song hóa

| Mốc | Nội dung | Lũy kế (1 người) |
| --- | --- | --- |
| **M0** | Nền tảng + Supabase thật + CI | ~18 ngày |
| **M1a** | Tài khoản | ~27 |
| **M1b** | Đọc truyện (dữ liệu seed) | ~45 |
| **M1 (MVP core)** | + Studio: viết và đăng, vòng lặp đóng | **~73** |
| **M2** | + Tương tác (vote, bình luận, theo dõi, thư viện, thông báo) | ~94 |
| **M3** | + Khám phá và xã hội | ~111 |
| **M4** | + Chức năng xung quanh | ~140 |
| **M5** | + Mobile | ~158 |
| **M6** | + Hardening (Phase 8, rải đều trong các phase trước, cộng dồn ở đây) | ~172 |

Đường găng: `0.0 → 0.3 → 1.1 → 1.2 → (3.1 → 3.2 → 3.4 → 3.5 → 3.6 → 3.7)`; trình đọc 2.x rẽ nhánh sau 0.5. Với 2 người: một người làm Phase 2, một người làm Phase 3 ngay sau M1a, M1 đạt sớm còn khoảng 45–50 ngày lịch.

Rủi ro cao nhất, nên làm sớm trong phase của nó: **editor + chuyển đổi `block_id` (3.5)**, **dedupe lượt đọc (2.6)**, **đọc offline (7.4)**, **kiểm tra Storage policy (D3)**.

## 4. Quyết định đã chốt (2026-11-03)

| # | Quyết định | Hệ quả cho WBS |
| --- | --- | --- |
| Q1 | **Mobile = Vite + router client**, Screen dùng chung không phụ thuộc `next/*`, adapter `PlatformProvider` cho mỗi nền tảng | Áp dụng kiến trúc 1.1; WP 0.3 và 7.1 theo hướng này |
| Q2 | **URL công khai `/story/{id}/{slug}`** (và chương `/story/{id}/{chapterSlug}` hoặc theo id), canonical redirect khi slug đổi | Route ở 1.2 theo dạng này; D10 được giải quyết ở tầng routing, không đổi schema |
| Q3 | **Tìm kiếm: `unaccent` + trigram**, đo lại ở 5.1 | WP 5.1: thêm extension `unaccent`, index trigram trên cột đã bỏ dấu |
| Q4 | **i18n: thư viện không phụ thuộc Next** (dùng chung web + mobile) | WP 0.4: chọn cụ thể thư viện khi làm (cần hỗ trợ ICU/plural, tải ngôn ngữ động) |
| Q5 | **Hai project Supabase (dev + prod)**, migration qua CI | WP 0.0 dựng project dev; 8.1 triển khai migration theo từng môi trường; chuyển sang branching khi có nhiều người sửa schema |
| Q6 | **OAuth Google ở M1; bình luận theo đoạn ở M2** | WP 1.1 giữ OAuth; WP 4.2 là mốc của bình luận theo đoạn (M1 không có bình luận) |
| Q7 | **Xóa tài khoản = ẩn danh hóa, giữ nội dung** | WP 6.4: xóa thông tin cá nhân (profile, email ở `auth.users`, avatar), đặt hiển thị "Người dùng đã xóa", story/bình luận giữ lại; không hard-delete `auth.users` nên FK RESTRICT không phải đổi; cần chính sách riêng cho story đang theo dõi và trường hợp tác giả muốn gỡ truyện (làm riêng trước khi ẩn danh) |

Còn mở: chính sách pháp lý cho Q7 (thời hạn lưu, yêu cầu gỡ nội dung theo luật) cần người phụ trách xác nhận trước khi làm WP 6.4; WP 6.9 cũng cần nội dung pháp lý.

## 5. Việc bắt đầu ngay (Sprint 1, ~2 tuần)

1. **0.0** Dựng project Supabase dev và đối chiếu với PostgreSQL thuần (chặn mọi thứ phía sau, vì chưa từng chạy trên Supabase thật).
2. **0.1** ESLint + ranh giới + CI.
3. **0.2, 0.3** theo quyết định Q1, Q2 (đã chốt).
4. **0.5** primitive cần cho form đăng nhập; **1.1, 1.2** đăng ký/đăng nhập/guard.

Kết thúc sprint: có CI xanh, ứng dụng chạy với Supabase thật, đăng ký và đăng nhập được.

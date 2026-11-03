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
| **0.1** ⬜ | ESLint flat config + quy tắc ranh giới (1.3); Prettier; CI GitHub Actions: `db:verify`, `db:types:check`, `typecheck`, `test`, `build web` | — | 2 | CI xanh trên PR; vi phạm ranh giới làm CI đỏ |
| **0.2** ⬜ | Tách `packages/utils`; dựng khung `packages/features` + template feature (1.2) + script `pnpm gen:feature <name>` | 0.1 | 1.5 | Sinh feature mới compile được, có test mẫu |
| **0.3** ⬜ | **Common code** trong `features/_shared`: `DataProvider`, `QueryProvider` (cấu hình retry/staleTime), `PlatformProvider` + adapter Next, `AuthProvider` (session, user, profile), mô hình lỗi (`AppError` ← SQLSTATE `42501/PT404/PT409/22023`, lỗi mạng, validation), `useAppToast`, error boundary | 0.2, Q1 | 4 | Có test cho ánh xạ lỗi; web render được Screen mẫu qua adapter |
| **0.4** ⬜ | **I18n** (Q4: thư viện không phụ thuộc Next) vi (mặc định) + en: cơ chế chọn ngôn ngữ, định dạng ngày/số/số nhiều, lint chặn chuỗi cứng trong screens | 0.3 | 1.5 | Đổi ngôn ngữ không reload; kiểm tra thiếu key bằng test |
| **0.5** ⬜ | **Shared widget, lớp primitive**: shadcn `Input, Textarea, Label, Form, Select, Checkbox, Switch, Dialog, Sheet, Drawer, DropdownMenu, Tabs, Tooltip, Sonner(toast), Skeleton, Avatar, Badge, Separator, ScrollArea, Sidebar`; widget khung: `AppShell` (header + sidebar desktop + `BottomNav` mobile), `PageHeader`, `EmptyState`, `ErrorState`, `InfiniteList`, `StatPill`, `ConfirmDialog` | 0.1 | 3.5 | Mỗi widget dùng token; có trang `/dev/gallery` (chỉ dev) hiển thị mọi trạng thái sáng/tối, desktop/mobile |
| **0.6** ⬜ | **Utils** (`packages/utils`, có test): `slugify` (bỏ dấu tiếng Việt), `formatCount` (1,2K), ngày giờ (tương đối, múi giờ), `excerpt`, `buildStorageUrl`, `newId` (UUID phía client cho offline), `debounce`/`useAutosave`, mã hóa/giải mã cursor phân trang, `isNative`/safe-area hook, `Result` | 0.2 | 2 | Phủ test các trường hợp biên (dấu, emoji, rỗng) |
| **0.7** ⬜ | Hạ tầng test: Vitest + Testing Library cho `features`; Playwright e2e smoke chạy với project Supabase dev (seed + user test) | 0.0, 0.3 | 2 | `pnpm test:e2e` chạy được cục bộ và trên CI |

---

## Phase 1. CORE A: Tài khoản · ~9 ngày

Không có tài khoản thì không ghi được gì, nên đi trước. DB đã xong, còn lại là UI + luồng.

| WP | Đầu ra | Phụ thuộc | Ngày | DoD đặc thù |
| --- | --- | --- | --- | --- |
| **1.1** ⬜ | Đăng ký / đăng nhập email + mật khẩu, Google OAuth; xác minh email; quên/đặt lại mật khẩu; callback route | 0.0, 0.3, 0.5 | 3 | Lỗi hiển thị đúng (sai mật khẩu, email trùng, link hết hạn); mọi form dùng Zod |
| **1.2** ⬜ | Đăng xuất; guard route phía server (redirect có `next`); `AuthProvider` đồng bộ phiên giữa tab | 1.1 | 1.5 | Truy cập `/studio` khi chưa đăng nhập → login rồi quay lại đúng trang |
| **1.3** ⬜ | `AppShell` biết trạng thái đăng nhập (menu người dùng, nút Đăng nhập) | 0.5, 1.2 | 1 | |
| **1.4** ⬜ | Hồ sơ cá nhân: xem/sửa `username`, `display_name`, `bio` (kiểm tra trùng username, thông báo lỗi rõ) | 1.3 | 1.5 | RLS cấm sửa `account_status` đã có test; UI không gửi cột đó |
| **1.5** ⬜ | Upload avatar: bucket `avatars`, policy (chỉ ghi vào thư mục `{uid}/`), crop/resize phía client, `avatar_storage_key` | 0.0 (D3), 1.4 | 2 | Policy có test; không upload được vào thư mục người khác; giới hạn dung lượng/định dạng |

**M1a (cuối Phase 1)**: đăng ký → xác minh → đăng nhập → sửa hồ sơ trên web.

---

## Phase 2. CORE B: Đọc truyện · ~18 ngày

Có thể làm song song với Phase 3 nếu có 2 người (đọc dùng dữ liệu seed). Với 1 người: làm 2.1–2.5 trước để có thứ để xem, rồi sang Phase 3.

| WP | Đầu ra | Phụ thuộc | Ngày | DoD đặc thù |
| --- | --- | --- | --- | --- |
| **2.1** ⬜ | **Seed**: category (có cây cha/con), tag mẫu, vài story + chapter đã publish (qua RPC thật) cho dev/e2e | 0.0, D4 | 1.5 | Một lệnh nạp lại được; không dùng cho production |
| **2.2** ⬜ | Trang chủ/Khám phá cơ bản: "mới cập nhật" theo `updated_at` (cursor pagination, dùng `idx_stories_discover`), lọc theo category/ngôn ngữ; widget `StoryCard`, `StoryCover` | 2.1, 0.5 | 3 | Phân trang cursor ổn định khi dữ liệu thay đổi; không N+1 (một query lấy story + author + stats) |
| **2.3** ⬜ | **Trang story** (SSR + SEO): bìa, tên, tác giả, mô tả, tag, thống kê, danh sách chương (`ChapterList`), nút "Đọc tiếp"/"Bắt đầu đọc", trạng thái hiển thị theo `visibility`/`status`/`is_mature` | 2.2 | 3 | Metadata/OG đúng; story private/draft trả 404 cho người lạ (đã có RLS); `unlisted` có `noindex` |
| **2.4** ⬜ | **Trình đọc chương** (SSR): render `chapter_version_blocks` (paragraph, heading, image, divider, marks), chương trước/sau, thanh công cụ `ReaderToolbar`, mục lục chương, `ReadingProgress` | 2.3 | 4 | Mỗi `block_id` có anchor ổn định (cho bình luận theo đoạn); chương chưa publish/đã gỡ → 404; cỡ chữ tối ưu ~66ch |
| **2.5** ⬜ | **Tiến độ đọc**: lưu `user_chapter_progress` (đoạn cuối, %) và `user_story_progress`, debounce, khôi phục vị trí khi mở lại; xử lý chương đã đổi phiên bản (`last_version_id`) | 2.4, 1.2 | 2 | Khách (chưa đăng nhập) không lỗi; ghi tối đa 1 lần/vài giây; có test debounce |
| **2.6** ⬜ | **Ghi nhận lượt đọc có dedupe (D2)**: bảng sự kiện đọc + RPC ghi (một lượt/người/chương/khoảng thời gian, khách theo cookie ẩn danh), job gom vào `chapter_stats`/`story_stats` | 2.4, 0.0 | 2.5 | Refresh trang không tăng lượt đọc; có test dedupe; không ghi counter trực tiếp trên mỗi request |
| **2.7** ⬜ | Tùy chọn đọc: cỡ chữ, giãn dòng, font, nền (sáng/sepia/tối); lưu cục bộ, đồng bộ vào hồ sơ khi đăng nhập | 2.4 | 1.5 | Áp dụng tức thì, không nháy giao diện khi tải |

**M1b (cuối Phase 2)**: người dùng duyệt, mở story, đọc chương, thoát ra vào lại vẫn đọc tiếp đúng chỗ.

---

## Phase 3. CORE C: Viết và đăng (Studio) · ~28 ngày

Phần lớn rủi ro kỹ thuật nằm ở editor. Đây là vòng lặp còn lại của core: tác giả đăng, người đọc thấy ngay.

| WP | Đầu ra | Phụ thuộc | Ngày | DoD đặc thù |
| --- | --- | --- | --- | --- |
| **3.1** ⬜ | Khung Studio (`/studio`): danh sách story của tôi (draft/ongoing/...), trạng thái, thao tác nhanh | 1.2, 0.5 | 2 | Chỉ thấy story của mình + story được mời |
| **3.2** ⬜ | Tạo/sửa story: tiêu đề, slug (tự sinh, kiểm tra trùng theo owner), mô tả, category, ngôn ngữ, mature, visibility, status; soft-delete/khôi phục | 3.1, 0.6 | 3 | Form dùng `storyCreateSchema`; slug trùng báo lỗi rõ; UUID sinh phía client |
| **3.3** ⬜ | Upload cover (bucket `covers`, policy theo `{story_id}`, resize), **quy ước `image_storage_key` + kiểm tra trong RPC publish** (D3) | 3.2, 0.0 | 2.5 | RPC từ chối key không thuộc story/người dùng; có test SQL |
| **3.4** ⬜ | Quản lý chương: danh sách, tạo, đổi tên slug, **reorder (RPC mới, D5)**, soft-delete/khôi phục, **archive** | 3.2 | 3 | Reorder an toàn với unique `(story_id, sort_order)` (deferrable); test đồng thời |
| **3.5** ⬜ | **Editor Tiptap**: heading, paragraph, bold/italic/underline/strike, divider, ảnh (upload `chapter-images`); **bộ chuyển đổi Tiptap JSON ↔ `chapter_drafts.body`** giữ `block_id` ổn định (block mới = UUID mới, block sửa giữ id); đếm từ bằng `countWords` | 3.4, 3.3 | 7 | Round-trip test (JSON→body→JSON không mất dữ liệu); sao chép/dán, undo/redo không đổi `block_id` của đoạn còn lại; `chapterBodySchema` luôn qua trước khi lưu |
| **3.6** ⬜ | **Autosave + xung đột**: lưu nháp theo `revision`, trạng thái "đã lưu/đang lưu/lỗi", cảnh báo khi rời trang, xử lý hai thiết bị cùng sửa (so `revision`) | 3.5 | 3 | Mất mạng giữa chừng không mất nội dung (giữ cục bộ, đồng bộ lại); test xung đột |
| **3.7** ⬜ | **Publish / hẹn giờ / gỡ**: nút và trạng thái theo vai trò, truyền `expected_revision`, ánh xạ lỗi SQLSTATE sang thông báo, chọn thời gian theo múi giờ người dùng | 3.6, 0.3 | 2.5 | Bấm đúp không tạo 2 phiên bản; editor không thấy nút gỡ; kiểm thử đủ 4 mã lỗi |
| **3.8** ⬜ | Cộng tác: **luồng mời + chấp nhận (D9)** thay vì thêm thẳng, vai trò `co_author`/`editor`, giao diện quản lý | 3.2, 1.2 | 2.5 | Người bị mời có thể từ chối; policy + test mới |
| **3.9** ⬜ | Lịch sử phiên bản (xem chỉ đọc, so sánh, khôi phục vào bản nháp) và xem trước (preview đúng như trình đọc) | 3.7, 2.4 | 2.5 | Khôi phục tạo draft mới, không sửa version cũ (bất biến) |

**M1 = MVP core (cuối Phase 3)**: tác giả tạo story, viết chương, đăng; người khác đọc được ngay. **Mốc quan trọng nhất**, tương đương ~73 ngày công tính từ hiện tại (gồm cả nền tảng). Dừng ở đây để dùng thử với người thật trước khi đầu tư tiếp.

---

## Phase 4. Tương tác quanh core · ~21,5 ngày

| WP | Đầu ra | Phụ thuộc | Ngày | DoD đặc thù |
| --- | --- | --- | --- | --- |
| **4.1** ⬜ | Vote chương (optimistic UI, hoàn tác khi lỗi) | 2.4 | 1.5 | Thao tác lặp không lỗi; số vote khớp sau refresh |
| **4.2** ⬜ | **Bình luận**: theo chương và **theo đoạn (inline, bám `block_id`)**, trả lời lồng, like, sửa, xóa mềm, phân trang; widget `CommentThread` | 2.4, 1.2 | 6 | Bình luận bị ẩn bởi moderator hiển thị đúng cho tác giả bình luận; chống gửi trùng; giới hạn độ sâu trả lời |
| **4.3** ⬜ | Follow story, lưu vào thư viện (hai khái niệm tách biệt như schema) | 2.3 | 1.5 | Follow đẩy notification khi có chương mới (đã có worker) |
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

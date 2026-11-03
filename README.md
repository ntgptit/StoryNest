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

### Việc còn lại

1. **RPC publish chapter** (một transaction, `SECURITY DEFINER`): tạo version + blocks, set `published_at`, `published_version_id`, `status`, `first_published_at`; cũng cần RPC cho unpublish/schedule/archive.
2. **Tạo `story_stats`/`chapter_stats`** khi tạo story/chapter, và cập nhật bất đồng bộ (đếm lượt đọc có dedupe).
3. **Tạo notification** server-side (outbox/job).
4. **Tags**: hiện chỉ `service_role` tạo được tag mới; cần RPC nếu tác giả được tạo tag.
5. **Comment trên truyện của mình**: tác giả chưa có quyền ẩn/xóa comment của người khác trên truyện của họ (hiện chỉ moderator).
6. **Extension trên Supabase**: kiểm tra `citext`/`gin_trgm_ops` resolve đúng khi extension nằm ở schema `extensions`; chạy `get_advisors` (security/performance) sau khi apply.

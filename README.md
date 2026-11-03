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

### Việc còn lại

1. **Worker xử lý `outbox_events`**: tạo `notifications` cho follower, cập nhật stats, lập lịch `publish_due_chapters`.
2. **Kiểm tra `image_storage_key`**: RPC chỉ kiểm tra khác rỗng; chưa xác minh file thuộc story/người dùng (cần chốt quy ước đường dẫn Supabase Storage + policy bucket).
3. **Archive chapter**, và `story_stats`/`chapter_stats` cho phía đếm lượt đọc (có dedupe).
4. **Tags**: hiện chỉ `service_role` tạo được tag mới.
5. **Comment trên truyện của mình**: tác giả chưa ẩn/xóa được comment của người khác (hiện chỉ moderator).
6. **Extension trên Supabase**: kiểm tra `citext`/`gin_trgm_ops` khi extension nằm ở schema `extensions`; chạy `get_advisors` sau khi apply.
7. **Sinh type TypeScript** vào `packages/database` và schema Zod cho `chapter_drafts.body` trong `packages/validation` (khớp hợp đồng ở trên).

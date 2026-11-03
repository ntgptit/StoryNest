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

### Việc còn lại trước khi dùng schema trên Supabase

Schema gốc cố ý chưa có phần authorization; các mục dưới là quyết định cần chốt, chưa được triển khai:

1. **Liên kết `app_users.id` với `auth.users(id)`** và tạo profile bằng trigger khi đăng ký.
2. **RLS cho mọi bảng trong `public`** (Supabase expose schema này qua API). Hiện chưa bật RLS nên nếu apply lên project thật, dữ liệu sẽ truy cập được bằng anon key.
3. **Publishing transaction** (xem ghi chú cuối file migration) nên là một RPC/Edge Function chạy trong một transaction, không để client tự ghép nhiều bước.
4. **Đếm lượt đọc** qua event có dedupe + job bất đồng bộ, không increment mỗi lần refresh.
5. Chốt extension: `pgcrypto`, `citext`, `pg_trgm` (Supabase đặt extension ở schema `extensions`; cần kiểm tra `gin_trgm_ops`/`citext` resolve đúng khi apply).

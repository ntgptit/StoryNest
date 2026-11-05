# Application Overview — StoryNest

> Status of this page: Verified against code on 2026-11-04 unless marked otherwise. Entry point: [README](README.md).

## 1. What the product is

StoryNest is a Wattpad-style platform where **readers** discover and read serialised stories chapter by chapter, and
**authors** write, publish and manage those stories with co-authors/editors. It is web-first (Next.js SSR for SEO)
with a planned Capacitor mobile shell that reuses the same screens (WBS Q1, Phase 7 — **not started**:
`apps/mobile/` only contains `.gitkeep`).

Default language is Vietnamese; English is fully translated (WBS 6.10). Default content language and SEO target is
Vietnamese (`<html lang="vi">`, `apps/web/src/app/layout.tsx:44`).

## 2. Actors and roles

| Actor | How the system knows | Main goals | Evidence |
| --- | --- | --- | --- |
| Guest (anonymous visitor) | No session / `is_anonymous` claim | Browse, search, read public chapters, view rankings, author pages and public lists | `apps/web/src/lib/auth/require-user.ts:17` |
| Member (reader) | Signed-in Supabase user with an `app_users` profile, `account_status = 'active'` | Follow/save stories, vote, comment, lists, library, notifications, settings | `supabase/migrations/20261103000100_auth_and_rls.sql` |
| Story owner (author) | `stories.owner_id = auth.uid()` | Create/edit stories, chapters, publish, manage team, view stats, moderate comments | see [OBJ-TEAM](domains/studio/collaboration/business-rules.md) |
| Co-author / Editor | `story_collaborators.role` (accepted invitation) | Write/edit chapters within role limits | [OBJ-TEAM](domains/studio/collaboration/business-rules.md) |
| Moderator | JWT `app_metadata.role = 'moderator'` (server-set only) | Review reports, hide comments, take down stories, suspend accounts | `apps/web/src/lib/auth/require-user.ts:21`, [OBJ-MOD](domains/trust-safety/moderation/business-rules.md) |
| System jobs | `service_role` via `pg_cron` | Scheduled publishing, outbox → notifications, read aggregation, rankings, counter reconciliation, purges | [OBJ-JOB](domains/platform/background-jobs/business-rules.md) |

## 3. Architecture in one picture

```text
Browser ──> Next.js 16 (apps/web)  route files are thin: params → server prefetch → <XScreen/>
              │  proxy.ts: session refresh + optimistic auth redirect; pages re-check with requireUser()
              ▼
        packages/features/<feature>   router-agnostic screens, TanStack Query hooks, api/ (query functions), model/
        packages/ui                    shadcn primitives + widgets (StoryCard, BottomNav, EmptyState, …)
        packages/validation            Zod schemas, APP_LIMITS, enum constants
              │  supabase-js (publishable key, user JWT)
              ▼
        Supabase: PostgreSQL 34 tables, RLS on every table, ~95 SQL functions/RPCs,
                  Storage buckets avatars / covers / chapter-images, Realtime (notifications),
                  pg_cron jobs storynest-* (7 jobs)
```

Key architectural rules (Documented in WBS §1, Verified by ESLint config `eslint.config.mjs`):
- RLS is the real security boundary; UI checks are for display only.
- Important writes go through RPCs (publish, reorder, follow, vote, invitations, moderation actions…).
- Shared screens must not import `next/*`; navigation via `PlatformProvider`.
- No hard-coded colours/strings (`pnpm check:tokens`, `pnpm check:hardcode`).

## 4. Business domains (summary)

| Domain | Purpose | Objects |
| --- | --- | --- |
| [Account & Identity](domains/account/overview.md) | Who the user is and how they configure the app | AUTH, PRF, SET |
| [Discovery](domains/discovery/overview.md) | Help readers find stories and authors | HOME, TAX, SRCH, RANK, REC, AUTHOR |
| [Reading](domains/reading/overview.md) | Story page, chapter reader, progress | STORY, READ, PROG |
| [Community & Engagement](domains/community/overview.md) | Votes, comments, notifications | VOTE, CMT, NOTI |
| [Library](domains/library/overview.md) | Personal collection: follows, saves, history, reading lists | LIB, LIST |
| [Authoring (Studio)](domains/studio/overview.md) | Write, publish and manage stories as a team | STM, CHM, EDT, HIST, TEAM, STAT |
| [Trust & Safety](domains/trust-safety/overview.md) | Reports, moderation, mature content, abuse limits | MOD, MAT, ABU |
| [Platform](domains/platform/overview.md) | Shell/navigation, i18n, SEO, background jobs, dev tools | SHELL, I18N, SEO, JOB, DEV |

Full map with dependencies: [domain-map.md](domain-map.md).

## 5. Delivery status vs plan (from `docs/WBS.md`, cross-checked)

| Phase | Planned scope | Status in WBS | Observed in code |
| --- | --- | --- | --- |
| 0 Foundation | Tooling, shared infra, i18n, widgets | ✅ except 0.0 🟡 (staging, OAuth, leaked-password protection) and 0.7 ⬜ (e2e) | No Playwright e2e suite in repo — consistent |
| 1 Account | Auth, guards, shell, profile, avatar | ✅ except 1.1 🟡 (Google OAuth not done) | No OAuth button in sign-in screen — consistent |
| 2 Reading | Seed, discover, story page, reader, progress, reads, reader prefs | ✅ | Consistent |
| 3 Studio | Studio, story CRUD, cover, chapters, editor, autosave, publish, team, history | ✅ | Consistent |
| 4 Engagement | Votes, comments, follow/save, library, lists, notifications, counters | ✅ | Consistent |
| 5 Discovery | Search, tags, rankings, author page, recommendations, mature filter | ✅ | Consistent (see filter consistency audit) |
| 6 Surrounding | Moderation, settings, stats, SEO, abuse limits | 6.4 account lifecycle ⬜, 6.7 push ⬜, 6.8 🟡, 6.9 legal pages ⬜ | Consistent |
| 7 Mobile | Capacitor app | ⬜ | `apps/mobile` empty |
| 8 Quality/ops | CI/CD, monitoring, security, perf, a11y, backup | not tracked with status | CI workflow manual-only (`.github/workflows/ci.yml`) |

Documentation drift: WBS §0 "Hiện trạng" table and root `README.md` "Việc còn lại" still describe the pre-Phase-1
state (e.g. "mới 1 component", "chưa có route nghiệp vụ nào", "Auth UI" as remaining work). See
[coverage report](audits/coverage-report.md#5-documentation-drift).

## 6. Verification performed for this spec

- Static analysis of all routes, features, migrations, validation and tests (by domain).
- `pnpm test`: 1,146 unit tests passed. `pnpm db:verify`: 31 SQL test files + concurrency checks passed (PostgreSQL 16 + shim).
- Runtime (browser) as **guest** against the `storynest-dev` Supabase project: 32 routes at 390 px and 8 at 1280 px.
  Signed-in, author and moderator flows were **not** exercised at runtime (no test account was created on the
  shared dev project). Details: [coverage report](audits/coverage-report.md).

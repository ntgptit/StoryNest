# Coverage Report

Snapshot of what this specification covers and how it was verified. Baseline commit: `204a1ea` (2026-11-04).
Re-run the counts after large changes (commands in §6). Entry point: [README](../README.md).

## 1. Totals

| Item | Count | Denominator / note |
| --- | --- | --- |
| Business domains | 8 | Derived from feature modules, migrations and WBS phases |
| Business objects / features | 31 | All 22 feature modules in `packages/features/src` (excluding `_shared`) are mapped to at least one object; DEV, JOB, SEO, I18N and TAX cover non-module areas |
| Routes | 33 | 28 `page.tsx`, 1 route handler (`/auth/callback`), robots, sitemaps, 2 OG image routes |
| Documented screens | 32 | 28 route screens + 4 global/embedded panels (SHELL-01, CMT-01, MOD-02, MAT-01) |
| Screen components documented | 289 | Unique `SCR-…-Cnn` IDs |
| User actions documented | 196 | Unique `SCR-…-Ann` IDs |
| Acceptance criteria (screen specs) | 372 | 90 of them tagged `[Proposed]`; plus proposed ACs in the backlog |
| Workflows | 144 | See [workflow map](../workflow-map.md); 7 cross-domain journeys |
| Business rules | 412 | Unique `BR-…` IDs |
| Confirmed gaps — functional (A/B) | 68 | 27 defects, 41 missing/incomplete; 6 P1, 34 P2, 28 P3 |
| Confirmed gaps — UX/UI (C) | 62 | 8 P2, 54 P3 |
| Improvement proposals | 34 | 19 remediation, 6 enhancement, 9 new features, plus a quick-fix list |
| Open questions | 56 + 3 | Domain questions + external/owner actions |

## 2. Coverage percentages (only where the denominator is reliable)

| Measure | Covered | Total | % |
| --- | --- | --- | --- |
| Routes reviewed in code | 33 | 33 | 100 % |
| Route screens with a screen spec | 28 | 28 | 100 % |
| Feature modules mapped to an object | 22 | 22 | 100 % |
| Migrations referenced by at least one domain spec | 29 | 30 | 97 % (`20261103000400_hardening_and_indexes.sql` cited only in the audit: index/`search_path` hardening with no functional rule of its own) |
| Route screens opened in a browser (rendered) | 13 | 28 | 46 % |
| Route screens with any runtime evidence (rendered or verified sign-in redirect) | 22 | 28 | 79 % |
| Business rules whose status starts with "Verified" (mostly verified in code) | ≈ 410 | 421 status rows | ≈ 97 % (others: 15 Documented, 4 Inferred, 3 Unknown, 3 Not implemented) |

**Do not read this as 100 % functional coverage.** Signed-in, author, collaborator and moderator flows were verified
by reading code and the automated tests, not by running them.

## 3. Verification performed

| Method | Result |
| --- | --- |
| Static review of routes, features, validation, migrations, SQL tests, seed, WBS, README | All domains (7 parallel analyses + consolidation) |
| `pnpm test` | 1,146 unit tests passed (utils 58, validation 75, ui 21, features 898, web 94) |
| `pnpm db:verify` (PostgreSQL 16 + local shim) | 31 SQL test files and 4 concurrency checks passed; 34 tables |
| Targeted SQL check | Link-counting regex of the spam filter run on PostgreSQL 16 (F-ABU-01) |
| Browser (Playwright, guest, `storynest-dev` data) | 32 route visits at 390 px, 8 at 1280 px, language switch, keyboard tab order, reader settings sheet; findings RT-01…RT-15 below |

### Runtime observations used as evidence

| ID | Observation | Used in |
| --- | --- | --- |
| RT-01 | Missing story/chapter → HTTP 200 with Next's default English 404 text; unknown path → 404 without the shell | F-SHELL-01 |
| RT-02 | Unknown author → 200 with localized empty state, generic title, no canonical | F-AUTHOR-02 |
| RT-03 | Missing list → localized empty state + noindex | SCR-LIST-01 |
| RT-04 | All 9 protected prefixes redirect guests to `/login?next=` | SCR-AUTH-01, BR-AUTH-* |
| RT-05 | Wrong story slug → redirect to canonical; canonical links present | BR-STORY-* |
| RT-06 | 18+ gate shown to guests; story title visible in tab; `noindex, nofollow`; 18+ story absent from guest home | F-MAT-01, BR-MAT-* |
| RT-07 | Tag chip "##Kiemhiep" | U-TAX-02 |
| RT-08 | Language stored in localStorage only; SSR always Vietnamese, `lang="vi"`; titles stay Vietnamese in English | U-I18N-01 |
| RT-09 | First tab stop is the brand; no skip link | FP-022 |
| RT-10 | Reader controls (Display, Contents, paragraph comment, vote CTA, Report) present for guests | SCR-READ-01 |
| RT-11 | Search: hint for < 3 chars; unaccented "anh chieu" finds "Ánh chiều"; tabs; empty state | BR-SRCH-* |
| RT-12 | Ranking period tabs and freshness label | SCR-RANK-01 |
| RT-13 | robots disallows `/lists`, `/search`; `/sitemap.xml` 404, split sitemaps served | OBJ-SEO, Q-SEO-02 |
| RT-14 | No horizontal scroll at 390 px on visited public pages | UX audit |
| RT-15 | Unknown `?category=` → generic empty state | U-HOME-03 |

## 4. Unverified areas and reasons

| Area | Why not verified | How to verify next |
| --- | --- | --- |
| All signed-in flows (library, lists CRUD, comments, votes, notifications realtime, settings sync) | No test account was created on the shared dev project (avoid writing data without approval) | Playwright e2e with seeded test users (WBS 0.7) |
| Studio and editor (autosave, conflicts, publish/schedule, images, history restore) | Requires an author account | Same; plus two-browser conflict test |
| Moderator console and actions | Requires a JWT with `app_metadata.role = moderator` | Seeded moderator user on dev |
| Supabase Auth project settings (email confirmation, secure password change, rate limits, redirect URLs, captcha) | Not versioned in the repo (no `supabase/config.toml`) | Owner exports settings (Q-AUTH-02) |
| `pg_cron` in production, Storage policies on real Supabase, PostgREST `max_rows` | Only the dev project exists; the SQL suite runs on a local shim | WBS 0.0 staging/prod |
| Cross-device email links (F-AUTH-04), Next soft-404 cause (RT-01) | Inferred from library behaviour | Manual test / Next issue reproduction |
| Mobile app (Phase 7) | `apps/mobile` is empty | — |
| Performance, accessibility with assistive technology | Out of scope for this pass | WBS 8.4, 8.5 |

## 5. Documentation drift

| Document | Stale statement | Actual state |
| --- | --- | --- |
| `docs/WBS.md` §0 "Hiện trạng" | `@storynest/ui` has 1 component; `apps/web` has no business route; CI/ESLint ⬜ | 32 primitives/widgets; 28 routes; ESLint and CI workflow exist (CI manual-only) |
| `README.md` "Việc còn lại" | Auth UI, shared components, reader, ESLint/CI, Tiptap converter, storage keys, tags, author comment moderation listed as remaining | All delivered (WBS 1.x–6.x ✅) |
| `README.md` structure | `packages/ui` contains `CommentThread`, `ChapterList`, `ReaderToolbar`; "Chưa có ESLint"; buckets still to create | `CommentThread` is in `packages/features/src/comments`; ESLint configured; buckets created by migrations |
| `README.md` outbox section | Only `chapter.published` handled | Also comment replies and collaboration invitations (see OBJ-NOTI) |
| WBS 1.3 note | Bottom nav has 2 items | 4 items (Home, Library, Write, Me) |
| WBS 2.2 | Language filter delivered | API only, no UI (F-HOME-02) |

Tracked as F-SHELL-03 (quick fix). This spec does not edit the WBS or README; update them when the related work is approved.

## 6. Regenerating the counts

```bash
cd docs/functional-spec
grep -rhoE "^#+ +BR-[A-Z]+-[0-9]{3}" domains | awk '{print $2}' | sort -u | wc -l     # rules
grep -rhoE "^#+ +WF-[A-Z]+-[0-9]{2}" domains | awk '{print $2}' | sort -u | wc -l     # workflows
grep -rhoE "SCR-[A-Z]+-[0-9]{2}-AC[0-9]{2}" domains | sort -u | wc -l                  # acceptance criteria
find ../../apps/web/src/app -name page.tsx | wc -l                                     # route screens
```

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

## 7. Phase 2 update (2026-11-05)

### 7.1 Is the Phase 1 snapshot still true?

Application code at `97ccecd` is identical to the Phase 1 baseline `204a1ea` (the only change in between is the
spec itself, PR #57), so the Phase 1 counts in §1 (8 domains, 31 objects, 32 screens, 144 workflows, 412 rules) are
**still accurate** and were not re-derived. Two Phase 1 discrepancies were found and corrected:

| Discrepancy | Correction |
| --- | --- |
| Line citations past the end of the file in the trust & safety specs (`report-button.tsx` cited up to `:421` for a 143-line file; `report-card.tsx`, `require-user.ts`, `moderation.api.ts`) | Re-mapped (DEC-021); a scripted check of all 1,924 `file:line` citations in `domains/` and `audits/` now finds none out of range. Ranges are checked for existence, not for exact content |
| Phase 1 functional summary first stated 69 findings (P2 32 / P3 31) | Corrected before merge to 68 (P2 34 / P3 28); Phase 2 adds 5 → 73 |

### 7.2 Phase 2 totals

| Item | Count |
| --- | --- |
| Journeys analysed | 35 (11 reader, 11 author, 8 moderation/operator, 5 account) |
| Capability rows | 171 (33 Implemented · 49 Partial · 86 Missing · 2 Unverified · 1 Not applicable) |
| Screens with an enhancement assessment | 32 of 32 (100 %) — 5 P1 · 20 P2 · 7 P3 |
| Screen-enhancement acceptance criteria | 205 (all `[Proposed]`) |
| New proposals | 32 IDs (`FP-035…FP-066`), 31 active (FP-052 merged) |
| Existing proposals amended or re-scoped | FP-001…FP-034 referenced; priorities changed for FP-019, FP-024, FP-031 (proposed) |
| Business-rule change proposals | 23 `BRC-*` (all awaiting approval) |
| New open questions | 35 (total open: 91 + 3 owner actions) |
| New findings | 5 functional (F-READ-01, F-STM-07, F-STM-08, F-MOD-09, F-HIST-03) · 9 UX |
| External benchmark entries | 35 (`BM-01…BM-35`; 6 confirmed from fetched pages, most from official text in search results, some Unverified) |

### 7.3 Verification performed in Phase 2

| Method | Result |
| --- | --- |
| Guest browser run (Playwright, `storynest-dev` data) | 13 public routes at 390 / 768 / 1280 px (39 full-page screenshots + page metrics), TOC and paragraph sheets, scrolled reader at 390 and 1280 px |
| Runtime-verified new facts | Reader toolbar/progress covered after scroll (F-READ-01); tablet has no navigation; card heights ≈ 451 px (390) / 511 px (1280); 17 of 21 reader controls < 44 px at 390 px (count includes inline links) |
| Code checks by the consolidator | F-STM-08 default visibility, toolbar/header stacking, focus-ring tokens, `reviewed_by` mapping, Studio chapter count, 18+ hint text, citation ranges |

### 7.4 Unverified in Phase 2 and why

| Area | Reason |
| --- | --- |
| All signed-in screens and flows (library, notifications, settings, Studio, editor, history, team, stats, moderation) | No test accounts on the shared dev project (DEC-011); assessed from code, tests and specs |
| Growth / retention value | No analytics data; marked Hypothesised |
| Competitor behaviour | Most sources were not fetchable (AO3, Royal Road, Wattpad support, Inkitt help centre blocked fetching); entries use official text from search results or are marked Unverified |
| Contrast ratios | Calculated from token values, not measured on screen |
| Dark mode, toasts over the bottom nav, Vietnamese IME in the editor, keyboard overlap on phones | Not observed |
| Phase 2 `_drafts` | Merged into the final documents and removed; per-review notes for consolidation are summarised in DEC-014…DEC-022 |

## 8. Phase 2.5 runtime verification (2026-11-05)

Signed-in flows were exercised with six QA accounts on `storynest-dev` after the Product Owner approved test data
(see [runtime verification](../verification/README.md) and DEC-023).

| Measure | Before | After |
| --- | --- | --- |
| Route screens rendered at runtime | 13 of 28 (46 %) | **26 of 28 (93 %)** — not rendered: `/me/edit`, `/following` (redirect only) |
| Signed-in flows exercised | none | Reader, author, co-author, editor, moderator, cross-role (50 cases) |
| Findings Verified (Runtime) | 8 (guest checks RT-01…RT-15, F-READ-01) | 8 + 18 confirmed in this run + 1 new defect (F-STM-09) |
| Functional · UX findings | 73 · 71 | 74 · 73 |

**Environment-parity lesson.** F-STM-09 passes the SQL suite on the local PostgreSQL shim (`260_moderation.test.sql:218`)
but fails on Supabase because of function privileges. Until the SQL suite runs against a Supabase branch or the dev
project, RLS/trigger/privilege changes must be re-checked on `storynest-dev` (quality gate in
[implementation-readiness §7](../proposals/implementation-readiness.md#7-quality-gates)).

Still unverified at runtime: sign-up submission, password reset and email change (would send email), Google OAuth
(not implemented), suspended author on the public home feed and sitemap (would need a public QA story), the 95 %
completion rule on a long chapter (F-PROG-01, QA chapters too short), offline behaviour, dark mode.

## 9. Regression after PR #60 (2026-11-05)

Application code changed for the first time since the Phase 1 baseline: PR #60 (338 files, UI/features/docs, no SQL). The
counts in §1 and §7 still describe the specification (rules, workflows, screens), not the code; PR #60 added rules
(BR-READ-019, BR-SET-010, BR-STAT-011…014) and screen actions that the Phase 1/2 counts do not include. Re-derive the
counts before the next release.

Checks on `main`: typecheck, lint, check:hardcode, check:tokens, format:check, db:types:check pass; unit tests 1,524 pass
(`pnpm db:verify` and the web build were not run: no SQL changed). Browser regression: 22 `REG-*` checks, results in
[verification](../verification/README.md#regression-after-pr-60). Phase 1/2 line citations were not re-checked against the
files PR #60 changed; expect some drift in `packages/features/src/{editor,reader,studio,story,shell}`.

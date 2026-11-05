# Functional Gap Analysis

Categories **A** (functional defect: contradicts a verified requirement or confirmed rule) and **B** (missing or
incomplete functionality in an established workflow). UX/UI findings (category C) are in
[ux-ui-gap-analysis.md](ux-ui-gap-analysis.md); new-feature ideas (category D) are only in the
[feature backlog](../proposals/feature-backlog.md). Entry point: [README](../README.md).

Compared sources: WBS (documented scope and "Đã làm" notes) ↔ code and SQL ↔ expected user workflow. Evidence paths
are repo-relative; the per-screen specs cite more lines. Verification: **Code** = confirmed by reading code/SQL;
**SQL** = confirmed by an existing SQL test or a query run during analysis; **Runtime** = confirmed in the browser
(guest, 2026-11-04); **Inferred** = derived from code paths, not exercised.

No P0 finding: nothing blocks current development, and the product is not yet public. The P1 items are the ones to
fix before any public launch.

## 1. Summary

| | A Defect | B Missing / incomplete | Total |
| --- | --- | --- | --- |
| P1 | 4 | 2 | 6 |
| P2 | 13 | 21 | 34 |
| P3 | 10 | 18 | 28 |
| **Total** | **27** | **41** | **68** |

Duplicates reported by more than one domain were merged into one canonical ID (aliases listed in §4).

## 2. Systemic themes

| Theme | Findings | Root cause | Proposal |
| --- | --- | --- | --- |
| T1 Permission rules enforced only by the UI | F-STM-01, F-CHM-01, F-TEAM-01 | Broad `UPDATE` RLS policies with `deleted_at` in the column grant; role limits live in screens | [FP-001](../proposals/feature-backlog.md#fp-001) |
| T2 Suspension applied inconsistently | F-HOME-01, F-MOD-05, F-SEO-01, F-STM-05, F-CMT-02, F-MOD-06 | `is_active_account()` checked on inserts/RPCs but not on updates or on non-RPC lists; no user feedback | [FP-002](../proposals/feature-backlog.md#fp-002) |
| T3 Unsaved text can be lost | F-EDT-02, F-HIST-01 (+ U-I18N-02, U-STM-03, U-PRF-02) | No shared "dirty form / flush before leave" mechanism | [FP-003](../proposals/feature-backlog.md#fp-003) |
| T4 Errors and not-found are not first-class | F-SHELL-01, F-STM-06, F-PRF-01, F-STM-03, F-EDT-04, F-HIST-02 | No `not-found.tsx`/`error.tsx`; several components render `null` on error | [FP-004](../proposals/feature-backlog.md#fp-004), [FP-020](../proposals/feature-backlog.md#fp-020) |
| T5 Links are not stable | F-NOTI-01 (+ D ideas F-STORY-03, U-PRF-03) | Slugs/usernames frozen in payloads and URLs; only story slugs redirect | [FP-011](../proposals/feature-backlog.md#fp-011) |
| T6 18+ protection is client-side | F-MAT-01, F-MAT-02, F-MAT-03 | Gate hides DOM only; server metadata and dehydrated data are not filtered | [FP-005](../proposals/feature-backlog.md#fp-005) |
| T7 Silent background failure | F-EDT-05, F-JOB-02, F-EDT-03 | Scheduled publish has no attempt limit or signal; no job health | [FP-010](../proposals/feature-backlog.md#fp-010) |

## 3. Findings

### P1

| ID | Cat | Object / screen | Finding | Evidence | Recommendation (impact) | Conf · Effort · Verif. | FP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-STM-01 | A | STM / SCR-STM-03 | Co-authors can soft-delete or restore the whole story via the API; WBS 3.2 says owner only. UI hides the button but RLS `stories_update` allows owner + co_author and `deleted_at` is grantable. | `supabase/migrations/20261103000100_auth_and_rls.sql:205-211`, `packages/features/src/studio/screens/story-form-screen.tsx:404` | Owner-only RPC or trigger on `deleted_at`; SQL tests (RLS migration) | High · S · Code | FP-001 |
| F-CHM-01 | A | CHM / SCR-CHM-01 | Editors can soft-delete/restore chapters via the API (archive RPC checks role, delete does not). | `…/20261103000100_auth_and_rls.sql:236-240`, `…/20261104000400_chapter_management.sql:115-117`, `chapter-manager-screen.tsx:78` | `set_chapter_deleted` RPC for owner/co-author; revoke column grant; test (RLS migration) | High · S · Code | FP-001 |
| F-HOME-01 | A | HOME / SCR-HOME-01 | Stories of suspended/deactivated authors stay on the home feed as "Anonymous author"; every RPC list hides them; WBS 5.4 says suspended accounts are not shown. | `packages/features/src/discovery/api/discovery.api.ts:64-71`, `discovery/model/story-card.ts:51-54`; compare `…/20261104001300_search.sql:80-81` | Shared discovery predicate (RPC or inner owner join) + test (API/DB) | High · S · Code | FP-002 |
| F-EDT-02 | A | EDT / SCR-EDT-01 | Leaving the editor through an in-app link (Preview, History, Back, header) neither saves to the server nor warns (`beforeunload` covers only tab close); unmount keeps the text only as a local backup on this device, offered on return. Preview/Compare therefore show the stale draft, other devices never get the text, and a History restore clears the backup, losing it for good. | `packages/features/src/editor/screens/chapter-editor-screen.tsx:177-184,238-263`, `packages/features/src/history/hooks/use-history.ts:47-55` | Flush `saveNow()` before navigation + in-app route guard (UI) | High · M · Code | FP-003 |
| F-SHELL-01 | B | SHELL / all | No `not-found.tsx`, `error.tsx`, `global-error.tsx`; shared `ErrorBoundary` never mounted. Missing story/chapter return **HTTP 200** with Next's default English "404 This page could not be found."; unknown paths show the default page without the shell. | `packages/features/src/_shared/error-boundary.tsx:20-45`; runtime RT-01 | Translated not-found/error pages inside the shell with real 404 status (UI) | High · S · **Runtime** | FP-004 |
| F-AUTH-07 | B | AUTH / SCR-SET-01 | No account lifecycle: deactivate, delete = anonymise (decision Q7), export, change email. WBS 6.4 ⬜. | `docs/WBS.md` WP 6.4 and §4 Q7, `…/20261103000100_auth_and_rls.sql:20-24` | WP 6.4 RPCs + Settings "Account" section; needs legal input (DB+RPC+UI) | High · L · Code | FP-008 |

### P2

| ID | Cat | Object / screen | Finding | Evidence | Recommendation (impact) | Conf · Effort · Verif. | FP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-TEAM-01 | A | TEAM / SCR-TEAM-01 | Invite hint says editors "can't publish or delete", but `publish_chapter`/`schedule_chapter` accept editors and the editor shows Publish to them. | `packages/features/src/studio/strings.en.ts:136-139`, `…/20261103000200_publish_chapter_rpc.sql:217-232`, `supabase/tests/20_publish.test.sql:84-96` | Fix copy or restrict per Q-TEAM-01 (copy / RPC) | High · S · SQL | FP-016 |
| F-MOD-02 | A | MOD → STM / SCR-STM-01, SCR-STM-03 | A moderator-removed story appears to its author as self-deleted with a Restore button that always fails ("You don't have permission"); no takedown notice. | `…/20261104002000_moderation.sql:102-116,389`, `studio-screen.tsx:154-200` | Expose "removed by moderation" state; badge instead of Restore (RPC+UI) | High · M · Code | FP-006 |
| F-MOD-05 | B | MOD / multiple | What a suspension hides is unspecified: hidden from search, ranking, recommendations, following feed and author page; still in home/category/tag lists, sitemap, story page by link; comments stay visible. | `discovery.api.ts:63-71`, `apps/web/src/lib/seo/sitemap-data.ts:22-29`, `…/20261104001500_rankings.sql:107` | Decide Q-MOD-01, then one owner-active filter everywhere (queries/RLS) | Medium · M · Code | FP-002 |
| F-MOD-06 | B | MOD, AUTH / SCR-SHELL-01 | Suspended users, content owners and reporters are never told anything; `account_status` is loaded but unused; writes fail with generic errors. (alias F-AUTH-08) | `packages/features/src/_shared/auth.tsx:11-21`, `docs/WBS.md` WP 6.1 | Suspension banner; outbox notifications for removal/hide/suspension/report resolved (DB+UI) | High · M · Code | FP-006 |
| F-STM-05 | B | STM, CHM, EDT | Suspended accounts can still update stories, chapters and drafts by direct table writes (`stories_update`, `chapters_update`, `chapter_drafts_all` lack `is_active_account()`), while inserts and RPCs check it. (alias F-EDT-10) | `…/20261103000100_auth_and_rls.sql:207-211,237-240,247-252` | Add the check to UPDATE policies + tests (RLS) | Medium · S · Code | FP-002 |
| F-SEO-01 | A | SEO | Sitemap and `isIndexable` ignore the owner's account status, offering crawlers what the app hides. | `apps/web/src/lib/seo/sitemap-data.ts:22-56`, `packages/features/src/story/model/story-detail.ts:24-26` | Sitemap RPC with owner-active filter (DB RPC + web) | High · S · Code | FP-002 |
| F-MAT-01 | A | MAT / SCR-MAT-01 | 18+ gate is client-only: the server emits the story title, synopsis meta, OG title and cover, chapter title and excerpt, and dehydrates full chapter blocks into the HTML. WBS 5.6 says the gate shows no title or content. | `apps/web/src/app/(main)/story/[id]/[slug]/page.tsx:18-38,64-66`, `…/opengraph-image.tsx:13-19`, `apps/web/src/lib/story/load-chapter.ts:14-17`; runtime RT-06 (tab title "Đêm không ngủ · StoryNest" behind the gate) | Generic title/OG for 18+; no cover; do not dehydrate blocks before confirmation (web routes) | High · S · **Runtime** (title) | FP-005 |
| F-MAT-02 | B | MAT → LIST / SCR-LIST-01 | Other people's public reading lists show 18+ stories to guests and to readers who chose "hidden". | `packages/features/src/lists/api/lists.api.ts:31-48` | Hide/blur 18+ items for non-owners (UI/query) | Medium · S · Code | FP-005 |
| F-ABU-01 | A | ABU / SCR-CMT-01 | Spam filter counts `https://www.` links twice (`(https?://|www\.)`), so a comment with two such links is refused as spam. | `…/20261104002200_abuse_limits.sql:83`, `supabase/tests/280_abuse_limits.test.sql:134` | Count one match per URL + test (DB migration) | High · S · **SQL** (regex run on PG 16) | FP-007 |
| F-ABU-02 | B | ABU, AUTH / SCR-AUTH-02 | No sign-up rate limit or captcha (WBS 6.8 open); leaked-password protection off (WBS 0.0). (alias F-AUTH-06) | `…/20261104002200_abuse_limits.sql:20-22`, `packages/features/src/auth/api/auth.api.ts:28-32` | Turnstile/hCaptcha + `captchaToken`; enable leaked-password protection; version Auth config (config+UI) | High · M · Code | FP-009 |
| F-AUTH-01 | A | AUTH / SCR-AUTH-02 | Sign-up silently changes the requested username: trigger lower-cases, truncates to 20 and may add a suffix, while the form allows 3–30 mixed-case. | `packages/validation/src/inputs.ts:13-17`, `…/20261103000100_auth_and_rls.sql:33-46` | Align trigger with validation; show the final username (DB+UI) | High · S · Code | FP-009 |
| F-AUTH-02 | B | AUTH | Google OAuth (approved for M1, Q6) not implemented. | `docs/WBS.md` WP 1.1, §4 Q6 | "Continue with Google" via `signInWithOAuth` (UI+config) | High · S · Code | FP-009 |
| F-AUTH-03 | B | AUTH / SCR-AUTH-01/02 | No way to resend the confirmation email; signing up again says "already registered". | `packages/features/src/auth/screens/sign-up-screen.tsx:51-60` | Resend with cooldown (UI) | High · S · Code | FP-009 |
| F-AUTH-04 | B | AUTH / callback | Email links opened on another device/browser fail (PKCE verifier) with "invalid or expired", even if the email is confirmed. | `apps/web/src/app/auth/callback/route.ts:11-22` | Support `token_hash` via `verifyOtp`, map error params (route + templates) | Medium · M · Inferred | FP-009 |
| F-AUTH-05 | B | AUTH / SCR-AUTH-04 | Any signed-in session can set a new password at `/reset-password` without the current one; no change-password entry in Settings. | `apps/web/src/lib/auth/route-guard.ts:14-15`, `reset-password-screen.tsx:21-50` | Distinguish recovery sessions; reauthenticated change-password (UI+config) | Medium · M · Code | FP-009 |
| F-SHELL-02 | B | SHELL | No CSP or security headers (HSTS, frame-ancestors, Referrer-Policy, Permissions-Policy). | `apps/web/next.config.ts:4-7`, `docs/WBS.md` WP 8.3 | Nonce CSP in proxy + standard headers (config) | High · M · Code | FP-023 |
| F-EDT-01 | A | EDT / SCR-EDT-01 | Schedule is offered on published chapters but is always refused (PT409) with "changed elsewhere, reload". | `packages/features/src/editor/components/publish-panel.tsx:139-147`, `…/20261103000200_publish_chapter_rpc.sql:254-257`, `supabase/tests/20_publish.test.sql:151` | Hide or explain; decide Q-EDT-05 (UI) | High · S · SQL | FP-010 |
| F-EDT-03 | B | EDT / SCR-EDT-01 | Save failures that can never succeed (expired session, forbidden, invalid) retry forever as "Couldn't save, retrying"; revoked collaborator sees "conflict". | `packages/features/src/editor/model/autosaver.ts` (`isPermanent` unused) | Stop on permanent errors with an actionable message (UI) | Medium · S · Inferred | FP-010 |
| F-EDT-04 | B | EDT / SCR-EDT-01 | Publish panel renders nothing while loading or on error (no skeleton, error or retry). | `publish-panel.tsx:59` | Loading + error/retry states (UI) | High · S · Code | FP-020 |
| F-EDT-05 | B | EDT, JOB | A failed scheduled publish is invisible: WARNING log, retried every minute forever, badge keeps a past time. (alias F-JOB-01) | `…/20261103000200_publish_chapter_rpc.sql:309-335` | Attempt counter + last error, stop after N, notify author, show in Studio (DB+UI) | High · M · Code | FP-010 |
| F-JOB-02 | B | JOB | No monitoring or alerting for dead letters, cron failures, ranking lag, missing `pg_cron`. | `…/20261103000300_outbox_worker_and_cron.sql:98,126-141`, WBS 8.2 | Health RPC + alerting (DB+ops) | High · M · Code | FP-010 |
| F-HIST-01 | B | HIST / SCR-HIST-01 | Restoring a version overwrites the unpublished draft with no undo; the revision check re-reads just before writing so it misses edits made since History opened; the local backup is deleted. | `packages/features/src/history/hooks/use-history.ts:47-55` | Send the displayed revision; keep replaced draft as backup (UI/API) | High · S · Code | FP-003 |
| F-STM-03 | A | STM / SCR-STM-03 | Story delete failure is silent (ConfirmDialog swallows the rejected promise). | `story-form-screen.tsx:445-449`, `packages/ui/src/widgets/confirm-dialog.tsx:15-18,40-51` | try/catch + error toast (UI) | High · S · Code | FP-018 |
| F-STM-04 | A | STM, CHM / SCR-STM-02, SCR-CHM-01 | Retry after a lost create response hits the primary key (23505) and is reported as "slug taken". | `packages/features/src/studio/api/story-write.api.ts:31-39`, `studio/model/story-form.ts:99-104` | Distinguish constraints; treat own existing row as success (UI/API) | Medium · S · Inferred | FP-018 |
| F-TEAM-02 | B | TEAM / SCR-TEAM-01 | Collaborators cannot leave a story; RLS allows it but no UI offers it. | `…/20261103000100_auth_and_rls.sql:221-222`, `team-screen.tsx:62-64` | "Leave story" action (UI) | High · S · Code | FP-016 |
| F-NOTI-01 | A | NOTI / SCR-NOTI-01 | Notification links 404 after a chapter slug rename (payload freezes slugs; only story slugs redirect). | `…/20261103000300_outbox_worker_and_cron.sql:40-41`, `packages/features/src/notifications/model/notification.ts:87,99` | Resolve by chapter id or slug history (route/DB) | High · M · Code | FP-011 |
| F-NOTI-02 | A | NOTI / SCR-NOTI-01 | Reply excerpt (≤140 chars) copied into the notification survives the reply's deletion or moderation. | `…/20261104001100_comment_reply_notifications.sql:52` | Blank excerpt on hide/delete, or read at display time (DB) | High · S · Code | FP-013 |
| F-LIB-01 | B | LIB / SCR-LIB-01 | Library tabs capped at 50 items, no paging (WBS 4.4 notes it). | `packages/features/src/library/model/library.ts:8` | Keyset paging + Load more (UI/API) | High · S · Code | FP-015 |
| F-LIST-01 | A | LIST / SCR-LIST-01 | Reorder is always refused when the list contains the owner's own soft-deleted story (client and server disagree on contents). | `packages/features/src/lists/model/list.ts:63-71`, `…/20261104000900_reading_lists.sql:101-105` | Server ignores deleted stories + test (RPC migration) | Medium · S · Inferred | FP-014 |
| F-LIST-03 | B | LIST / SCR-LIST-01 | Unlisted lists are enumerable through the API while the UI says "It isn't listed anywhere" (known limitation in WBS 4.5). | `…/20261103000100_auth_and_rls.sql:301-302`, `packages/features/src/lists/strings.en.ts:19` | `get_list(id)` DEFINER RPC; restrict direct SELECT (RLS+RPC) | High · M · Code | FP-014 |
| F-PROG-01 | A | PROG / SCR-READ-01 | Completion (≥95 %) and the progress bar are measured over the whole page, comments included; non-scrolling pages stay 0 %. Readers who skip comments never complete a chapter. | `packages/features/src/progress/hooks/use-reading-tracker.ts:22-28`, `reader-screen.tsx:110-125` | Measure the blocks container; end marker / Next = 100 % (UI) | Medium · S · Inferred | FP-012 |
| F-TAX-01 | B | TAX / SCR-HOME-01, SCR-STM-02 | Categories exist only in the dev seed; no production provisioning or management path. | `supabase/seed/dev_seed.sql:22-37` | Idempotent data migration (DB data) | Medium · S · Code | FP-017 |
| F-AUTHOR-01 | B | AUTHOR / SCR-AUTHOR-01/02 | No list of followed authors; unfollow only per author page, although the follow-limit message says "Unfollow some". | `packages/features/src/author/strings.en.ts:26`, WBS 5.4 | `list_followed_authors` + "Authors" tab (DB+UI) | High · M · Code | FP-019 |
| F-AUTHOR-02 | B | AUTHOR, SEO / SCR-AUTHOR-01 | Author page: generic title, client-only render, HTTP 200 for unknown authors, no canonical, not in sitemap (story JSON-LD links to it). (alias F-SEO-02) | `apps/web/src/app/(main)/author/[username]/page.tsx:7-13`, `apps/web/src/lib/seo/sitemap.ts:43`; runtime RT-02 | `generateMetadata`, `notFound()`, SSR prefetch, sitemap (route/SEO) | High · S · **Runtime** | FP-004 |

### P3

| ID | Cat | Object / screen | Finding | Evidence | Recommendation | Conf · Effort | FP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-STORY-01 | A | STORY, READ, MOD | Report button shown to the owner on their own story/chapter; server refuses self-reports. (alias F-MOD-01) | `story-screen.tsx:113`, `reader-screen.tsx:115`, `…/20261104002000_moderation.sql:163-165` | Pass `ownerId` (UI+query) | High · S | Quick fix |
| F-STORY-02 | B | STORY, READ | Chapter list and TOC load every chapter in one query; PostgREST `max_rows` unknown. | `packages/features/src/story/api/story.api.ts:41-55` | Confirm limit; paginate; fetch neighbours only | Low · M | Quick fix |
| F-STORY-04 | A | STORY, SEO | JSON-LD author URL becomes `/author/` when the author profile is hidden. | `story/[id]/[slug]/page.tsx:59` | Omit `author.url` when empty | High · S | Quick fix |
| F-PROG-02 | A | PROG / SCR-STORY-01 vs SCR-LIB-01 | "Continue" targets the next chapter on the story page but the finished chapter in the library. | `progress/model/progress.ts:51-59`, `library/model/library.ts:49-58` | Reuse `resolveContinueChapter` | High · S | FP-012 |
| F-PROG-03 | A | PROG / SCR-STORY-01 | Story-progress cache key is not per user and survives sign-out (up to 5 min). | `progress/keys.ts:5`, `_shared/auth.tsx:65` | User-scoped keys / clear on sign-out | Medium · S | FP-012 |
| F-PRF-01 | A | PRF / SCR-PRF-01 | `/me` shows a load error as "No profile was found". | `apps/web/src/app/(main)/me/me-view.tsx:28-41` | Error state with retry | High · S | FP-020 |
| F-STM-06 | A | STM / studio routes | Malformed story id shows "check your connection" + retry instead of not-found. | `studio/story/[id]/page.tsx:11-14`, `_shared/errors.ts:67` | Validate UUID → `notFound()` | Medium · S | FP-004 |
| F-TEAM-03 | B | TEAM | No way to change a collaborator's role (RLS allows; WBS 3.8 lists as missing). | `…/20261103000100_auth_and_rls.sql:216,219-220` | Role select per row | High · S | FP-016 |
| F-EDT-06 | B | EDT | Republishing an unchanged draft creates an identical version (WBS 3.7 notes). | `…/20261103000200_publish_chapter_rpc.sql` | Skip identical snapshot | High · M | FP-034 |
| F-EDT-07 | B | EDT | Drafts of soft-deleted chapters / deleted stories still open, autosave and show Publish; publish then fails with a misleading message. | `can_edit_chapter`, `story_role` ignore `deleted_at` | Deleted notice; disable publish | Medium · S | FP-018 |
| F-EDT-08 | B | EDT | Chapter pictures are never deleted (orphans in a public bucket). | `packages/features/src/editor/api/images.api.ts:13-23` | Orphan clean-up job | High · M | FP-030 |
| F-HIST-02 | B | HIST / SCR-HIST-01 | Comparing with another version shows a skeleton forever if it fails to load. | `history-screen.tsx:196-198,254` | Error state | High · S | FP-020 |
| F-HOME-02 | B | HOME | Language filter from WBS 2.2 exists only in the API (no URL param or control). | `discovery.api.ts:72`, `apps/web/src/app/(main)/page.tsx:18-22` | Add `?language=` + select, or correct WBS | High · S | Quick fix |
| F-TAX-02 | B | TAX, MOD | Tags cannot be moderated, renamed or merged; moderation targets exclude tags. | `…/20261104002000_moderation.sql:37-41` | Moderator tag RPC + audit | Medium · M | FP-017 |
| F-SRCH-01 | B | SRCH / SCR-SRCH-01 | Offset cap (200) shows "No more results"; the `capReached` string is unused. | `packages/features/src/search/model/search.ts:49-54` | Show cap message | High · S | Quick fix |
| F-CMT-01 | A | CMT / SCR-CMT-01 | "(edited)" shown after hide/unhide or saving unchanged text (`updated_at` bumped on every UPDATE). | `…/20261104001800_comment_moderation_by_author.sql:108,144,157`, `comment-item.tsx:108` | `edited_at` set only when body changes | High · S | Quick fix |
| F-CMT-02 | A | CMT | Suspended accounts can still edit/delete their own comments. | `…/20261104000700_comments.sql:250-292`, `…/20261103000400_hardening_and_indexes.sql:42-48` | Active-account check (Q-CMT-01) | Medium · S | FP-002 |
| F-CMT-04 | B | CMT (tests) | SQL test 240 contains an assertion that always passes. | `supabase/tests/240_comment_moderation_by_author.test.sql:106` | Real query as another reader | High · S | Quick fix |
| F-NOTI-03 | B | NOTI | No delete UI and no retention purge for notifications (RLS allows delete). | `…/20261103000100_auth_and_rls.sql:349` | Per-item delete + retention job (Q-NOTI-01) | High · S | FP-013 |
| F-LIST-02 | B | LIST | Unavailable stories vanish from lists without trace, still count toward the 500 limit, cannot be removed. | `…/20261104000900_reading_lists.sql:35-43` | Owner-only placeholders (Q-LIST-01) | High · M | FP-014 |
| F-MOD-03 | A | MOD / SCR-MOD-01 | Console offers "Restore story" for author-deleted targets (always PT409). | `packages/features/src/moderation/model/report.ts:141-144` | Separate `deleted` vs `removed` state | High · S | FP-006 |
| F-MOD-04 | A | MOD, CMT | Moderator cannot lock an author-hidden comment, so the author can later unhide it (WBS 6.2 implies a moderator hide overrides). | `report.ts:133-136`, `…/20261104002000_moderation.sql:261,371-373` | "Hide as moderator" rewrites source | Medium · S | FP-006 |
| F-MOD-08 | B | MOD (validation) | `reportCreateSchema` describes a direct-insert path the DB refuses; reason is free text. | `packages/validation/src/inputs.ts:83-95` | Replace with `submit_report` arg schema | High · S | Quick fix |
| F-MAT-03 | B | MAT | 18+ choice survives sign-out; a guest's confirmation is uploaded to the next account. | `adult-content/model/store.ts:57-67`, `use-adult-content-sync.ts:56-61` | Reset on sign-out; confirm before upload (Q-MAT-03) | Medium · S | FP-005 |
| F-ABU-03 | B | ABU | No limits on votes, likes, follows, saves, creation, profile edits; no IP limits. | WBS 6.8 | Extend `enforce_rate_limit`; edge IP limits | High · M | FP-007 |
| F-SET-01 | B | SET | Only in-app notification switches; email/push deferred (WBS 6.3/6.7). | `…/20261104001900_user_settings.sql:11-13` | Channel columns with WP 6.7 | High · L | FP-026 |
| F-I18N-01 | B | I18N (tooling) | Hardcode guard catches Vietnamese text only, not English literals. | `scripts/check-hardcode.mjs:21-31` | Required label props / `jsx-no-literals` | High · S | Quick fix |
| F-SHELL-03 | B | docs | README and WBS §0 describe pre-Phase-1 state (no ESLint, "Auth UI" pending, 1 component, bottom nav 2 items, `apps/mobile` shell). (incl. F-CMT-05) | `README.md:26,84,120,127,157,164`, `docs/WBS.md:11-22,139` | Update docs | High · S | Quick fix |

## 4. Aliases (merged duplicates)

| Alias | Canonical | Reason |
| --- | --- | --- |
| F-MOD-01 | F-STORY-01 | Same Report-button issue |
| F-STM-02 | F-MOD-02 | Same moderator-removed story issue |
| F-EDT-10 | F-STM-05 | Same missing `is_active_account()` on draft UPDATE |
| F-JOB-01 | F-EDT-05 | Same failed scheduled publish |
| F-AUTH-06 | F-ABU-02 | Same sign-up captcha/limit gap |
| F-AUTH-08 | F-MOD-06 | Same "suspended user not told" gap |
| F-SEO-02 | F-AUTHOR-02 | Same author-page SEO gap |
| F-CMT-05 | F-SHELL-03 | Same stale-README finding |
| F-CHM-03 | F-STORY-03 (D) | Same chapter slug redirect idea — in backlog |

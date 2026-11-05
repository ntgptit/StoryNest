# OBJ-MOD — Reports & moderation console — Business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | OBJ-MOD |
| Name | Reports & moderation console |
| Business purpose | Let any active reader flag harmful content or accounts, and let moderators review flags and take accountable, reversible action |
| User goals | Reader: "tell someone this is wrong" in two clicks. Moderator: see what waits longest, understand the context, act with a recorded reason, undo a mistake |
| Actors / roles | Guest (redirected to sign in), Member (reporter), Moderator, affected party (story owner, commenter, reported account) |
| Related entities | Tables `content_reports`, `moderation_actions` (audit), `comment_hides` (OBJ-CMT), `stories.deleted_at`, `comments.status`, `app_users.account_status`. RPCs `submit_report`, `list_reports`, `moderate`, `resolve_report`; internal `moderation_report_card`, `close_reports_for`, `last_moderation_action`; guard triggers `content_reports_guard`, `comments_guard_hiding`, `stories_guard_removal`; helper `is_moderator()` |
| Dependencies | BR-ABU-004 (report rate limit), OBJ-CMT (author-side hiding, `comment_hides`), OBJ-STORY/OBJ-STM (readability, soft delete), OBJ-AUTH (account status), OBJ-SHELL (user menu), `_shared/errors.ts` |
| Code | `packages/features/src/moderation/**`, `apps/web/src/app/(main)/moderation/{page,moderation-view}.tsx`, `supabase/migrations/20261104002000_moderation.sql`, `supabase/tests/260_moderation.test.sql` |

## 2. Rules

### BR-MOD-001 — Moderator role
| Field | Value |
| --- | --- |
| Description | A moderator is a user whose verified JWT carries `app_metadata.role = 'moderator'` |
| Preconditions | Role set by service role on `auth.users.raw_app_meta_data` (no UI) |
| Conditions | DB: `is_moderator()` reads `auth.jwt() -> 'app_metadata' ->> 'role'`. Web server: `getCurrentUser()` reads the same claim from `getClaims()` (signature-verified). Client: `useIsModerator()` reads `auth.user.app_metadata.role` only to show menus |
| Expected behavior | Every moderation RPC re-checks `is_moderator()`; the client flag never grants anything |
| Exceptions | The claim lives in the token: a granted/revoked role takes effect when the token is refreshed (Q-MOD-02). For "cannot suspend a moderator" the DB reads `auth.users` metadata instead of the token (BR-MOD-014) |
| Related screens | SCR-MOD-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:10,69-72`, `apps/web/src/lib/auth/require-user.ts:9-23`, `packages/features/src/moderation/hooks/use-moderation.ts:15-19`, `docs/WBS.md:219` ("cấp/thu vai moderator qua giao diện" not done) |
| Status | Verified |

### BR-MOD-002 — Reportable targets
| Field | Value |
| --- | --- |
| Description | A report is about exactly one of: story, chapter, comment, user |
| Preconditions | — |
| Conditions | `p_kind ∈ {story, chapter, comment, user}`; any other kind → 22023. Table CHECK `num_nonnulls(story_id, chapter_id, comment_id, reported_user_id) = 1` |
| Expected behavior | The report row stores the id in the matching column |
| Exceptions | — |
| Related screens | SCR-MOD-02 (mounted on story page, chapter reader, each comment, author page) |
| Evidence | `supabase/migrations/20261104002000_moderation.sql:139-162,177-184`, `supabase/migrations/20261103000000_init_schema.sql:302-317`, `moderation/model/report.ts:16`, `supabase/tests/260_moderation.test.sql:99` |
| Status | Verified |

### BR-MOD-003 — Report reasons and details
| Field | Value |
| --- | --- |
| Description | A report needs one reason from a fixed list; free-text details are optional |
| Preconditions | — |
| Conditions | Reasons: `spam, harassment, hate, sexual, violence, copyright, other` (en labels: "Spam or advertising", "Harassment or abuse", "Hate or discrimination", "Sexual content", "Violence", "Copyright infringement", "Other reason"). Details trimmed; empty → NULL; max 2000 chars |
| Expected behavior | Client: Submit disabled until a reason is chosen; textarea `maxLength=2000`; empty details not sent. Server: unknown/NULL reason or details > 2000 → 22023 |
| Exceptions | `reason = other` does not require details. The Zod `reportCreateSchema` (table-shaped, reason free text ≤ 40) is not used by this flow (F-MOD-08) |
| Related screens | SCR-MOD-02 |
| Evidence | `supabase/migrations/20261104002000_moderation.sql:124,133-137`, `packages/validation/src/enums.ts:14`, `moderation/components/report-button.tsx:107-123,135`, `moderation/model/report.ts:161-162`, `moderation/strings.en.ts:20-28`, `packages/validation/src/inputs.ts:83-95` |
| Status | Verified |

### BR-MOD-004 — Who may report
| Field | Value |
| --- | --- |
| Description | Only a signed-in, active account may report |
| Preconditions | — |
| Conditions | `auth.uid()` not null and `is_active_account()` (status `active`, not deleted) |
| Expected behavior | Guest: button navigates to `/login?next=<current pathname>` (query string/hash not kept). Suspended/deactivated: RPC 42501 → "You can't submit a report right now." `anon` has no EXECUTE privilege |
| Exceptions | Moderators may report and are not rate-limited (BR-ABU-004) |
| Related screens | SCR-MOD-02 |
| Evidence | `supabase/migrations/20261104002000_moderation.sql:130-132,188-189`, `moderation/components/report-button.tsx:54-56,86-88`, `moderation/model/report.ts:164-169`, `supabase/tests/260_moderation.test.sql:65,241` |
| Status | Verified |

### BR-MOD-005 — The target must be something the reporter can see
| Field | Value |
| --- | --- |
| Description | A report cannot be filed about content the reporter cannot read, or about an inactive account |
| Preconditions | Reporter passes BR-MOD-004 |
| Conditions | Story: `can_read_story`. Chapter: `can_read_chapter`. Comment: exists, `status = 'visible'`, and its chapter readable. User: `account_status = 'active'` and not deleted |
| Expected behavior | Otherwise PT404 → "This content no longer exists or you can't view it." |
| Exceptions | Unlisted stories are reportable (readable by link). A hidden or deleted comment cannot be reported |
| Related screens | SCR-MOD-02 |
| Evidence | `supabase/migrations/20261104002000_moderation.sql:139-159`, `supabase/tests/260_moderation.test.sql:187`, `moderation/strings.en.ts:31` |
| Status | Verified |

### BR-MOD-006 — No self-reporting
| Field | Value |
| --- | --- |
| Description | Nobody reports their own story, chapter, comment or account |
| Preconditions | Target resolved (BR-MOD-005) |
| Conditions | Owner = story `owner_id` (story, chapter), comment `author_id`, or the account itself |
| Expected behavior | Server: 22023 → "You can't report your own content, or the information isn't valid." Client hides the button for the owner **only** where it knows the owner: own comments (`!own`) and own author page (`ownerId`) |
| Exceptions | Story page and chapter reader do not pass `ownerId`, so the owner sees "Report" on their own story/chapter and only learns on submit (F-MOD-01). Co-authors/editors are not "owners" and may report the story |
| Related screens | SCR-MOD-02 |
| Evidence | `supabase/migrations/20261104002000_moderation.sql:163-165`, `moderation/components/report-button.tsx:40-41,56`, `packages/features/src/story/screens/story-screen.tsx:129`, `packages/features/src/reader/screens/reader-screen.tsx:159`, `packages/features/src/comments/components/comment-item.tsx:186-188`, `packages/features/src/author/screens/author-screen.tsx:102`, `packages/features/src/author/author.test.tsx:406` |
| Status | Verified |

### BR-MOD-007 — Duplicate reports are idempotent
| Field | Value |
| --- | --- |
| Description | A reporter has at most one open report per target |
| Preconditions | — |
| Conditions | Open = `pending` or `reviewing`. Partial unique index `uq_content_reports_open (reporter_id, coalesce(target))` |
| Expected behavior | Re-submitting returns the existing report id; nothing is overwritten (first reason/details kept); the client shows the same success toast "Report sent. Thank you." Another reporter gets their own report on the same target; the queue card shows "N pending reports about this item" |
| Exceptions | Once the report is closed, the same reporter can report the target again (counts against BR-ABU-004). The duplicate check runs before the rate limit, so a duplicate never consumes quota |
| Related screens | SCR-MOD-02, SCR-MOD-01 |
| Evidence | `supabase/migrations/20261104002000_moderation.sql:53-56,167-172`, `20261104002200_abuse_limits.sql:167-173`, `supabase/tests/260_moderation.test.sql:94-106`, `moderation/strings.en.ts:13,63` |
| Status | Verified |

### BR-MOD-008 — Report rate limit
| Field | Value |
| --- | --- |
| Description | New reports per account are capped per rolling window |
| Preconditions | — |
| Conditions | Defined by BR-ABU-004 (`report_rate_day`, default 20 / 86 400 s) |
| Expected behavior | PT429 → "You've sent too many reports today. Please try again later." shown inside the dialog |
| Exceptions | Moderators exempt |
| Related screens | SCR-MOD-02 |
| Evidence | `supabase/migrations/20261104002200_abuse_limits.sql:173`, `moderation/model/report.ts:176-177`, `moderation/strings.en.ts:34` |
| Status | Verified |

### BR-MOD-009 — Clients write nothing directly
| Field | Value |
| --- | --- |
| Description | Reports, comment hiding and story restoring after a removal happen only through the audited functions |
| Preconditions | Statement issued by role `authenticated` or `anon` |
| Conditions | `content_reports_guard` refuses INSERT/UPDATE/DELETE; `comments_guard_hiding` refuses a direct status change to/from `hidden`; `stories_guard_removal` refuses `deleted_at → NULL` when the last moderation action on the story is `remove_story` |
| Expected behavior | 42501 in each case (functions run as owner and pass) |
| Exceptions | The table grants from WP 1.2 (`INSERT/UPDATE` on `content_reports`, `comments_update_moderator`) still exist but are neutralised by the triggers |
| Related screens | — |
| Evidence | `supabase/migrations/20261104002000_moderation.sql:15-18,58-116`, `20261103000100_auth_and_rls.sql:281-282,351-361`, `supabase/tests/260_moderation.test.sql:207-209` |
| Status | Verified |

### BR-MOD-010 — Report lifecycle
| Field | Value |
| --- | --- |
| Description | A report moves `pending → reviewing → resolved | dismissed`, or `pending → resolved | dismissed` directly |
| Preconditions | Moderator (BR-MOD-001); reason 3–1000 chars (BR-MOD-015) |
| Conditions | `resolve_report(report, status, reason)` with status ∈ {reviewing, resolved, dismissed}; report closed (`resolved`/`dismissed`) → PT409; unknown report → PT404 |
| Expected behavior | Sets `status`, `reviewed_by = moderator`, `reviewed_at = now()`, writes audit `review_report` / `resolve_report` / `dismiss_report`. Console shows "Under review" only for `pending`; "Mark as resolved" and "Dismiss report" for any open report; none for closed reports |
| Exceptions | Closed is terminal — there is no reopen. Dismissing never touches the content. Reports are also closed automatically by content actions (BR-MOD-017) |
| Related screens | SCR-MOD-01 |
| Evidence | `supabase/migrations/20261104002000_moderation.sql:436-468`, `moderation/components/report-card.tsx:173-209`, `supabase/tests/260_moderation.test.sql:255-272`, `moderation/moderation.test.tsx:465,493` |
| Status | Verified |

### BR-MOD-011 — Hide / unhide a comment (moderator)
| Field | Value |
| --- | --- |
| Description | A moderator hides a visible comment or shows a hidden one again |
| Preconditions | Moderator; comment exists (PT404) and is not `deleted` (PT409) |
| Conditions | `hide_comment`: `UPDATE … SET status='hidden' WHERE status='visible'`; `restore_comment`: `… 'visible' WHERE status='hidden'`. Both idempotent (return the new state, still write an audit row) |
| Expected behavior | Hidden comment disappears for other readers (placeholder), stays visible to its author with "A moderator hid this comment. Only you can see it."; story managers see "A moderator hid this comment. You can't unhide it." (OBJ-CMT). `comment_hides.source = 'moderator'` is recorded by the OBJ-CMT trigger, so the story author cannot unhide it |
| Exceptions | **Author-hidden comment** (OBJ-CMT): the queue shows state "Hidden" and offers only "Unhide comment", which overrides the author's choice; `hide_comment` on it changes nothing (status already `hidden`), so it is never converted into a moderator hide and the author can still unhide it later (F-MOD-04) |
| Related screens | SCR-MOD-01 |
| Evidence | `supabase/migrations/20261104002000_moderation.sql:362-377`, `20261104001800_comment_moderation_by_author.sql:10-14,36-45`, `moderation/model/report.ts:133-136`, `packages/features/src/comments/strings.en.ts:41-44`, `supabase/tests/260_moderation.test.sql:172-197` |
| Status | Verified |

### BR-MOD-012 — Remove / restore a story
| Field | Value |
| --- | --- |
| Description | A moderator takes a story down (soft delete) and can bring back only what a moderator took down |
| Preconditions | Moderator; story exists (PT404) |
| Conditions | `remove_story`: refused if already deleted (PT409); sets `deleted_at = now()`. `restore_story`: allowed only when deleted **and** the latest content action on it is `remove_story`, else PT409 |
| Expected behavior | Removed story: readers get 404 / disappears from every list (it is `deleted_at IS NOT NULL`); its chapters become unreadable; the owner cannot undo it with `UPDATE deleted_at = NULL` (42501). After a moderator restore the story is back and the owner may again delete/restore it themselves |
| Exceptions | A story the author deleted is not the moderator's to restore and cannot be "removed" again (PT409). The console still offers "Restore story" for it because the card state is `removed` either way (F-MOD-03). The author sees the removed story in Studio "Deleted stories" with a Restore button that always fails (F-MOD-02) |
| Related screens | SCR-MOD-01 |
| Evidence | `supabase/migrations/20261104002000_moderation.sql:91-116,379-397`, `supabase/tests/260_moderation.test.sql:200-221`, `packages/features/src/studio/screens/studio-screen.tsx:154-200` |
| Status | Verified |

### BR-MOD-013 — A reported chapter is acted on through its story
| Field | Value |
| --- | --- |
| Description | There is no "remove chapter" action: the content action for a chapter report removes or restores the whole story |
| Preconditions | Report target kind = chapter |
| Conditions | `actionTargetId()` sends `story_id`; card state for a chapter = `removed` if the story **or** the chapter is deleted |
| Expected behavior | Button labels read "Remove story" / "Restore story"; removing the story closes the chapter's reports too |
| Exceptions | Chapter deleted by its author while the story is visible → state `removed` → "Restore story" offered → PT409 (F-MOD-03). Q-MOD-03 asks whether a chapter-level action is wanted |
| Related screens | SCR-MOD-01 |
| Evidence | `moderation/model/report.ts:129-151`, `supabase/migrations/20261104002000_moderation.sql:246-255,327-335`, `moderation/moderation.test.tsx:446` |
| Status | Verified |

### BR-MOD-014 — Suspend / reinstate an account
| Field | Value |
| --- | --- |
| Description | A moderator suspends an active account and reinstates only accounts a moderator suspended |
| Preconditions | Moderator; account exists (PT404) |
| Conditions | `suspend_user`: refused (22023) for oneself or an account whose `auth.users` metadata role is `moderator` (the DB record, not the caller's token); refused (PT409) unless `account_status = 'active'`. `reinstate_user`: only if `suspended` and the latest content action on the account is `suspend_user`, else PT409 |
| Expected behavior | Sets `account_status` to `suspended` / `active`. A `deactivated` account is never touched |
| Exceptions | A suspension made outside the console (service role) cannot be reinstated from the console. The 22023 for "moderator cannot be suspended" maps to the generic "This action can't be applied to the selected item." |
| Related screens | SCR-MOD-01 |
| Evidence | `supabase/migrations/20261104002000_moderation.sql:399-421`, `supabase/tests/260_moderation.test.sql:226-246`, `moderation/strings.en.ts:108` |
| Status | Verified |

### BR-MOD-015 — Every moderator action needs a written reason
| Field | Value |
| --- | --- |
| Description | Content actions and report status changes require a reason of 3–1000 characters (after trim) |
| Preconditions | — |
| Conditions | Client: `checkReason()`; Confirm disabled while invalid; inline "The reason must be at least 3 characters." / "The reason can be up to 1000 characters." (shown once something is typed); textarea `maxLength=1000`. Server: 22023 otherwise; table CHECK on `moderation_actions.reason` |
| Expected behavior | Reason is stored trimmed in the audit row |
| Exceptions | Dismissing and "Under review" need a reason too |
| Related screens | SCR-MOD-01 |
| Evidence | `moderation/model/report.ts:31-32,153-159`, `moderation/components/report-card.tsx:60,219-226,237`, `supabase/migrations/20261104002000_moderation.sql:43,354-357,447`, `moderation/strings.en.ts:95-101` |
| Status | Verified |

### BR-MOD-016 — Effects of a suspension
| Field | Value |
| --- | --- |
| Description | What a suspended account can still do and what others still see of it |
| Preconditions | `account_status = 'suspended'` |
| Conditions | — |
| Expected behavior | Can sign in (Supabase Auth is untouched) and read. Every write gated by `is_active_account()` is refused (42501): report, comment, follow, create story, list/library writes. Profile hidden from others (`app_users_read`), author page "not found", excluded from search/ranking/recommendations/following feed/popular tags |
| Exceptions | Still visible: their stories in home/category/tag lists with "Anonymous author" (F-HOME-01), on the story page by link, in the sitemap; their visible comments. No notice is shown to the suspended user (F-MOD-06). Scope of suspension is not specified anywhere (Q-MOD-01) |
| Related screens | SCR-MOD-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:74-80,182-184,198-202,268-271`, `20261104001300_search.sql:80-81`, `20261104001500_rankings.sql:107`, `20261104001600_author_follows.sql:50,109`, `20261104001700_recommendations.sql:36,101`, `packages/features/src/discovery/api/discovery.api.ts:66-73`, `apps/web/src/lib/seo/sitemap-data.ts:22-29`, `packages/features/src/_shared/auth.tsx:13,21` |
| Status | Inferred (assembled from RLS/RPC filters; no end-to-end test of a suspended author's content) |

### BR-MOD-017 — Content actions close the reports on the target
| Field | Value |
| --- | --- |
| Description | Hiding a comment, removing a story or suspending an account resolves every open report about that target |
| Preconditions | `moderate()` succeeded with `hide_comment`, `remove_story` or `suspend_user` |
| Conditions | `close_reports_for(target)`: all `pending/reviewing` reports on the target, plus (for a story) reports on its chapters, from any reporter |
| Expected behavior | Status `resolved`, `reviewed_by`, `reviewed_at` set; the cards move to the "Resolved" tab after the queue refresh |
| Exceptions | Restore/unhide/reinstate do not reopen or touch reports. Reports on comments of a removed story are not closed. Closing does not write one audit row per report (only the action row, with the optional `report_id`) |
| Related screens | SCR-MOD-01 |
| Evidence | `supabase/migrations/20261104002000_moderation.sql:326-337,427-429`, `supabase/tests/260_moderation.test.sql:180-181,192,203-205,238` |
| Status | Verified |

### BR-MOD-018 — Audit log
| Field | Value |
| --- | --- |
| Description | Every moderation function writes one `moderation_actions` row (actor, action, target kind/id, report id, reason, `clock_timestamp()`) in the same transaction as the change |
| Preconditions | — |
| Conditions | Table: RLS SELECT for moderators only; no INSERT/UPDATE/DELETE grant to clients; `actor_id` has no FK so the record outlives profiles |
| Expected behavior | The latest content action per target drives the restore/reinstate checks (`last_moderation_action`) |
| Exceptions | **No UI** shows the log (read by SQL only); idempotent repeats (hide twice) also write rows |
| Related screens | SCR-MOD-01 (description text "Every action is logged along with its reason.") |
| Evidence | `supabase/migrations/20261104002000_moderation.sql:33-51,92-100,424-425,461-464`, `supabase/tests/260_moderation.test.sql:177,272-289`, `docs/WBS.md:219` ("Chưa làm: xem lịch sử audit trên giao diện") |
| Status | Verified |

### BR-MOD-019 — Queue listing and card context
| Field | Value |
| --- | --- |
| Description | Moderators list reports with enough context to decide |
| Preconditions | Moderator (non-moderator → 42501; `anon` no privilege) |
| Conditions | `list_reports(status, newest_first, cursor_at, cursor_id, limit)`; status `open` (pending+reviewing), `closed` (resolved+dismissed) or one exact status, else 22023; keyset on `(created_at, id)`; limit clamped 1–51. Client uses only `open` (oldest first) and `closed` (newest first), page size 20 (+1 probe row) |
| Expected behavior | Card fields: kind, status, reason, details, reporter display name, target title (story title; chapter published title or slug; first 300 chars of comment; account display name), target state, link to the target (story / chapter / author page), count of open reports on the same target (shown when > 1) |
| Exceptions | Rows missing id/date/target/state, or with unknown kind/status, are dropped silently. Not shown although returned: report date, comment author `username`, `reviewed_by/reviewed_at` (U-MOD-01) |
| Related screens | SCR-MOD-01 |
| Evidence | `supabase/migrations/20261104002000_moderation.sql:191-323`, `moderation/api/moderation.api.ts:33-47`, `moderation/model/report.ts:34-127`, `moderation/components/report-card.tsx:109-148`, `supabase/tests/260_moderation.test.sql:133-154` |
| Status | Verified |

### BR-MOD-020 — Console access
| Field | Value |
| --- | --- |
| Description | `/moderation` exists only for moderators |
| Preconditions | — |
| Conditions | Proxy: `/moderation` is a protected prefix (guest → `/login?next=%2Fmoderation`). Page: `requireUser("/moderation")`, then `notFound()` unless `isModerator`. Menu: "Moderation" item in the avatar menu only when `useIsModerator()` |
| Expected behavior | Non-moderator gets the standard 404; page is `robots: noindex` and disallowed in `robots.txt` |
| Exceptions | `ModerationScreen` also has client fallbacks (sign-in prompt, "You don't have access to this page") used by non-Next hosts; on web they are unreachable |
| Related screens | SCR-MOD-01 |
| Evidence | `apps/web/src/lib/auth/route-guard.ts:37-45`, `apps/web/src/app/(main)/moderation/page.tsx:12-20`, `apps/web/src/app/(main)/moderation/page.test.tsx:24-38`, `packages/features/src/shell/components/user-menu.tsx:71-75`, `moderation/screens/moderation-screen.tsx:22-43` |
| Status | Verified |

### BR-MOD-021 — What the affected parties see
| Field | Value |
| --- | --- |
| Description | Feedback given to the reporter and to the owner of moderated content |
| Preconditions | A report was filed / an action was taken |
| Conditions | — |
| Expected behavior | Reporter: success toast only; RLS lets them read their own `content_reports` rows but no UI lists them. Commenter: hidden-comment notice in the thread (BR-MOD-011). Story owner: story disappears for readers; Studio lists it under "Deleted stories" like a self-deleted story. Suspended account: no notice (BR-MOD-016). Reported user: nothing |
| Exceptions | No moderation notifications exist (WBS lists them as not done) |
| Related screens | SCR-MOD-02 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:355-356`, `moderation/components/report-button.tsx:71-73`, `packages/features/src/studio/screens/studio-screen.tsx:154-200`, `docs/WBS.md:219` ("Chưa làm: … thông báo cho người bị gỡ/khóa hoặc người báo cáo") |
| Status | Verified (code) / Documented (not done) |

## 3. Open questions
- **Q-MOD-01** — Scope of suspension: should stories/comments of a suspended account vanish from every list, the
  story page and the sitemap? Should sign-in be blocked? Evidence BR-MOD-016.
- **Q-MOD-02** — Role grant/revocation latency: `is_moderator()` trusts the token claim until refresh. Is that
  acceptable, or should sensitive RPCs read `auth.users`? Evidence `20261103000100_auth_and_rls.sql:69-72`.
- **Q-MOD-03** — Should a moderator be able to remove a single chapter instead of the whole story? Evidence
  `moderation/model/report.ts:148-151`.
- **Q-MOD-04** — Should a moderator be able to "take over" an author-hidden comment (lock it)? WBS 6.2 says a
  moderator hide after the author overrides, but the console cannot do it. Evidence BR-MOD-011, `docs/WBS.md:220`.

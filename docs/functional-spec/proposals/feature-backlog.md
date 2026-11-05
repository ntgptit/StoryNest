# Feature Backlog

Every item is a **proposal**: nothing here is implemented or approved. All proposals require human approval
(record it in the [decision register](decision-register.md)) before implementation. Entry point:
[README](../README.md).

- **Type**: *Remediation* fixes confirmed findings (A/B); *Enhancement* improves existing behaviour (C);
  *New feature* adds capability that no requirement establishes today (D).
- **Need**: *MVP* = needed before a public launch · *Maturity* = important for a complete product · *Optional*.
- **Effort** is a rough size for one developer with AI help (S ≤ 1 day, M 1–3 days, L > 3 days), same caveats as
  the WBS estimates.
- Acceptance criteria below are **[Proposed]**. When implemented, move them into the screen spec and drop the tag.
- Priority follows [CONVENTIONS](../CONVENTIONS.md) and the scoring in [implementation-roadmap.md](implementation-roadmap.md#1-scoring).

## Overview

| FP | Title | Type | Pri | Need | Effort | Phase | Findings | Decision needed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [FP-001](#fp-001) | Enforce role limits on delete/restore in the database | Remediation | P1 | MVP | S | 1 | F-STM-01, F-CHM-01 | Q-TEAM-02 |
| [FP-002](#fp-002) | One suspension policy, applied everywhere | Remediation | P1 | MVP | M | 1 | F-HOME-01, F-MOD-05, F-SEO-01, F-STM-05, F-CMT-02 | Q-MOD-01, Q-STM-01, Q-CMT-01, Q-LIB-01, Q-STORY-01 |
| [FP-003](#fp-003) | Never lose typed text (flush + unsaved-changes guard) | Remediation | P1 | MVP | M | 1 | F-EDT-02, F-HIST-01, U-I18N-02, U-STM-03, U-PRF-02 | Q-HIST-01 |
| [FP-004](#fp-004) | Real not-found and error pages | Remediation | P1 | MVP | S | 1 | F-SHELL-01, F-STM-06, F-AUTHOR-02 | — |
| [FP-005](#fp-005) | Server-side 18+ protection | Remediation | P2 | MVP | S | 1 | F-MAT-01, F-MAT-02, F-MAT-03, U-MAT-01 | Q-SEO-01, Q-MAT-02, Q-MAT-03 |
| [FP-006](#fp-006) | Moderation outcomes visible to the people affected | Remediation | P2 | MVP | M | 1 | F-MOD-02, F-MOD-03, F-MOD-04, F-MOD-06 | Q-MOD-04, Q-AUTH-03 |
| [FP-007](#fp-007) | Abuse limits: fix link counting, extend coverage | Remediation | P2 | MVP | S (fix) / M | 2 | F-ABU-01, F-ABU-03, U-ABU-01 | Q-ABU-01, Q-ABU-02 |
| [FP-008](#fp-008) | Account lifecycle (WBS 6.4 / Q7) | Remediation | P1 | MVP | L | 2 | F-AUTH-07 | Legal policy for Q7 (WBS §4) |
| [FP-009](#fp-009) | Complete sign-up and sign-in | Remediation | P2 | MVP | M | 2 | F-AUTH-01…05, F-ABU-02 | Q-AUTH-01, Q-AUTH-02 |
| [FP-010](#fp-010) | Reliable scheduled publishing and job health | Remediation | P2 | MVP | M | 2 | F-EDT-01, F-EDT-03, F-EDT-05, F-JOB-02, U-CHM-01 | Q-EDT-02, Q-EDT-05, Q-JOB-01 |
| [FP-011](#fp-011) | Stable links (chapter id resolution, slug/username history) | Remediation | P2 | Maturity | M | 2 | F-NOTI-01, F-STORY-03, U-PRF-03 | Q-PRF-02 |
| [FP-012](#fp-012) | Correct reading completion and "Continue" | Remediation | P2 | MVP | S | 2 | F-PROG-01…03, U-READ-01, U-READ-03 | Q-PROG-01, Q-READ-01 |
| [FP-013](#fp-013) | Notification safety and deep links | Remediation | P2 | Maturity | M | 2 | F-NOTI-02, F-NOTI-03, U-NOTI-01, U-NOTI-02 | Q-NOTI-01 |
| [FP-014](#fp-014) | Reading-list integrity and privacy | Remediation | P2 | Maturity | M | 2 | F-LIST-01…03, U-LIST-02, U-LIST-03 | Q-LIST-01, Q-LIST-02 |
| [FP-015](#fp-015) | Library paging, URL tabs, undo | Remediation | P2 | Maturity | S | 2 | F-LIB-01, U-LIB-01, U-LIB-02 | Q-LIB-02 |
| [FP-016](#fp-016) | Team lifecycle: leave, change role, accurate role copy | Remediation | P2 | Maturity | S | 2 | F-TEAM-01…03, U-TEAM-01 | Q-TEAM-01, Q-TEAM-03 |
| [FP-017](#fp-017) | Taxonomy provisioning and tag hygiene | Remediation | P2 | MVP | S/M | 2 | F-TAX-01, F-TAX-02, U-TAX-02 | Q-TAX-01, Q-TAX-02 |
| [FP-018](#fp-018) | Studio robustness on failure paths | Remediation | P2 | Maturity | S | 2 | F-STM-03, F-STM-04, F-EDT-07, U-STM-06, U-CHM-02 | — |
| [FP-023](#fp-023) | Security headers and CSP | Remediation | P2 | MVP | M | 2 | F-SHELL-02 | — |
| [FP-019](#fp-019) | Navigation and information architecture | Enhancement | P2 | Maturity | M | 3 | U-SHELL-01, U-SHELL-04, U-PRF-01, U-CMT-02, U-STAT-01, F-AUTHOR-01 | Q-SHELL-01 |
| [FP-020](#fp-020) | One pattern for loading / error / load-more | Enhancement | P2 | Maturity | S | 3 | U-SRCH-01, U-STORY-01, U-STM-04, F-EDT-04, F-PRF-01, F-HIST-02 | — |
| [FP-021](#fp-021) | Server-side language | Enhancement | P3 | Maturity | M | 3 | U-I18N-01, U-AUTH-01, U-SET-01 | Q-I18N-01 |
| [FP-022](#fp-022) | Accessibility pass on core screens (WBS 8.5) | Enhancement | P2 | Maturity | M | 3 | U-CMT-01, U-SHELL-02, U-STM-05, U-EDT-03, U-RANK-02, U-MAT-02, U-AUTHOR-01, U-STAT-02, U-LIB-03 | — |
| [FP-024](#fp-024) | Moderation console productivity | Enhancement | P3 | Maturity | M | 3 | U-MOD-01, U-MOD-02, F-MOD-07 | Q-MOD-03 |
| [FP-034](#fp-034) | Editor publish safety and clarity | Enhancement | P3 | Maturity | S | 3 | U-EDT-01, U-EDT-02, U-EDT-04, U-EDT-05, F-EDT-06 | Q-EDT-01 |
| [FP-025](#fp-025) | Richer comments: identity and live updates | New feature | P3 | Optional | M | 4 | U-CMT-04, F-CMT-03 | Q-CMT-02 |
| [FP-026](#fp-026) | More notification types and channels (email/push) | New feature | P3 | Maturity | L | 4 | F-NOTI-04, F-SET-01 | Q-NOTI-02, Q-NOTI-03 |
| [FP-027](#fp-027) | Device-local progress for guests | New feature | P3 | Optional | M | 4 | F-PROG-04 | — |
| [FP-028](#fp-028) | Discoverable public reading lists | New feature | P3 | Optional | M | 4 | F-LIST-04 | Q-LIST-03, Q-SEO-02 |
| [FP-029](#fp-029) | Recommendation feedback ("Not interested") | New feature | P3 | Optional | M | 4 | F-REC-01 | Q-REC-01 |
| [FP-030](#fp-030) | Image alt text, paste/drop upload, orphan clean-up | New feature | P3 | Maturity | M | 4 | F-EDT-09, U-READ-02, F-EDT-08 | — |
| [FP-031](#fp-031) | "My reports" and reported state for reporters | New feature | P3 | Optional | M | 4 | U-MOD-03 | — |
| [FP-032](#fp-032) | Guest home onboarding and trending row | New feature | P3 | Optional | S | 4 | U-HOME-02 | — |
| [FP-033](#fp-033) | Faster chapter reordering | New feature | P3 | Optional | M | 4 | U-CHM-03 | — |

FP numbers are stable identifiers, not an order; the table is sorted by phase.

---

## Phase 1 — critical gaps and broken workflows

### FP-001
**Enforce role limits on delete/restore in the database** · Remediation · P1 · MVP · S

| Question | Answer |
| --- | --- |
| 1 User problem | A co-author can take a whole story offline and an editor can hide published chapters, although Studio shows those actions to the owner (story) / owner + co-author (chapters) only. |
| 2 Improves | OBJ-STM WF-STM-05/06, OBJ-CHM WF-CHM-05, role matrix BR-TEAM-010 |
| 3 Why insufficient | RLS `stories_update` / `chapters_update` accept any team role and `deleted_at` is in the column grant (`auth_and_rls.sql:205-211,236-240`); the limit exists only in the UI. |
| 4 Recommended behaviour | `set_story_deleted(story_id, deleted)` (owner only) and `set_chapter_deleted(chapter_id, deleted)` (owner, co-author) RPCs; remove `deleted_at` from the UPDATE grants; UI calls the RPCs. |
| 5 Benefits | Documented permissions become real; no accidental or malicious takedown by collaborators. |
| 6 Reuse | Pattern of `archive_chapter` (role check inside RPC, `chapter_management.sql:115-117`), `classifyRpcError`, existing confirm dialogs. |
| 7 Changes | DB migration (RPCs, grants), SQL tests, `story-write.api.ts`, `chapters.api.ts`, regenerated types. |
| 8 Risks / deps | Decide Q-TEAM-02 (security rule vs UI convention). Moderator removal guard (`stories_guard_removal`) must keep working. |

Acceptance criteria [Proposed]
- Given a co-author of story S, When they call the API to set `stories.deleted_at` or call `set_story_deleted(S, true)`, Then the request is refused with 42501 and S stays visible.
- Given an editor of story S, When they try to delete or restore a chapter of S, Then it is refused with 42501.
- Given the owner, When they delete and then restore S from Studio, Then both succeed and readers lose/regain access accordingly.
- Given the SQL test suite, When `pnpm db:verify` runs, Then each refused case above has a test.

### FP-002
**One suspension policy, applied everywhere** · Remediation · P1 · MVP · M

| Question | Answer |
| --- | --- |
| 1 User problem | After a moderator suspends an abuser, their stories keep appearing on Home, category/tag lists and in the sitemap, and they can keep editing stories, chapters, drafts and comments. Nobody tells the suspended user why writes fail. |
| 2 Improves | OBJ-MOD WF-MOD-03/06, OBJ-HOME WF-HOME-01, OBJ-SEO WF-SEO-01, OBJ-STM/CHM/EDT, OBJ-CMT |
| 3 Why insufficient | `is_active_account()` is checked on inserts and RPCs but not on UPDATE policies or the PostgREST home feed / sitemap queries (see discovery consistency matrix in [discovery overview](../domains/discovery/overview.md)). |
| 4 Recommended behaviour | (a) Owner decides Q-MOD-01: what a suspension hides (proposal: hide from every list and sitemap, keep the story page readable by link with `noindex` — or hide it — per decision). (b) One SQL predicate `is_discoverable_story(story)` used by all lists incl. home and sitemap. (c) `is_active_account()` added to `stories_update`, `chapters_update`, `chapter_drafts_all`, comment edit/delete per Q-CMT-01. (d) Shell banner for non-active members (with FP-006). |
| 5 Benefits | Moderation becomes effective and predictable; one place to change the rule. |
| 6 Reuse | Existing predicate in `search.sql:80-81`, `rankings.sql:106-107`; `account_status` already loaded in `AuthProvider`. |
| 7 Changes | DB migration (predicate, policies), home feed query → RPC or inner join, sitemap RPC, SQL tests, small UI banner. |
| 8 Risks / deps | Needs Q-MOD-01, Q-STM-01, Q-CMT-01, Q-LIB-01, Q-STORY-01. Performance of the home feed query must keep using `idx_stories_discover`. |

Acceptance criteria [Proposed]
- Given author A is suspended, When any visitor opens Home, a category or tag filter, search, rankings, recommendations or the sitemap, Then no story owned by A is listed.
- Given A is suspended, When A tries to update a story, chapter, draft or comment they own, Then the write is refused with 42501.
- Given A is suspended and signed in, When any page loads, Then a banner explains the account is suspended (text from i18n, no internal reason codes).
- Given A is re-activated, When lists are refreshed, Then A's eligible stories reappear without manual data fixes.

### FP-003
**Never lose typed text** · Remediation · P1 · MVP · M

| Question | Answer |
| --- | --- |
| 1 User problem | Authors lose text when they click Preview/History/Back in the editor or restore a version; any form loses input when the language is switched or the user navigates away. |
| 2 Improves | OBJ-EDT WF-EDT-10, OBJ-HIST WF-HIST-03, OBJ-STM WF-STM-02/03, OBJ-PRF WF-PRF-02, OBJ-I18N WF-I18N-01 |
| 3 Why insufficient | Editor unmount only writes a local backup; history restore clears it and re-reads the revision just before writing; other forms have no dirty guard; `LanguageProvider` re-keys the tree. |
| 4 Recommended behaviour | Shared `useUnsavedChangesGuard(isDirty, flush?)` in `features/_shared`: `beforeunload` + in-app link interception via `PlatformProvider`. Editor flushes `saveNow()` before leaving; history restore sends the revision the screen displayed and keeps the replaced draft as a local backup; language switch asks to confirm when a guarded form is dirty (or switches without remount). |
| 5 Benefits | Removes the highest-impact data-loss paths for authors. |
| 6 Reuse | `autosaver.saveNow`, `local-backup.ts`, `ConfirmDialog`, `PlatformProvider` navigation adapter. |
| 7 Changes | UI/hooks only (+ history restore API passes revision). |
| 8 Risks / deps | Next App Router has no official navigation-blocking API; implement through the platform adapter's `Link`/`navigate`. Q-HIST-01. |

Acceptance criteria [Proposed]
- Given unsaved editor changes, When the author clicks Preview, Then the draft is saved first and Preview shows the latest text.
- Given unsaved changes in any guarded form, When the user clicks an in-app link or the language switch, Then a confirm dialog offers "Stay" and "Discard"; choosing Stay keeps the input.
- Given History was opened at draft revision r and the draft is now r+1, When the author restores a version, Then the restore is refused as a conflict and nothing is overwritten.
- Given a successful restore, When the author opens the editor, Then the replaced draft is offered as a recoverable backup.

### FP-004
**Real not-found and error pages** · Remediation · P1 · MVP · S

| Question | Answer |
| --- | --- |
| 1 User problem | Missing stories/chapters show Next's English "This page could not be found." with HTTP 200; crashes show an unbranded page; unknown authors return 200; malformed studio ids suggest a network problem. |
| 2 Improves | OBJ-SHELL WF-SHELL-04, OBJ-STORY WF-STORY-01, OBJ-READ WF-READ-06, OBJ-AUTHOR WF-AUTHOR-01, OBJ-SEO |
| 3 Why insufficient | No `not-found.tsx` / `error.tsx` / `global-error.tsx`; `(main)/loading.tsx` streaming makes `notFound()` respond 200 (Inferred cause of RT-01); author page renders client-only. |
| 4 Recommended behaviour | Translated `not-found.tsx` and `error.tsx` inside the shell using `EmptyState`/`ErrorState`; `global-error.tsx`; real 404 status for story/chapter/author/list (resolve existence before streaming, e.g. move the check above the loading boundary); UUID validation → `notFound()` in studio routes; author page `generateMetadata` + SSR. |
| 5 Benefits | Clear recovery path for users; correct status codes for crawlers. |
| 6 Reuse | `ErrorBoundary`, `EmptyState`, `ErrorState`, i18n strings. |
| 7 Changes | Web routes only (+ author SEO from F-AUTHOR-02). |
| 8 Risks / deps | Moving checks above `loading.tsx` may slightly delay first byte on story pages; measure. |

Acceptance criteria [Proposed]
- Given a non-existent story id, When it is requested, Then the response status is 404 and the page shows the app header, a translated message and a link Home.
- Given a server component throws, When the page renders, Then a translated error page with "Try again" is shown inside the shell.
- Given `/studio/story/not-a-uuid`, When opened, Then the not-found page is shown (no retry button).
- Given `/author/<unknown>`, When requested, Then status is 404 and the title is not the generic "Tác giả".

### FP-005
**Server-side 18+ protection** · Remediation · P2 · MVP · S

| Question | Answer |
| --- | --- |
| 1 User problem | Titles, synopses, covers and first paragraphs of 18+ stories leak into the HTML, browser tab and link previews before age confirmation; others' public lists show 18+ covers; a shared device keeps the adult choice after sign-out. |
| 2 Improves | OBJ-MAT WF-MAT-02/03, OBJ-SEO WF-SEO-02, OBJ-LIST WF-LIST-04 |
| 3 Why insufficient | The gate hides only rendered DOM (`adult-gate.tsx:20`); metadata, OG image and dehydrated query data are produced server-side without the mature check. |
| 4 Recommended behaviour | For `is_mature` stories: generic `<title>`/description, generic OG card without cover (per Q-SEO-01), no dehydrated chapter blocks; fetch content client-side after confirmation. Lists hide/blur 18+ items for non-owners who chose "hidden" (Q-MAT-02). Reset device choice on sign-out when it came from the account (Q-MAT-03). "Go back" falls back to `/`. |
| 5 Benefits | Meets WBS 5.6 "the gate shows no title or content"; protects minors and shared devices. |
| 6 Reuse | `useShowMature`, `AdultGate`, `isIndexable` (already `noindex, nofollow` for mature — RT-06). |
| 7 Changes | Web routes (`page.tsx`, `opengraph-image.tsx`, `load-chapter.ts`), lists query/UI, adult-content store. |
| 8 Risks / deps | Product decision on how much (title?) may be shown; SEO impact is none (already noindex). |

Acceptance criteria [Proposed]
- Given an 18+ story and a guest, When the story or chapter HTML is fetched, Then it contains neither the story title, synopsis, cover URL nor any chapter text.
- Given an 18+ story, When its link is shared, Then the preview card is generic.
- Given a reader who chose "hidden", When they open someone else's public list, Then 18+ stories are hidden or blurred with a count.
- Given an adult signs out on a shared device, When the next guest opens Home, Then 18+ stories are hidden.

### FP-006
**Moderation outcomes visible to the people affected** · Remediation · P2 · MVP · M

| Question | Answer |
| --- | --- |
| 1 User problem | Authors see a moderator-removed story as "deleted" with a Restore button that always fails; the console offers Restore for author-deleted stories; moderators cannot lock an author-hidden comment; suspended users, owners and reporters are never told anything. |
| 2 Improves | OBJ-MOD WF-MOD-03/04/06, OBJ-STM WF-STM-06, OBJ-CMT WF-CMT-08, OBJ-NOTI |
| 3 Why insufficient | No "removed by moderation" state exposed to clients; card state does not separate `deleted` and `removed`; `hide_comment` ignores already-hidden comments; no moderation notification types. |
| 4 Recommended behaviour | RPC/field exposing removal state to the owner; Studio shows "Removed by a moderator" without Restore; console states `deleted` vs `removed`, "Hide as moderator" for author-hidden comments; outbox events `story.removed`, `comment.hidden`, `account.suspended`, `report.resolved` → notifications (types switchable per BR-SET-006 where appropriate). |
| 5 Benefits | Trust in moderation, fewer support requests, an appeal path. |
| 6 Reuse | `moderation_actions` audit log, outbox worker + handler pattern, notification model, studio deleted list. |
| 7 Changes | DB (RPC, handlers, notification types), studio + moderation UI, notification rendering. |
| 8 Risks / deps | Q-MOD-04, Q-AUTH-03; wording reviewed for legal/tone; depends on FP-002 banner. |

Acceptance criteria [Proposed]
- Given a story removed by a moderator, When the owner opens Studio, Then it is labelled "Removed by a moderator" and no Restore button is shown.
- Given a report on an author-deleted story, When a moderator opens it, Then "Restore story" is not offered.
- Given a comment hidden by the story author, When a moderator chooses "Hide as moderator", Then the author can no longer unhide it.
- Given a moderator resolves a report, When processing completes, Then the reporter receives one "report resolved" notification (no duplicate on replay).

---

## Phase 2 — core functionality completion

### FP-007
**Abuse limits: fix link counting, extend coverage** · Remediation · P2 · MVP · S (fix) / M (extension)

| Question | Answer |
| --- | --- |
| 1 User problem | Legitimate comments with two `https://www.` links are refused as spam; votes/follows/likes can be inflated without limit; the daily comment limit shows the "too fast" message. |
| 2 Improves | OBJ-ABU WF-ABU-01/02, OBJ-CMT, OBJ-VOTE, OBJ-RANK (gaming) |
| 3 Why insufficient | Regex `(https?://|www\.)` counts a URL twice (verified on PG 16); `enforce_rate_limit` covers comments and reports only. |
| 4 Recommended behaviour | Count one match per URL (Q-ABU-02); add rows for votes, comment likes, follows, saves, story/chapter creation; distinct message for `comment_rate_day` with retry time (Q-ABU-03). |
| 5 Benefits | Fewer false positives; ranking integrity. |
| 6 Reuse | `abuse_limits` table + `enforce_rate_limit`, `classifyRpcError` hints. |
| 7 Changes | DB migration + SQL tests; comment/vote error copy. |
| 8 Risks / deps | Thresholds need product input (Q-ABU-01: who tunes them in production, audited). |

Acceptance criteria [Proposed]
- Given a comment containing exactly two links written as `https://www.a.com` and `https://www.b.com`, When posted, Then it is accepted.
- Given a member exceeding the daily comment ceiling, When they post, Then the message names the daily limit, not "too fast".
- Given a member voting more than the configured number of times per window, When they vote again, Then PT429 is returned and the UI explains it.

### FP-008
**Account lifecycle (WBS 6.4 / Q7)** · Remediation · P1 · MVP · L

| Question | Answer |
| --- | --- |
| 1 User problem | Members cannot deactivate, delete (anonymise) their account, export their data or change email. |
| 2 Improves | OBJ-AUTH WF-AUTH-08, OBJ-SET, OBJ-PRF |
| 3 Why insufficient | Not started (WBS 6.4 ⬜); `stories.owner_id ON DELETE RESTRICT` prevents hard delete by design (Q7). |
| 4 Recommended behaviour | As decided in Q7: RPCs `deactivate_account`, `delete_account` (anonymise profile/email/avatar, show "Deleted user", keep stories/comments), `export_my_data`; Settings "Account" section with re-authentication and confirmation; change-email flow via Supabase. |
| 5 Benefits | Legal compliance and user trust before launch. |
| 6 Reuse | `account_status`, Storage avatar removal, settings screen layout. |
| 7 Changes | DB + RPC + RLS + Edge Function (auth admin) + UI. |
| 8 Risks / deps | **Blocked** on the legal policy noted in WBS §4 ("Còn mở"). Interacts with FP-002 (non-active accounts). |

Acceptance criteria [Proposed]
- Given a member confirms deletion after re-authentication, When processing completes, Then their profile shows "Deleted user", email and avatar are removed, and their stories/comments remain under that label.
- Given a member requests an export, When it is ready, Then they can download their profile, settings, lists, follows and comments.
- Given a deactivated account signs in again, When reactivation is allowed by policy, Then the account returns to active.

### FP-009
**Complete sign-up and sign-in** · Remediation · P2 · MVP · M

| Question | Answer |
| --- | --- |
| 1 User problem | Username silently altered; no resend of the confirmation email; email links fail across devices; no Google sign-in (approved Q6); password changeable without the current password; no captcha. |
| 2 Improves | OBJ-AUTH WF-AUTH-01…04, WF-AUTH-07 |
| 3 Why insufficient | See F-AUTH-01…05, F-ABU-02. Supabase Auth settings are not versioned in the repo (Q-AUTH-02). |
| 4 Recommended behaviour | Trigger keeps the requested username (≤ 30, case policy decided) and the UI shows the final handle; "Resend email" with cooldown; callback supports `token_hash` + `verifyOtp`; "Continue with Google"; Settings "Change password" with re-authentication; Turnstile/hCaptcha; enable leaked-password protection; add `supabase/config.toml` or a documented settings checklist. |
| 5 Benefits | Fewer abandoned sign-ups, fewer support cases, launch-level security. |
| 6 Reuse | `auth.api.ts`, `authCallbackUrl`, `safeRedirectPath`, auth strings and form resolver. |
| 7 Changes | DB trigger migration, auth UI, callback route, email templates, Supabase project config (owner action). |
| 8 Risks / deps | Google client credentials (owner); email template change affects existing links. |

Acceptance criteria [Proposed]
- Given a sign-up with username "MyName_2026" that is free, When the account is created, Then the public username equals the policy-normalised value shown before submit.
- Given an unconfirmed account, When the user clicks "Resend email", Then a new email is sent and the button is disabled for the cooldown.
- Given a confirmation link opened on a different device, When it is valid, Then the email is confirmed and the user is told to sign in.
- Given a signed-in user in Settings, When they change their password, Then the current password (or reauth code) is required.

### FP-010
**Reliable scheduled publishing and job health** · Remediation · P2 · MVP · M

| Question | Answer |
| --- | --- |
| 1 User problem | A scheduled chapter that fails validation is retried forever with no signal; Schedule is offered where it can never work; autosave retries hopeless errors forever; nobody is alerted when jobs stop. |
| 2 Improves | OBJ-EDT WF-EDT-08, OBJ-JOB WF-JOB-02, OBJ-CHM |
| 3 Why insufficient | `publish_due_chapters` logs WARNING only; no attempt counter; no health surface. |
| 4 Recommended behaviour | `schedule_attempts`, `schedule_last_error`; stop after N attempts, set a `schedule_failed` state, notify the author (Q-JOB-01); Studio shows the failure and the scheduled time; hide/explain Schedule on published chapters (Q-EDT-05); autosave stops on permanent errors with an actionable message; `job_health()` RPC + alerting on dead letters, cron failures and ranking lag (WP 8.2). |
| 5 Benefits | Authors trust scheduling; operators see stoppages. |
| 6 Reuse | Outbox retry/dead-letter pattern, notification handler, `isPermanent` in autosaver. |
| 7 Changes | DB migration + tests, editor/chapter manager UI, ops alerting (Supabase logs / Sentry). |
| 8 Risks / deps | Q-EDT-02 (who is credited at due time). |

Acceptance criteria [Proposed]
- Given a scheduled chapter whose draft becomes invalid, When the job fails N times, Then the chapter leaves the "scheduled" state, the author is notified once and Studio shows the error.
- Given a published chapter, When the author opens the publish panel, Then Schedule is not offered (or is explained) per Q-EDT-05.
- Given an expired session, When autosave fails, Then the editor stops retrying and asks the user to sign in, keeping the local backup.
- Given more than 0 dead-letter events, When the health check runs, Then an alert is raised.

### FP-011
**Stable links** · Remediation (+ New feature for slug history) · P2 · Maturity · M

| Question | Answer |
| --- | --- |
| 1 User problem | Notification links and shared chapter links break after a chapter slug rename; `/story/{id}` without slug is a 404; renaming a username breaks `/author/` links. |
| 2 Improves | OBJ-NOTI WF-NOTI-05, OBJ-CHM WF-CHM-03, OBJ-STORY, OBJ-PRF |
| 3 Why insufficient | Payloads freeze slugs; only story slugs redirect (WBS Q2). |
| 4 Recommended behaviour | Notifications link by `chapter_id` and resolve to the current canonical URL; `chapter_slug_history` (and optionally `username_history`) with 308 redirects; `/story/{id}` → 308 to canonical. |
| 5 Benefits | No dead links; SEO keeps value after renames. |
| 6 Reuse | Story canonical redirect in `story/[id]/[slug]/page.tsx`, `load-chapter.ts`. |
| 7 Changes | DB (history tables/triggers), routes, notification model. |
| 8 Risks / deps | Q-PRF-02; must stay within decision Q2 (`/story/{id}/{slug}` canonical). |

Acceptance criteria [Proposed]
- Given a chapter renamed from `a` to `b`, When `/story/{id}/{slug}/a` is opened, Then it redirects (308) to `/b`.
- Given an old notification for that chapter, When clicked, Then the chapter opens.
- Given `/story/{id}`, When opened, Then it redirects to `/story/{id}/{slug}`.

### FP-012
**Correct reading completion and "Continue"** · Remediation · P2 · MVP · S

| Question | Answer |
| --- | --- |
| 1 User problem | Readers who don't scroll through all comments never "finish" a chapter; short chapters never complete; "Continue" points to different chapters on the story page and in the library; chapter navigation sits below the comments; numbering skips drafts. |
| 2 Improves | OBJ-PROG WF-PROG-01/03, OBJ-READ WF-READ-02, OBJ-LIB WF-LIB-03 |
| 3 Why insufficient | Progress = document scroll ratio; two different continue algorithms. |
| 4 Recommended behaviour | Measure progress on the blocks container; reaching the end marker or pressing Next = 100 %; one `resolveContinueChapter` used by story page and library (Q-PROG-01); prev/next directly after "— End of chapter —" plus ←/→ keys; chapter number = published position (Q-READ-01); user-scoped progress cache keys. |
| 5 Benefits | Accurate progress, consistent continue, faster binge reading. |
| 6 Reuse | `use-reading-tracker`, `ReadingProgress` widget, `chapter-nav.tsx`. |
| 7 Changes | UI + library API query. |
| 8 Risks / deps | Changing the completion rule changes analytics drop-off numbers (OBJ-STAT) — note in release. |

Acceptance criteria [Proposed]
- Given a chapter shorter than the viewport, When the reader reaches the end marker, Then progress is saved as 100 % and the chapter counts as finished.
- Given a finished chapter n, When the reader taps Continue on the story page or in the library, Then both open chapter n+1.
- Given the reader is at the end of a chapter, When they press →, Then the next published chapter opens.

### FP-013
**Notification safety and deep links** · Remediation · P2 · Maturity · M

| Question | Answer |
| --- | --- |
| 1 User problem | A hidden or deleted abusive reply stays readable in the notification excerpt; reply notifications don't open the reply; invite notices stay actionable after being answered; old notifications pile up. |
| 2 Improves | OBJ-NOTI WF-NOTI-02/05, OBJ-CMT |
| 3 Why insufficient | Excerpt copied at creation; deep link stops at the paragraph; no retention/delete UI. |
| 4 Recommended behaviour | Trigger blanks the excerpt when the reply leaves "visible"; link params `?comment=<id>` open the sheet, expand replies and highlight; role-aware invite text; resolved invites shown as resolved; per-item delete + retention job (Q-NOTI-01). |
| 5 Benefits | Moderation reaches every copy; faster replies. |
| 6 Reuse | Notification model, comment thread, outbox handler pattern. |
| 7 Changes | DB trigger + cron, notification + comment UI, optional RPC to load a comment's page. |
| 8 Risks / deps | Q-NOTI-01. |

Acceptance criteria [Proposed]
- Given a reply that triggered a notification, When the reply is hidden or deleted, Then the notification shows no excerpt.
- Given a reply notification, When clicked, Then the chapter opens with the reply visible and highlighted.
- Given notifications older than the retention period, When the purge runs, Then they are removed.

### FP-014
**Reading-list integrity and privacy** · Remediation · P2 · Maturity · M

| Question | Answer |
| --- | --- |
| 1 User problem | Reorder breaks permanently when a list contains the owner's deleted story; unavailable stories vanish silently but count toward limits; "unlisted" lists can be enumerated; quick-create ignores long names silently; one message for different conflicts. |
| 2 Improves | OBJ-LIST WF-LIST-02/06/09 |
| 3 Why insufficient | Client and RPC disagree on list contents; RLS allows SELECT of all unlisted lists. |
| 4 Recommended behaviour | RPC ignores unavailable items in reorder; owner sees placeholders with Remove (Q-LIST-01); `get_list(id)` DEFINER RPC for unlisted access and restricted direct SELECT (Q-LIST-02); inline validation + `maxLength`; distinct HINTs. |
| 5 Benefits | Lists behave predictably and keep their privacy promise. |
| 6 Reuse | `reading_lists.sql` RPCs, Library placeholder pattern. |
| 7 Changes | RLS + RPC migration + tests, list UI. |
| 8 Risks / deps | Q-LIST-01, Q-LIST-02. |

Acceptance criteria [Proposed]
- Given a list containing the owner's soft-deleted story, When the owner reorders, Then the reorder succeeds.
- Given an unlisted list, When a client queries `reading_lists` without the id, Then it is not returned.
- Given a quick-create name over 120 characters, When submitted, Then an inline message explains the limit.

### FP-015
**Library paging, URL tabs, undo** · Remediation · P2 · Maturity · S

Problem: tabs capped at 50, tab not in URL, removal without undo. Improves OBJ-LIB WF-LIB-04/05. Recommended:
keyset paging with `InfiniteList`, `?tab=reading|saved|following|lists`, undo toast for removals, title snapshot
for unavailable placeholders, copy "reading list" → "Reading" (Q-LIB-02 for progress clearing). Reuse
`InfiniteList`, toast. Changes: UI/API only. Risks: none significant.

Acceptance criteria [Proposed]
- Given 60 saved stories, When the user scrolls the Saved tab, Then all 60 can be reached.
- Given `/library?tab=lists`, When opened or returned to via "Back to library", Then the Lists tab is active.
- Given a removal, When "Undo" is pressed within the toast, Then the item is restored.

### FP-016
**Team lifecycle** · Remediation · P2 · Maturity · S

Problem: the editor role hint contradicts real rights; collaborators cannot leave; roles cannot be changed; one
message for three invite conflicts. Improves OBJ-TEAM WF-TEAM-01…04. Recommended: owner decides Q-TEAM-01 (editors
publish or not) then align copy **or** RPC; "Leave story" for collaborators; role select for the owner with a
notification; distinct HINTs per conflict; auto-cancel invitations of deleted stories (Q-TEAM-03). Reuse
`removeCollaborator`, RLS already permits leave/role update. Changes: UI (+ RPC if publishing rights change).

Acceptance criteria [Proposed]
- Given the owner invites an editor, When reading the role hint, Then it states exactly what editors can do (matching BR-TEAM-010).
- Given a co-author, When they choose "Leave story" and confirm, Then they lose access and the owner is notified.
- Given the owner changes an editor to co-author, When saved, Then the new permissions apply immediately.

### FP-017
**Taxonomy provisioning and tag hygiene** · Remediation · P2 · MVP · S/M

Problem: categories exist only in the dev seed; tag names may contain a leading "#" (runtime "##Kiemhiep"); tags cannot
be moderated. Improves OBJ-TAX WF-TAX-01…03, OBJ-MOD. Recommended: idempotent data migration with the approved
category tree (Q-TAX-01, Q-TAX-02); normalise tag names (strip leading `#`, trim) in the create RPC and fix existing
rows; moderator RPC to rename/hide/merge tags with an audit row. Changes: DB data migration, RPC, moderation UI.

Acceptance criteria [Proposed]
- Given a fresh production database, When migrations run, Then the approved categories exist.
- Given an author creates tag "#Kiemhiep", When saved, Then the stored name is "Kiemhiep" and chips show "#Kiemhiep".
- Given a moderator merges tag A into B, When done, Then stories tagged A are tagged B and an audit row exists.

### FP-018
**Studio robustness on failure paths** · Remediation · P2 · Maturity · S

Problem: story delete failures are silent; retry after a lost create response says "slug taken"; deleted
chapters/stories remain editable with misleading errors; tags typed on create are lost on partial failure.
Improves OBJ-STM WF-STM-02/05, OBJ-CHM, OBJ-EDT WF-EDT-01. Recommended: error toast on delete; treat a 23505 on the
primary key whose row belongs to the user as success; "deleted" notice and disabled actions in chapter manager and
editor; carry unsaved tags into the edit page. Changes: UI/API only.

Acceptance criteria [Proposed]
- Given deletion fails, When the user confirms Delete, Then an error toast explains why and the dialog stays open.
- Given the first create succeeded but its response was lost, When the client retries, Then the user lands on the created story with no "slug taken" error.
- Given a deleted story, When its chapter manager or editor opens, Then a notice is shown and write actions are disabled.

### FP-023
**Security headers and CSP** · Remediation · P2 · MVP · M

Problem: no CSP, HSTS, frame-ancestors, Referrer-Policy, Permissions-Policy (WBS 8.3). Improves OBJ-SHELL. Recommended:
nonce-based CSP set in `proxy.ts` (the reader bootstrap script and JSON-LD need the nonce), plus standard headers in
`next.config.ts`. Reuse: existing proxy. Risks: Supabase Realtime/Storage origins must be allowed; test with report-only
first.

Acceptance criteria [Proposed]
- Given any page, When fetched, Then CSP (with nonce), HSTS, `frame-ancestors 'none'`, Referrer-Policy and Permissions-Policy headers are present.
- Given the reader page, When loaded with CSP enforced, Then the preferences bootstrap and JSON-LD still work with no CSP violations.

---

## Phase 3 — UX/UI consistency and productivity

### FP-019
**Navigation and information architecture** · Enhancement · P2 · Maturity · M

| Question | Answer |
| --- | --- |
| 1 User problem | Desktop has no primary navigation; Rankings and Following are reachable only from Home; `/me` is not an account hub; sign-in from the header or comments loses the reader's place; stats pages don't name the story; followed authors can't be listed. |
| 2 Improves | OBJ-SHELL WF-SHELL-01, OBJ-RANK, OBJ-AUTHOR WF-AUTHOR-03, OBJ-PRF WF-PRF-01, OBJ-STAT |
| 3 Why insufficient | See U-SHELL-01, U-SHELL-04, U-PRF-01, U-CMT-02, U-STAT-01, F-AUTHOR-01. |
| 4 Recommended behaviour | Header section links on ≥ md (Home, Rankings, Library, Write) or the deferred sidebar (Q-SHELL-01); Following as a Library tab or user-menu item; `/me` shows avatar, public page link, Settings, Sign out; all sign-in links carry `next` incl. hash; story title + Stats links on edit/chapter pages; `list_followed_authors` with unfollow. |
| 5 Benefits | Every section reachable at every width; fewer dead ends. |
| 6 Reuse | `BottomNav` items list, `withNext`, `AppLink`, author follow API. |
| 7 Changes | UI (+ one RPC for followed authors). |
| 8 Risks / deps | Q-SHELL-01; header width on small tablets. |

Acceptance criteria [Proposed]
- Given a 1280 px viewport, When any `(main)` page is open, Then Home, Rankings, Library and Write are one click away.
- Given a guest reading a chapter, When they click "Sign in" in the header and sign in, Then they return to the same chapter.
- Given a member, When they open `/me`, Then they can reach Settings and Sign out from that page.

### FP-020
**One pattern for loading / error / load-more** · Enhancement · P2 · Maturity · S

Problem: several widgets render nothing on error (actions, vote, inbox, publish panel), load-more errors are silent,
`/me` shows "No profile" on error, compare spins forever. Recommended: `InfiniteList` gains `loadMoreError` + retry;
a small `QueryBoundary`/`AsyncSection` helper in `features/_shared` renders skeleton/error/retry consistently; apply
to the listed components. Reuse `ErrorState`, `Skeleton`, `toAppError`. Changes: UI only.

Acceptance criteria [Proposed]
- Given page 2 of search results fails, When the user scrolls, Then an inline error with "Retry" appears below the loaded results.
- Given the follow/save state request fails on a story page, When the page renders, Then the buttons show an error with retry instead of disappearing.

### FP-021
**Server-side language** · Enhancement · P3 · Maturity · M

Problem: SSR always Vietnamese (`lang="vi"`, Vietnamese titles), English flashes in after hydration; auth pages have
no switcher; account language save fails silently. Recommended: language cookie written by `setLanguage` and read in
the root layout and `generateMetadata` (Q-I18N-01); `LanguageSwitcher` in the auth layout; surface sync failures on
Settings. Reuse `@storynest/features` i18n modules (`strings.en.ts`). Risk: caching — pages must vary by cookie.

Acceptance criteria [Proposed]
- Given a visitor who chose English, When any page is server-rendered, Then the HTML has `lang="en"`, English text and an English `<title>` with no Vietnamese flash.
- Given the sign-in page, When opened, Then the language switch is available.

### FP-022
**Accessibility pass on core screens (WBS 8.5)** · Enhancement · P2 · Maturity · M

Scope: paragraph-comment button target (U-CMT-01), header targets (U-SHELL-02), tag remove/target sizes and labels
with item names (U-STM-05), editor live region/toolbar (U-EDT-03), rank badge semantics (U-RANK-02), 18+ control
semantics (U-MAT-02), follow toggle (U-AUTHOR-01), chart values (U-STAT-02), follow/save group label (U-LIB-03),
plus a skip-to-content link (runtime RT-09: first tab stop is the brand). Reuse `touch-target` utility. Changes: UI.

Acceptance criteria [Proposed]
- Given a 390 px touch screen, When interacting with header controls and paragraph-comment buttons, Then each target is at least 44×44 px (project rule).
- Given a screen-reader user in the chapter manager, When moving through row actions, Then each button name includes the chapter title.
- Given keyboard navigation, When the first Tab is pressed on any page, Then a "Skip to content" link is focused.

### FP-024
**Moderation console productivity** · Enhancement · P3 · Maturity · M

Recommended: report date, comment author, closed-by/at and consequence text on cards; status/kind/reason filters kept
in the URL; rename "Resolved" to "Closed"; per-target history panel from `moderation_actions` (F-MOD-07); decide
chapter-level removal (Q-MOD-03). Changes: UI + optional RPC params.

Acceptance criteria [Proposed]
- Given the queue, When a moderator filters by kind "comment" and status "open", Then only those reports show and the URL reflects the filter.
- Given a report card, When opened, Then it shows when it was filed and the history of actions on the target.

### FP-034
**Editor publish safety and clarity** · Enhancement · P3 · Maturity · S

Recommended: confirmation before the first publish (it notifies followers and moves the story to ongoing); Mod+S
saves; shortcuts help; title `maxLength` 200; accurate conflict/unpublish/cancel-schedule copy; skip creating an
identical version when nothing changed (F-EDT-06); decide Q-EDT-01 (empty chapters). Changes: UI (+ RPC for dedupe).

Acceptance criteria [Proposed]
- Given a never-published chapter, When the author presses Publish, Then a dialog explains followers will be notified and requires confirmation.
- Given the editor is focused, When Mod+S is pressed, Then the draft is saved and the browser dialog does not open.
- Given an unchanged published draft, When Publish is pressed, Then no new version is created and the author is told nothing changed.

---

## Phase 4 — optional product enhancements (new features)

| FP | User problem → recommended behaviour | Benefit | Reuse / changes | Acceptance criteria [Proposed] |
| --- | --- | --- | --- | --- |
| <a id="fp-025"></a>FP-025 Richer comments | Commenters are plain names; threads go stale → avatar, profile link, "Author" badge; "N new comments" banner via Realtime | Recognisable people, livelier threads | Avatar widget, Realtime (already used for notifications); DB flag for author badge | Given the story author comments, When shown, Then an "Author" badge is visible. Given a new comment is posted by someone else, When the thread is open, Then a "1 new comment" banner appears. |
| <a id="fp-026"></a>FP-026 Notification types & channels | Authors aren't told about comments on their story or new followers; no email/push → new types (comment on my story, my comment hidden, new follower, new chapter from followed author) with switches; email/push with WP 6.7 | Engagement | Outbox handlers, BR-SET-006 trigger, Edge Function; depends on WP 6.7/7.2 | Given a switched-off type, When the event happens, Then no notification is created. Given a new follower, When processed, Then the author gets one notification. |
| <a id="fp-027"></a>FP-027 Guest progress on device | Guests lose their place → local progress store, uploaded on sign-in | Retention, conversion | `progress-writer`, local storage pattern | Given a guest reads to 60 %, When they return on the same device, Then the position is restored. |
| <a id="fp-028"></a>FP-028 Discoverable public lists | Curated lists have no reach → section on author page, optional index; SEO decision (Q-SEO-02, robots disallows `/lists` today) | Curation value | `my-lists`, list visibility rules | Given a public list, When its owner's author page is opened, Then the list is shown. |
| <a id="fp-029"></a>FP-029 Recommendation feedback | No way to dismiss a suggestion → "Not interested" stored per user and excluded; hint why empty | Relevance | Recommendation RPCs + small table | Given a dismissed story, When recommendations refresh, Then it is not suggested again. |
| <a id="fp-030"></a>FP-030 Images: alt text, paste/drop, clean-up | Images are `alt=""`; no paste/drag upload; orphaned files stay public → optional alt/caption per image block; paste/drop upload; orphan clean-up job | Accessibility, storage hygiene | `use-chapter-image`, body converter, storage key convention; DB column + RPC snapshot change | Given an image with alt text, When published, Then the reader renders it with that alt. Given an image removed from all drafts and versions for 7 days, When clean-up runs, Then the file is deleted. |
| <a id="fp-031"></a>FP-031 Reporter feedback | Reporters can't see their reports → "Reported" state on the button, `/me/reports` list | Trust in reporting | RLS already allows reading own reports | Given I reported a comment, When I view it again, Then the button shows "Reported". |
| <a id="fp-032"></a>FP-032 Guest onboarding | Guest home has no call to action or trending → CTA "Create account / Start writing" + "Trending this week" row from rankings | Conversion | `top_stories`, hero | Given a guest on Home, When it loads, Then a sign-up CTA and a trending row are shown. |
| <a id="fp-033"></a>FP-033 Faster reordering | One step per click for long serials → accessible drag-and-drop or "Move to position…" (RPC already takes a full order) | Author productivity | `reorder_chapters` RPC | Given 50 chapters, When the author moves chapter 50 to position 1, Then it takes one action and one request. |

## Quick fixes (confirmed findings, no proposal needed)

Small, local corrections of confirmed findings. They still need approval but no design decision.

| Finding | Fix |
| --- | --- |
| F-STORY-01 | Pass `ownerId` to `ReportButton` on story and chapter pages |
| F-STORY-02 | Confirm PostgREST `max_rows`; paginate chapter list if needed |
| F-STORY-04 | Omit JSON-LD `author.url` when username is empty |
| F-HOME-02 | Add `?language=` + control, or correct WBS 2.2 note |
| F-SRCH-01 | Show the existing `capReached` message |
| F-CMT-01 | `edited_at` set only when the body changes |
| F-CMT-04 | Replace the always-true assertion in `240_comment_moderation_by_author.test.sql` |
| F-MOD-08 | Replace `reportCreateSchema` with `submit_report` arguments schema |
| F-I18N-01 | Required label props / `jsx-no-literals` |
| F-SHELL-03 | Update README "Việc còn lại", WBS §0, notes on ESLint/mobile/bottom nav |
| U-SET-02, U-SHELL-03, U-DEV-01, U-TAX-01, U-HOME-03, U-SRCH-02, U-RANK-01, U-AUTHOR-02, U-STORY-02, U-CMT-03, U-LIST-01, U-STM-01, U-STM-02, U-HIST-01, U-HIST-02, U-ABU-01 | See [ux-ui-gap-analysis.md](../audits/ux-ui-gap-analysis.md) |

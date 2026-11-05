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

> **Phase 2 (2026-11-05):** 32 further proposals `FP-035…FP-066` (31 active) and amendments to existing proposals are in
> [Phase 2 proposals](#phase-2-proposals-product-discovery) and [Phase 2 amendments](#phase-2-amendments-to-existing-proposals).
> The combined ranking is in the [roadmap](implementation-roadmap.md#phase-2-update-product-discovery-2026-11-05).
>
> **Phase 2.5 (2026-11-05):** readiness of every FP is in [implementation-readiness.md](implementation-readiness.md);
> decisions in [product-decisions.md](product-decisions.md). The new runtime defect F-STM-09 (owner cannot restore a
> deleted story on Supabase) belongs with [FP-001](#fp-001) (same RPC/trigger area) and is listed as a fix-now item.

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
| 4 Recommended behaviour | Header section links on ≥ md (Home, Rankings, Library, Write) — *Phase 2 proposes ≥ lg with the bottom nav kept below lg (BRC-SHELL-02, DEC-022)* — or the deferred sidebar (Q-SHELL-01); Following as a Library tab or user-menu item; `/me` shows avatar, public page link, Settings, Sign out; all sign-in links carry `next` incl. hash; story title + Stats links on edit/chapter pages; `list_followed_authors` with unfollow. |
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


---

## Phase 2 proposals (product discovery)

Added 2026-11-05 by the [product discovery](product-discovery.md) and [screen enhancement](screen-enhancements.md)
review. Same rules as above: every item is **Proposed** and needs approval; existing IDs are unchanged; new IDs are
`FP-035…FP-066`. Items covered by an existing proposal were written as **amendments** (next section), not as new IDs.
FP-052 was merged into FP-044 during consolidation (DEC-016) and is kept only for traceability.

### Phase 2 overview

| FP | Title | Type | Priority · size · class | Domain · object · screens | Decision needed |
| --- | --- | --- | --- | --- | --- |
| [FP-035](feature-backlog.md#fp-035) | First-run welcome and activation checklist | New Feature | P2 · M · Maturity | D-ACCOUNT · OBJ-PRF (+ OBJ-SET, uses OBJ-LIB, OBJ-TAX) · new SCR-PRF-03 Welcome `/welcome` [Proposed], SCR-PRF-01, SCR-AUTH-02, SCR-HOME-01 (checklist card), SCR-SET-01 (interests) | Q-AUTH-04 (blocked until approved: mandatory vs. optional, identity fields at sign-up or in welcome) |
| [FP-036](feature-backlog.md#fp-036) | Appearance and motion preferences (app theme, reduced motion) | Enhancement | P3 · S · Maturity | D-ACCOUNT · OBJ-SET (+ OBJ-SHELL, OBJ-READ) · SCR-SET-01, SCR-SHELL-01 (user menu, guest "⋯" menu, footer), SCR-READ-01 (reader theme "site") | Q-SET-01 (device-only vs. synced) |
| [FP-037](feature-backlog.md#fp-037) | Design-system consistency: StoryCard variants, layout primitives and accessible control tokens | Enhancement | P2 · M (A: S, B: M, C: S per screen) · Maturity | D-PLATFORM · OBJ-SHELL (shared widgets), OBJ-DEV · all list screens (SCR-HOME-01, SCR-SRCH-01, SCR-RANK-01, SCR-AUTHOR-01/02, SCR-LIB-01, SCR-LIST-01, SCR-STORY-01 recommendations), every form, SCR-DEV-01 | none for A/B; per-screen variant choice confirmed during consolidation (7.2 DS-06) |
| [FP-038](feature-backlog.md#fp-038) | Connectivity awareness on the web (offline banner, paused requests explained) | Enhancement | P3 · S · Maturity | D-PLATFORM · OBJ-SHELL (+ `_shared` query layer, PlatformProvider) · SCR-SHELL-01 and every screen with a form or list | none |
| [FP-039](feature-backlog.md#fp-039) | Public site frame: footer, legal links, app icons and default share metadata | New Feature | P2 · S · MVP (legal links and copyright route are launch requirements; icons are trivial) | D-PLATFORM · OBJ-SHELL, OBJ-SEO (+ OBJ-AUTH consent line) · SCR-SHELL-01, SCR-AUTH-02, static legal pages under the WBS §1.2 `(marketing)` route group (screen IDs to register on approval) | Q-X-02 (content, blocks the legal pages only), Q-SHELL-03 (brand assets) |
| [FP-040](feature-backlog.md#fp-040) | Story facts that help readers choose (length, reading time, chapter cadence, completion) | Enhancement | P2 · M · Maturity | D-READING / D-DISCOVERY · OBJ-STORY, OBJ-HOME, OBJ-AUTHOR · SCR-STORY-01, SCR-HOME-01, SCR-SRCH-01, SCR-RANK-01, SCR-AUTHOR-01/02 | Q-HOME-03 (reading speed, length buckets). BRC-HOME-02 approval for card content. |
| [FP-041](feature-backlog.md#fp-041) | Filter and sort for browsing and search results | New Feature | P2 · M · Maturity | D-DISCOVERY · OBJ-HOME, OBJ-SRCH, OBJ-AUTHOR · SCR-HOME-01, SCR-SRCH-01, SCR-AUTHOR-01 | Q-HOME-03 (length buckets), BRC-HOME-01 (default order semantics) |
| [FP-042](feature-backlog.md#fp-042) | Search relevance beyond titles, with no-result recovery | Enhancement | P3 · M · Maturity | D-DISCOVERY · OBJ-SRCH · SCR-SRCH-01 (+ header SearchBox) | Q-SRCH-02, BRC-SRCH-01 |
| [FP-043](feature-backlog.md#fp-043) | Immersive chapter reader (shell-less reader route and auto-hiding chrome) | Remediation (N-01, WBS alignment) + Enhancement | P1 · M · MVP | D-READING · OBJ-READ (+ OBJ-SHELL) · SCR-READ-01, SCR-SHELL-01, SCR-HIST-02 (reuse) | Q-READ-02 (which chrome stays, default of the comment-marker preference) |
| [FP-044](feature-backlog.md#fp-044) | Reading continuity: continue rail, read marks, caught-up and end-of-story states | Enhancement (+ BR change) | P2 · M · Maturity | D-READING · OBJ-PROG, OBJ-STORY, OBJ-READ (+ OBJ-HOME) · SCR-HOME-01, SCR-STORY-01, SCR-READ-01 (TOC, end panel) · reference SCR-LIB-01 | Q-STORY-02, BRC-STORY-01 (and Q-PROG-01 already open) |
| [FP-045](feature-backlog.md#fp-045) | Story card density and responsive list layouts | Enhancement | P2 · M · Maturity | D-DISCOVERY / D-READING · OBJ-HOME (shared card BR-HOME-009), OBJ-STORY · SCR-HOME-01, SCR-SRCH-01, SCR-RANK-01, SCR-AUTHOR-01/02, SCR-STORY-01 (similar stories, desktop layout) · reference SCR-LIB-01, SCR-LIST-01 | none (BRC-HOME-02 approval) |
| [FP-046](feature-backlog.md#fp-046) | Ranking scopes: per category and "New & rising" | New Feature | P3 · S/M · Optional | D-DISCOVERY · OBJ-RANK (+ OBJ-HOME) · SCR-RANK-01, SCR-HOME-01 | Q-RANK-02, BRC-RANK-01 |
| [FP-047](feature-backlog.md#fp-047) | "What's new" library state: new-chapter badges, Home "Continue reading", nav dot | New Feature | P2 · M · Maturity | D-LIBRARY · OBJ-LIB (+ OBJ-PROG read side) · SCR-LIB-01, SCR-HOME-01, SCR-SHELL-01 | Q-LIB-04 (definition of "new"); BRC-LIB-01 only for the Following sort order |
| [FP-048](feature-backlog.md#fp-048) | One "Save": unified keep + notify model, Library tabs, intent replay | Enhancement | P2 · M (A: S, B: M, C: S) · Maturity | D-LIBRARY · OBJ-LIB, OBJ-LIST (+ OBJ-AUTHOR wording) · SCR-STORY-01, SCR-LIB-01, SCR-LIST-01-C09, SCR-AUTHOR-01 | Q-LIB-03 (blocks stages B and C; stage A can proceed) |
| [FP-049](feature-backlog.md#fp-049) | Two-way comment conversations | Enhancement | P2 · M · Maturity | D-COMMUNITY · OBJ-CMT, OBJ-NOTI · SCR-CMT-01, SCR-NOTI-01 | Q-CMT-04, Q-NOTI-06 (blocked until approved) |
| [FP-050](feature-backlog.md#fp-050) | Notification inbox you can tune | Enhancement | P2 (settings link, mute, bell size, empty copy) / P3 (grouping, filter, avatars, popover) · M · Maturity | D-COMMUNITY · OBJ-NOTI (+ OBJ-SET, OBJ-SHELL) · SCR-NOTI-01, SCR-SET-01, SCR-SHELL-01 | none |
| [FP-051](feature-backlog.md#fp-051) | Share a story, chapter or reading list | New Feature | P2 · S · Maturity | D-PLATFORM / OBJ-SEO (share surface) with D-READING, D-LIBRARY · SCR-STORY-01, SCR-READ-01, SCR-LIST-01 | none (Q-SEO-01 only affects 18+ preview content) |
| [FP-052](feature-backlog.md#fp-052) | End-of-chapter next step ("caught up" and "finished" cards) — *merged into FP-044* | Enhancement | P2 · S · Maturity | D-READING · OBJ-READ (+ OBJ-LIB, OBJ-REC) · SCR-READ-01 | none |
| [FP-053](feature-backlog.md#fp-053) | Story workspace: one header and role-aware tabs for every story tool | Enhancement | P2 · M · Maturity | D-STUDIO · OBJ-STM (frame), OBJ-CHM, OBJ-TEAM, OBJ-STAT · SCR-STM-03, SCR-CHM-01, SCR-TEAM-01, SCR-STAT-01 (+ links from SCR-STM-01, SCR-EDT-01, SCR-STORY-01, SCR-READ-01) | none |
| [FP-054](feature-backlog.md#fp-054) | Reader-visibility status, go-live checklist and change-impact warnings | Enhancement (closes a confirmed workflow break) | P1 · S/M · MVP | D-STUDIO · OBJ-STM · SCR-STM-01, SCR-STM-02, SCR-STM-03, workspace header (FP-053); publish confirmation in SCR-EDT-01 via FP-034 | none for the proposal; Q-STM-03 only for an optional default change |
| [FP-055](feature-backlog.md#fp-055) | Studio home as an author dashboard (onboarding, health, next action) | Enhancement | P2 · M · Maturity | D-STUDIO · OBJ-STM (+ STAT, CHM read-only) · SCR-STM-01 | none (Q-STM-02 answered by keyset pagination; confirm page size 20) |
| [FP-056](feature-backlog.md#fp-056) | Audience insights: lifetime totals, followers trend, fair retention | Enhancement | P3 · M · Maturity | D-STUDIO · OBJ-STAT · SCR-STAT-01 (+ figures reused by FP-055) | Q-STAT-02 (follower identities or counts only); BRC-STAT-01 approval |
| [FP-057](feature-backlog.md#fp-057) | Reader conversations: a comments tab for authors | New Feature | P3 · M · Maturity | D-STUDIO / D-COMMUNITY · OBJ-CMT (read model), OBJ-STM (frame) · new workspace tab "Comments" (FP-053); reuses SCR-CMT-01 item component | Q-CMT-03 (scope for editors; cross-story inbox later) |
| [FP-058](feature-backlog.md#fp-058) | Focused, mobile-ready writing workspace | Enhancement | P2 (P1 if Q-EDT-06 = mobile web authoring at launch) · M · Maturity | D-STUDIO · OBJ-EDT (+ OBJ-SHELL frame) · SCR-EDT-01, SCR-HIST-02 (frame), SCR-HIST-01 (frame) | BRC-SHELL-01; Q-EDT-06 (priority). |
| [FP-059](feature-backlog.md#fp-059) | Draft checkpoints (server-side draft history) | New Feature | P2 · M (L with retention UI) · Maturity | D-STUDIO · OBJ-HIST (+ OBJ-EDT) · SCR-HIST-01, SCR-EDT-01 | Q-HIST-01 (existing), Q-HIST-03 (new), BRC-HIST-01. |
| [FP-060](feature-backlog.md#fp-060) | Pre-publish review: audience, changes and checks | Enhancement | P2 · M · Maturity (first-publish part MVP) | D-STUDIO · OBJ-EDT (+ OBJ-HIST diff, OBJ-NOTI audience, OBJ-CMT anchors) · SCR-EDT-01, SCR-HIST-02 | none to start; Q-EDT-01 and Q-NOTI-04 refine checks. |
| [FP-061](feature-backlog.md#fp-061) | Editing presence for collaborators | New Feature | P3 · M · Optional | D-STUDIO · OBJ-EDT (+ OBJ-TEAM) · SCR-EDT-01, SCR-CHM-01 (badge) | none |
| [FP-062](feature-backlog.md#fp-062) | Writing aids: find & replace, writing stats, paste clean-up | Enhancement | P3 · M · Maturity | D-STUDIO · OBJ-EDT · SCR-EDT-01 | none |
| [FP-063](feature-backlog.md#fp-063) | Appeal a moderation decision | New Feature | P2 · M · Maturity | D-TRUST · OBJ-MOD (+OBJ-NOTI, OBJ-STM, OBJ-CMT) · SCR-MOD-01 (Appeals tab), SCR-STM-01 (removed story), SCR-CMT-01 (hidden-comment note), SCR-SHELL-01 (suspension banner), SCR-NOTI-01; new embedded **Appeal dialog** (proposed ID SCR-MOD-03, to be assigned at consolidation) | Q-MOD-06 (window, who decides), BRC-MOD-02 (blocked until approved) |
| [FP-064](feature-backlog.md#fp-064) | Block another user | New Feature | P2 · M · Maturity | D-TRUST · proposed new object **OBJ-BLK "User blocks"** (registry addition needed, CONVENTIONS §3; alternatively placed under OBJ-MOD) · SCR-AUTHOR-01 ("⋯" menu), SCR-CMT-01 (comment "⋯" menu, placeholder), SCR-MOD-02 (success view), SCR-SET-01 (Blocked accounts section), SCR-NOTI-01 | Q-MOD-07 (does a block also stop comments on the blocker's stories and remove follows?) |
| [FP-065](feature-backlog.md#fp-065) | Community guidelines, legal pages and copyright requests | Remediation (documented, not done: WBS 6.9) + Enhancement | P1 (pages + links: launch blocker) · S for pages/links, M for copyright evidence + Legal tab · MVP | D-TRUST · OBJ-MOD (+OBJ-SHELL, OBJ-SEO, OBJ-AUTH) · new static routes `/guidelines`, `/terms`, `/privacy`, `/copyright` (proposed screen ID SCR-MOD-04 "Policy pages", one template), SCR-SHELL-01 (footer / menu links), SCR-AUTH-02 (consent line), SCR-MOD-02 (reason links, copyright branch), SCR-MOD-01 (Legal tab), SCR-MAT-01 ("What counts as 18+?") | Q-X-02 (legal content), Q-MOD-08 (non-member channel) |
| [FP-066](feature-backlog.md#fp-066) | Operations area: staff roles, abuse thresholds, audit log, job health | New Feature (WBS 6.1 "not done" items + Q-ABU-01) | P3 · M · Maturity | D-TRUST · OBJ-MOD, OBJ-ABU (+OBJ-JOB) · SCR-MOD-01 new "Operations" tab with sub-views Staff · Limits · Audit log · Health | BRC-MOD-01, Q-MOD-09 (separate admin role?), Q-ABU-01 |

### Consolidation notes

| Decision | Effect |
| --- | --- |
| DEC-015 | Story card variants are built once in FP-037 (`grid`, `row`, `rail`); FP-045 chooses them per screen |
| DEC-016 | FP-052 merged into FP-044 (in-story continuity); the Home continue rail belongs to FP-047 |
| DEC-017 | Legal page content and copyright requests: FP-065; footer/icons/share card: FP-039 |
| DEC-018 | FP-060 reuses FP-054's reader-visibility model and absorbs FP-034's first-publish confirmation |
| DEC-019 | FP-066 shows job health from FP-010 and leaves per-target history to FP-024 |
| DEC-014 | One focused-frame pattern (reader FP-043, studio writing FP-058) under BRC-SHELL-01 |

<a id="fp-035"></a>

### FP-035 — First-run welcome and activation checklist

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-ACCOUNT · OBJ-PRF (+ OBJ-SET, uses OBJ-LIB, OBJ-TAX) · new SCR-PRF-03 Welcome `/welcome` [Proposed], SCR-PRF-01, SCR-AUTH-02, SCR-HOME-01 (checklist card), SCR-SET-01 (interests) |
| User problem | After confirming their email a new member lands on `next` (default `/`) and sees the guest home: a username they never chose, no picture, an empty library, so "Recommended for you" shows nothing and nothing suggests a first step (read, save, follow, write). |
| Evidence / hypothesis | Verified (Code): callback redirects straight to `next` (`apps/web/src/app/auth/callback/route.ts:16-21`); username derived/suffixed by `handle_new_user` (`20261103000100_auth_and_rls.sql:33-46`); "Recommended for you" hidden when empty (BR-REC-005, `discover-home.tsx:9-13`) and needs follows/saves (BR-REC-004); no onboarding code. Signed-in runtime not observed. Hypothesis (Inferred): activation drop-off after the email round-trip. Benchmark BM-33 (Wattpad genre picks at sign-up seed the feed; StoryNest should make them editable). |
| Current limitation | No first-session state, no username availability feedback before save, no starter content, no "what next" checklist. |
| Proposed solution | **A. Welcome flow** `/welcome?next=…` (protected, `packages/features/src/profile/screens/welcome-screen.tsx`), 3 steps with a progress indicator, each skippable, "Skip all" always visible: (1) *Your public identity* — avatar (reuse `AvatarEditor`), display name, username with live availability and the resulting address; (2) *What do you like to read?* — top-level categories as chips (0–5) + interface language confirmation; (3) *Start here* — 6–8 stories from the chosen categories (existing feed/ranking RPCs filtered by category; mature excluded unless the account already opted in) with one-tap "Save" (existing save API), and a "Start writing" card → `/studio/new`. Finish → `next`. **B. Entry rule**: shown once per account (`user_settings.onboarded_at IS NULL`); the callback (and Google first sign-in, FP-009) redirects to `/welcome?next=<next>` only when `next` is `/` or a non-content page; when `next` is a content page (story, chapter, author, list) the member goes there directly and gets a one-time toast "Welcome! Finish setting up your profile" linking to `/welcome?next=<current>`. **C. Activation checklist** on `/me` and as a dismissible card on Home for 14 days: Add a picture · Save a story · Follow an author · Read a chapter · (optional) Write your first story. Computed from existing data by `my_activation_status()`; dismissal stored in `user_settings.checklist_dismissed_at`. **D. Interests** stored as `user_settings.preferred_category_ids uuid[]` (≤ 5), editable in Settings → Reading; consumers: step 3 ordering now, cold-start recommendations later (discovery agent, see 7.1). |
| Expected benefit | First session ends with a personal library (seeds `library_similar` recommendations immediately), chosen identity instead of `user_xxxx`, clear next steps. Measurable from existing tables (operator SQL: % of new members with ≥ 1 save/follow/read within 7 days). |
| Scenarios & main flow | 1. Guest signs up from Home (no `next`). 2. Confirms email → callback → `/welcome?next=%2F`. 3. Step 1: keeps suggested display name, changes username, sees "available". 4. Step 2: picks Romance and Fantasy; language stays VI. 5. Step 3: saves two stories. 6. "Done" → `/` shows "Recommended for you" based on the saves and the checklist card (2 of 5 done). |
| Alternative / error flows | A1. Sign-up came from "Sign in to vote" on a chapter: callback goes to the chapter; toast offers the welcome later. A2. "Skip all" → `onboarded_at` set, `next`. A3. Leaving mid-flow (tab closed): `onboarded_at` stays NULL; next sign-in on `/` shows the flow again once, then sets it. E1. Username taken between check and save → field error, stays on step 1. E2. Avatar upload fails → inline error, can continue. E3. Starter list empty (no stories in chosen categories) → falls back to top stories overall. E4. Suspended account → flow not shown (FP-002 policy). |
| Business rules to add/modify | New (Proposed, owned by OBJ-PRF): **BR-PRF-014** "The welcome flow is offered once per account, never blocks a content destination, and every step can be skipped." **BR-PRF-015** "Activation checklist items are derived from existing data, shown for 14 days after sign-up or until dismissed; dismissal is per account." New (OBJ-SET): **BR-SET-010** "`preferred_category_ids` holds at most 5 active top-level categories; it never filters what a reader can see." **BRC-AUTH-01** (move identity fields out of sign-up) — requires approval. |
| UI behaviour & validation | Step indicator "1 of 3"; primary "Continue", secondary "Skip"; username validation = BR-PRF-001 + live `is_username_available` (debounced 400 ms); categories as `Chip` (FP-037), max 5 with a counter; starter stories as StoryCard `row` variant with a Save toggle; all controls ≥ 44 px on touch; focus moves to the step heading on each step; works at 390 (single column) and 768/1280 (`max-w-2xl` centred). |
| Technical impact | Frontend: welcome screen + web route `(main)/welcome/page.tsx`; checklist card component; Settings interests chips. Shared components: `Chip`, StoryCard `row`, `Surface` (FP-037). API/RPC: `is_username_available(p_username text) returns boolean` (SECURITY DEFINER, case-insensitive, ignores own row), `my_activation_status() returns jsonb`. Database: `user_settings` add `onboarded_at timestamptz`, `checklist_dismissed_at timestamptz`, `preferred_category_ids uuid[]` (+ column grants, CHECK cardinality ≤ 5). RLS: own row (existing policy). Jobs: none. Callback route: one extra settings read for first sign-in. |
| Dependencies · Risks | FP-009 (Google first sign-in path, username policy F-AUTH-01), FP-019 (`/me` hub), FP-037 (Chip, row card), FP-032 (guest CTA). Risks: interrupting intent (mitigated by entry rule B); users with ad blockers or tab closure re-shown once; `is_username_available` can be used to enumerate usernames — acceptable because usernames are public on author pages, but rate-limit via `enforce_rate_limit` (FP-007). |
| Priority · Complexity · Class | P2 · M · Maturity |
| Decision required | Q-AUTH-04 (blocked until approved: mandatory vs. optional, identity fields at sign-up or in welcome) |

Acceptance criteria [Proposed]:
- Given a member signs in for the first time with `next=/`, When the callback completes, Then they land on `/welcome?next=%2F` and every step has a visible "Skip".
- Given a member signs up from a chapter page (`next=/story/a/b/c`), When the callback completes, Then they land on that chapter and a one-time toast links to the welcome flow.
- Given step 1, When the member types a username that another account holds in any letter case, Then "This username is already taken." appears before "Continue" is pressed.
- Given step 3 and two stories saved, When the member finishes, Then those stories are in Library → Saved and the Home "Recommended for you" block is not empty.
- Given the welcome flow was completed or skipped, When the member signs in on another device, Then it is not shown again.
- Given a checklist with all items done or dismissed, Then the Home card is not rendered.

<a id="fp-036"></a>

### FP-036 — Appearance and motion preferences (app theme, reduced motion)

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-ACCOUNT · OBJ-SET (+ OBJ-SHELL, OBJ-READ) · SCR-SET-01, SCR-SHELL-01 (user menu, guest "⋯" menu, footer), SCR-READ-01 (reader theme "site") |
| User problem | Night readers cannot make the whole app dark unless their OS is dark; people who want a light app on a dark OS cannot either; people sensitive to motion get dialog and sheet animations with no way to reduce them. |
| Evidence / hypothesis | Verified (Code): tokens support forcing `.light`/`.dark` on `<html>` (`packages/design-tokens/src/tokens.css:6-7,76-81`) but no code sets them; Sonner uses `theme="system"` (`packages/ui/src/components/sonner.tsx`); no `prefers-reduced-motion` rule anywhere; `tw-animate-css` imported (`tokens.css:11`). Reader theme exists only on chapter pages (WBS 2.7). Benchmark BM-02 (Wattpad: no web dark mode, reader theme separate — anti-pattern for a web-first app). Dark mode itself not runtime-checked. |
| Current limitation | Theme = OS only; motion = always on; no Display section in Settings. |
| Proposed solution | Settings → "Language & display": Theme (System / Light / Dark), Reduce motion (System / On). Stored on the device (`storynest.theme`, `storynest.motion`) and, for members, in `user_settings.theme`, `user_settings.reduce_motion`, synced with the same rules as language (BR-SET-004 pattern). Applied before first paint by extending the existing inline bootstrap script (`apps/web/src/app/layout.tsx:37`) to set `class="dark|light"` and `data-motion="reduce"` on `<html>` and update `<meta name="theme-color">`. Reader theme "site" follows the app theme. Quick access: user menu (members), guest "⋯" menu and footer (FP-039). Token rule in `tokens.css`: `@media (prefers-reduced-motion: reduce)` and `:root[data-motion="reduce"]` shorten animations/transitions to ~0 and disable smooth scrolling. |
| Expected benefit | Comfortable night reading across the whole app (core use case); WCAG 2.3.3-friendly motion control; dark tokens finally reachable for testing. |
| Scenarios & main flow | 1. Member opens Settings → Theme → Dark. 2. Whole app turns dark immediately (no reload). 3. On another device after sign-in, the app is dark. 4. Opening a chapter with reader theme "site" shows dark reading. |
| Alternative / error flows | A1. Guest picks Dark in the footer → stored on device only. A2. Account value differs from the device after sign-in → account wins unless changed during load (BR-SET-004 rule). E1. Save to account fails → "Saved on this device only. Retry". |
| Business rules to add/modify | New **BR-SET-011** (Proposed): "Theme ∈ {system, light, dark}; reduce_motion ∈ {system, on}; defaults system; device value applies before first paint; account value follows the language sync rules." Reader BR (reading agent): reader theme `site` resolves to the app theme. |
| UI behaviour & validation | Segmented controls with visible labels; change applies instantly; live region "Theme: Dark"; no confirmation. |
| Technical impact | Frontend: settings section, menu items, bootstrap script, small `useAppearance` hook in `features/_shared`. Shared components: segmented control (ToggleGroup) in `packages/ui`; reduced-motion token rule. API/RPC: none (table upsert like language). Database: `user_settings` add `theme varchar(8) CHECK (theme IN ('system','light','dark')) DEFAULT 'system'`, `reduce_motion varchar(8) CHECK (... IN ('system','on')) DEFAULT 'system'` + grants. RLS: existing own-row policy. Jobs: none. CSP: bootstrap script needs the nonce (FP-023). |
| Dependencies · Risks | FP-023 (nonce), FP-037 (tokens), Q-SET-01. Risk: flash of wrong theme if the script fails → fall back to system (today's behaviour). Dark mode visual QA has never been done at runtime: budget a pass through every screen. |
| Priority · Complexity · Class | P3 · S · Maturity |
| Decision required | Q-SET-01 (device-only vs. synced) |

Acceptance criteria [Proposed]:
- Given a device with a light OS theme, When the member chooses "Dark", Then every page including header, bottom nav, dialogs and toasts renders with dark tokens without reload and without a light flash on the next page load.
- Given "Reduce motion: On", When a dialog or sheet opens, Then it appears without a sliding/zoom animation.
- Given a member chose "Dark" on device A, When they sign in on device B (no local choice), Then device B shows the dark theme after sign-in.
- Given the reader theme "site" and app theme "Dark", When a chapter opens, Then the chapter uses the dark tokens.

<a id="fp-037"></a>

### FP-037 — Design-system consistency: StoryCard variants, layout primitives and accessible control tokens

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-PLATFORM · OBJ-SHELL (shared widgets), OBJ-DEV · all list screens (SCR-HOME-01, SCR-SRCH-01, SCR-RANK-01, SCR-AUTHOR-01/02, SCR-LIB-01, SCR-LIST-01, SCR-STORY-01 recommendations), every form, SCR-DEV-01 |
| User problem | Browsing is slow and visually monotonous: a story card is 451 px tall at 390 px and 511 px at 1280 px, so a phone shows about one row per screen and the first Home screen shows no complete card; covers without images are grey boxes with one letter; ranking/recommendation captions hang outside the cards; most buttons and inputs are 32–36 px on touch screens; keyboard focus is nearly invisible in light mode. |
| Evidence / hypothesis | Verified (Runtime): `metrics.json` card heights (m 451, t 507–535, d 511–539), `m-home.png` (first card starts at y≈413, ends below the 844 px fold behind the bottom nav), `d-story.png` (one full-height recommendation), `d-ranking.png` (captions under cards). Verified (Code): `story-card.tsx:56-92`, `story-cover.tsx:22-28`, `GRID` duplicated in 8 files, `size="touch"` used in 0 feature files vs. `size="sm"` 58 times, `--ring` already 50 % alpha + `ring-ring/50` (`tokens.css:52`, `button.tsx:8`). Inferred (calculation): focus ring 1.25:1, input border 1.31:1, placeholder cover 1.14:1. Full audit: section 7.2. |
| Current limitation | One StoryCard shape for every context; no shared grid, surface, chip, form-alert or type-scale primitives; control sizes tuned for mouse; focus and input borders below 3:1. |
| Proposed solution | Three parts, each shippable alone. **A. Tokens (S)** in `tokens.css`: opaque `--ring` + 2 px ring with offset; `--input` darkened to ≥ 3:1; `--size-control` / `--size-control-sm` that grow on `(pointer: coarse)`; semantic type utilities (`text-display`, `text-title`, `text-section`, `text-card-title`, `text-meta`, `text-caption` ≥ 12 px); `--space-section`; content width tokens; reduced-motion rule (shared with FP-036). **B. Widgets (M)** in `packages/ui`: StoryCard `variant: "grid" | "row" | "rail"` with `leading` (rank), `meta` (period stats, reason, "new chapter") and `footer` (progress, actions) slots; `StoryGrid` / `StoryList` / `StoryRail` containers; illustrated `StoryCover` placeholder; `Surface` (card) primitive; `Chip` (filter/tag); `FormAlert` (moved from auth); `PageSkeleton` variants; gallery coverage. **C. Adoption (per screen, by owning agents)** following the variant matrix in 7.2 DS-06. |
| Expected benefit | ~2× more stories per phone screen in lists (row variant 112 px vs. 451 px), aligned rows, recognisable placeholder covers, 44 px targets on touch without bloating desktop, visible focus, one place to tune density. |
| Scenarios & main flow | 1. Reader opens Rankings on a phone → sees 5–6 ranked rows per screen with rank numbers in a leading column and "this week" stats inside each row. 2. Opens a story → "You may also like" is a horizontal rail of 6 covers. 3. Tabs through the page → every focused control shows a clearly visible ring. |
| Alternative / error flows | A1. Story without cover → illustrated placeholder (title + author on a tinted background derived from the category). A2. Long Vietnamese titles → 2-line clamp with fixed title block height so rows align. E1. Cover image fails to load → same placeholder (onError). |
| Business rules to add/modify | BR-SHELL-010 (shared widget contracts) extended: "List screens choose a StoryCard variant from the matrix; captions belong inside the card (meta slot)". BR-HOME-009 (card content, discovery agent) adjusted for the compact grid variant (no synopsis below `sm`). Both need approval by their owners; no data rules change. |
| UI behaviour & validation | Row: whole row is one link; secondary actions (Save, remove) are separate buttons outside the link with their own 44 px targets. Rail: horizontal scroll-snap with visible next-item peek, arrow buttons on fine pointers, `aria-roledescription="carousel"` not needed (plain list). Grid: equal-height rows (title block min height 2 lines, meta 1 line). |
| Technical impact | Frontend: all list screens (adoption), forms (control sizing). Shared components: `packages/ui` widgets listed above, `tokens.css`. API/RPC: none (row/rail use the same data). Database: none. RLS: none. Jobs: none. Tests: widget tests updated; `check:tokens` extended to forbid `text-[…]` arbitrary font sizes. |
| Dependencies · Risks | FP-022 (a11y pass uses the tokens), FP-020 (skeleton variants), owning agents for adoption. Risks: visual churn across many screens (mitigate: ship tokens first, then one variant per PR); darker input borders change the look (validate in the gallery, SE-DEV-01). |
| Priority · Complexity · Class | P2 · M (A: S, B: M, C: S per screen) · Maturity |
| Decision required | none for A/B; per-screen variant choice confirmed during consolidation (7.2 DS-06) |

Acceptance criteria [Proposed]:
- Given a story list on a 390 × 844 screen using the `row` variant, Then each row is at most 120 px tall and at least five rows are visible below the page heading.
- Given the `grid` variant at 390 px, Then each card is at most 360 px tall and all cards in a row have aligned title, meta and counter lines.
- Given any focusable control in the light theme, When it receives keyboard focus, Then the focus indicator has at least 3:1 contrast against the adjacent background.
- Given a coarse pointer, Then default buttons, inputs, select triggers and icon buttons are at least 44 px tall; given a fine pointer they keep the desktop size (36–40 px).
- Given a story without a cover, Then the placeholder shows the title (and author in grid/rail) on a tinted background whose text contrast is at least 4.5:1.
- Given the repository, Then the duplicated `GRID` constants and local `CHIP` constants are replaced by the shared widgets and `check:tokens` rejects arbitrary `text-[…]` sizes.

<a id="fp-038"></a>

### FP-038 — Connectivity awareness on the web (offline banner, paused requests explained)

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-PLATFORM · OBJ-SHELL (+ `_shared` query layer, PlatformProvider) · SCR-SHELL-01 and every screen with a form or list |
| User problem | On a train or in a lift the app either keeps spinning ("Signing in…", "Sending…", skeletons) or silently does nothing; the person does not know whether their vote, comment or saved chapter went through. |
| Evidence / hypothesis | Verified (Code): QueryClient keeps TanStack Query v5 defaults (`networkMode: 'online'`, `packages/features/src/_shared/query.ts:17-32`; version 5.105.3 in `packages/features/package.json`), so when the browser reports offline, queries and mutations **pause** instead of failing; screens then never reach the "No connection…" message they implement (BR-AUTH-013, SCR-*-D "Offline: Implemented" rows assume a failed request). SCR-SHELL-01 D lists "Offline: Missing". Behaviour not observed at runtime (Inferred from library defaults) — verify with DevTools offline before building. |
| Current limitation | No shell-level connectivity state; paused mutations are indistinguishable from slow ones; no explanation that they will be retried. |
| Proposed solution | `ConnectivityBanner` in the shell status slot (SE-SHELL-01) subscribed to `onlineManager` (web) / the platform adapter (Capacitor Network plugin later; add `subscribeOnline` to the `PlatformProvider` contract): "You're offline. Things you do now will be sent when you're back online." Shared submit buttons read `mutation.isPaused` → label "Waiting for connection…" + "Cancel". Queries use `networkMode: 'offlineFirst'` so cached pages (e.g. the chapter already open) keep rendering with the banner instead of a skeleton. On reconnect: banner "Back online" (3 s) and paused mutations resume (existing TanStack behaviour). No service worker and no offline storage (that is WBS 7.4 for the app). |
| Expected benefit | Trust in writes on flaky mobile networks; no endless spinners; seam ready for Capacitor (WBS 7.1/7.4). |
| Scenarios & main flow | 1. Reader votes while offline → button shows "Waiting for connection…" and the banner appears. 2. Connection returns → vote is sent, button shows the voted state, "Back online" appears briefly. |
| Alternative / error flows | A1. Reader cancels a paused comment → draft text kept in the field. E1. Mutation fails after reconnect (e.g. rate limit) → normal error message (BR-SHELL-007). E2. Auth mutations (sign in) while offline → show "You're offline" immediately instead of pausing (auth must not fire later unexpectedly): set `networkMode: 'always'` for auth mutations so they fail fast with the network message. |
| Business rules to add/modify | BR-SHELL-007 extended (Proposed): "Queries render cached data while offline; non-auth mutations pause and resume on reconnect with a visible waiting state; auth mutations fail immediately when offline." |
| UI behaviour & validation | Banner is a polite live region, dismissible, not covering the bottom nav; respects reduced motion. |
| Technical impact | Frontend: shell banner, shared mutation-button helper. Shared components: `StatusBanner` (shared with FP-006 suspension notice). API/RPC: none. Database: none. RLS: none. Jobs: none. Platform: adapter contract `subscribeOnline`. |
| Dependencies · Risks | FP-020 (state pattern), SE-SHELL-01 status slot. Risk: resumed mutations after a long time may conflict (e.g. comment on a now-hidden chapter) → server errors already handled. |
| Priority · Complexity · Class | P3 · S · Maturity |
| Decision required | none |

Acceptance criteria [Proposed]:
- Given the browser goes offline on any `(main)` page, Then a banner "You're offline…" appears within 1 s and is announced politely.
- Given the reader presses "Vote" while offline, Then the button shows "Waiting for connection…" and, When the connection returns, Then the vote is sent once and the button shows the voted state.
- Given the sign-in form is submitted while offline, Then "No connection. Check your network and try again." is shown immediately and nothing is sent later.
- Given a chapter already loaded, When the connection drops and the reader navigates back to it, Then the cached chapter renders with the banner instead of a skeleton.

<a id="fp-039"></a>

### FP-039 — Public site frame: footer, legal links, app icons and default share metadata

> **Consolidation (DEC-017):** legal page content and the copyright-request flow are owned by [FP-065](#fp-065); FP-039 provides the footer, icons, manifest and default share card that link to them.

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-PLATFORM · OBJ-SHELL, OBJ-SEO (+ OBJ-AUTH consent line) · SCR-SHELL-01, SCR-AUTH-02, static legal pages under the WBS §1.2 `(marketing)` route group (screen IDs to register on approval) |
| User problem | There is no footer, no About/Terms/Privacy/Copyright page and no way to report copyright infringement; sign-up references no terms; the site has no favicon or app icon, so tabs, bookmarks and "Add to Home Screen" show a generic icon; sharing the home or ranking link produces no preview. |
| Evidence / hypothesis | Verified (Runtime): no footer on any `d-*.png`/`t-*.png`. Verified (Code): no `icon.*`, `apple-icon.*`, `manifest.*`, root `opengraph-image.*` in `apps/web/src/app`, no `apps/web/public`; only story and chapter routes set `alternates`/`openGraph` (`story/[id]/[slug]/page.tsx:28-31`, `…/[chapterSlug]/page.tsx:28-30`). Documented: WBS 6.9 legal pages ⬜ "needs legal content"; WBS 7.5 needs icons/splash anyway. |
| Current limitation | No legal surface, no brand assets, no site-wide share defaults. |
| Proposed solution | **Footer** (`SiteFooter` in `AppShell`): About StoryNest · Terms · Privacy · Copyright/DMCA report · Contact · language choice · theme (FP-036) · ©. End-of-page on every `(main)` page; on < `lg` placed above the bottom-nav padding; slim (2 rows max at 390). Auth layout gets a one-line version (Terms · Privacy · language). **Legal pages** in `(marketing)/{about,terms,privacy,copyright}` as static, translated, indexable pages (content from Q-X-02). **Sign-up line** "By creating an account you agree to …" (SE-AUTH-02). **App identity**: `app/icon.svg` + `icon.png` (32/192/512), `apple-icon.png` (180), `app/manifest.ts` (name, short_name, `theme_color`/`background_color` = the literals already mirrored in `layout.tsx:25-28`, `display: "standalone"`, `lang: "vi"`). **Default metadata**: root `openGraph` + `twitter: summary_large_image` with a branded `app/opengraph-image.tsx`; `alternates.canonical` for `/` and `/ranking`. |
| Expected benefit | Launch-ready legal surface and copyright route (UGC platform), recognisable brand in tabs/search results/home screen, attractive link previews for the most shared URLs. |
| Scenarios & main flow | 1. Visitor scrolls to the end of Home → footer → "Terms" → reads → back. 2. Sharing `https://…/` in a chat shows the StoryNest card. 3. Adding the site to the iOS home screen shows the StoryNest icon. |
| Alternative / error flows | A1. Legal content not yet approved → footer hides those links (feature flag per link) rather than linking to empty pages. A2. Copyright report: link to a mailto/contact form until a structured flow exists (trust-safety agent may extend SCR-MOD-02). |
| Business rules to add/modify | BR-SEO-004/006 extended (Proposed): default share card for pages without their own; canonical for home and ranking. New BR-SHELL-015 (Proposed): "Every `(main)` and `(auth)` page links to Terms and Privacy." |
| UI behaviour & validation | Footer links ≥ 44 px tall on touch (row spacing), `<footer>` landmark with `aria-label`, current language marked. |
| Technical impact | Frontend: `SiteFooter`, auth layout line, static pages. Shared components: `AppShell` `footer` slot. API/RPC: none. Database: none. RLS: none. Jobs: none. SEO: sitemap adds the static pages; robots unchanged. |
| Dependencies · Risks | Q-X-02 (legal content, owner), Q-SHELL-03 (brand assets), FP-036 (theme control), FP-021 (language). Risk: shipping placeholder legal text — forbidden; links stay hidden until content is approved. |
| Priority · Complexity · Class | P2 · S · MVP (legal links and copyright route are launch requirements; icons are trivial) |
| Decision required | Q-X-02 (content, blocks the legal pages only), Q-SHELL-03 (brand assets) |

Acceptance criteria [Proposed]:
- Given any `(main)` page scrolled to the end, Then a footer with About, Terms, Privacy and Copyright links and a language choice is visible, and on a phone it sits above the bottom navigation.
- Given the browser requests `/manifest.webmanifest` (or the Next default path), Then it returns name "StoryNest", icons of 192 and 512 px and the theme colours.
- Given the home URL is shared to a link-preview service, Then the preview shows the StoryNest title, description and default image.
- Given the Terms page is not yet approved, Then no link to it is rendered anywhere.

---

<a id="fp-040"></a>

### FP-040 — Story facts that help readers choose (length, reading time, chapter cadence, completion)

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-READING / D-DISCOVERY · OBJ-STORY, OBJ-HOME, OBJ-AUTHOR · SCR-STORY-01, SCR-HOME-01, SCR-SRCH-01, SCR-RANK-01, SCR-AUTHOR-01/02 |
| User problem | Readers cannot tell how long a story is, how much time it takes, whether it is still being updated, or when the last chapter appeared, before investing in it (JRN-RDR-04). The only "Updated" signal moves on any edit (N-03). |
| Evidence / hypothesis | Verified (Code): N-07 (no columns), N-03 (`stories_touch` + `publish_chapter` update), U-STORY-02 (dates loaded, not shown). Verified (Runtime): `m-story.png` / `d-story.png` show no length or date. Benchmark: Wattpad and comparable serial platforms show part count, reading time and last update on the story page (Inferred common practice). |
| Current limitation | `story_stats` has no chapter count, words or last-chapter time. The card query cannot show or filter them. The story page derives the count from the full chapter list only. |
| Proposed solution | Maintain per-story **facts**: `published_chapter_count`, `published_word_count` (sum of the published versions' `word_count`), `last_chapter_published_at` (= max `chapters.first_published_at` over published, non-deleted chapters, so republishing an edit does not count as new). Store them in `story_stats` (already joined by `STORY_COLUMNS`) through one trigger on `chapters` (status, `published_version_id`, `deleted_at` changes) that recomputes the story's three facts. This covers every write path (publish, unpublish, archive, delete, restore, scheduled publish job). Backfill in the migration. Expose them in `STORY_COLUMNS`, `StorySummary`, `StoryDetail`. Show them: card facts line (row/grid variants), story-page facts line, author page "last update", following feed ordering (SE-AUTHOR-02). Reading time = words ÷ reading speed (constant per language, Q-HOME-03). |
| Expected benefit | Confident choice; prerequisite for length and recency filters (FP-041) and for "new chapter" semantics (BRC-HOME-01). |
| Scenarios & main flow | 1. Author publishes chapter 5 (1,800 words). 2. The trigger sets count 5, words +1,800, `last_chapter_published_at = now()`. 3. Home/story/author show "5 chapters · 9.2k words · ~40 min · Updated just now". 4. The author republishes an edit of chapter 2: count and last date unchanged, words updated to the new version's count. |
| Alternative / error flows | Unpublish or archive of the newest chapter → `last_chapter_published_at` falls back to the previous newest. All chapters unpublished → count 0, date null → facts line omits length and date. Soft-deleted story → unchanged (not listed anyway). |
| Business rules to add/modify | New rule BR-STORY-017 "Story facts": definitions above, published chapters only, maintained server-side, readable wherever `story_stats` is readable. BRC-HOME-02 (card content) requires approval. BR-STORY-013 gains the facts (additive). |
| UI behaviour & validation | Numbers locale-formatted (`formatCount`). Reading time rounded (< 1 h → minutes, else hours, "~"). Dates relative < 7 days, absolute afterwards. Facts never shown for mature stories in server metadata (FP-005). |
| Technical impact | Frontend: discovery model/card mapping, story screen, author screen · Shared components: `StoryCard` facts slot, `StoryFacts` · API/RPC: `STORY_COLUMNS`. RPC-backed lists already re-query cards by id (BR-SRCH-010) so they inherit it · Database: 3 columns on `story_stats` + trigger + backfill. Index `(last_chapter_published_at DESC, story_id)` if used for ordering (FP-041) · RLS: none new (`story_stats` read policy) · Jobs: none (the trigger also covers the scheduled-publish job) |
| Dependencies · Risks | Counter unification migration (`20261104001200_counter_unification.sql`) must not overwrite the new columns. Check before implementing. Risk: trigger cost on bulk chapter operations (reorder does not touch status, so it is not affected). |
| Priority · Complexity · Class | P2 · M · Maturity |
| Decision required | Q-HOME-03 (reading speed, length buckets). BRC-HOME-02 approval for card content. |

Acceptance criteria [Proposed]
- Given a story with 3 published chapters of 1,000 / 2,000 / 3,000 words, When its card and page load, Then they show "3 chapters" and "6,000 words".
- Given chapter 2 is republished with an edit (now 2,500 words) a week after chapter 3, When the facts refresh, Then the word count is 6,500 and `last_chapter_published_at` is still chapter 3's first publish time.
- Given the newest chapter is archived, When the story page reloads, Then "Updated …" reflects the previous newest published chapter.
- Given a scheduled chapter is published by the cron job, Then the facts update without any client call.
- Given the SQL test suite runs, Then each transition (publish, republish, unpublish, archive, delete, restore, schedule) has a facts assertion.

<a id="fp-041"></a>

### FP-041 — Filter and sort for browsing and search results

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-DISCOVERY · OBJ-HOME, OBJ-SRCH, OBJ-AUTHOR · SCR-HOME-01, SCR-SRCH-01, SCR-AUTHOR-01 |
| User problem | Readers cannot narrow lists by what matters to them (finished stories, length, recently updated) or change the order. They must scroll an edit-ordered feed (JRN-RDR-02/03). |
| Evidence / hypothesis | Verified (Code): fixed order and no status/length/recency params (`discovery.api.ts:59-95`, `search.sql:64-86`). Hypothesis: "completed" is the most-wanted filter for serial fiction readers who avoid abandoned stories. Not measured; validate with usage analytics after launch. |
| Current limitation | Only category, tag (and an unexposed language) filters. One order per list. |
| Proposed solution | One shared `DiscoveryFilter` model in `features/discovery/model` with URL params: `status` (`ongoing` / `completed` / `hiatus`), `length` (`short` / `medium` / `long` buckets on `published_word_count`, Q-HOME-03), `updated` (`7d` / `30d` on `last_chapter_published_at`), `sort` (`updated` default on Home, `relevance` default on Search, `newest` = `stories.first_published_at`, `reads`, `votes`), plus the existing `category`, `tag` and `language` (F-HOME-02). Home and author lists move from PostgREST to a `browse_stories(filter…, cursor, limit)` RPC (SECURITY INVOKER) that applies the shared discovery predicate from FP-002 (this also closes F-HOME-01) and uses keyset paging per sort key. Search passes the same filters to `search_stories`. UI: `FilterBar` (≥ sm, inline selects with chips for active filters) and `FilterSheet` (< sm, bottom sheet with Apply / Reset and a result count when cheap). |
| Expected benefit | Readers narrow to what they want. Shareable filtered URLs (SEO for category + completed pages). Consistent eligibility (fixes the home inconsistency). |
| Scenarios & main flow | 1. A guest taps "Filters" on Home and picks Completed + Long. 2. The URL becomes `/?status=completed&length=long`. 3. SSR renders the first page. 4. Infinite load continues with the same filter. 5. They sort by Most read. |
| Alternative / error flows | No result → "No stories match these filters" + "Clear filters". Invalid param values are ignored (as BR-SRCH-008 / BR-RANK-006 do). The search offset cap stays at 200 (BR-SRCH-007). |
| Business rules to add/modify | New BR-HOME-013 "Browse filters and sort" (params, defaults, validation, keyset per sort). BR-HOME-002 ordering → BRC-HOME-01. BR-HOME-005 (language exposed). BR-SRCH-007 unchanged. |
| UI behaviour & validation | Active filters shown as removable chips. Filter sheet traps focus, Esc closes, Apply announces the result. The sort select is labelled. Filter state lives only in the URL (no hidden state). |
| Technical impact | Frontend: discover/search/author screens, filter widgets · Shared components: `FilterBar`, `FilterSheet` in `packages/ui/widgets` (presentation only) · API/RPC: `browse_stories`, `search_stories` params · Database: indexes for `(status, last_chapter_published_at)` and the reads/votes sort (on `story_stats`). `EXPLAIN` evidence as in WBS 5.1 · RLS: invoker RPC, existing policies · Jobs: none |
| Dependencies · Risks | FP-040 (length and recency data), FP-002 (shared predicate). Risk: keyset paging on reads/votes needs a tie-break (score, id). Query-plan cost on small catalogues is low. Measure before launch. |
| Priority · Complexity · Class | P2 · M · Maturity |
| Decision required | Q-HOME-03 (length buckets), BRC-HOME-01 (default order semantics) |

Acceptance criteria [Proposed]
- Given 3 completed and 2 ongoing public stories, When `/?status=completed` opens, Then exactly the 3 completed stories are listed and the "Completed" chip is shown as active.
- Given `/?sort=reads`, When the reader scrolls through all pages, Then stories appear in non-increasing read count with no duplicate or missing story across pages.
- Given `/search?q=anh&status=completed`, Then only completed stories whose search match qualifies are listed.
- Given a suspended author's story matches every filter, When any filtered list loads, Then it is not listed (shared predicate, FP-002).
- Given a 390 px viewport, When the reader opens "Filters", changes two options and presses Apply, Then the sheet closes, the URL contains both params and focus returns to the "Filters (2)" button.

<a id="fp-042"></a>

### FP-042 — Search relevance beyond titles, with no-result recovery

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-DISCOVERY · OBJ-SRCH · SCR-SRCH-01 (+ header SearchBox) |
| User problem | Searching an author name or a genre word in the main box finds no stories. Zero-result searches end in a dead end. Readers retype searches they made before (JRN-RDR-03). |
| Evidence / hypothesis | Verified (Code): title-only matching (N-06), empty states without next step (`search-screen.tsx:115-123`). Hypothesis: a meaningful share of queries are author names or genre terms. Measure with privacy-safe query logs if added later. |
| Current limitation | `search_stories` scores `similarity(title)` + 1 for containment only. Tags (≤ 10) and authors are separate tabs. No recent searches. |
| Proposed solution | (a) `search_stories` scores across fields: title (weight 1.0 + containment bonus), owner display name / username (0.6), tag names (0.5), synopsis (0.3, only if Q-SRCH-02 approves; needs a trigram index on `search_normalize(synopsis)` or a capped prefix), and returns `match_field` for the UI's "why matched" label. (b) Header suggestions: titles + top 2 authors + top 2 tags. (c) Zero-result recovery: popular tags + Rankings link + "try fewer words". If another tab has matches, offer to switch. (d) Recent searches stored on the device (max 8, clear-all; never sent to the server). |
| Expected benefit | Fewer dead-end searches; one box finds stories by any natural cue. |
| Scenarios & main flow | 1. A reader types "an nhien". 2. Suggestions: author "An Nhiên" + her 2 stories. 3. Enter → Stories tab lists her stories labelled "by An Nhiên". |
| Alternative / error flows | Query < 3 chars → existing hint (BR-SRCH-002). Storage blocked → no recent searches, no error. RPC error → existing "Can't search right now". |
| Business rules to add/modify | BRC-SRCH-01 (BR-SRCH-003 matching and score). BR-SRCH-009 (suggestion groups). New BR-SRCH-012 "Recent searches are device-local". |
| UI behaviour & validation | Match label is shown only when the match is not the title. Recent searches are keyboard-navigable in the listbox. "Clear" asks no confirmation (low risk). |
| Technical impact | Frontend: `search-screen.tsx`, `search-box.tsx`, local store · Shared components: none new · API/RPC: `search_stories` (scoring, `match_field`) · Database: optional synopsis index; existing name/tag indexes (`search.sql:21-40`) · RLS: unchanged (invoker) · Jobs: none |
| Dependencies · Risks | Q-SRCH-02. Risk: synopsis matching adds noise; keep its weight low and test with `EXPLAIN` as WBS 5.1 requires. |
| Priority · Complexity · Class | P3 · M · Maturity |
| Decision required | Q-SRCH-02, BRC-SRCH-01 |

Acceptance criteria [Proposed]
- Given a story whose title does not contain "nhien" but whose author is "An Nhiên", When "an nhien" is searched on the Stories tab, Then the story is listed with the label "by An Nhiên", ranked below any title match.
- Given the query "zzzq" matches nothing, Then the page shows popular tags and a link to Rankings.
- Given the reader searched "anh" and "kiem hiep" earlier on this device, When they focus the empty search field, Then both appear as recent searches, most recent first, and "Clear" removes them.
- Given localStorage throws, When the reader searches, Then search works and no recent-search UI is shown.

<a id="fp-043"></a>

### FP-043 — Immersive chapter reader (shell-less reader route and auto-hiding chrome)

| Field | Value |
| --- | --- |
| Type | Remediation (N-01, WBS alignment) + Enhancement |
| Domain · object · screens | D-READING · OBJ-READ (+ OBJ-SHELL) · SCR-READ-01, SCR-SHELL-01, SCR-HIST-02 (reuse) |
| User problem | While reading, the app header, the reader toolbar and the bottom nav take ~18 % of a phone screen, the bottom nav overlays the text, and after the first scroll the reader toolbar and progress bar disappear under the header. Paragraph comment icons interrupt every paragraph (JRN-RDR-05). |
| Evidence / hypothesis | Verified (Runtime): `m-reader.png` (chrome, overlay, markers), metrics (17/21 small targets). Verified (Code): N-02, N-09. Inferred (Code), high confidence: N-01. Documented: WBS §1.2 `(reader)` "toàn màn hình (không shell)". |
| Current limitation | The reader is a `(main)` route. The toolbar sticks at the same `top-0` as the higher-z header. There is no hide-on-scroll and no comment-marker control. |
| Proposed solution | (1) A `(reader)` route group (URL unchanged) with a `ReaderLayout`: providers, adult-content sync, toaster, skip link. No `SiteHeader`, no `BottomNav`. (2) A `ReaderBar` widget (presentation-only, `packages/ui`): top bar (back to story, "Ch. n / N", Display, Contents, "⋯") and a mobile bottom bar (prev, percent, next). Hide on scroll-down / show on scroll-up, tap, focus and end of chapter. The progress line is always visible. (3) A reader preference `paragraphComments: all | withComments | off` added to `readerPreferencesSchema` with `.catch` default (BRC-READ-01). (4) 44 px targets throughout. (5) Reuse `ReaderLayout` for the studio chapter preview (same sticky bug). FP-012 supplies the nav placement, completion measure and keys. FP-044 supplies the end panel content. |
| Expected benefit | More reading area, controls and progress always reachable, calmer text, alignment with the planned architecture (also eases WBS 7.1 mobile reuse). |
| Scenarios & main flow | 1. A reader opens a chapter: no site header or bottom nav. Top bar visible. 2. Scrolls down: bars slide away, the 2 px progress line remains. 3. Taps the text: bars return, opens Contents. 4. Reaches the end: bars return, the end panel shows Next. |
| Alternative / error flows | JS not yet hydrated → bars rendered visible (no hide), SSR content readable. Reduced motion → instant show/hide. Screen reader → bars never `aria-hidden` while focusable. Hiding uses transform; focus inside a bar keeps it visible. Not-found / error inside the reader layout (FP-004 amendment). Mature gate first (BR-READ-010). |
| Business rules to add/modify | BRC-READ-01 (BR-READ-013: fifth preference). New BR-READ-019 "Reader layout": reader routes render without the main shell, with a reader bar that offers back-to-story, contents, display and, for guests, sign-in with return. SCR-READ-01 Layout row updated. BR-SHELL-001 unchanged (it governs `(main)` only). |
| UI behaviour & validation | Threshold 24 px before hiding. Never hide while a sheet or menu is open or within 200 px of the end. Bottom bar respects the safe area (`pb-safe`). Keyboard: ← / → (FP-012), Esc. |
| Technical impact | Frontend: route move (`apps/web/src/app/(reader)/…`, incl. `opengraph-image.tsx`), `ReaderLayout`, `reader-screen.tsx`, `reader-blocks.tsx`, settings sheet · Shared components: `ReaderBar` (ui), `ReadingProgress` target param · API/RPC: none · Database: none (JSON preference ≤ 512 bytes, BR-READ-017) · RLS: none · Jobs: none · Tests: route-level 200/404/308 tests move with the files; pre-paint script unaffected (`CHAPTER_PATH_PATTERN`). |
| Dependencies · Risks | FP-012 (should ship together), FP-004, FP-005, FP-019 (global nav no longer visible in the reader; the "⋯" offers Home). Risk: readers who navigate via the bottom nav from inside a chapter lose it. Mitigated by the back link and "⋯ → Home" (Q-READ-02). Next.js: route groups must keep identical dynamic segment names (`[id]`, `[slug]`). |
| Priority · Complexity · Class | P1 · M · MVP |
| Decision required | Q-READ-02 (which chrome stays, default of the comment-marker preference) |

Acceptance criteria [Proposed]
- Given any chapter URL, When it renders at 390, 768 or 1280 px, Then no site header and no bottom navigation are present, and the reader bar shows back-to-story, "Ch. n / N", Display and Contents.
- Given the reader has scrolled to the middle of a long chapter, Then the progress indicator is visible and the reader bar can be revealed by scrolling up or tapping the text (never covered by another bar).
- Given the preference "Hide" for paragraph comments, Then no per-paragraph comment buttons render, and the chapter comment section is still available. The preference survives reload and syncs to the account (BR-READ-016).
- Given a stale story slug in a chapter URL, Then it still 308-redirects, and a missing chapter returns a real 404 rendered inside the reader layout (FP-004).
- Given `prefers-reduced-motion: reduce`, Then the bars show and hide without animation.

<a id="fp-044"></a>

### FP-044 — Reading continuity: continue rail, read marks, caught-up and end-of-story states

> **Consolidation (DEC-016):** absorbs FP-052 (end-of-chapter/caught-up cards). The Home "Continue reading" rail is owned by [FP-047](#fp-047); FP-044 keeps the in-story continuity (read marks, CTA states, end-of-chapter and end-of-story cards).

| Field | Value |
| --- | --- |
| Type | Enhancement (+ BR change) |
| Domain · object · screens | D-READING · OBJ-PROG, OBJ-STORY, OBJ-READ (+ OBJ-HOME) · SCR-HOME-01, SCR-STORY-01, SCR-READ-01 (TOC, end panel) · reference SCR-LIB-01 |
| User problem | Returning readers cannot continue from the home page, cannot see which chapters they read or which are new, are told to "Start reading" after catching up, get no sign at the last chapter that more is coming, and are moved to a saved position without explanation (JRN-RDR-06). |
| Evidence / hypothesis | Verified (Code): N-04, N-05 (+ runtime `mobile-reader-last.png`), N-08, `discover-home.tsx:11-15` (no continue entry), `story-screen.tsx:165-181` and `toc-sheet.tsx:43-59` (no read marks). Not runtime-verified for members (DEC-011). |
| Current limitation | Story progress exposes only the current chapter and its completion. Per-chapter progress is fetched one chapter at a time (`getChapterProgress`). |
| Proposed solution | (1) `get_story_reading_state(story_id)` (SECURITY INVOKER, own rows): per published chapter `completed`, `percent`, plus `last_read_at` of the story. Alternatively a PostgREST select on `user_chapter_progress` joined to chapters of the story under existing RLS. (2) Story page: ✓ read marks; "New" for chapters with `first_published_at > last_read_at`; CTA states (BRC-STORY-01): Start · Continue · Ch. N · **Caught up · Follow for new chapters** (ongoing/hiatus, last chapter completed) · **Read again** (completed story, all read). (3) Reader end panel: Next card / caught-up + Follow / "The end" + similar stories + Add to list. (4) TOC: read marks, "New", scroll to current. (5) Home "Continue reading" rail for members: `user_story_progress` ordered by `last_read_at`, max 6, using the shared resolver (FP-012) and FP-040 facts ("3 new chapters"). It includes caught-up stories with new chapters, and excludes finished completed stories. (6) Resume notice toast with "Start from the beginning". (7) Guests: same UI fed by FP-027 local progress when that ships. |
| Expected benefit | Continue in one tap from the first screen; correct next action at every point of the story; fewer "where was I" moments. |
| Scenarios & main flow | 1. A member read chapters 1–4 of an ongoing story (4 published). 2. Story page CTA: "Caught up · Follow for new chapters". 3. The author publishes chapter 5. 4. Home rail shows the story with "1 new chapter". The story page marks chapter 5 "New", and the CTA is "Continue · Ch. 5". |
| Alternative / error flows | Progress query fails → page renders without marks and with the default CTA (no blocking; FP-020). Current chapter archived → BR-PROG-008 "none" → Start reading (unchanged). Guest without FP-027 → no rail, no marks. |
| Business rules to add/modify | BRC-STORY-01 (BR-STORY-012 / BR-PROG-008 CTA states). New BR-PROG-016 "Chapter read state on story page and TOC" (read = `completed_at` set; new = first published after the story's `last_read_at`). New BR-HOME-014 "Continue rail" (member, unfiltered home, ≤ 6, order by `last_read_at`). |
| UI behaviour & validation | Marks use icon + accessible text ("Read", "New"). The rail is hidden when empty. The toast appears only when a non-zero position was restored and no hash is present (BR-PROG-007). |
| Technical impact | Frontend: story screen, TOC, reader end panel, home rail, tracker notice · Shared components: `StoryCard` compact with progress slot · API/RPC: one read RPC or select · Database: none (index `user_chapter_progress (user_id, chapter_id)` is the PK; story join via chapters) · RLS: existing own-row policies · Jobs: none |
| Dependencies · Risks | FP-012 (one resolver; library uses it too, owned by the library agent), FP-040 (new-chapter counts), FP-027 (guests), Q-PROG-01, Q-STORY-02. Risk: "New since last visit" depends on `last_read_at`, which moves when any chapter is opened. Acceptable and documented. |
| Priority · Complexity · Class | P2 · M · Maturity |
| Decision required | Q-STORY-02, BRC-STORY-01 (and Q-PROG-01 already open) |

Acceptance criteria [Proposed]
- Given a member completed every published chapter of an ongoing story, When the story page loads, Then the CTA reads "Caught up" with a Follow action (or "Following" when already following), not "Start reading".
- Given a completed story fully read, Then the CTA reads "Read again" and opens chapter 1.
- Given the member read chapters 1–3 and chapter 6 was published after their last visit, Then chapters 1–3 show a "Read" mark and chapter 6 shows "New" on the story page and in the TOC.
- Given a member with 2 stories in progress, When Home loads unfiltered, Then a "Continue reading" rail lists them by most recent reading, each opening the same chapter as the story page CTA.
- Given the last published chapter of an ongoing story, When the reader reaches its end, Then the end panel states that they are caught up and shows the last update date and a Follow action.
- Given the member's saved position in chapter 2 is restored, Then a toast offers "Start from the beginning", and choosing it scrolls to the top.

<a id="fp-045"></a>

### FP-045 — Story card density and responsive list layouts

> **Consolidation (DEC-015):** card variants are built once in [FP-037](#fp-037) (`grid`, `row`, `rail`; FP-045's "compact" = `rail`). FP-045 covers the per-screen layouts (two-column story page, which variant each list uses).

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-DISCOVERY / D-READING · OBJ-HOME (shared card BR-HOME-009), OBJ-STORY · SCR-HOME-01, SCR-SRCH-01, SCR-RANK-01, SCR-AUTHOR-01/02, SCR-STORY-01 (similar stories, desktop layout) · reference SCR-LIB-01, SCR-LIST-01 |
| User problem | On phones one story card is 451 px tall, so a reader sees about two stories per screen. On desktop the story page leaves half the width empty and buries recommendations. Reasons and rank metrics float outside the cards. |
| Evidence / hypothesis | Verified (Runtime): metrics (451 / 507 / 511 px cards), `m-home.png`, `m-search.png`, `m-ranking.png`, `d-story.png`. Verified (Code): one card layout (`packages/ui/src/widgets/story-card.tsx:52-93`), 2:3 cover filling the card width (`story-cover.tsx:22`), loose reason/metric lines (`recommendation-list.tsx:45`, ranking). |
| Current limitation | `StoryCard` has a single vertical layout. Every list uses the same grid. The story page body is single-column at all widths. |
| Proposed solution | `StoryCard` gains `variant: "grid" (default) | "row" | "compact"` and optional slots `rank`, `reason`, `progress`, `facts`. **row**: 72 × 108 cover left, title (2 lines), author, category · status, facts (FP-040), counters; ≈ 130 px. **compact**: cover + title + one meta line for rails (≈ 150 px wide). The grid variant caps the cover height so a card is ≤ 420 px. List screens choose `row` below `sm` and `grid` from `sm` (ranking uses `row` at all widths, 2 columns ≥ md). Reason and rank metrics render inside the card's link. The story page gets the desktop two-column body (main + aside with author card and similar rows) described in SE-STORY-01. A placeholder for a missing cover keeps the first letter but in the smaller row cover. |
| Expected benefit | 2–3× more stories per phone screen; faster scanning; better use of desktop width; consistent card semantics across 6 screens. |
| Scenarios & main flow | 1. A reader on a 390 px phone opens search. 2. Results render as rows with facts. 3. On a laptop the same results render as a 4-column grid. |
| Alternative / error flows | Missing cover → letter placeholder in all variants. Very long titles → 2-line clamp. 18+ badge on the cover in all variants (no overlap with rank, U-RANK-02). |
| Business rules to add/modify | BRC-HOME-02 (BR-HOME-009 card content and variants). |
| UI behaviour & validation | Whole card stays one link (BR-HOME-009), so the author name stays text inside it. A separate author link is offered only in row variants outside the card link area if the designer chooses (nested links are not allowed). The accessible name order is title, author, status. Touch target = whole row. |
| Technical impact | Frontend: list screens choose the variant · Shared components: `StoryCard`, `StoryCover` size prop, dev gallery entries (U-DEV-01) · API/RPC: none (facts via FP-040) · Database: none · RLS: none · Jobs: none |
| Dependencies · Risks | FP-040 for the facts slot (variants can ship without it). Coordinate with the library/lists agent (SCR-LIB-01, SCR-LIST-01 use cards or rows). Risk: visual regression tests need updating. |
| Priority · Complexity · Class | P2 · M · Maturity |
| Decision required | none (BRC-HOME-02 approval) |

Acceptance criteria [Proposed]
- Given a 390 px viewport, When Home, Search, Rankings or an author page lists stories, Then each item is ≤ 140 px tall and at least 4 items are visible in one screen height below the page controls.
- Given a ≥ 640 px viewport, Then Home and Search use the grid variant and no grid card exceeds 420 px in height.
- Given a recommendation with a reason, Then the reason is inside the card's link and is part of its accessible name.
- Given a ranked mature story, Then the rank and the "18+" badge do not overlap in any variant.
- Given a 1280 px story page, Then the similar-stories list is in the aside next to the chapter list.

<a id="fp-046"></a>

### FP-046 — Ranking scopes: per category and "New & rising"

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-DISCOVERY · OBJ-RANK (+ OBJ-HOME) · SCR-RANK-01, SCR-HOME-01 |
| User problem | Rankings mix all genres, so niche readers see nothing relevant. Cumulative popularity keeps established stories on top, so new stories and authors are hard to find (JRN-RDR-01/02). |
| Evidence / hypothesis | Verified (Code): N-10 (`top_stories` has no scope), BR-RANK-001 (score = reads + 5 × votes). Hypothesis: new authors stop publishing when they get no readers. Healthy supply needs an exposure path. Reasoned, not measured. |
| Current limitation | Four periods only; no category; no recency-of-debut constraint. |
| Proposed solution | Extend `top_stories` with optional `p_category_slug` (category + direct children, as BR-TAX-004) and `p_scope` = `all` (default) | `new` (stories whose `first_published_at` is within N days, Q-RANK-02). Positions are recomputed within the scope (row_number over the filtered set). `/ranking?period=&scope=` (scope = category slug or `new`). The Home "New & rising" rail = `top_stories('week', scope='new', limit 8)`. The snapshot view is unchanged (live join to `stories` already exists, BR-RANK-003). |
| Expected benefit | Relevant rankings per genre; an exposure path for new stories; more home rails at almost no data cost. |
| Scenarios & main flow | 1. A reader selects "Lãng mạn" in Rankings. 2. The list ranks romance stories this week from #1. 3. A guest on Home sees "New & rising" with 8 stories first published this month. |
| Alternative / error flows | Unknown category → empty state + "All". `new` with no eligible story → rail hidden; ranking empty state. |
| Business rules to add/modify | BRC-RANK-01 (BR-RANK-004/006: scoped positions, `scope` param). New BR-RANK-009 "New scope eligibility" per Q-RANK-02. |
| UI behaviour & validation | Scope chips (All, categories, New) in the URL. Invalid → All. "Rank N in Romance" accessible label. |
| Technical impact | Frontend: ranking screen, home rail · Shared components: chips (existing) · API/RPC: `top_stories` new params (keep defaults for compatibility) · Database: index on `stories (first_published_at)` if needed; none on the MV · RLS: SECURITY DEFINER function keeps the eligibility clauses · Jobs: none (refresh unchanged) |
| Dependencies · Risks | FP-017 (approved categories in production). Risk: small catalogues produce near-empty scoped lists; hide scopes with < 3 ranked stories. |
| Priority · Complexity · Class | P3 · S/M · Optional |
| Decision required | Q-RANK-02, BRC-RANK-01 |

Acceptance criteria [Proposed]
- Given romance stories A (10 reads) and B (5 reads) and fantasy story C (50 reads) this week, When `/ranking?scope=lang-man` opens, Then A is #1 and B is #2 and C is absent.
- Given story D first published 3 days ago and story E first published a year ago, When `scope=new` is selected, Then D can appear and E cannot.
- Given `scope=does-not-exist`, Then the "All" scope is shown.
- Given a guest on Home and at least 3 eligible new stories, Then a "New & rising" rail shows at most 8 of them ordered by this week's score.

---

<a id="fp-047"></a>

### FP-047 — "What's new" library state: new-chapter badges, Home "Continue reading", nav dot

> **Consolidation (DEC-016):** also owns the Home "Continue reading" rail described in FP-044; both use the FP-012 resolver.

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-LIBRARY · OBJ-LIB (+ OBJ-PROG read side) · SCR-LIB-01, SCR-HOME-01, SCR-SHELL-01 |
| User problem | A returning reader cannot see which kept stories have new chapters, where they stand in each, or resume from Home. The only "what's new" signal is the notification list, and it exists only in the app. |
| Evidence / hypothesis | Verified (Code): no update state in the library model (`library/model/library.ts:49-58`); Home has no continue row (`discover-home.tsx:9-13`); `BottomNavItem` has no badge (`ui/src/widgets/bottom-nav.tsx:14-20`). Data already exists (`chapters.first_published_at`, `user_story_progress`, `user_chapter_progress.completed_at`). Hypothesis: surfacing new chapters at entry points raises the return-to-read rate. Benchmark: "new episode" badges in Webtoon and Wattpad libraries (Inferred). |
| Current limitation | Library entries show only "Continue with chapter N" and a time. Following is sorted by follow time. No home entry point to resume. |
| Proposed solution | (1) RPC `list_library(p_tab text, p_cursor_at timestamptz, p_cursor_id uuid, p_limit int)`, SECURITY INVOKER, returning per story: summary columns, `continue_chapter` (via the FP-012 rule), `published_count`, `completed_count`, `new_count` (published chapters with `first_published_at > last_read_at`, or `> kept_at` when never read), `latest_chapter_at`, `is_followed`, `is_saved`. It also replaces the three direct queries and enables paging (FP-015). (2) `LibraryRow` widget (SE-LIB-01). (3) Home: for members on the unfiltered `/`, a "Đọc tiếp" row above "Recommended for you" with the top 6 Reading entries (stories with `new_count > 0` first). The row is horizontal scroll on mobile, 3 columns on desktop, hidden when empty. (4) Nav dot: `library_update_count()` returns the number of kept stories with `new_count > 0`. A dot (not a number) on the "Thư viện" bottom-nav item and the user-menu entry. Refreshed when the bell's Realtime receives `chapter_published` (`use-notifications.ts:50-84` already subscribes). |
| Expected benefit | One-tap resume from the first screen; the library answers "what's new"; less reliance on the notification list. |
| Scenarios & main flow | 1. Reader R keeps stories S1 (2 new chapters) and S2 (caught up). 2. R opens `/`: "Đọc tiếp" shows S1 first with "2 chương mới", then S2 "Còn 0 · Đang ra". 3. R taps S1's action and the first new chapter opens. 4. After reading it, S1 shows "1 chương mới". 5. The nav dot disappears when no kept story has new chapters. |
| Alternative / error flows | RPC failure → the Home row is hidden (as BR-REC-005 does for recommendations) and the Library shows its ErrorState. A story becomes unreadable → placeholder (BR-LIB-010). Guest → no row, no dot. Suspended author → follows FP-002 policy. |
| Business rules to add/modify | New BR-LIB-013 "Library entry status" (definitions of new, left, caught up and finished, subject to Q-LIB-04). BR-LIB-008 ordering for Following changes to `latest_chapter_at` (presentation; included in BRC-LIB-01 for approval). BR-LIB-009 superseded by paging (FP-015). |
| UI behaviour & validation | Badge text pluralised (vi/en). Counts capped at "99+". The dot has the accessible name "Thư viện, có chương mới". The row is not rendered while loading (skeleton only on the Library page). |
| Technical impact | Frontend: `library` feature (api, model, screen), Home `discover-home.tsx`, `main-shell.tsx`, `user-menu.tsx`. Shared components: `LibraryRow`, `BottomNavItem.badge?: "dot"`. API/RPC: `list_library`, `library_update_count` + SQL tests. Database: index check on `chapters (story_id, status, first_published_at)`. RLS: unchanged (INVOKER). Jobs: none. |
| Dependencies · Risks | FP-012 (single continue rule) first; FP-015 (paging/URL) merges into the same RPC. Risk: query cost for large libraries; mitigate with keyset paging and a per-story lateral count. Risk: the "new" definition is disputed (Q-LIB-04). |
| Priority · Complexity · Class | P2 · M · Maturity |
| Decision required | Q-LIB-04 (definition of "new"); BRC-LIB-01 only for the Following sort order |

Acceptance criteria [Proposed]:
- Given story S kept by R and two chapters of S first published after R's `last_read_at`, When R opens the Library, Then S shows "2 new chapters" and is listed in the "Has new chapters" group.
- Given a member on the unfiltered Home with at least one Reading entry, When the page loads, Then a "Continue reading" row is shown above "Recommended for you". Given no entries, Then no row and no empty placeholder are shown.
- Given R has at least one kept story with new chapters, When any `(main)` page renders on mobile, Then the Library nav item shows a dot with the accessible name "Library, new chapters"; When R has read them all, Then the dot disappears without a reload after the next library or notification refresh.
- Given 120 Reading entries, When R scrolls the tab, Then all 120 are reachable via keyset paging without duplicates.

<a id="fp-048"></a>

### FP-048 — One "Save": unified keep + notify model, Library tabs, intent replay

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-LIBRARY · OBJ-LIB, OBJ-LIST (+ OBJ-AUTHOR wording) · SCR-STORY-01, SCR-LIB-01, SCR-LIST-01-C09, SCR-AUTHOR-01 |
| User problem | Three adjacent keep-buttons with overlapping meanings; "Save" silently means "no updates"; "Theo dõi" means different things for stories and authors; guests lose their action at sign-in. |
| Evidence / hypothesis | Verified (Runtime) `m-story.png` (three buttons + Report over two rows at 390 px). Verified (Code) BR-LIB-001, `story/strings.ts:18-23`, `author/strings.ts:10-12`, `library/strings.ts:9`, BR-REC-004 (save = follow as an interest signal), `story-actions.tsx:21-22` (action not replayed). Hypothesis: readers expect a kept story to tell them about updates. Benchmark: Wattpad "Add to library" + reading lists (Inferred). |
| Current limitation | Separate tables, buttons and tabs; no per-story notify switch outside the Follow button; no followed-authors management. |
| Proposed solution | Staged (§1.6). **Stage A (copy and IA):** story button "Theo dõi" → "Nhận chương mới" (bell); helper line under the action group: "Lưu: giữ trong thư viện · Chuông: báo khi có chương mới"; Library tab "Đang theo dõi" → "Thông báo"; Reading remove toast → "Đã xóa khỏi mục Đang đọc."; author button "Theo dõi tác giả" with toast "Truyện mới của tác giả sẽ hiện ở mục Từ tác giả bạn theo dõi."; Library "Tác giả" tab (FP-019). **Stage B (merged UI):** story page shows one primary toggle "Lưu" / "Đã lưu" and a secondary chevron or the long-press "Tùy chọn lưu" sheet = Notify switch + list toggles + quick-create (today's C09). Library "Đã lưu" = union of saves and follows (with a bell state) and a "Đang nhận thông báo" filter. `?tab=following` is an alias. **Stage C (default):** new `set_story_kept(p_story uuid, p_kept boolean, p_notify boolean default null)` (INVOKER) calls the existing two RPCs in one transaction. Saving with `p_notify` null applies the reader's default (on). Unsave removes both, with Undo. **Intent replay:** guest presses Save, Notify, Vote or Comment → `/login?next=<path>&intent=save:<storyId>` (allow-listed intents). After sign-in, the target screen performs the intent once and shows a toast. |
| Expected benefit | One decision at peak interest; library content matches the reader's mental model; more kept stories notify (Hypothesis, measure follow ratio before and after). |
| Scenarios & main flow | 1. Reader taps "Lưu" → toast "Đã lưu. Bạn sẽ nhận thông báo chương mới." with "Tắt thông báo". 2. Reader opens "Tùy chọn lưu" → switches Notify off, adds the story to "Đam mỹ hay". 3. Library "Đã lưu" shows the story with the bell off. 4. A guest taps "Lưu" → signs in → returns to the story with it saved and the same toast. |
| Alternative / error flows | Follow-only legacy rows appear as Saved + bell on (stage B; no backfill). If the save succeeds and the follow fails in stage B (two calls), roll back both optimistically and show an error; in stage C the RPC is atomic. Intent for a story no longer readable → toast "Không thể lưu truyện này." (`42501`). Intent replay never runs twice (the intent is removed from the URL after use). |
| Business rules to add/modify | **BRC-LIB-01** (stage B tab content, stage C "save implies notify by default"). New BR-LIB-014 "Intent replay after sign-in" (allow-listed intents, once, only on the `next` target). BR-LIB-005 copy changes. No change to BR-LIB-002/003/004 (RPCs, counters). |
| UI behaviour & validation | Single primary button ≥ 44 px. The sheet uses `Switch` for Notify and toggle rows for lists. The `aria-label` of the group is fixed (U-LIB-03). Intent values are validated against `^(save|notify|vote):[0-9a-f-]{36}$`; anything else is ignored. |
| Technical impact | Frontend: `story-actions.tsx`, `add-to-list-button.tsx` (becomes `SaveOptionsSheet`), library tabs, author button copy, a sign-in `next` handler for `intent`. Shared components: none new (Sheet, Switch). API/RPC: stage C `set_story_kept` + SQL test; `list_library` union (FP-047). Database: optional `user_settings.notify_on_save boolean default true` (stage C). RLS: unchanged. Jobs: none. |
| Dependencies · Risks | FP-047 (union read), FP-015 (tab URL), FP-019 (Authors tab), FP-022 (aria). Risk: readers who deliberately saved without notifications get notified after stage C. Mitigation: stage C applies only to **new** saves, and existing save-only rows keep the bell off. Risk: notification volume rises → FP-050 per-story mute ships first. |
| Priority · Complexity · Class | P2 · M (A: S, B: M, C: S) · Maturity |
| Decision required | Q-LIB-03 (blocks stages B and C; stage A can proceed) |

Acceptance criteria [Proposed]:
- Given stage A, When a reader views a story page, Then the bell button reads "Nhận chương mới" and the author page button reads "Theo dõi tác giả"; no behaviour changes.
- Given stage B and a reader with a follow-only row for story S, When they open Library "Saved", Then S is listed with the bell on, and switching the bell off keeps S in Saved.
- Given stage C, When a reader saves a story for the first time, Then a save and a follow are created in one transaction and the toast offers "Turn off notifications".
- Given a guest presses "Save" on story S and signs in, When they land back on S, Then S is saved exactly once and a toast confirms it; reloading the page does not save again.
- Given `/library?tab=following` after stage B, When opened, Then Saved opens filtered to "Notifying me".

<a id="fp-049"></a>

### FP-049 — Two-way comment conversations

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-COMMUNITY · OBJ-CMT, OBJ-NOTI · SCR-CMT-01, SCR-NOTI-01 |
| User problem | A discussion stops after one turn: someone who replied is never told when the original commenter answers, cannot answer a reply in place, and cannot tell when the story's author is the one replying. |
| Evidence / hypothesis | Verified (Code): recipient = `parent.author_id` only (`…001100_comment_reply_notifications.sql:45-66`); "Reply" hidden on replies (`comment-item.tsx:170`); text "<actor> replied to your comment" for everyone (`notifications/strings.en.ts`). Hypothesis: replies are the strongest social reason to return, and author replies especially. |
| Current limitation | One recipient per reply; no reply-to-reply UI; no author marker. |
| Proposed solution | (1) **Reply on replies (UI only):** "Trả lời" on a reply opens the parent's reply composer prefilled with "@<Display name> ". Storage stays one level (`parent_comment_id` = top-level). A new nullable `reply_to_comment_id` (FK to `comments`) records whom it answers, so the deep link can highlight it. (2) **Participant notifications:** the handler notifies (a) the parent author (as today) and (b) the author of `reply_to_comment_id`, plus (c) up to 10 most recent distinct repliers of the thread who have not muted it. It excludes the replier and inactive accounts, and keeps one notification per recipient per reply (dedupe `comment_replied:<reply>` is already per recipient, BR-NOTI-009). Type stays `comment_replied`; payload gains `role: 'parent'|'addressed'|'participant'` and `actor_is_story_author boolean`. (3) **Mute thread:** table `comment_thread_mutes(user_id, comment_id)` (RLS own rows), action in the thread ⋯ menu and in the notification ⋯ menu (FP-050). (4) **Wording:** "Tác giả của <story> đã trả lời bạn: …" when `actor_is_story_author`; "<actor> cũng đã trả lời trong cuộc thảo luận bạn tham gia" for participants. |
| Expected benefit | Conversations continue; visible author engagement; more reasons to return (Hypothesis). |
| Scenarios & main flow | 1. A comments. 2. B replies → A notified (today). 3. A taps "Trả lời" on B's reply → prefilled "@B ". 4. A posts → B notified as `addressed`; earlier participant C is notified as `participant` unless C muted. 5. The story author D replies → A, B and C get "The author replied…". |
| Alternative / error flows | Addressed reply deleted or hidden before posting → the reply posts to the parent, and `reply_to_comment_id` is null (FK `ON DELETE SET NULL`). Rate and spam limits apply unchanged (BR-CMT-017). Recipient switched off "Replies to comments" → suppressed (BR-NOTI-007 unchanged). Thread with > 10 participants → only the 10 most recent are told (anti-spam cap). |
| Business rules to add/modify | **BRC-CMT-01** (Reply action shown on replies; SCR-CMT-01-AC10 wording). **BRC-NOTI-01** (BR-NOTI-004 recipients extended; mute rule). New BR-CMT-022 "Addressed reply" and BR-NOTI-018 "Thread mute". |
| UI behaviour & validation | The prefill is plain text the user may delete (no mention entity). The "@Name" is not linked (avoids user-search scope). Author replies show the FP-025 badge. The thread menu shows "Tắt thông báo cuộc thảo luận này" / "Bật lại". |
| Technical impact | Frontend: `comment-item.tsx`, composer prefill, notification text. Shared components: none. API/RPC: `post_comment` accepts `p_reply_to uuid` (validated: same parent thread). Database: column `comments.reply_to_comment_id`, table `comment_thread_mutes` + RLS. Jobs: handler change in `private.notify_comment_replied` (outbox, pg_cron unchanged). SQL tests for recipients, cap, mute and self-exclusion. |
| Dependencies · Risks | FP-013 (`?comment=` deep link and highlight; the excerpt rule applies to all copies), FP-025 (badge), FP-007 (abuse). Risk: notification volume in busy threads → cap + mute + FP-050 grouping. |
| Priority · Complexity · Class | P2 · M · Maturity |
| Decision required | Q-CMT-04, Q-NOTI-06 (blocked until approved) |

Acceptance criteria [Proposed]:
- Given A's comment with B's reply, When A replies using "Reply" on B's reply, Then the composer is prefilled with "@B ", the new reply is stored under A's comment, and B receives one `comment_replied` notification.
- Given participants B and C in A's thread and C muted it, When A posts a reply, Then B is notified and C is not.
- Given the story owner replies to reader A, When A opens notifications, Then the item reads "The author of <story> replied to you: …".
- Given a thread with 15 distinct prior repliers, When a new reply is posted, Then at most 10 participant notifications plus the parent and addressed recipients are created, and none goes to the replier.

<a id="fp-050"></a>

### FP-050 — Notification inbox you can tune

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-COMMUNITY · OBJ-NOTI (+ OBJ-SET, OBJ-SHELL) · SCR-NOTI-01, SCR-SET-01, SCR-SHELL-01 |
| User problem | As follows grow, the inbox becomes an unscannable text list; batch publishes flood it; the only way to quiet one noisy story is to find and unfollow it; preferences are hidden in Settings. |
| Evidence / hypothesis | Verified (Code): `notifications-screen.tsx:91-122` (text only, no menu, no settings link), BR-NOTI-003 (one per chapter), `notification-bell.tsx:25` (36 px), no user-menu entry. Hypothesis: without per-story control, readers switch off "New chapters" globally (JRN-RDR-10 friction 8). |
| Current limitation | No grouping, filter, mute, unread toggle or quick path to settings. |
| Proposed solution | As SE-NOTI-01: `NotificationRow` with a cover or avatar and a type icon; client-side grouping of same-story `chapter_published`; "All / Unread" filter; per-item ⋯ (Mark unread, Delete [FP-013], Stop notifications for this story, Mute thread [FP-049]); a "Notification settings" link with the `#notifications` anchor; a 44 px bell; a user-menu entry with the unread count; optional desktop popover (P3). |
| Expected benefit | Readers tune notifications instead of abandoning them; faster triage. |
| Scenarios & main flow | 1. Author publishes 3 chapters by schedule. 2. Reader sees one grouped row and opens it at the first unread chapter; all 3 are marked read. 3. Reader mutes a different, noisy story from its row, with Undo. |
| Alternative / error flows | Mute fails → toast and the follow is unchanged. Grouped mark-read fails → the rollback restores all ids. Unknown type → stays ungrouped, generic text (BR-NOTI-016). |
| Business rules to add/modify | None (grouping and filter are presentation; mute = existing unfollow; mark-unread is already permitted by the `read_at` grant). Add BR-NOTI-019 "Grouped display" as documentation of presentation. |
| UI behaviour & validation | Group label pluralised. Group aria label lists the count. The menu trigger is ≥ 44 px. Undo window 5 s. |
| Technical impact | Frontend: notifications feature, settings anchor, user menu. Shared components: `Avatar`, `StoryCover` (thumb). API/RPC: the list query joins actor avatar and story cover; unread filter. Database/RLS/Jobs: none. |
| Dependencies · Risks | FP-013 (delete/retention), FP-011 (links), FP-019 (desktop header for the popover). Risk: client grouping across page boundaries is imperfect; acceptable (documented). |
| Priority · Complexity · Class | P2 (settings link, mute, bell size, empty copy) / P3 (grouping, filter, avatars, popover) · M · Maturity |
| Decision required | none |

Acceptance criteria [Proposed]: SE-NOTI-01-AC01…AC08 apply. In addition:
- Given a signed-in user, When they open the user menu, Then "Notifications" with the unread count is listed and opens `/notifications`.
- Given a grouped row whose mark-read request fails, When the error returns, Then all grouped items return to unread and an error toast shows.
- Given an item of an unknown type between two grouped candidates, When rendered, Then grouping does not span it.

<a id="fp-051"></a>

### FP-051 — Share a story, chapter or reading list

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-PLATFORM / OBJ-SEO (share surface) with D-READING, D-LIBRARY · SCR-STORY-01, SCR-READ-01, SCR-LIST-01 |
| User problem | Readers who want to recommend a story or a list have to copy the URL from the browser bar (impossible inside the future Capacitor app, WBS 7.3 "chia sẻ"); shared lists preview with a generic title. |
| Evidence / hypothesis | Verified (Code): no `navigator.share`/clipboard use in `features/` or `apps/web/src`, apart from the editor test; OG images and canonical URLs exist (WBS 6.6); list metadata generic (BR-LIST-014); U-LIST-01 (quick fix for lists only). Hypothesis: word-of-mouth is the main acquisition channel for fan fiction. |
| Current limitation | No share action anywhere. |
| Proposed solution | `ShareButton` (in `packages/features/src/_shared` or `packages/ui/src/widgets`, router-agnostic) uses `navigator.share({title, url})` when available, else copies to the clipboard and shows the toast "Đã sao chép liên kết.". On mobile (WBS 7.3) the `PlatformProvider` adapter supplies the native share. Placements: story page action group (overflow ⋯ on 390 px), reader toolbar ⋯ and the end-of-chapter card (FP-052), list page header (unlisted/public). URLs are canonical (`/story/{id}/{slug}[/chapterSlug]`, `/lists/{id}`) with no tracking parameters. List pages get a server `generateMetadata` (title, OG image = first readable cover) for unlisted/public lists, keeping `noindex`. |
| Expected benefit | Low-friction recommendations; better link previews. |
| Scenarios & main flow | 1. Reader taps Share on a story → OS share sheet → sends to a friend. 2. The friend opens the canonical URL → story page (guest). 3. A list owner shares an unlisted list → the preview shows the list title. |
| Alternative / error flows | Web Share rejected or cancelled → no toast. Clipboard denied → a dialog with the selectable URL. Private list → visibility prompt (SE-LIST-01-AC02). 18+ story → OG follows the FP-005 / Q-SEO-01 decision. |
| Business rules to add/modify | New BR-SEO rule "List share metadata" (title for unlisted/public only; `noindex` unchanged). No BR change. |
| UI behaviour & validation | Button ≥ 44 px with accessible name "Chia sẻ <title>". Never shown on private lists or drafts. |
| Technical impact | Frontend: `ShareButton`, placements, list `generateMetadata`. Shared components: `ShareButton` + platform adapter method `share()`. API/RPC: none (server read via the anon client respects RLS). Database/RLS/Jobs: none. |
| Dependencies · Risks | FP-005 / Q-SEO-01 (18+ previews), FP-011 (stable chapter links), Q-SEO-02 (indexing stays out of scope). Risk: low. |
| Priority · Complexity · Class | P2 · S · Maturity |
| Decision required | none (Q-SEO-01 only affects 18+ preview content) |

Acceptance criteria [Proposed]:
- Given a browser with Web Share, When the reader presses "Share" on a story page, Then the share sheet opens with the story title and its canonical URL.
- Given a browser without Web Share, When "Share" is pressed, Then the canonical URL is in the clipboard and "Link copied." shows.
- Given an unlisted list, When its URL is fetched by a link-preview bot, Then `og:title` is the list title and `robots` is `noindex`.
- Given a private list, When its owner views the page, Then the Share action asks to change visibility before copying anything.

<a id="fp-052"></a>

### FP-052 — End-of-chapter next step ("caught up" and "finished" cards)

> **Consolidation (DEC-016): merged into [FP-044](#fp-044).** Its acceptance criteria are delivered as part of FP-044; the ID is kept for traceability and must not be implemented separately.

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-READING · OBJ-READ (+ OBJ-LIB, OBJ-REC) · SCR-READ-01 |
| User problem | At the end of the newest chapter, the reader sees a disabled "Chương sau" with no explanation and no way to be told when the next chapter comes. At the end of a finished story there is no next step. |
| Evidence / hypothesis | Verified (Code): `reader-screen.tsx:106-125` (end order: marker, vote, report, comments, nav), `chapter-nav.tsx` (disabled placeholder). Verified (Runtime): `m-reader.png`, `d-reader.png` (guest). `useStoryLibrary` and `StorySummary.status` already exist (`story/hooks/use-story-library.ts`, `discovery/model/story-card.ts:11`). Hypothesis: the end of the latest chapter is the moment of highest intent to follow. |
| Current limitation | No follow or save entry in the reader; story status not shown in the reader. |
| Proposed solution | A `ChapterEndCard` directly after "— Hết chương —" (and before vote/comments, consistent with FP-012 moving prev/next up). Variants: **Next available** → primary "Chương N+1: <title>" (FP-012). **Caught up and ongoing/hiatus** → "Bạn đã đọc đến chương mới nhất" + "Đang ra" or "Tạm ngưng" + the bell toggle "Nhận chương mới" (hidden if already on; shows "Bạn sẽ được báo khi có chương mới ✓") + Share (FP-051). **Finished** (status `completed`, last chapter) → "Hết truyện" + vote reminder + "Truyện tương tự" (top 3 from `similar_stories`, BR-REC-001) + "Lưu vào danh sách". Guests see the same with the sign-in intent (FP-048). |
| Expected benefit | Converts peak intent into a follow; gives finished readers a next story (Hypothesis; measure follows created from the reader). |
| Scenarios & main flow | 1. Reader finishes chapter 4 of 4 (ongoing). 2. Card: "You're caught up · Ongoing" + "Notify me". 3. Tap → follow (stage A) or save + notify (stage C) → toast. 4. Next publish → notification (BR-NOTI-003). |
| Alternative / error flows | Library state fails to load → the card shows without the bell (no error noise). Story status `draft` (owner preview) → no card. 18+ gate → the card renders only after the gate. |
| Business rules to add/modify | None (uses BR-LIB-002/005 behaviour). New presentation rule BR-READ-0xx "Chapter end card variants" (number assigned by the READ owner). |
| UI behaviour & validation | Card ≤ 160 px tall on 390 px; actions ≥ 44 px; `aria-live="polite"` for the follow confirmation. |
| Technical impact | Frontend: `reader-screen.tsx`, new `ChapterEndCard`. Shared components: reuse `Button`, `StoryCard` compact. API/RPC: none (existing hooks; `similar_stories` already used on the story page). Database/RLS/Jobs: none. |
| Dependencies · Risks | FP-012 (nav placement, completion), FP-048 (vocabulary, intent), FP-051 (share), FP-022. Overlaps the READ agent's SE-READ-01 (see §7). |
| Priority · Complexity · Class | P2 · S · Maturity |
| Decision required | none |

Acceptance criteria [Proposed]:
- Given a signed-in reader who does not follow story S (ongoing) and is on its latest published chapter, When they reach "End of chapter", Then a card says they are caught up and offers "Notify me of new chapters"; pressing it follows S and the card confirms it.
- Given the reader already follows S, When the card renders, Then it shows the confirmation state and no button.
- Given story S is `completed` and the reader is on its last chapter, When they reach the end, Then the card shows "The end" with up to 3 similar stories.
- Given a guest on the latest chapter, When they press "Notify me", Then they are sent to sign in and, on return, S is followed once (FP-048 intent replay).

---

<a id="fp-053"></a>

### FP-053 — Story workspace: one header and role-aware tabs for every story tool

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-STUDIO · OBJ-STM (frame), OBJ-CHM, OBJ-TEAM, OBJ-STAT · SCR-STM-03, SCR-CHM-01, SCR-TEAM-01, SCR-STAT-01 (+ links from SCR-STM-01, SCR-EDT-01, SCR-STORY-01, SCR-READ-01) |
| User problem | Authors cannot move between Details, Chapters, Team and Stats of one story without going back to the Studio list; two screens don't name the story; editors hit a dead end; team members cannot jump from their public story to the Studio. |
| Evidence / hypothesis | Verified (Code): §3.0 matrix; `story-form-screen.tsx:92-102`, `chapter-manager-screen.tsx:123-128`, `team-screen.tsx:96-101`, `story-stats-screen.tsx:68-75`; no `layout.tsx` under `apps/web/src/app/(main)/studio`. Documented: WBS §1.2 `(studio)/studio/` area (`docs/WBS.md:64`). Findings U-STAT-01. Benchmark: Wattpad's story editing has tabs "Story details / Table of contents" on one page (Inferred from public product knowledge). |
| Current limitation | Each screen fetches the story itself (`useStoryForEdit` in 3 screens) and renders its own header/back link; widths 576/672/768 px differ. |
| Proposed solution | (1) Router-agnostic `StoryWorkspace` component in `packages/features/src/studio/components/story-workspace.tsx`: compact header (cover thumb, title, role badge, reader-visibility chip from FP-054, "View story page" icon link) + tab bar (Chapters · Details · Team · Stats, later Comments FP-057), tabs filtered by role per BR-TEAM-010 (Stats hidden for editors). (2) Next.js route group `apps/web/src/app/(main)/studio/story/[id]/(workspace)/layout.tsx` wrapping the existing pages `page.tsx` (Details), `chapters`, `team`, `stats` — URLs unchanged; the editor/history/preview routes stay outside the group. (3) `generateMetadata` with the story title for the tab title (server client with session; fallback to static title). (4) Workspace-level banners: deleted (FP-018), removed by moderator (FP-006). (5) Team-only link "Open in Studio" on SCR-STORY-01 and SCR-READ-01 when `story_role` is not null. (6) Studio card title → `/studio/story/{id}/chapters`. |
| Expected benefit | One click between tools; story always named; fewer dead ends; consistent widths (content `max-w-3xl`). |
| Scenarios & main flow | 1. Author opens a story from Studio → lands on Chapters tab with header. 2. Taps "Stats" tab → stats load, header persists, no story refetch (shared query key). 3. Taps "View story page" → public page; there "Open in Studio" returns to the workspace. 4. Editor opens the workspace → sees Chapters, Details (read-only), Team (read-only); no Stats tab. |
| Alternative / error flows | Story not found / no role → existing "Story not found" state rendered by the layout once (not per tab). Malformed id → not-found per FP-004. Load error → `ErrorState` with retry in the layout. Editor deep-links to `/stats` → existing "You can't view these statistics" state inside the frame. |
| Business rules to add/modify | New BR-STM-026 (Proposed): "Every story-level Studio page shows the story title and the role-filtered tool tabs; a tool a role cannot use is not shown." No approved rule changed. |
| UI behaviour & validation | Mobile 390: header 56 px (thumb 32 px, title truncate, chip below title), tabs as horizontally scrollable segmented control (≥ 44 px), sticky under the app header. Tablet 768: same, tabs not scrolling. Desktop 1280: left sidebar 240 px (cover 2:3, title, chips, vertical tabs), content column `max-w-3xl`. Active tab `aria-current="page"`; tabs are links (not `role=tablist`) because they change URL. |
| Technical impact | Frontend: new component + 4 screens drop their own header/back link. Shared components: `Tabs` styling reused for links, `StoryCover`, `Badge`. API/RPC: none (reuse `useStoryForEdit`). Database: none. RLS: none. Jobs: none. Web: route group + layout + `generateMetadata`. |
| Dependencies · Risks | FP-054 (chip), FP-004 (not-found). Risk: Next layouts persist across tab navigation — fine; mobile Vite app must mount `StoryWorkspace` in its own router (DEC-001 keeps it router-agnostic). Coordinate with `studio-write` agent for the editor's back link label. |
| Priority · Complexity · Class | P2 · M · Maturity |
| Decision required | none |

Acceptance criteria [Proposed]:
- Given I own story S, When I open `/studio/story/S/chapters`, Then the header shows S's title and cover And tabs Chapters, Details, Team, Stats are shown with Chapters marked current.
- Given I am an editor on S, When I open any workspace URL of S, Then the Stats tab is not shown And Details renders read-only.
- Given I am on the Stats tab, When I select the Team tab, Then the URL becomes `/studio/story/S/team` And the story request is not repeated (served from cache).
- Given I am a collaborator viewing S's public story page, Then an "Open in Studio" link is shown; Given I am any other reader, Then it is not.
- Given S is soft-deleted, When I open any tab, Then one banner "This story is deleted" (+ Restore for the owner) is shown above the tab content.

<a id="fp-054"></a>

### FP-054 — Reader-visibility status, go-live checklist and change-impact warnings

| Field | Value |
| --- | --- |
| Type | Enhancement (closes a confirmed workflow break) |
| Domain · object · screens | D-STUDIO · OBJ-STM · SCR-STM-01, SCR-STM-02, SCR-STM-03, workspace header (FP-053); publish confirmation in SCR-EDT-01 via FP-034 |
| User problem | Authors cannot tell whether readers can open their story; by default they publish chapters into a private story that nobody else can see, and they can hide a live story by changing status/visibility without warning. |
| Evidence / hypothesis | Verified (Code): default private+draft (`studio/model/story-form.ts:21-32`, `packages/validation/src/inputs.ts:47`); first publish keeps visibility (`20261103000200_publish_chapter_rpc.sql:193`); notifications only for readable stories (`20261103000300_outbox_worker_and_cron.sql:50`); reader access predicate (`auth_and_rls.sql:93-112`); no visibility mention in the editor. U-STM-01. Hypothesis: a large share of first-time authors keep the default. |
| Current limitation | Visibility and status are two independent selects; the Studio row shows them as separate badges; nothing combines them with "has a published chapter", deletion and moderator removal. |
| Proposed solution | (1) Pure function `readerAccess(story, chapters)` in `features/studio/model/reader-access.ts` returning `{ state: 'live' | 'link_only' | 'team_only' | 'deleted' | 'removed', reasons: ('private' | 'draft_status' | 'no_published_chapter' | 'deleted' | 'removed')[] }`, mirroring `can_read_story`/`can_read_chapter` (contract test against the SQL predicate like the storage-key contract test, WBS 3.3). (2) Chip in workspace header and Studio card. (3) **Go-live panel** in Details › Audience: blocking items with one-click fixes ("Make public" / "Make unlisted" → visibility; "Write chapter 1"; "Restore"), and non-blocking recommendations (cover, synopsis ≥ 50 chars, category, ≥ 1 tag, author bio/avatar → link to `/me/edit`). (4) **Impact warnings**: when a pending change would move `live`/`link_only` → `team_only`, show inline text + confirm with `story_stats.followers` and `saves` counts. (5) Feed FP-034's first-publish dialog: if the story is `team_only`, the dialog says so and offers "Publish and make public" (owner/co-author) or "Ask the owner" (editor). |
| Expected benefit | First chapters reach readers; no accidental hiding; better metadata quality for discovery. |
| Scenarios & main flow | 1. New author creates story (private draft), writes chapter 1, presses Publish → FP-034 dialog: "Only your team can read this story. Publish and make it public?" → chooses it → chapter published, visibility public, status ongoing → chip "Readers can see it". 2. Author opens Details of a live story, switches Status to Draft → warning "48 followers… will lose access" → Save → confirm → saved. |
| Alternative / error flows | Editor (cannot change visibility, BR-TEAM-010) → panel shows reasons without fix buttons + "Ask the owner". Visibility update fails → existing error mapping; chip unchanged. Removed by moderator → only "Removed by a moderator" reason, no fixes (FP-006). Mature story → no extra blocking (18+ gate is reader-side, OBJ-MAT). |
| Business rules to add/modify | New BR-STM-027 (Proposed): "The Studio states a story's reader access using the same predicate as RLS; a change that removes reader access is confirmed with its impact." Defaults (BR-STM-006) and first-publish behaviour (BR-STM-020) **unchanged**; whether first publish should *offer* public is UI only. Q-STM-03 asks whether the default itself should change. |
| UI behaviour & validation | Chip colours from tokens (success/neutral/warning/destructive) with text, never colour alone. Panel: list with check icons and buttons ≥ 44 px on mobile. Warning text under the select (`aria-describedby`), confirm via `ConfirmDialog` (destructive style when hiding). |
| Technical impact | Frontend: model + chip + panel + warnings. Shared components: `Badge`, `ConfirmDialog`. API/RPC: none (needs published-chapter count: from FP-055 summary RPC or a `chapters` head count). Database: none. RLS: none. Jobs: none. Tests: contract test vs SQL predicate. |
| Dependencies · Risks | FP-034 (dialog), FP-006 (removed state), FP-053 (header), FP-055 (counts). Risk: predicate drift — mitigated by contract test. |
| Priority · Complexity · Class | P1 · S/M · MVP |
| Decision required | none for the proposal; Q-STM-03 only for an optional default change |

Acceptance criteria [Proposed]:
- Given a private story with 1 published chapter, Then its chip reads "Only your team can see it" And the go-live panel lists "Visibility is Private" with a "Make public" button.
- Given a public story with status Draft and no published chapter, Then the panel lists both "Status is Draft" and "No published chapter yet".
- Given a public ongoing story with ≥ 1 published chapter and 48 followers, When I select Private and press Save, Then a confirmation states that 48 followers will lose access And nothing is saved until I confirm.
- Given I am an editor on a private story, When I press Publish on chapter 1, Then the confirmation says only the team can read the story And offers no visibility change.
- Given the SQL predicate in `can_read_story`, When the contract test runs, Then `readerAccess` agrees with it for every combination of visibility × status × deleted × has-published-chapter.

<a id="fp-055"></a>

### FP-055 — Studio home as an author dashboard (onboarding, health, next action)

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-STUDIO · OBJ-STM (+ STAT, CHM read-only) · SCR-STM-01 |
| User problem | New authors get an empty list with no guidance; experienced authors cannot see which story needs attention, how each is doing, or jump back into the chapter they were writing. |
| Evidence / hypothesis | Verified (Code): `studio-screen.tsx:31-152`, `studio.api.ts:11-39`, `studio-story.ts:53-60`, chapter count includes drafts/deleted; no continue-writing link. Q-STM-02 (pagination). Hypothesis: authors with > 5 stories or shared stories lose time locating work. |
| Current limitation | Two PostgREST queries return story columns + `chapters(count)`; everything else requires opening each story. |
| Proposed solution | (1) RPC `studio_story_summaries(p_cursor_updated_at, p_cursor_id, p_limit)` (SECURITY INVOKER, keyset pagination answers Q-STM-02): per story role, chapter counts by state (published/draft/scheduled/archived; deleted excluded), `last_published_at`, `next_scheduled_for`, `schedule_failed` (FP-010 when present), most recently edited live chapter (id, title, updated_at, updated_by name), `story_stats` (reads, followers) for owner/co-author only, `removed_by_moderation` (FP-006). (2) Card redesign, toolbar, account strip and onboarding empty state (SE-STM-01). (3) "Needs attention" filter = `readerAccess` issues (FP-054) ∪ failed schedule ∪ removed. |
| Expected benefit | Faster return to writing; problems surfaced proactively; correct chapter counts; scales past dozens of stories. |
| Scenarios & main flow | 1. Author opens Studio → cards with counts/figures → taps "Continue writing · Chương 13" → editor. 2. Author filters "Needs attention" → sees a story whose schedule failed → opens Chapters tab. 3. New member opens Studio → onboarding empty state → "Write your first story". |
| Alternative / error flows | RPC error → existing `ErrorState` + retry. Partial data (no stats for editor) → figures omitted, not zero. Pagination "Load more" error → FP-020 pattern. |
| Business rules to add/modify | BRC-STM-01 (BR-STM-003 row content: "n chapters" → published/draft counts; figures for owner/co-author). BR-STM-002 order unchanged (updated desc) as default sort. |
| UI behaviour & validation | See SE-STM-01. Search is client-side over loaded pages (title, accent-insensitive with existing `search_normalize`-equivalent in utils) until the list exceeds one page, then server-side `p_query`. |
| Technical impact | Frontend: card, toolbar, empty state, hooks. Shared components: `EmptyState` (action), `DropdownMenu`, `StatPill`, `InfiniteList`. API/RPC: `studio_story_summaries`. Database: none (indexes on `chapters(story_id, …)` exist; verify plan). RLS: invoker; editors excluded from stats inside the function. Jobs: none. |
| Dependencies · Risks | FP-054, FP-010, FP-006 for attention flags (degrade gracefully when absent). Risk: N+1 inside the RPC — use lateral joins and limit 20 per page. |
| Priority · Complexity · Class | P2 · M · Maturity |
| Decision required | none (Q-STM-02 answered by keyset pagination; confirm page size 20) |

Acceptance criteria [Proposed]:
- Given I own 25 stories, When I open Studio, Then 20 cards load And "Load more" loads the remaining 5 in `updated_at` order.
- Given story S where I last edited "Chương 13" (live), Then S's primary action opens `/studio/story/S/chapter/<id of Chương 13>`.
- Given a story with a failed scheduled publish (FP-010), When I choose "Needs attention", Then that story is listed with "Scheduled publish failed".
- Given I am an editor of S, Then S's card shows no reads or followers.
- Given I have no stories, Then the empty state's "Write your first story" button opens `/studio/new`.

<a id="fp-056"></a>

### FP-056 — Audience insights: lifetime totals, followers trend, fair retention

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-STUDIO · OBJ-STAT · SCR-STAT-01 (+ figures reused by FP-055) |
| User problem | Authors see only range totals of reads/likes/comments; they cannot see followers or saves, whether the story is growing, or which recent chapter really loses readers. |
| Evidence / hypothesis | Verified (Code): `story-stats-screen.tsx:111-124` (3 tiles), `daily-chart.tsx:17-31` (reads only, no axis), `20261104002100_author_stats.sql:59-60` (lifetime-vs-lifetime retention), `story_stats` columns (`init_schema.sql:320-328`), `story_follows.created_at` (`:220-225`). Verified (Runtime): public story page shows a followers count the author's stats page does not (`rt2/shots/m-story.png`). |
| Current limitation | Two RPCs: per chapter (lifetime counters) and daily (reads, votes, comments; ≤ 90 days). |
| Proposed solution | (1) Overview tiles from `story_stats` (all-time reads, likes, comments, followers, saves). (2) Extend `author_story_daily` with `new_followers` (count of `story_follows.created_at` per UTC day; counts only, never identities — Q-STAT-02) and allow `p_days` up to 180 so the client can compute "vs previous period" for 7/30/90 (reads beyond 90 days are purged → for 90-day range the comparison is shown only when data exists, BR-STAT-006). (3) `author_chapter_stats` returns `first_published_at`; retention shown as "Too early" when the chapter is < 7 days old (BRC-STAT-01). (4) Chart: metric switch, date labels, "Show as table" (with FP-022). (5) `?range=` in URL. |
| Expected benefit | Actionable insight (growth, drop-off), aligned with what readers see publicly. |
| Scenarios & main flow | 1. Author opens Stats → overview → selects 30 days → sees "+20% reads vs previous 30 days" → switches chart to New followers → sees a spike on publish day. 2. Checks By chapter → newest chapter shows "Too early" instead of 4%. |
| Alternative / error flows | Comparison window partly outside 90-day read retention → comparison hidden with note. RPC 22023 for days > 180 → client never sends. Editor → unchanged "can't view". |
| Business rules to add/modify | BRC-STAT-01 (BR-STAT-003 retention display). Extension of BR-STAT-004 (new series, window ≤ 180 days for comparison). BR-STAT-001 access unchanged. |
| UI behaviour & validation | See SE-STAT-01. Percentages rounded to whole numbers; "—" when the previous value is 0. |
| Technical impact | Frontend: overview, comparison, chart, table toggle. Shared components: `StatPill`, `Tabs`. API/RPC: alter two functions (backward-compatible extra columns). Database: index `story_follows (story_id, created_at)` replacing/complementing `idx_story_follows_story (story_id)` (`init_schema.sql:363`). RLS: none (SECURITY DEFINER role checks kept). Jobs: none. |
| Dependencies · Risks | Q-PROG-02 (team reads), Q-STAT-01, Q-STAT-02, FP-022. Risk: follower series reveals timing of individual follows on tiny stories — acceptable as counts only; confirm in Q-STAT-02. |
| Priority · Complexity · Class | P3 · M · Maturity |
| Decision required | Q-STAT-02 (follower identities or counts only); BRC-STAT-01 approval |

Acceptance criteria [Proposed]:
- Given `story_stats` reads 1,240 and followers 48, When Stats opens, Then the overview shows 1,240 reads and 48 followers.
- Given 3 follows of S on 2026-11-02 (UTC), When the 7-day chart shows New followers, Then 2026-11-02 has the value 3.
- Given chapter 12 first published 2 days ago, Then its retention shows "Too early"; Given it was published 10 days ago, Then the percentage is shown.
- Given range 30 with 120 reads now and 100 in the previous 30 days, Then the Reads tile shows "+20%".

<a id="fp-057"></a>

### FP-057 — Reader conversations: a comments tab for authors

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-STUDIO / D-COMMUNITY · OBJ-CMT (read model), OBJ-STM (frame) · new workspace tab "Comments" (FP-053); reuses SCR-CMT-01 item component |
| User problem | Authors must open each chapter in the reader to find new comments; they cannot see what is unanswered or hidden across the story. |
| Evidence / hypothesis | Verified (Code): only in-reader threads (`comments/components/comment-thread.tsx`), author moderation in the item menu (BR-CMT-014), no list RPC by story; authors are not notified of new comments (`notification.ts:6-12`). Benchmark: AO3 "Inbox" lists comments on your works; Royal Road has an author comments overview (Inferred, public product knowledge). Hypothesis: response rate drives reader engagement (J3). |
| Current limitation | `list_comments` is per chapter (and per block). |
| Proposed solution | RPC `author_story_comments(p_story_id, p_filter, p_cursor_created_at, p_cursor_id, p_limit)` (SECURITY DEFINER; caller must have `can_moderate_comments` on the story's chapters — owner/co-author; editors per Q-CMT-03) returning cards via the existing `comment_to_card` plus chapter number/title/slug and `has_author_reply` (any reply by a team member). Filters: All · Unanswered (top-level, no team reply) · Hidden. UI: list grouped by day; each item shows chapter label, paragraph excerpt if inline, actions Reply (inline composer reusing `post_comment`), Hide/Unhide (`set_comment_hidden`), "Open in chapter" (deep link `#b-<id>`/`#comments`). Count badge on the tab = unanswered in last 7 days. |
| Expected benefit | Faster replies and moderation; one place to keep up with readers. |
| Scenarios & main flow | 1. Author opens Comments tab → Unanswered (5) → replies to two inline → items leave the filter. 2. Hides an abusive comment → moves to Hidden; can unhide (author-hidden only). |
| Alternative / error flows | Moderator-hidden comment → shown in Hidden without Unhide (BR-CMT-013). Reply rate-limited → existing abuse messages (BR-ABU). Story deleted → tab read-only. Editor → per Q-CMT-03 (default: tab hidden). |
| Business rules to add/modify | New BR-CMT-0xx (Proposed): "Owner and co-authors can list every listable comment of their story across chapters; 'Unanswered' = visible top-level comment with no reply from the story team." No change to listability rules (BR-CMT-001/013/014). |
| UI behaviour & validation | Infinite list (`InfiniteList`, 20 per page) with FP-020 error pattern; composer validation as SCR-CMT-01; 44 px actions on mobile; desktop two-pane (list + chapter context excerpt) at ≥ 1024 px. |
| Technical impact | Frontend: tab screen in `features/studio` (or `features/comments/screens/author-comments-screen.tsx`). Shared components: `CommentItem`, `InfiniteList`. API/RPC: one RPC. Database: index `comments (chapter_id, created_at)` exists (used by stats); consider `(story)` via chapters join. RLS: none new (definer with explicit role check). Jobs: none. |
| Dependencies · Risks | FP-053 (tab), FP-025 (Author badge), FP-026 (notification type "comment on my story" links here). Risk: large stories — keyset pagination by `created_at, id`. |
| Priority · Complexity · Class | P3 · M · Maturity |
| Decision required | Q-CMT-03 (scope for editors; cross-story inbox later) |

Acceptance criteria [Proposed]:
- Given 3 top-level comments on chapters 1–3, one of which has a reply from a co-author, When the owner opens Comments › Unanswered, Then exactly 2 items are listed with their chapter labels.
- Given an item, When the owner hides it, Then it disappears from All and appears in Hidden with "Unhide"; Given a moderator-hidden item, Then no "Unhide" is offered.
- Given a reader who is not on the team, When they call `author_story_comments`, Then the request is refused (42501 or PT404).
- Given 45 comments, Then the first 20 load And scrolling loads the next pages without duplicates.

<a id="fp-058"></a>

### FP-058 — Focused, mobile-ready writing workspace

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-STUDIO · OBJ-EDT (+ OBJ-SHELL frame) · SCR-EDT-01, SCR-HIST-02 (frame), SCR-HIST-01 (frame) |
| User problem | Writing a chapter on a phone fights the layout: toolbar scrolls away and wraps, keyboard + header + bottom nav leave little text visible, save status and Publish sit under the whole chapter, targets are < 44 px; on desktop the editor is a left-aligned column inside a browsing shell with no context and no focus option. |
| Evidence / hypothesis | Verified (Code): `chapter-editor-screen.tsx:290-390` (order, no sticky, no H1), `editor-toolbar.tsx:86` (`flex-wrap`), `button.tsx:22-25` (32–36 px), `app-shell.tsx:24-29`, `bottom-nav.tsx:47`, `tokens.css:74` (44 px rule). Documented: WBS §1.2 planned a separate `(studio)` group (`docs/WBS.md:64`); WBS 7.3 "touch target ≥ 44px", keyboard integration. Hypothesised: share of authors writing on phones (benchmark: Wattpad's writer flow is mobile-app-first — not verified here). Runtime: not observed (signed-in). |
| Current limitation | One generic frame (`MainShell`) for reading-oriented browsing and for writing. |
| Proposed solution | (1) Studio writing frame: `AppShell` variant without bottom nav, used by SCR-EDT-01/HIST-01/HIST-02 (route group `(studio)` per WBS §1.2, or a layout flag). (2) Sticky action bar with context (story · chapter n), status chip, Preview, ⋯ menu, Publish ▸ (opens the publish sheet). (3) Toolbar: sticky ≥ md; < md docked above the keyboard via `visualViewport` (web) / Capacitor Keyboard (WP 7.3), single scrollable row of 44 px buttons. (4) Writing column centred at `--reader-measure`; placeholder on empty body. (5) Focus mode. (6) Right rail ≥ lg (publish state, stats, last checkpoint). (7) Prev/Next chapter + "Write next chapter" in ⋯ and in the publish success toast. |
| Expected benefit | Comfortable phone writing, always-visible save state (trust), one-tap path to publish, less scrolling, WCAG target size. |
| Scenarios & main flow | 1. Author opens a chapter on a phone; action bar shows "Saved". 2. Taps into the body; keyboard opens; formatting bar docks above it. 3. Types; chip goes Unsaved → Saving… → Saved. 4. Taps Publish ▸ → bottom sheet (FP-060 review) → publishes. 5. Toast "Chapter published · Write next chapter" → next draft opens. |
| Alternative / error flows | Offline: chip "Offline – kept on this device"; Publish ▸ disabled with reason. Conflict: chip red + banner (BR-EDT-013 unchanged). `visualViewport` unsupported: toolbar falls back to sticky top. Focus mode + conflict: focus exits automatically to show the alert. |
| Business rules to add/modify | BRC-SHELL-01 (studio writing screens without bottom nav). New BR-EDT (Proposed): "Save state is visible without scrolling on every breakpoint." No change to save/publish rules. |
| UI behaviour & validation | Chip text = existing `editorText.status.*` (plus offline variant); `aria-live` only on chip state; toolbar buttons keep `onMouseDown preventDefault` (focus stays in text) and gain `aria-keyshortcuts`; roving tabindex (FP-022). Focus-mode flag in localStorage (try/catch). |
| Technical impact | Frontend: editor screen split (`EditorActionBar`, `DockedToolbar`, `PublishSheet`), `useVisualViewport` hook in `features/_shared`. Shared components: `AppShell` prop to omit bottom nav / `StudioShell`; `Sheet`, `DropdownMenu`, `Tooltip`. API/RPC: none (next chapter uses existing chapter list query + `create_chapter`). Database · RLS · Jobs: none. Mobile app (WP 7.1) reuses the screen via `PlatformProvider`. |
| Dependencies · Risks | FP-003 (exits), FP-060 (sheet content), FP-022. Risk: iOS Safari `visualViewport` quirks (toolbar jitter) — mitigate with fallback; Vietnamese IME composition must not be broken by the docked bar (needs device test, WBS 3.5 gap). |
| Priority · Complexity · Class | P2 (P1 if Q-EDT-06 = mobile web authoring at launch) · M · Maturity |
| Decision required | BRC-SHELL-01; Q-EDT-06 (priority). |

Acceptance criteria [Proposed]
- Given a 390 px phone with the keyboard open, When the cursor is in the body, Then the formatting bar is directly above the keyboard, no bottom navigation is visible, and all toolbar targets are ≥ 44×44 px.
- Given any breakpoint, When an autosave changes state, Then the status is visible in the action bar without scrolling.
- Given the author enables focus mode, When they reload the editor on the same device, Then focus mode is still on and can be left with Esc or "Exit focus".
- Given a chapter was published, When the author chooses "Write next chapter", Then the next chapter's editor opens (or the create-chapter form if there is none).

<a id="fp-059"></a>

### FP-059 — Draft checkpoints (server-side draft history)

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-STUDIO · OBJ-HIST (+ OBJ-EDT) · SCR-HIST-01, SCR-EDT-01 |
| User problem | Only published versions are kept. An author drafting for weeks, a co-author who overwrote a passage, or an author who restored the wrong version or pressed "Load latest version" after a conflict has no way back to an earlier unpublished state; the device backup is per browser and single-slot. |
| Evidence / hypothesis | Verified (Code): `chapter_drafts` holds one row per chapter (BR-EDT-008), `chapter_versions` only on publish (BR-EDT-020); restore overwrites with no undo and deletes the backup (BR-HIST-006, F-HIST-01); Q-HIST-01 open. Benchmark (not verified here): Google Docs version history; Wattpad's writer offers part version history of saves. |
| Current limitation | No server-side record between publishes; undo stack is lost on reload. |
| Proposed solution | Table `chapter_draft_checkpoints(id, chapter_id, revision, title, body jsonb, word_count, kind ∈ auto/named/before_restore/before_reload, label, created_by, created_at)`; RLS read/insert = `can_edit_chapter` + `is_active_account()`; no UPDATE; DELETE by owner/co-author for named ones (or none, per Q-HIST-03). Writes: RPC `create_draft_checkpoint(chapter, expected_revision, kind, label)` copies the **saved** draft server-side (no body upload). Automatic: client calls it at most every 30 min of active editing and on the first save of a session; always before history restore (BRC-HIST-01) and before "Load latest version". Named: ⋯ → "Save checkpoint…" (label ≤ 80 chars). Retention job (pg_cron, existing pattern): keep all named + last N automatic (N per Q-HIST-03). UI: "Checkpoints" tab in SCR-HIST-01 reusing viewer, Compare (`diffBlocks`) and Restore; "Last checkpoint 12 min ago" in the editor rail/⋯. |
| Expected benefit | Undo across days and devices; fearless restore and conflict reload; teams can recover a collaborator's overwrite. |
| Scenarios & main flow | 1. Author writes; 30 min later an automatic checkpoint is created from the saved draft. 2. Next day they delete a scene and autosave saves it. 3. Opens History → Checkpoints → picks yesterday's → Compare with current draft shows the scene as "Removed". 4. Restores → current draft first saved as `before_restore` checkpoint → draft replaced. |
| Alternative / error flows | Checkpoint RPC fails (offline) → silently retried at next save; never blocks writing. Restore conflict → same messages as BR-HIST-009. Draft unchanged since last checkpoint → RPC no-ops (dedupe on `revision`). |
| Business rules to add/modify | New BR-HIST-010 (checkpoint creation, dedupe by revision, never published, team-only), BR-HIST-011 (retention). BRC-HIST-01 (restore first checkpoints the replaced draft — modifies BR-HIST-006 expected behaviour). BR-HIST-002 untouched (checkpoints are not versions; not immutable-published). |
| UI behaviour & validation | Label trimmed 0–80 chars; list shows kind icon, label/"Automatic", time, author, words; Restore confirm text explains current draft will be checkpointed. |
| Technical impact | Frontend: history tabs, editor ⋯ action, `useCreateCheckpoint`. API/RPC: `create_draft_checkpoint`, `list_draft_checkpoints` (or table select). Database: new table + index `(chapter_id, created_at desc)`; storage ≈ body size × N per chapter (bounded by N and 2,000-block limit). RLS: as above + tests. Jobs: daily retention purge (pg_cron). |
| Dependencies · Risks | FP-003 (revision displayed), Q-HIST-01, Q-HIST-03. Risk: storage growth (mitigated by N and dedupe); privacy of removed text kept server-side (retention + account deletion must purge, WBS Q7). |
| Priority · Complexity · Class | P2 · M (L with retention UI) · Maturity |
| Decision required | Q-HIST-01 (existing), Q-HIST-03 (new), BRC-HIST-01. |

Acceptance criteria [Proposed]
- Given an author edited for 35 minutes with saves, When the next save succeeds, Then exactly one automatic checkpoint with that revision exists, and none is created if the revision equals the last checkpoint's.
- Given the author restores version 2, When the restore succeeds, Then a `before_restore` checkpoint holds the replaced draft (same title, body, block ids) and restoring that checkpoint returns the draft to its previous state.
- Given a member without a role on the story, When they query checkpoints of its chapters, Then no rows are returned (RLS test).
- Given more than N automatic checkpoints for a chapter, When the retention job runs, Then the oldest automatic ones beyond N are deleted and named ones are kept.

<a id="fp-060"></a>

### FP-060 — Pre-publish review: audience, changes and checks

> **Consolidation (DEC-018):** the audience part reuses the reader-visibility model of [FP-054](#fp-054); the first-publish confirmation of FP-034 is delivered here.

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-STUDIO · OBJ-EDT (+ OBJ-HIST diff, OBJ-NOTI audience, OBJ-CMT anchors) · SCR-EDT-01, SCR-HIST-02 |
| User problem | Publishing is one click with no idea of consequences: the first publish irreversibly notifies all followers and makes the story "ongoing"; a republish may hide reader paragraph comments (removed blocks), may be identical, or may fail on a picture from another story; publishing while the story is private silently uses up the follower announcement. |
| Evidence / hypothesis | Verified (Code): U-EDT-05, F-EDT-06, BR-EDT-016/020/025; comments anchor to `chapter_blocks` (`20261104000700_comments.sql:222-225`) — Inferred that comments on blocks absent from the live version are unreachable in the reader (reader renders live blocks only, BR-READ-*); `first_published_at` set regardless of story visibility (`publish_chapter_rpc.sql:163,189`) while BR-NOTI-003 skips private stories — Inferred consumption. `story_stats.followers` available (`20261104000800_story_follows_saves.sql:27-37`). |
| Current limitation | Publish panel shows state and buttons only; no diff vs live, no audience, no pre-flight checks. |
| Proposed solution | A **review step** inside the Publish sheet (FP-058), also opened from Preview: (1) *What happens*: first publish → "≈{followers} followers will be notified; the story becomes Ongoing"; private story → warning "Followers will not be notified now **or later**" (until Q-NOTI-04 decides otherwise); republish → "Silent update: readers see the new text on next load". (2) *What changes* (republish): summary from `diffBlocks(liveVersionBlocks, draftBlocks)` — "3 changed, 1 added, 2 removed" + link "See changes" (opens SCR-HIST-01 Compare with base = live). (3) *Checks* (blocking ✕ / warning !): ✕ title blank / > 200; ✕ image key outside this story (client check with `is_valid_storage_key` convention, BR-EDT-016); ! 0 words (or ✕ per Q-EDT-01); ! "2 removed paragraphs have 14 reader comments that will no longer be shown"; ! identical to live (FP-034 dedupe: button becomes "Nothing to publish"). (4) Actions: Publish now (primary) · Schedule… · Cancel. One read RPC `publish_preview(chapter_id)` returns followers count, story visibility/status, live version id, `first_published_at`, and per-block comment counts for blocks of the live version missing from the saved draft (SECURITY DEFINER, `story_role` not null). |
| Expected benefit | No accidental announcements; reader discussions protected; fewer publish-time errors; FP-034 first-publish confirmation delivered with real information. |
| Scenarios & main flow | 1. Author taps Publish ▸. 2. Sheet saves first (`ensureSaved`, BR-EDT-018), then loads `publish_preview`. 3. Shows audience, changes, checks. 4. Author taps Publish now → existing `publish_chapter(expected_revision)`. 5. Toast + "Write next chapter". |
| Alternative / error flows | Preview RPC fails → sheet still allows publishing with a notice "Couldn't load the summary" (never blocks on a read). Blocking check → Publish disabled with reason and "Fix" link (focuses the title / selects the image block). Save-first fails → existing message (U-EDT-01 copy fix in FP-034). |
| Business rules to add/modify | New BR-EDT (Proposed) "Publish review": informational; the server remains the authority (BR-EDT-019 unchanged). No BRC unless Q-EDT-01 makes 0-word chapters non-publishable (then BRC-EDT via FP-034) or Q-NOTI-04 re-arms announcements. |
| UI behaviour & validation | Sheet sections collapsible on mobile; follower count shown approximately ("about 1.2k") via `formatCount`; comment warning lists the paragraphs (first 80 chars) with a link to each in the editor. |
| Technical impact | Frontend: `PublishReview` in editor feature, reuse `diffBlocks` from history model (move to shared model or import via `history/index.ts`). API/RPC: `publish_preview` (read-only, SQL test for role/visibility). Database: none (reads `story_stats`, `chapters`, `chapter_version_blocks`, `comments`). RLS: definer function with `story_role` check. Jobs: none. |
| Dependencies · Risks | FP-058 (sheet), FP-034 (dedupe, copy), Q-EDT-01, Q-NOTI-04. Risk: comment count query cost — bounded by the blocks of one chapter; `idx_comments_block (block_id, created_at, id)` already exists (`20261103000000_init_schema.sql:357`). |
| Priority · Complexity · Class | P2 · M · Maturity (first-publish part MVP) |
| Decision required | none to start; Q-EDT-01 and Q-NOTI-04 refine checks. |

Acceptance criteria [Proposed]
- Given a never-published chapter of a public story with 120 followers, When the author opens the publish review, Then it states that about 120 followers will be notified and the story becomes Ongoing, and nothing is published until "Publish now" is pressed.
- Given a published chapter whose draft removes two paragraphs carrying 14 visible reader comments, When the review loads, Then a warning names those paragraphs and the comment count, and publishing is still allowed.
- Given a draft containing an image block whose key belongs to another story, When the review loads, Then "Publish now" is disabled with "A picture comes from another story — remove or re-insert it", and no RPC publish call is made.
- Given the story is private, When a first publish is reviewed, Then the review warns that followers will not be notified.
- Given the summary RPC fails, When the sheet shows, Then the author can still publish and sees "Couldn't load the summary".

<a id="fp-061"></a>

### FP-061 — Editing presence for collaborators

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-STUDIO · OBJ-EDT (+ OBJ-TEAM) · SCR-EDT-01, SCR-CHM-01 (badge) |
| User problem | Co-authors and editors learn that someone else is editing the same chapter only when their own save is refused as a conflict — after they typed. The conflict path is safe but costly (reload, compare, re-apply). |
| Evidence / hypothesis | Verified (Code): CAS detects conflicts only at save (BR-EDT-008/013); draft query never refetches on focus (`use-chapter-draft.ts:12-23`); team roles owner/co_author/editor all edit drafts (BR-TEAM-010). Hypothesised: frequency of simultaneous editing in team stories. |
| Current limitation | No awareness of other editors; no soft lock. |
| Proposed solution | Supabase Realtime **Presence** channel `chapter-draft:{chapterId}` (Realtime already used for notifications — no new service): each open editor tracks `{user_id, display_name, since, typing}`. Editor shows a compact banner "Lan is editing this chapter (since 10:12). Your changes may conflict." with actions "Open read-only preview" / "Continue anyway". Additionally, the editor subscribes to `chapter_drafts` UPDATE for that chapter (Realtime Postgres changes, RLS-filtered) and, when another user saves, shows "Lan saved a newer version — Load it" *before* the local save fails. Chapter manager rows show an "Editing: Lan" badge. No hard lock. |
| Expected benefit | Prevents most team conflicts; makes collaboration visible. |
| Scenarios & main flow | 1. Lan opens chapter 5. 2. Minh opens it; sees the presence banner. 3. Minh chooses preview or continues; if Lan saves, Minh is told immediately and can load before typing more. |
| Alternative / error flows | Realtime unavailable → no banner; CAS remains the safety net. Same user on two devices → banner "You also have this chapter open on another device". |
| Business rules to add/modify | New BR-EDT (Proposed): presence is visible only to people with a role on the story; presence never blocks saving. |
| UI behaviour & validation | Banner dismissible per session; avatar + name; `role="status"`. |
| Technical impact | Frontend: `useDraftPresence` hook (editor), badge in chapter manager. Shared: avatar widget. API: Realtime channel authorization (private channel with RLS on `realtime.messages`, or presence keyed by an unguessable chapter id + RLS-filtered postgres changes). Database: Realtime publication for `chapter_drafts` (RLS applies). Jobs: none. |
| Dependencies · Risks | Realtime private-channel authorization must be configured (verify in WP 8.3 review); privacy: shows teammates' activity (team-only). |
| Priority · Complexity · Class | P3 · M · Optional |
| Decision required | none |

Acceptance criteria [Proposed]
- Given two collaborators open the same chapter, When the second editor loads, Then they see who else is editing within 5 s.
- Given collaborator A saves, When collaborator B has the chapter open, Then B is told a newer version exists before B's next save is attempted.
- Given a member without a role on the story, When they try to join the presence channel, Then they are refused and receive no presence or draft-change events.

<a id="fp-062"></a>

### FP-062 — Writing aids: find & replace, writing stats, paste clean-up

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-STUDIO · OBJ-EDT · SCR-EDT-01 |
| User problem | Authors cannot rename a character or fix a repeated mistake inside a chapter (no replace; on mobile no in-editor find at all); they only see a total word count (no selection count, reading time or words written this session); text pasted from Word/Google Docs brings empty spacing paragraphs and silently loses unsupported formatting. |
| Evidence / hypothesis | Verified (Code): no search/replace or CharacterCount/Placeholder extension (`extensions.ts:47-66`); only total words (`chapter-editor-screen.tsx:100,217-219`). Inferred: paste normalisation per ProseMirror schema (BR-EDT-003 exception, untested). Hypothesised: most authors draft in other tools first. |
| Current limitation | Editor offers formatting only. |
| Proposed solution | (1) Find & replace panel (⋯ / Mod+F inside the editor; Mod+H replace): match case, whole word, Vietnamese-diacritic-aware option "ignore accents" (reuse `unaccent`-like client normaliser from `@storynest/utils` if present, else simple NFD strip); replace one / all as one undo step; block ids preserved (text edits only). Implemented as a small ProseMirror decoration plugin (no new dependency) or a pinned Tiptap community extension after review. (2) Writing stats popover from the status chip: words, characters, paragraphs, est. reading time (words ÷ 200 wpm, Vietnamese-tuned constant to confirm), selection words, words added this session (client only). (3) Paste clean-up: on paste of HTML, collapse runs of empty paragraphs to one, trim leading/trailing whitespace, keep B/I/U/S, and show a toast "Pasted. Removed: 12 empty lines, 3 links, 1 list (converted to paragraphs)". |
| Expected benefit | Faster revision, length consistency across chapters, clean imports. |
| Scenarios & main flow | 1. Author opens Find & replace, types "Lan" → "Lam", whole word, Replace all (14) → one undo step reverts all. 2. Taps the status chip → sees "2,340 words · ~12 min read · +410 this session". 3. Pastes a Google Docs chapter → toast summarises clean-up. |
| Alternative / error flows | Replace all would exceed `blockTextLength` → refused with message, nothing changed. Paste exceeding 2,000 blocks → existing validation message after paste (BR-EDT-006) — better: refuse paste with explanation. |
| Business rules to add/modify | New BR-EDT (Proposed) "Replace keeps block ids"; reading-time constant documented once (shared with the reader/story page if they show reading time — consolidation). No BRC. |
| UI behaviour & validation | Panel docks under the action bar (≥ md) or as a bottom sheet above the keyboard (< md); counts update live; `aria-live` only on "n matches". |
| Technical impact | Frontend only: editor plugin, stats util in `editor/model`, paste transform via `editorProps.transformPastedHTML`/`transformPasted`. Add `@tiptap/extensions` as a pinned direct dependency for CharacterCount/Placeholder (already in the lockfile as a transitive dep). API/DB/RLS/Jobs: none. |
| Dependencies · Risks | FP-058 (chip, ⋯). Risk: IME composition and replace interplay — test on Vietnamese keyboards. |
| Priority · Complexity · Class | P3 · M · Maturity |
| Decision required | none |

Acceptance criteria [Proposed]
- Given a chapter where "Lan" appears 14 times as a whole word, When the author replaces all with "Lam", Then 14 occurrences change, block ids of all paragraphs are unchanged, and one Undo restores all 14.
- Given the author selects a passage, When the stats popover is open, Then it shows the selection's word count alongside the chapter total and an estimated reading time.
- Given HTML with 5 consecutive empty paragraphs and a link is pasted, When the paste completes, Then at most one empty paragraph remains, the link text is kept without the link, and a toast reports what was removed.

---

<a id="fp-063"></a>

### FP-063 — Appeal a moderation decision

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-TRUST · OBJ-MOD (+OBJ-NOTI, OBJ-STM, OBJ-CMT) · SCR-MOD-01 (Appeals tab), SCR-STM-01 (removed story), SCR-CMT-01 (hidden-comment note), SCR-SHELL-01 (suspension banner), SCR-NOTI-01; new embedded **Appeal dialog** (proposed ID SCR-MOD-03, to be assigned at consolidation) |
| User problem | An author whose story was removed, a commenter whose comment was hidden, or a member who was suspended cannot contest the decision. A wrong decision stands unless a moderator happens to notice it. |
| Evidence / hypothesis | Verified (Code): no appeal table, RPC or UI. WF-MOD-06 success criteria "Not met: no notification, no reason shown, no appeal path". FP-006 lists "an appeal path" only as a benefit. Inferred: removals and suspensions are the decisions with most user impact; an internal second look reduces errors. Benchmark: appeal flows are standard on UGC platforms (Inferred; no specific source checked). |
| Current limitation | Reversal exists (WF-MOD-04) but only on a moderator's own initiative, with no input from the affected person. A suspended account cannot write anything (BR-MOD-016). |
| Proposed solution | **Data:** `moderation_appeals(id, action_id → moderation_actions.id, appellant_id, statement text 10–2000, status pending/upheld/reversed, decided_by, decided_at, decision_reason, created_at)`. Unique open appeal per action. RLS: the appellant reads own rows; moderators read all; no client writes. **RPCs:** `submit_appeal(action_id, statement)` (SECURITY DEFINER). It is allowed only for the affected party of a take-down action (story owner for `remove_story`, comment author for `hide_comment`, the account for `suspend_user`), within the appeal window (Q-MOD-06), and only while the action is still the latest on the target. It is **allowed for suspended accounts** (BRC-MOD-02). `decide_appeal(appeal_id, outcome, reason)` is moderator-only. `reversed` runs the matching reverse action through the same code path as `moderate()` in one transaction (audit row with `report_id` NULL and a new `appeal_id` column). Only `decide_appeal` writes `moderation_actions` rows (new actions `uphold_appeal` / `reverse_appeal`); appellants are not audit actors, their statement lives in the appeal row. **Outbox events:** `appeal.decided` → notification to the appellant (mandatory, not switchable). |
| Expected benefit | Due process; mistakes corrected; trust from authors; a safety valve for coarse actions until FP-024's graduated actions exist |
| Scenarios & main flow | 1. Author opens Studio and sees "Removed by a moderator · Rule: Harassment · 3 Nov" (FP-006) with "Appeal". 2. Appeal dialog: what was actioned, the rule, the moderator's message (if any), a statement textarea (10–2000, counter), "Send appeal". 3. `submit_appeal` creates a pending appeal; the label becomes "Appeal pending". 4. A moderator opens Console → Appeals (oldest first), sees the original action, the original reports, the content preview (SE-MOD-01-AC05) and the statement. 5. "Reverse decision" or "Uphold decision" with a reason (3–1000). 6. Reverse: the story is restored, the audit is written, the author is notified "Your appeal was accepted, the story is visible again". Uphold: the author is notified "Your appeal was reviewed; the decision stands" with the rule. |
| Alternative / error flows | A1 Suspended member: the banner (FP-002) carries "Appeal". The dialog works although other writes are refused. A2 The action was already reversed before the decision: `decide_appeal` returns PT409 "Already reversed", and the appeal auto-closes as reversed. A3 Second appeal on the same action → PT409 "You already appealed this decision". A4 Outside the window → button hidden; RPC 22023. A5 Appeal rate: `appeal_rate_day` row in `abuse_limits` (FP-007 amendment) → PT429. A6 Decided by the same moderator who acted: allowed or refused per Q-MOD-06 (the proposal defaults to a warning in the UI, not a block, because teams are small). |
| Business rules to add/modify | New (proposed) **BR-MOD-022** — Appeal eligibility (affected party, window, one per action, latest action). New **BR-MOD-023** — Appeal decision reverses through the audited path; upheld appeals change nothing. **BRC-MOD-02** — exception to BR-MOD-016: a suspended account may submit an appeal (requires approval). |
| UI behaviour & validation | Statement 10–2000 chars, counter from 1800; Send disabled while invalid or sending; errors inline (`role="alert"`); success replaces the dialog body with "Appeal sent. We'll notify you of the decision." Entry button states: "Appeal" / "Appeal pending" / "Appeal decided — see notification". The console Appeals tab uses the case-detail layout (SE-MOD-01) with the decision panel showing only "Reverse decision" / "Uphold decision". |
| Technical impact | Frontend: `moderation` feature (appeal dialog, appeals tab), Studio deleted list, comment note, shell banner, notification renderer. Shared components: none new. API/RPC: `submit_appeal`, `decide_appeal`, `list_appeals`. Database: table + `moderation_actions.appeal_id`, enum values. RLS: as above. Jobs: outbox handler `appeal.decided` → notification (existing outbox + handler pattern). |
| Dependencies · Risks | Depends on FP-006 (removed state and notices are the entry points) and FP-002 (banner). Risk: appeal floods. Mitigated by one appeal per action + rate row. Risk: tone and legal wording. Needs review (Q-X-02 owner). |
| Priority · Complexity · Class | P2 · M · Maturity |
| Decision required | Q-MOD-06 (window, who decides), BRC-MOD-02 (blocked until approved) |

Acceptance criteria [Proposed]:
- Given a story removed by a moderator 2 days ago and an appeal window of 30 days, When its owner sends an appeal with a 50-character statement, Then a pending appeal exists, the Studio row reads "Appeal pending", and a second appeal on the same action is refused with "You already appealed this decision".
- Given a suspended account, When it submits an appeal against its suspension, Then the appeal is stored although all other writes are still refused with 42501.
- Given a pending appeal, When a moderator chooses "Reverse decision" with a reason, Then the target is restored in the same transaction, one audit row references the appeal, the appeal status is `reversed`, and the appellant receives exactly one notification (no duplicate on outbox replay).
- Given a pending appeal, When a moderator chooses "Uphold decision", Then the target is unchanged and the appellant is notified with the rule cited in the original action.
- Given a member who is not the affected party, When they call `submit_appeal` for that action, Then the call fails with 42501.

<a id="fp-064"></a>

### FP-064 — Block another user

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-TRUST · proposed new object **OBJ-BLK "User blocks"** (registry addition needed, CONVENTIONS §3; alternatively placed under OBJ-MOD) · SCR-AUTHOR-01 ("⋯" menu), SCR-CMT-01 (comment "⋯" menu, placeholder), SCR-MOD-02 (success view), SCR-SET-01 (Blocked accounts section), SCR-NOTI-01 |
| User problem | A reader or author targeted by one person in comments and replies can only report each comment and wait for a moderator. Meanwhile every reply notifies them and the person can keep commenting on their stories. |
| Evidence / hypothesis | Verified (Code): no block or mute table, RPC or UI (search over `supabase/migrations`, `packages/features/src`). Reply notifications are emitted for any reply (`20261104001100_comment_reply_notifications.sql:24-68`). The only filter on notification insert is the settings trigger `notifications_respect_settings` (`20261104001900_user_settings.sql:73`). Author tools hide one comment at a time (OBJ-CMT, WBS 6.2). Inferred: harassment is concentrated in a few accounts per victim, so per-pair blocking resolves most cases without moderator time. Benchmark: block/mute is standard on reading/writing UGC platforms (Inferred). |
| Current limitation | Protection depends entirely on moderator latency. Rate limits (BR-ABU-002) only cap volume. |
| Proposed solution | **Data:** `user_blocks(blocker_id, blocked_id, created_at, PK(blocker_id, blocked_id), CHECK blocker ≠ blocked)`. RLS: own rows only (read/delete). Max 1000 per account. **RPC:** `set_user_block(user_id, blocked boolean)` (idempotent; moderators may be blocked, which never affects moderation functions). **Effects (single places):** (1) *Viewer side:* `comment_to_card` returns `blocked_author = true` when the viewer blocked the author. The thread renders a collapsed placeholder "Comment from someone you blocked · Show" (body not sent until "Show", via `list_comments` omitting the body). (2) *Notifications:* the existing BEFORE INSERT trigger `notifications_respect_settings` also drops a notification whose `actor_id` is blocked by the recipient (one place covers replies, follows and future types). (3) *Interaction:* `post_comment` refuses a reply whose parent author has blocked the replier, and (if Q-MOD-07 = yes) any comment on a story owned by a blocker. The refusal is a generic 42501 "You can't reply here" that does not reveal the block. (4) Following: blocking removes the blocked user's follow of the blocker and prevents a new one (Q-MOD-07). **UI:** "Block <name>" in the author page and comment "⋯" menus and in the report success view. A confirm dialog lists the effects. "Blocked accounts" in Settings has Unblock. |
| Expected benefit | Immediate self-service protection; fewer reports filed only to stop contact; less moderator load |
| Scenarios & main flow | 1. Member opens a harasser's comment "⋯" → "Block Minh". 2. Confirm dialog: "Minh's comments will be collapsed for you, you won't get notifications from Minh, and Minh can't reply to your comments. Minh won't be told." → "Block". 3. `set_user_block(minh, true)`. Toast "Minh blocked · Undo". 4. Thread refetches; Minh's comments are collapsed. 5. Minh replies to the member's comment → refused with a generic message. 6. Settings → Blocked accounts → Unblock. |
| Alternative / error flows | A1 Block yourself → button hidden; RPC 22023. A2 Limit 1000 reached → PT409 "You've reached the block limit". A3 Blocked user's existing comments stay public for everyone else (blocking is personal; reporting remains the path for public harm). A4 Guest → "Block" sends to sign-in like Report. A5 Suspended blocker: block allowed? Follows Q-MOD-01/FP-002 (proposal: allowed, as it only protects the user). |
| Business rules to add/modify | New (proposed) **BR-BLK-001** Who may block; **BR-BLK-002** Viewer-side collapse; **BR-BLK-003** Notifications from blocked actors are not stored; **BR-BLK-004** Blocked users cannot reply to (and optionally comment on stories of) the blocker; **BR-BLK-005** The block is never disclosed to the blocked user. No change to existing BRs. |
| UI behaviour & validation | Placeholder is keyboard-reachable with "Show" as a button and an accessible name ("Show comment from a blocked account"). Block/unblock via `ConfirmDialog`; undo toast 6 s. The Settings list is paginated at 50 with relative dates. |
| Technical impact | Frontend: `comments` (placeholder, menu item), `author` (menu), `settings` (section), `moderation` (success view). Shared components: `ConfirmDialog`, `DropdownMenu` (existing). API/RPC: `set_user_block`, `list_my_blocks`. Database: table + indexes `(blocked_id)`; changes to `comment_to_card`, `post_comment`, notifications trigger, `set_user_follow`. RLS: own rows. Jobs: none. |
| Dependencies · Risks | Risk: performance of `comment_to_card` per row. Mitigate with `EXISTS` on the PK (viewer, author) — one index lookup. Risk: users mistake block for report. Mitigate: the confirm dialog says "This doesn't remove the comment for others — report it if it breaks the rules". Coordinates with the community agent (comment menu) and the account agent (Settings). |
| Priority · Complexity · Class | P2 · M · Maturity |
| Decision required | Q-MOD-07 (does a block also stop comments on the blocker's stories and remove follows?) |

Acceptance criteria [Proposed]:
- Given member A blocked member B, When A opens a chapter where B commented, Then B's comments are collapsed for A with a "Show" control, and remain fully visible to every other reader.
- Given A blocked B, When B replies to A's comment, Then the reply is refused with a message that does not mention blocking, and A receives no notification.
- Given A blocked B, When any event with actor B would notify A (reply, follow), Then no notification row is stored for A.
- Given A unblocks B in Settings, When A reloads the chapter, Then B's comments are shown normally and new replies from B notify A again.
- Given A attempts to block themselves through the API, Then the call fails with 22023.

<a id="fp-065"></a>

### FP-065 — Community guidelines, legal pages and copyright requests

| Field | Value |
| --- | --- |
| Type | Remediation (documented, not done: WBS 6.9) + Enhancement |
| Domain · object · screens | D-TRUST · OBJ-MOD (+OBJ-SHELL, OBJ-SEO, OBJ-AUTH) · new static routes `/guidelines`, `/terms`, `/privacy`, `/copyright` (proposed screen ID SCR-MOD-04 "Policy pages", one template), SCR-SHELL-01 (footer / menu links), SCR-AUTH-02 (consent line), SCR-MOD-02 (reason links, copyright branch), SCR-MOD-01 (Legal tab), SCR-MAT-01 ("What counts as 18+?") |
| User problem | Readers and authors have no written rules, so they cannot know what is allowed, what a report reason means, or what 18+ covers. Moderators decide against a "policy" that does not exist. Rights holders without an account cannot ask for a takedown, and members' copyright reports lack the facts needed to act. There is no privacy policy or terms. |
| Evidence / hypothesis | Documented: WBS 6.9 ⬜ "Trang tĩnh pháp lý: điều khoản, quyền riêng tư, DMCA/khiếu nại bản quyền" (`docs/WBS.md:227`); §4 "Còn mở: chính sách pháp lý". Verified (Code): no such routes (`apps/web/src/app`), no strings in `packages/features/src`, no footer component (`packages/features/src/shell/components/`). The moderator placeholder cites a policy (`moderation/strings.en.ts:87`). The report reason `copyright` has only free text (`report-button.tsx:102-123`). `anon` cannot call `submit_report` (BR-MOD-004). Inferred: app-store submission for the Capacitor apps (Phase 7) requires a privacy-policy URL. |
| Current limitation | Nothing public describes the rules; copyright takedowns are indistinguishable from other reports. |
| Proposed solution | (1) **Policy pages:** four static, indexable routes rendered from versioned Markdown per locale (`apps/web/content/policies/{vi,en}/*.md`, no CMS). Each has a "Last updated" date and stable section anchors. Guidelines sections map 1:1 to report reasons (`#spam`, `#harassment`, `#hate`, `#sexual`, `#violence`, `#copyright`) plus `#mature-content` (what requires the 18+ mark) and `#enforcement` (actions, appeals). (2) **Links:** a slim footer on desktop pages (≥ 768 px) and a "Help & policies" item in the user menu (mobile and guests); a sign-up consent line "By creating an account you agree to the Terms and Privacy Policy"; report dialog reason links; gate link; Studio 18+ hint link. (3) **Structured copyright claims (members):** `submit_report` accepts `p_evidence jsonb` for `copyright` (`original_url` required http(s), `is_rights_holder_or_agent` true required, `contact_email` optional). The console shows a "Legal" badge and lists these in the **Legal** tab. Removal for copyright uses rule `#copyright`, and the author notice (FP-006) states that they can respond through FP-063. (4) **Non-members:** `/copyright` publishes a contact address and the required information (no anonymous form until captcha exists — Q-MOD-08). Operators log such requests in the console with "Create legal case" (moderator creates a report on the target with `evidence.source = 'external'`, reporter = moderator). (5) **Moderator reasons cite rules:** the reason dialog's "Rule" select uses the same anchors (SE-MOD-01-AC08). |
| Expected benefit | Legal baseline for launch; consistent decisions; better reports; copyright takedowns that can be audited; authors know the 18+ rule |
| Scenarios & main flow | 1. Reader picks "Harassment" in the report dialog → description + link to `/guidelines#harassment`. 2. A rights holder member reports a chapter with reason "Copyright": enters the original URL and ticks the authorisation box → report stored with evidence. 3. Moderator Legal tab → case shows evidence with an "Open original" link → "Remove story" with rule `#copyright` → author notified with the rule and the "Respond / Appeal" path. 4. A non-member emails the published address; the moderator uses "Create legal case" on the story → same flow. |
| Alternative / error flows | A1 Invalid URL → inline "Enter a link starting with http:// or https://". A2 Checkbox not ticked → Submit disabled. A3 Evidence on a non-copyright reason → server ignores it (22023 if malformed JSON). A4 Policy page for a missing locale → falls back to vi with a notice. A5 Content not provided by the legal owner → routes are not released (they are not shipped with placeholder legal text). |
| Business rules to add/modify | New (proposed) **BR-MOD-024** Copyright reports require evidence (original URL + authorisation statement). New **BR-MOD-025** Every take-down cites a guideline rule (anchor). New **BR-MOD-026** Policy pages are public, indexable and versioned with a visible "Last updated" date. No change to existing BRs (evidence is additive). |
| UI behaviour & validation | Footer links 44 px tall on touch; pages use the reading typography and a table of contents on ≥ 1024 px; anchors scroll with header offset; `robots` allow; canonical per page; `lang` per locale. |
| Technical impact | Frontend: 4 route files + one `PolicyPage` component (web-only content, screens in `packages/features` stay router-agnostic), footer in `main-shell`, menu item, report dialog branch, console Legal tab. Shared components: optional `SiteFooter` widget in `packages/ui/widgets`. API/RPC: `submit_report(+p_evidence)`, `create_legal_case(kind, target, evidence, reason)` (moderator). Database: `content_reports.evidence jsonb` + CHECK on shape for copyright; `moderation_actions.rule text`. RLS: unchanged (functions). Jobs: none. SEO: add the pages to the sitemap. |
| Dependencies · Risks | Blocked on legal content (Q-X-02) for pages (1). (2)–(5) can ship with guidelines only. Risk: publishing rules commits the platform to enforce them consistently, which is why FP-024 cites rules. Overlaps the shell agent (footer) and the auth agent (consent line). |
| Priority · Complexity · Class | P1 (pages + links: launch blocker) · S for pages/links, M for copyright evidence + Legal tab · MVP |
| Decision required | Q-X-02 (legal content), Q-MOD-08 (non-member channel) |

Acceptance criteria [Proposed]:
- Given any visitor, When they open `/guidelines`, `/terms`, `/privacy` or `/copyright`, Then the page renders in the active language with a "Last updated" date, is indexable, and each guideline section has a stable anchor matching a report reason.
- Given a desktop page at 1280 px, Then a footer links to all four pages. Given a 390 px viewport, Then the user menu (guest and member) has "Help & policies" leading to them.
- Given the report dialog with reason "Copyright infringement", When the member submits without a valid original-work URL or without ticking the authorisation box, Then submission is impossible. With both, the stored report contains the evidence and appears in the console's Legal tab.
- Given a moderator removes a story for copyright, Then the audit row stores rule `copyright`, and the author's notice (FP-006) cites the rule and offers the appeal/response path (FP-063).
- Given the sign-up screen, Then a consent line links to the Terms and the Privacy Policy.

<a id="fp-066"></a>

### FP-066 — Operations area: staff roles, abuse thresholds, audit log, job health

> **Consolidation (DEC-019):** per-target history stays in [FP-024](#fp-024); job health is specified once in [FP-010](#fp-010) and only displayed here.

| Field | Value |
| --- | --- |
| Type | New Feature (WBS 6.1 "not done" items + Q-ABU-01) |
| Domain · object · screens | D-TRUST · OBJ-MOD, OBJ-ABU (+OBJ-JOB) · SCR-MOD-01 new "Operations" tab with sub-views Staff · Limits · Audit log · Health |
| User problem | Adding or removing a moderator, tightening a limit during a spam wave, or checking whether jobs run all require a person with service-role SQL access. Changes to limits leave no trace, and a revoked moderator keeps access until the token refreshes. |
| Evidence / hypothesis | Documented: `docs/WBS.md:219` "Chưa làm: … cấp/thu vai moderator qua giao diện". Verified (Code): role read from the JWT claim (`20261103000100_auth_and_rls.sql:69-72`, BR-MOD-001); `abuse_limits` closed to clients with no audit (`20261104002200_abuse_limits.sql:3-7,38-39`, Q-ABU-01); no job health surface (F-JOB-02); `supabase/functions/` is empty (no Edge Function exists yet). Hypothesised: incident response time is bounded by the availability of an engineer. |
| Current limitation | All operator tasks are SQL-only and unaudited, except moderation actions. |
| Proposed solution | (1) **Staff roles as data:** `staff_roles(user_id PK, role 'moderator'|'admin', granted_by, granted_at)`. A Supabase **Custom Access Token hook** (a Postgres function, no new service) copies the role into the JWT claim at issue time, so the existing `is_moderator()` and web checks keep working. Sensitive RPCs (`moderate`, `decide_appeal`, staff/limit changes) additionally check the table, which removes the revocation latency for them (answers Q-MOD-02). This changes BR-MOD-001's source of truth → **BRC-MOD-01**. (2) **Staff view (admin only):** list staff; grant by username; revoke, with a reason. Every change writes `moderation_actions` (`action` + `grant_role`/`revoke_role`, `target_kind` + `staff`). (3) **Limits view (admin only):** table of `abuse_limits` rows with description, value and window. Edit with a reason → `update_abuse_limit(code, max, window, reason)` writes an audit row with the old and new values. A "Freeze" shortcut (max 0) has a confirm. (4) **Audit log (moderators read, as RLS allows today):** global list filtered by actor, action, target kind and date; each row links to its case. (5) **Health (admin):** reads `job_health()` from **FP-010** (outbox backlog, dead letters, last cron run, ranking freshness) with green/amber/red states. No duplicate logic here. |
| Expected benefit | Faster incident response; accountability for every privileged change; immediate revocation for sensitive actions |
| Scenarios & main flow | 1. Admin opens Moderation → Operations → Staff → "Add moderator" → username → reason → Confirm → row added, audit written; the new moderator sees the console after their next token refresh (copy says so). 2. Spam wave: Limits → `comment_rate_burst` 10 → 5 with the reason "spam wave 5 Nov" → next comment uses 5. 3. Health shows "3 dead-letter events" in red → link to the runbook (WP 8.2). |
| Alternative / error flows | A1 Admin revokes themselves while the last admin → refused (PT409 "At least one admin is required"). A2 Moderator (non-admin) opens Staff/Limits → tab hidden; RPC 42501. A3 Invalid limit (negative, window ≤ 0) → existing CHECK → 22023 inline. A4 Hook misconfigured → fallback: `is_moderator()` also accepts `app_metadata.role` during migration (time-boxed). |
| Business rules to add/modify | **BRC-MOD-01** (role source of truth = `staff_roles`, claim projected by hook; sensitive RPCs check the table). New (proposed) **BR-MOD-027** Staff changes and limit changes are audited with a reason. New **BR-MOD-028** At least one admin must exist. New role `admin` (Q-MOD-09). |
| UI behaviour & validation | Same reason dialog as SE-MOD-01 (3–1000 chars). Limits edited in a dialog with numeric inputs and a preview "10 per 10 min → 5 per 10 min". Health auto-refreshes every 60 s while visible. Operations is hidden for non-admins. At 390 px: lists as stacked cards; at ≥ 1024 px: tables. |
| Technical impact | Frontend: `moderation` feature (operations views). Shared components: none new. API/RPC: `grant_staff_role`, `revoke_staff_role`, `list_staff`, `update_abuse_limit`, `list_audit(filters, cursor)`; reads `job_health()` (FP-010). Database: `staff_roles`; `moderation_actions` CHECK extended (`grant_role`, `revoke_role`, `update_limit`; `target_kind` + `staff`, `limit`); `old_value/new_value jsonb` columns; the hook function + Supabase Auth hook setting (owner action like Q-X-03). RLS: `staff_roles` readable by moderators, writable only via functions. Jobs: none new. |
| Dependencies · Risks | FP-010 (`job_health`); Supabase Auth hook configuration per environment (record it — Q-AUTH-02). Risk: privilege escalation bugs → SQL tests for every refusal. Risk: low value while the team is 1–2 people → P3. |
| Priority · Complexity · Class | P3 · M · Maturity |
| Decision required | BRC-MOD-01, Q-MOD-09 (separate admin role?), Q-ABU-01 |

Acceptance criteria [Proposed]:
- Given an admin grants the moderator role to user U with a reason, Then a `staff_roles` row and an audit row (actor, `grant_role`, U, reason) exist, and U can open `/moderation` after their next token refresh.
- Given an admin revokes U's moderator role, When U immediately calls `moderate` with a still-valid token, Then the call is refused with 42501.
- Given an admin changes `comment_rate_burst` from 10 to 5 with a reason, Then the next comment counts against 5, and the audit log shows the old and new values with the reason.
- Given a non-admin moderator, When they call `update_abuse_limit` or `grant_staff_role`, Then the call fails with 42501 and the Operations tab is not shown to them.
- Given `job_health()` reports dead-letter events, When an admin opens Health, Then the outbox status is shown as failing with the count.

---


---

## Phase 2 amendments to existing proposals

These additions extend existing proposals without changing their IDs. Where an amendment changes a priority it is
listed in the [roadmap](implementation-roadmap.md#phase-2-update-product-discovery-2026-11-05).

| FP | Amended or referenced in the amendments of |
| --- | --- |
| [FP-001](#fp-001) | studio management |
| [FP-002](#fp-002) | account & platform, trust & safety |
| [FP-003](#fp-003) | writing & history |
| [FP-004](#fp-004) | account & platform, discovery & reading |
| [FP-005](#fp-005) | discovery & reading, engagement & library, trust & safety |
| [FP-006](#fp-006) | studio management, trust & safety |
| [FP-007](#fp-007) | trust & safety |
| [FP-008](#fp-008) | account & platform, trust & safety |
| [FP-009](#fp-009) | account & platform, trust & safety |
| [FP-010](#fp-010) | studio management, writing & history, trust & safety |
| [FP-011](#fp-011) | discovery & reading, engagement & library, writing & history |
| [FP-012](#fp-012) | discovery & reading, engagement & library |
| [FP-013](#fp-013) | engagement & library, trust & safety |
| [FP-014](#fp-014) | engagement & library |
| [FP-015](#fp-015) | engagement & library |
| [FP-016](#fp-016) | account & platform, studio management |
| [FP-017](#fp-017) | discovery & reading |
| [FP-018](#fp-018) | studio management |
| [FP-019](#fp-019) | account & platform, discovery & reading, engagement & library, studio management |
| [FP-020](#fp-020) | account & platform, discovery & reading |
| [FP-021](#fp-021) | account & platform |
| [FP-022](#fp-022) | account & platform, discovery & reading, engagement & library, trust & safety |
| [FP-023](#fp-023) | account & platform |
| [FP-024](#fp-024) | trust & safety |
| [FP-025](#fp-025) | engagement & library |
| [FP-026](#fp-026) | engagement & library, writing & history |
| [FP-027](#fp-027) | discovery & reading |
| [FP-028](#fp-028) | engagement & library |
| [FP-029](#fp-029) | discovery & reading |
| [FP-030](#fp-030) | writing & history |
| [FP-031](#fp-031) | trust & safety |
| [FP-032](#fp-032) | discovery & reading |
| [FP-033](#fp-033) | studio management |
| [FP-034](#fp-034) | studio management, writing & history |

### From the account & platform review

**FP-004 — Real not-found and error pages** (add):
- Runtime adds a visual defect: the default 404 renders a white panel inside the cream shell (`m-notfound.png`, `d-notfound.png`), so the fix must render inside `(main)` with the token background, not only translate text.
- Every page-level `EmptyState` used as a "not found" (list missing `d-list-missing.png`, author missing) must offer at least one exit action (Home, Search) — today the list-missing state is a dead end (Verified (Runtime)).
- `global-error.tsx` cannot rely on the providers; give it its own minimal markup using `tokens.css` and a bilingual message.
- New AC: Given `/lists/<unknown>`, Then the not-found state shows "Go to Library" (members) or "Go to Home" (guests).

**FP-008 — Account lifecycle (WBS 6.4 / Q7)** (add flows, keep blocked on Q-X-01):
- Location: Settings → "Account" (change email) and "Privacy & data" (export, deactivate, delete) (SE-SET-01).
- Deactivate: sets `account_status = 'deactivated'` (value already allowed, `init_schema.sql:19-20`); public profile and stories hidden like a suspended account per the FP-002 policy; signing in again offers "Reactivate" (Proposed rule, Q-AUTH-05).
- Delete: reauthentication → consequences list (what is anonymised, what stays) → per owned story choice "keep under 'Deleted user'" or "unpublish first" (WBS §4 Q7 note) → co-authorship and pending invitations closed (FP-016) → typed confirmation → **14-day grace period** during which signing in cancels deletion (Proposed, BR text below, Q-AUTH-05) → anonymisation job (pg_cron via existing outbox pattern).
- Export: `export_my_data()` RPC returning JSON (profile, settings, library, follows, lists, comments, votes, reading progress); stories/chapters of authors exported separately as text/Markdown later (size). Download through the platform adapter (works in Capacitor).
- Change email: `updateUser({ email })` with Supabase "secure email change" (confirmation on both addresses; Q-AUTH-02 must confirm the setting).
- Proposed BR text (needs approval): "A deletion request is reversible for 14 days by signing in; after that the account is anonymised irreversibly." "A deactivated account is hidden like a suspended one but can reactivate itself by signing in."
- Additional AC: Given a member with a pending deletion signs in within 14 days, Then they are asked to cancel the deletion and the account returns to active when they confirm.

**FP-009 — Complete sign-up and sign-in** (add):
- Google button placement and order on SCR-AUTH-01/02 (top, outline, full width); first Google sign-in also enters FP-035's welcome rule.
- `next` carried through forgot → email → reset → destination; reset lands on `next` (SE-AUTH-03/04).
- Recovery-session detection; normal sessions go to Settings → Account → Change password (reauth) (SE-AUTH-04).
- "Sign out" in the menu = this device (`scope: 'local'`); "Sign out of all devices" in Settings → Account; "Sign out of other devices" checkbox after reset — all conditional on Q-AUTH-01 / Q-AUTH-06.
- Check-email card: resend (60 s), "Use a different email", spam hint; resend also on the "not confirmed" sign-in error.
- Sign-up sends `locale` in user metadata so email templates can be localised (templates must be versioned with the Q-AUTH-02 settings checklist).
- If BRC-AUTH-01 is rejected: show the final username before submit (live preview + availability via the FP-035 RPC).
- AC: Given "Sign out" from the user menu on device A, Then device B stays signed in (if Q-AUTH-01 chooses per-device).

**FP-019 — Navigation and information architecture** (add):
- Tablet: bottom nav visible below `lg` (BRC-SHELL-02); header section links from `lg` (Discover, Rankings, Library, Write). Runtime evidence `t-home.png` (no nav at 768).
- Header density: language → user menu/footer (BRC-I18N-01), 18+ toggle → menu (Q-SHELL-02, trust-safety agent), guest "⋯" menu; "Sign in" not filled.
- `/me` hub content as specified in SE-PRF-01 (avatar, public page, counts, checklist, navigation list, Sign out); move `MeView` into `packages/features` (WBS Q1).
- Auth layout "Back" link to a safe `next`.
- AC: Given a 768 px viewport, Then the bottom navigation is visible on every `(main)` page.

**FP-020 — One pattern for loading / error / load-more** (add):
- `PageSkeleton` variants `grid | detail | list | form | reader` and per-segment `loading.tsx` (U-SHELL-03), so `/settings`, `/me`, story and reader pages do not flash a card grid.
- `/me` error state (F-PRF-01) moves here explicitly with SE-PRF-01-AC02.
- Shared "section saved / saved on this device only" status pattern for auto-saving settings (SE-SET-01).

**FP-021 — Server-side language** (add):
- Language control in the auth layout and in the footer (FP-039), not only in the `(main)` header.
- Visible text must be part of the accessible name (WCAG 2.5.3): e.g. a menu button "VI" named "Ngôn ngữ / Language: Tiếng Việt" with the two options listed by their own names.
- Sign-up passes `locale` (FP-009) and the cookie decided in Q-I18N-01 is also read by the `/auth/callback` redirect target.

**FP-022 — Accessibility pass on core screens** (add):
- Focus indicator contrast: effective ring alpha is 25 % (`--ring` already 50 % at `tokens.css:52` and components use `ring-ring/50`, e.g. `button.tsx:8`) → computed 1.25:1 in light theme, 2.56:1 dark (Inferred). Fix in FP-037 tokens; FP-022 verifies.
- Input borders 1.31:1 against the page (`--input`, `tokens.css:51`) fail WCAG 1.4.11 for the field boundary (Inferred calc).
- Label-in-name failure on the language button (Verified (Code)).
- Switch rows: make the whole row the label; switch visual is ≈ 18 × 32 px.
- `prefers-reduced-motion` base rule (shared with FP-036).
- Touch sizing via `--size-control` instead of per-component `touch-target` (outside `packages/ui` only the two Home chip rows and the gallery use it today).

**FP-023 — Security headers and CSP** (add):
- The nonce must also cover the theme/motion bootstrap (FP-036) and allow Google OAuth redirects plus the captcha script/frame origin (FP-009).

---

### From the discovery & reading review

| FP | Add / change | Why |
| --- | --- | --- |
| FP-004 | Add: when the chapter route moves to the `(reader)` group (FP-043), chapter not-found and error pages render inside `ReaderLayout` with "Back to story" (when the story is readable) and "Home". Re-test RT-01 for chapters: the `(main)/loading.tsx` streaming boundary will no longer wrap the reader, which may by itself restore the real 404 status (Inferred: FP-004 names `loading.tsx` streaming as the cause). Add AC: "Given a missing chapter, Then HTTP 404 inside the reader layout." | Keeps FP-004 correct after the route move and may simplify its fix. |
| FP-005 | Add: (a) the new reader layout (FP-043) must keep "gate before any text", including "Ch. n / N" and the chapter title in the bar. (b) FP-040 facts and the new rails (continue, new & rising, trending) obey the 18+ choice and never put facts of mature stories into metadata or OG. (c) Scoped rankings (FP-046) pass `include_mature`. | New surfaces must not reopen the client-only gate gaps (F-MAT-01). |
| FP-011 | Add: continue-rail items, end-of-chapter "Next" cards and following-feed "New: Chapter N" links should be built from chapter ids resolved to the canonical URL (or the `/story/{id}` short form + chapter id route if introduced), so they survive slug renames. | FP-044 and SE-AUTHOR-02 add many deep links into chapters. |
| FP-012 | Add: (a) the next-chapter control after the end marker is a **card** (number, title, words), not just a button, and is part of the FP-043 end panel. (b) Completion measured on the article blocks must work in the new layout where comments follow the end panel. (c) "Ch. n / N" in the reader bar uses the published position (Q-READ-01). (d) The shared `resolveContinueChapter` must also return the caught-up / read-again states of BRC-STORY-01, so the story page, library (SCR-LIB-01) and the Home continue rail agree. | One resolver for every continue surface. FP-043/044 depend on it. |
| FP-017 | Add browsing scope: sub-category chips under an active root category (U-TAX-01), the category name as the h1 of a filtered Home view, an "All categories" sheet on mobile (runtime: chip row is cut at 390 px), and the category badge on the story page as a link. | Browsing value from the approved category tree. Confirmed runtime overflow. |
| FP-019 | Add: the header nav from `lg` (below `lg` the bottom nav carries the sections; BRC-SHELL-02, DEC-022) must include Rankings and, for members, Following (currently only Home links, U-HOME-01). Reader routes are outside the shell after FP-043: the reader bar's "⋯" must offer Home and, for guests, "Sign in" with `next` including the chapter path. The mobile search icon opens `/search` with focus (U-SRCH-02). | Navigation changes when the reader leaves the shell. |
| FP-020 | Add: apply `loadMoreError` + retry to the filtered lists (FP-041), scoped rankings (FP-046) and the following "Updates" list. Rails (continue, For-you, trending, new) reserve a skeleton of their final height and render an inline retry on error, without blocking the feed (BR-HOME-012). | New lists inherit the same async pattern. Avoids the For-you layout shift. |
| FP-022 | Add the measured runtime counts as the baseline: controls < 44 px — reader 17/21 (390) and 16/16 (768/1280), story 13/22, search 9/15, ranking 9/16 (metrics.json). Add to scope: StatPill visible labels (story page), TOC items, ChapterNav, paragraph markers, reader bar (FP-043). | Quantified evidence for WBS 8.5 on the reading path. |
| FP-027 | Add: guest device progress feeds the same continuity UI as members (FP-044): Home continue rail, story CTA states, read marks, TOC marks, end panel. On sign-in, merge rather than overwrite: keep the furthest completed chapter per story (align with Q-PROG-01). | Guests get the continuity journey (JRN-RDR-06) without a second UI. |
| FP-029 | Add: "Not interested" on For-you rail items **and** on similar-story rows (story page aside). The reason line moves inside the card (FP-045). Hide For-you while the reader has fewer than N signals, and show "Follow or save stories to get suggestions" (BR-REC-008 says no hint exists). | Placement follows the new card variants. |
| FP-032 | Replace the solution text with a concrete guest landing: compact hero ≤ 120 px at 390 px with a value line + "Create account" + "Start writing"; "Trending this week" rail (`top_stories('week')`, 8); "New & rising" rail (FP-046); "Completed picks" rail (FP-041 `status=completed&sort=reads`, 8); then the browse section. Members: no hero (continue + For-you rails instead, FP-044). Evidence: runtime `m-home.png` (the first story title is at y ≈ 668 px). | Turns FP-032 into a measurable layout with runtime evidence. |

---

### From the engagement & library review

| FP | Amendment | Why |
| --- | --- | --- |
| FP-011 Stable links | Add: grouped notifications (FP-050) and Library "first new chapter" links (FP-047) resolve by `chapter_id` with the same resolver. `ShareButton` (FP-051) always emits canonical URLs. AC: "Given a grouped notification whose first chapter was renamed, When opened, Then the chapter opens." | One resolver for every link the engagement loop produces |
| FP-012 Correct completion and Continue | Mark it as **prerequisite** of FP-047 and FP-052. `resolveContinueChapter` also feeds `list_library.continue_chapter` (server-side equivalent) and the Home "Continue reading" row. The chapter-end card (FP-052) takes the slot directly after "— End of chapter —" together with the moved prev/next. | Avoid a third continue algorithm; one end-of-chapter layout |
| FP-013 Notification safety and deep links | Extend the excerpt-blanking trigger to all recipients created by FP-049 (participant/addressed copies). `?comment=<id>` also highlights the `reply_to_comment_id` target. Per-item Delete is surfaced through the FP-050 ⋯ menu (no separate UI). Fix the empty-state copy as in SE-NOTI-01-AC07. | Moderation reaches every copy; one item menu |
| FP-014 Reading-list integrity | The quick-create inline validation moves into the FP-048 Save sheet (same rule, new host). Owner placeholders also appear in the "Add stories" picker exclusion logic (SE-LIST-01). | Keep the validation fix when C09 is restructured |
| FP-015 Library paging, URL tabs, undo | Tab values become `reading|saved|notify|lists|authors` (stage A) with `following` kept as an alias. Paging is implemented through `list_library` (FP-047), not three separate queries. Undo is also offered for the notify toggle. Replace the 4-column card grid with `LibraryRow` (SE-LIB-01). | Single data path; avoid building paging twice |
| FP-019 Navigation and IA | Choose "Followed authors as a Library **Authors** tab" (not a user-menu item), consistent with FP-048. Add "Notifications" to the user menu (FP-050). `next` keeps the hash and may carry an allow-listed `intent` (FP-048). | Resolves the open option in FP-019 §4 |
| FP-022 Accessibility pass | Add the 44 px bell (SE-NOTI-01-AC06), the paragraph trigger (SE-CMT-01-AC02), comment action rows (`h-7`, 28 px, `comment-item.tsx:174-176`) and Library row actions to the target list. | Same targets problem, Confirmed (Runtime) on the reader: 17 of 21 controls < 44 px |
| FP-025 Richer comments | Add: the "Author" badge also drives the notification wording "The author replied" (`actor_is_story_author` payload, FP-049). The avatar is reused by `NotificationRow` (FP-050). Live "N new comments" stays here (Q-CMT-02). | Author recognition must be consistent in the thread and in the inbox |
| FP-026 More types and channels | (a) Order of delivery: first **in-app** `followed_author_new_story` and `followed_author_new_chapter`, suppressed when the reader already follows that story (no duplicates). (b) The first out-of-app channel is an **opt-in email digest** of new chapters for kept stories (daily or weekly, one email, unsubscribe link, sent by a pg_cron job reading unread `chapter_published`). Push follows with WP 6.7. (c) Add the switch "Email digest" to SCR-SET-01. New decision Q-NOTI-07. | The return loop has no out-of-app trigger today (BR-NOTI-017). A digest reuses stored notifications and needs only an SMTP provider (Supabase Auth already sends mail; provider choice is the only new dependency, so it is justified) |
| FP-028 Discoverable public lists | Reuse the FP-051 list metadata (title, OG image) for the author-page section. The author-page list section uses the C08 mosaic row. | Avoid two list-card designs |
| FP-005 Server-side 18+ | Note: the Library rows, Home Continue row, notification covers and chapter-end recommendations (FP-047, FP-050, FP-052) must apply the same 18+ visibility as lists (F-MAT-02). | New surfaces must not reintroduce the leak |

---

### From the studio management review

| FP | Amendment | Why |
| --- | --- | --- |
| FP-001 | Add: `set_story_deleted` must raise a **distinct** error code/hint when the story was removed by a moderator (today 42501 "removed by a moderator", `20261104002000_moderation.sql:107`, mapped to the generic "You don't have permission"), so FP-006/FP-053 can explain it. Add AC: "Given a moderator-removed story, When the owner calls `set_story_deleted(S,false)`, Then the error hint is `story_removed` and Studio shows 'Removed by a moderator'." | Lets the Studio distinguish forbidden vs removed without a second request. |
| FP-006 | Add Studio surfaces: removed state shown as the FP-054 chip "Removed by a moderator", as a workspace-level banner on every tab (FP-053) with the reason category if Q-MOD-04/Q-AUTH-03 allow, and as an item in the dashboard "Needs attention" filter (FP-055); workspace becomes read-only for content settings. | One consistent place instead of only the deleted list. |
| FP-010 | Add: chapter manager rows show "Scheduled · <local date/time>" and, on failure, "Scheduled publish failed — open to fix" (SE-CHM-01); `studio_story_summaries` exposes `next_scheduled_for` and `schedule_failed` for dashboard cards (FP-055). AC: "Given a failed schedule, Then the Studio card and the chapter row both show the failure." | Closes U-CHM-01 and makes failures visible where authors look first. |
| FP-016 | Add: (a) read-only Team view for co-authors/editors (RLS already allows reading `story_collaborators` and active profiles, `auth_and_rls.sql:182-184,213-214`) → BRC-TEAM-01; (b) owner listed as a member; (c) "Leave story" on the member's own row inside the workspace Team tab; (d) attribution "Last edited by …" in chapter rows from `chapter_drafts.updated_by` and "Published by …" from `chapter_versions.created_by`; (e) invite lookup preview via `author_profile(username)`; (f) the invitation inbox shows the role's capability summary. AC: "Given I am an editor, When I open Team, Then I see all members and roles and no invite form." | Transparency and accountability on shared stories at almost no backend cost. |
| FP-018 | Replace per-screen deleted notices with one workspace banner (FP-053) + read-only tabs; keep the delete error toast AC. AC: "Given a deleted story, Then Chapters, Details and Team show the same banner and no write action is enabled." | Consistency; fewer code paths. |
| FP-019 | Move the Studio bullet ("story title + Stats links on edit/chapter pages", U-STAT-01) to FP-053; FP-019 keeps global navigation. Add: the desktop header/sidebar entry for the Studio is labelled "Write" (same as bottom nav) and is visible to guests (leads to sign-in with `next=/studio`). | Avoid two proposals implementing the same links. |
| FP-033 | Add a mobile path: "Move to position…" in the row overflow menu (number input 1..n, single `reorder_chapters` call) in addition to drag-and-drop on ≥ 768 px; keyboard reorder (Alt+↑/↓) on the drag handle. AC: "Given 390 px, When I choose Move to position 1 for chapter 50, Then one request reorders the list." | Drag-and-drop is unreliable on small touch screens. |
| FP-034 (or studio-write FP-060) | First-publish confirmation / pre-publish review must include the FP-054 reader-access state: when the story is `team_only`, say "Only your team can read this story" and offer "Publish and make public" (owner/co-author; also sets status per BR-STM-020) or "Publish anyway"; editors get "Ask the owner to make it public". AC as in FP-054. | Closes the "publish into the void" break at the moment it happens (editor agent owns the dialog; this adds content only). |

### From the writing & history review

**FP-003 (Never lose typed text)** — add:
1. Scope explicitly includes the action-bar exits of FP-058, header/user-menu links and (while it exists) the bottom
   nav. Flush has a timeout (e.g. 3 s): if offline or failing, navigate anyway, keep the device backup and show
   "Saved on this device only" (so the guard never traps the author). Also write the backup on `pagehide` (iOS Safari
   does not show `beforeunload` prompts) — Inferred.
2. Backup banner gets **"Compare"**: opens a sheet with `diffBlocks(serverDraft, backup)` (reuse history model) so
   Restore/Discard is an informed choice; when the backup's base is older, offer "Restore as a checkpoint first"
   (if FP-059 approved).
3. Same-browser tabs (answers Q-EDT-04 option): `BroadcastChannel('storynest-draft-{chapterId}')` — the second tab
   shows "This chapter is open in another tab" and becomes read-only until the author chooses "Edit here" (the other
   tab then stops autosaving and writes its backup).
4. Restore safety: send the revision the History screen loaded (already in FP-003) **and** offer an inline "Undo"
   after a successful restore (SE-HIST-01-AC06); if FP-059 is approved, the replaced draft is kept server-side
   (BRC-HIST-01) instead of only as a device backup.
5. AC to add: "Given the author is offline with unsaved text, When they tap Preview, Then they navigate within 3 s,
   the backup is kept and the preview notes that later changes are not included."

**FP-010 (Reliable scheduled publishing)** — add:
1. Editing a scheduled chapter shows a persistent banner "Scheduled for Thu 20:00 — changes you save now will be
   published then" (UI-only, no BR change) — closes JRN-AUT-10 F9 regardless of Q-EDT-02.
2. Schedule dialog: quick picks (Tonight 20:00, Tomorrow same time, Next week same time), a readable confirmation
   ("Publishes Thursday 6 Nov, 20:00 (Asia/Ho_Chi_Minh) — in 2 days"), and the state badge shows relative time.
   Mobile: dialog as bottom sheet so the native picker and buttons are not covered by the keyboard.
3. If Q-EDT-05 = yes (schedule the next version of a live chapter), the schedule must capture the revision at
   scheduling time; record as BRC-EDT-01 (see §6) — the "draft as it is then" rule would otherwise publish
   half-finished edits.
4. Optional author receipt when a scheduled chapter goes live (in-app notification to the scheduler, reusing the
   outbox handler) — type list decision belongs to Q-NOTI-03 / FP-026.
5. Chapter manager shows the scheduled date/time (already U-CHM-01) and a "Scheduled" filter for release planning
   (consolidation with CHM agent).

**FP-011 (Stable links)** — add: when a `chapter_published` notification points to a chapter that is now
unpublished, archived or deleted, open the story page with a notice "This chapter is no longer available" instead
of a not-found page; resolve the displayed chapter title by `chapter_id` at display time (the payload title freezes
the first version's title, BR-NOTI-003). AC: "Given a notification for a chapter that was later unpublished, When
clicked, Then the story page opens with the notice."

**FP-030 (Images)** — add: touch-friendly image block controls (tap → small bar: Alt text, Replace, Remove, Move
up/down; 44 px) because selecting an atom node and deleting it with the virtual keyboard is unreliable on mobile
(Hypothesised); upload progress with Cancel; at paste/insert time detect image blocks whose key is outside this story
(BR-EDT-016) and mark them in the editor (feeds the FP-060 blocking check); `accept` already lets phones offer the
camera — keep it. AC: "Given an image block on a 390 px screen, When tapped, Then Remove and Replace are reachable
without the keyboard."

**FP-034 (Editor publish safety and clarity)** — change: the first-publish confirmation (bullet 1 and its AC) is
**delivered by FP-060's review step** (with follower count and story-status change) — keep one implementation. Keep
Mod+S, shortcuts help (add tooltips + `aria-keyshortcuts` on toolbar buttons), title `maxLength` 200, copy fixes,
identical-republish dedupe (FP-060 shows "Nothing to publish" when identical). Add copy: conflict banner should say
"Your text is kept on this device and offered after reloading" (U-EDT-01).

---

### From the trust & safety review

| FP | Add / change | Why |
| --- | --- | --- |
| **FP-002** One suspension policy | (e) The suspension banner content: what happened ("Your account is suspended"), the rule cited (FP-065 anchor), the date, what still works (read, sign in, change settings per Q-PRF-01) and an **"Appeal"** button (FP-063). (f) A suspended account may still submit an appeal and manage blocks (BRC-MOD-02; FP-064 A5). (g) The moderator "Suspend" dialog shows the consequence list derived from the Q-MOD-01 decision (SE-MOD-01-AC08). Add AC: "Given A is suspended, When A opens any page, Then the banner shows the rule and date and an Appeal button that opens the appeal dialog." | Banner without a reason or remedy leaves the user stuck (JRN-MOD-08); the consequence list must match the policy decided in Q-MOD-01. |
| **FP-005** Server-side 18+ protection | Add the gate experience of SE-MAT-01: copy stating the global effect, toast with **Undo**, "Back to home" fallback (already listed), link "What counts as 18+?" (FP-065), stacked ≥ 44 px buttons at 390 px. Header control: visible "18+" label at ≥ 768 px and state in the accessible name (shared with FP-022 / U-MAT-02). No re-ask once `ageConfirmed` (BRC-MAT-01, Q-MAT-01). Correct the Studio hint `studio/strings.en.ts:187` to "18+ stories are hidden from all lists unless a reader opts in, and open behind an age gate" + link to guidelines. Add ACs SE-MAT-01-AC01…AC08 by reference. | Runtime shows the gate and icon (JRN-MOD-04). The gate confirm silently changes every list (Code). The Studio hint is wrong (Code). All are S-size and belong with the server-side work. |
| **FP-006** Moderation outcomes visible | Define a **notice standard** for every affected-party surface: action, item, rule (FP-065 anchor), date, optional moderator message (SE-MOD-01-AC08), and next step (Appeal — FP-063). Surfaces: Studio "Removed by a moderator" row; hidden-comment note (link "Why?" → rule); suspension banner (FP-002); notification. Notification types: `moderation.story_removed`, `moderation.comment_hidden`, `moderation.account_suspended`, `moderation.decision_reversed` (affected party, **not switchable** — exempt from BR-SET-006), and `moderation.report_closed` (reporter; switchable), with outcome category only ("Action taken" / "No violation found"). The reporter is never told the sanction details, and the reported party is never told who reported (CAP-TNS-25). Use `dedupe_key = action_id` (+ reporter id). Reversal sends `decision_reversed`. | Gives JRN-MOD-07/08 a consistent, safe message format. Reversals currently notify nobody (BR-MOD-017). Prevents leaking reporter identity or sanction details. |
| **FP-007** Abuse limits | Add rows `appeal_rate_day` (default 3/24 h) and `block_rate_day` (default 50/24 h) used by FP-063/FP-064. Move "who tunes thresholds and how it is audited" (Q-ABU-01) to FP-066's Limits view, which writes audit rows. Add AC: "Given an admin edits a limit, Then an audit row with old/new values exists." | New write paths need the same protection. Auditing thresholds needs a UI, not only a policy. |
| **FP-024** Moderation console productivity | **Raise the core subset to P2** (card date, comment author, closed-by/at, consequence text, per-target history, F-MOD-03 state fix, removed-content preview, case grouping). The rest stays P3. **Add:** (a) the case model — one row per target, `list_cases` RPC, priority tiers from guideline sections (Q-MOD-05); (b) "Under review by <name>" (map `reviewed_by`, already returned by SQL); (c) list/detail layout with deep link `/moderation/<kind>/<targetId>`, filters in the URL, back preserving scroll; (d) investigation: History for target + owner account (direct `moderation_actions` read is allowed by RLS; add display names), `moderation_preview` for removed content (public queries filter `deleted_at`); (e) **graduated actions:** "Mark 18+" (BRC-MAT-02, Q-MAT-04), chapter-level removal (Q-MOD-03), optional timed suspension (`suspended_until` + pg_cron reinstatement, audited as `reinstate_user` by system — needs Q-MOD-01); (f) the reason dialog gains Rule (FP-065 anchor), internal note, optional user message; (g) paragraph anchor on chapter reports (SE-MOD-02-AC10); (h) admin layout without the bottom nav per WBS §1.2 `(admin)` group. ACs: SE-MOD-01-AC01…AC13 by reference. | JRN-MOD-01/02/03 friction is Verified (Code). Without history and preview, reversals and appeals (FP-063) cannot be judged. Without graduated actions, a mis-rated story can only be removed (BR-MAT-011). |
| **FP-031** "My reports" and reported state | Raise to **P2 · Maturity** (it is the reporter half of FP-006). Scope: (a) "Reported" state on the control (SE-MOD-02-AC08) using the member's own open reports (RLS already allows reading own `content_reports`); (b) `/me/reports` (or a "Reports" section on `/me`) listing target title (if still visible), reason, date and status: Pending / Under review / Closed — Action taken / Closed — No violation (outcome category only); (c) **"Withdraw report"** while pending (`withdraw_report(id)` → status `dismissed` by reporter, audited with actor = reporter, does not refund quota); (d) a link from the report success view. AC: "Given my report was dismissed, When I open My reports, Then it shows 'Closed — No violation found' and no moderator name." | JRN-MOD-07: reporters get no feedback today. Withdrawing fixes mistaken reports without moderator effort. Outcome categories keep the reported party's privacy. |

Also referenced, not amended (outside my list): **FP-008** (account lifecycle requests in JRN-MOD-05), **FP-010**
(job health data for FP-066), **FP-013** (notification excerpts after moderation), **FP-022** (U-MAT-02), **FP-009**
(captcha, required before any anonymous report/copyright form — Q-MOD-08).

---


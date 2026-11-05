# Decision Register

Approved decisions, documentation decisions, and **open questions** that need a business or architecture answer.
Each open question links to the spec where it was raised. When answered, set **Status** to *Decided* with date and
owner, then update the affected rules/proposals. Entry point: [README](../README.md).

## 1. Approved product/architecture decisions (from `docs/WBS.md` §4, 2026-11-03)

| ID | Decision | Source | Status | Effect on this spec |
| --- | --- | --- | --- | --- |
| DEC-001 | Q1 Mobile = Vite + client router; shared screens never import `next/*` | WBS §4 Q1 | Approved | Screens documented as `packages/features` components |
| DEC-002 | Q2 Public URLs `/story/{id}/{slug}`, canonical redirect on slug change | WBS §4 Q2 | Approved | BR-STORY-*; FP-011 extends it to chapters (needs approval) |
| DEC-003 | Q3 Search with `unaccent` + trigram | WBS §4 Q3 | Approved | BR-SRCH-*; verified at runtime (RT-11) |
| DEC-004 | Q4 i18n library independent of Next | WBS §4 Q4 | Approved | OBJ-I18N; FP-021 must keep this |
| DEC-005 | Q5 Two Supabase projects (dev + prod), migrations via CI | WBS §4 Q5 | Approved (prod/staging not yet created) | Coverage report |
| DEC-006 | Q6 Google OAuth in M1; paragraph comments in M2 | WBS §4 Q6 | Approved; OAuth **not delivered** (F-AUTH-02) | FP-009 |
| DEC-007 | Q7 Account deletion = anonymise, keep content | WBS §4 Q7 | Approved; legal policy still open | FP-008 blocked |

## 2. Documentation decisions (this spec)

| ID | Decision | Rationale | Date |
| --- | --- | --- | --- |
| DEC-008 | The spec is written in English; UI text is quoted from `strings.en.ts` with the Vietnamese key when it matters | Task language; stable for AI agents; Vietnamese strings stay the product default | 2026-11-04 |
| DEC-009 | Rule ownership: one object owns each rule; others link to it (CONVENTIONS §4) | Avoid conflicting sources of truth | 2026-11-04 |
| DEC-010 | The report dialog spec is stored as `flag-content-dialog.md` (screen ID unchanged, SCR-MOD-02) | Tooling refused the file name `report-dialog.md` | 2026-11-04 |
| DEC-011 | Runtime checks used only guest access on the shared dev project; no test accounts were created | Avoid writing data to a shared environment without approval | 2026-11-04 |
| DEC-012 | No P0 assigned: the product is pre-launch and nothing blocks development; launch-blocking items are P1 | Priority definitions in CONVENTIONS | 2026-11-04 |

## 3. Open questions

Status for all rows: **Open**. "Blocks" lists the proposals that cannot be finalised without an answer.

### Account & Platform

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-AUTH-01 | Should sign-out end every session (current library default is global)? | Shared-device users are also logged out on their phone | FP-009 | [authentication](../domains/account/authentication/business-rules.md) |
| Q-AUTH-02 | Where are Supabase Auth settings recorded per environment (no `supabase/config.toml`)? | Email confirmation, secure password change, rate limits, redirect URLs depend on them | FP-009 | [authentication](../domains/account/authentication/business-rules.md) |
| Q-AUTH-03 | What may a suspended member still see or do? | Today they hit generic errors | FP-002, FP-006 | [authentication](../domains/account/authentication/business-rules.md) |
| Q-PRF-01 | May suspended members edit their profile and settings (RLS allows it)? | Consistency with `is_active_account()` | FP-002 | [profile](../domains/account/profile/business-rules.md) |
| Q-PRF-02 | Should old usernames redirect after a rename? | Shared links and SEO | FP-011 | [profile](../domains/account/profile/business-rules.md) |
| Q-SHELL-01 | Desktop navigation: sidebar or header links, which sections? | WBS 0.5 deferred the sidebar | FP-019 | [app-shell](../domains/platform/app-shell/business-rules.md) |
| Q-I18N-01 | Is server-side language rendering (cookie) wanted before mobile? | Effort and caching of FP-021 | FP-021 | [i18n](../domains/platform/i18n/business-rules.md) |
| Q-SEO-01 | Should OG images of 18+ stories show the cover? | Link previews bypass the gate | FP-005 | [seo](../domains/platform/seo/business-rules.md) |
| Q-SEO-02 | Should public reading lists be indexable (robots disallows `/lists`)? | Reach of curated lists | FP-028 | [seo](../domains/platform/seo/business-rules.md) |
| Q-JOB-01 | Who is notified when a scheduled publish fails, and should a non-active actor's chapter still publish? | Attribution goes to the last draft saver | FP-010 | [background-jobs](../domains/platform/background-jobs/business-rules.md) |

### Discovery

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-HOME-01 | Should suspended authors' stories leave the home feed, and stay readable by link? | Same as Q-MOD-01 for the busiest list | FP-002 | [home](../domains/discovery/home/business-rules.md) |
| Q-TAX-01 | Who provisions and changes categories in production? | Prod has no category data path | FP-017 | [taxonomy](../domains/discovery/taxonomy/business-rules.md) |
| Q-TAX-02 | Is the category tree limited to two levels? | UI shows one level of children | FP-017 | [taxonomy](../domains/discovery/taxonomy/business-rules.md) |
| Q-SRCH-01 | Should tag counts include mature stories for readers who opted in? | Counts differ from results | — | [search](../domains/discovery/search/business-rules.md) |
| Q-RANK-01 | Should "Today" use the Vietnam / reader time zone instead of UTC? | Reads use UTC day, votes rolling 24 h | — | [ranking](../domains/discovery/ranking/business-rules.md) |
| Q-REC-01 | Should "Recommended for you" exclude stories where the reader is a collaborator? | Today only owned stories are excluded | FP-029 | [recommendations](../domains/discovery/recommendations/business-rules.md) |
| Q-AUTHOR-01 | Should a co-author's page list co-written stories? | Author page lists owned stories only | — | [author](../domains/discovery/author/business-rules.md) |

### Reading & Votes

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-STORY-01 | Should stories of suspended authors stay readable by link? | Part of the suspension policy | FP-002 | [story](../domains/reading/story/business-rules.md) |
| Q-READ-01 | Is "Chapter N" the published position or `sort_order`? | Gaps in numbering | FP-012 | [chapter-reader](../domains/reading/chapter-reader/business-rules.md) |
| Q-PROG-01 | Should "Continue" open the last opened chapter or the furthest read? | Story page and library disagree | FP-012 | [reading-progress](../domains/reading/reading-progress/business-rules.md) |
| Q-PROG-02 | Should reads by the author or team count? | Inflated stats/rankings | — | [reading-progress](../domains/reading/reading-progress/business-rules.md) |
| Q-VOTE-01 | May authors vote on their own chapters (including drafts via the RPC)? | Ranking integrity | FP-007 | [vote](../domains/community/vote/business-rules.md) |

### Community & Library

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-CMT-01 | May suspended users edit/delete their own comments? | F-CMT-02 fix scope | FP-002 | [comments](../domains/community/comments/business-rules.md) |
| Q-CMT-02 | Live thread updates, or a sort toggle (unused `newestFirst` prop)? | FP-025 scope | FP-025 | [comments](../domains/community/comments/business-rules.md) |
| Q-NOTI-01 | What is the notification retention period? | No purge exists | FP-013 | [notifications](../domains/community/notifications/business-rules.md) |
| Q-NOTI-02 | Should followers without age confirmation receive `chapter_published` for 18+ stories? | The title is exposed | FP-005, FP-026 | [notifications](../domains/community/notifications/business-rules.md) |
| Q-NOTI-03 | Which new notification types should exist, and which can be switched off? | FP-026 scope | FP-026 | [notifications](../domains/community/notifications/business-rules.md) |
| Q-LIB-01 | Can suspended users follow/save, and do they count as followers? | Insert policy lacks the active-account check | FP-002 | [library](../domains/library/library/business-rules.md) |
| Q-LIB-02 | Should "Remove from reading" also clear per-chapter progress? | Privacy vs. convenience | FP-015 | [library](../domains/library/library/business-rules.md) |
| Q-LIST-01 | Should lists show owner-only placeholders for unavailable stories? | Silent disappearance | FP-014 | [reading-lists](../domains/library/reading-lists/business-rules.md) |
| Q-LIST-02 | Must unlisted lists be non-enumerable? | Privacy promise in UI copy | FP-014 | [reading-lists](../domains/library/reading-lists/business-rules.md) |
| Q-LIST-03 | Should public lists be discoverable? | FP-028 scope | FP-028 | [reading-lists](../domains/library/reading-lists/business-rules.md) |

### Studio

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-TEAM-01 | May editors publish and schedule chapters? | Invite copy says no, RPC says yes | FP-016 | [collaboration](../domains/studio/collaboration/business-rules.md) |
| Q-TEAM-02 | Are "owner-only story delete" and "editors don't delete chapters" security rules or UI conventions? | FP-001 scope | FP-001 | [collaboration](../domains/studio/collaboration/business-rules.md) |
| Q-TEAM-03 | Auto-cancel invitations to a soft-deleted story? Notify removed collaborators? | Pending invites count toward the cap of 20 | FP-016 | [collaboration](../domains/studio/collaboration/business-rules.md) |
| Q-STM-01 | What may a suspended account still do to its own stories? | F-STM-05 scope | FP-002 | [story-management](../domains/studio/story-management/business-rules.md) |
| Q-STM-02 | At what story count does the Studio list need pagination? | Loads everything today | — | [story-management](../domains/studio/story-management/business-rules.md) |
| Q-STAT-01 | Should stats stay available for soft-deleted stories? | Stats RPCs ignore `deleted_at` | — | [analytics](../domains/studio/analytics/business-rules.md) |
| Q-EDT-01 | Should empty (0-word) chapters be publishable? | Quality of published content | FP-034 | [chapter-editor](../domains/studio/chapter-editor/business-rules.md) |
| Q-EDT-02 | A scheduled publish uses the draft at due time and credits the last saver without re-checking role/status. Intended? | Accountability | FP-010 | [chapter-editor](../domains/studio/chapter-editor/business-rules.md) |
| Q-EDT-03 | Should editors be able to cancel a schedule? | Role matrix | FP-016 | [chapter-editor](../domains/studio/chapter-editor/business-rules.md) |
| Q-EDT-04 | Two tabs in one browser share one local backup key — acceptable? | WBS 3.6 lists it as unverified | FP-003 | [chapter-editor](../domains/studio/chapter-editor/business-rules.md) |
| Q-EDT-05 | Should a live chapter be able to schedule its next version? | Explains F-EDT-01 | FP-010 | [chapter-editor](../domains/studio/chapter-editor/business-rules.md) |
| Q-HIST-01 | Should restore snapshot the draft it replaces? | Undo for restore | FP-003 | [version-history](../domains/studio/version-history/business-rules.md) |
| Q-HIST-02 | Should moderators get read-only version history (RLS allows it; the screen says "not found")? | Moderation context | FP-024 | [version-history](../domains/studio/version-history/business-rules.md) |

### Trust & Safety

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-MOD-01 | What exactly does a suspension hide (all lists, sitemap, story page, comments, sign-in)? | Lists disagree today | FP-002 | [moderation](../domains/trust-safety/moderation/business-rules.md) |
| Q-MOD-02 | Is it acceptable that a moderator role change applies only when the JWT refreshes? | Revoked moderators keep access until then | — | [moderation](../domains/trust-safety/moderation/business-rules.md) |
| Q-MOD-03 | Should moderators remove a single chapter instead of the whole story? | Chapter reports remove the story today | FP-024 | [moderation](../domains/trust-safety/moderation/business-rules.md) |
| Q-MOD-04 | Should a moderator be able to lock an author-hidden comment? | WBS 6.2 implies yes | FP-006 | [moderation](../domains/trust-safety/moderation/business-rules.md) |
| Q-MAT-01 | Should age confirmation be asked again after the reader hides 18+? | WBS says "not twice"; UI re-asks | FP-005 | [mature-content](../domains/trust-safety/mature-content/business-rules.md) |
| Q-MAT-02 | Should other people's lists respect the viewer's 18+ choice? | F-MAT-02 fix | FP-005 | [mature-content](../domains/trust-safety/mature-content/business-rules.md) |
| Q-MAT-03 | Should sign-out reset the choice; should a guest's choice be uploaded to an account? | Shared devices | FP-005 | [mature-content](../domains/trust-safety/mature-content/business-rules.md) |
| Q-MAT-04 | Should moderators be able to mark a story 18+ instead of removing it? | Only remedy today is removal | FP-024 | [mature-content](../domains/trust-safety/mature-content/business-rules.md) |
| Q-ABU-01 | Who changes `abuse_limits` in production, and how is it audited? | No UI, no audit row | FP-007 | [abuse-limits](../domains/trust-safety/abuse-limits/business-rules.md) |
| Q-ABU-02 | Is "two links per comment, counted per URL" the intended policy? | F-ABU-01 fix | FP-007 | [abuse-limits](../domains/trust-safety/abuse-limits/business-rules.md) |
| Q-ABU-03 | Should a limited user be told when they can retry? | Server knows the window | FP-007 | [abuse-limits](../domains/trust-safety/abuse-limits/business-rules.md) |

### Cross-cutting (external / owner actions)

| ID | Question / action | Blocks |
| --- | --- | --- |
| Q-X-01 | Legal policy for account deletion (retention, takedown requests) — WBS §4 "Còn mở" | FP-008 |
| Q-X-02 | Legal pages content (WBS 6.9) | — |
| Q-X-03 | Owner actions in Supabase dashboard: leaked-password protection, Auth redirect URLs, Google OAuth keys, staging project (WBS 0.0) | FP-009 |

Total open questions: 56 domain questions + 3 cross-cutting.


---

## 4. Phase 2 consolidation decisions (2026-11-05)

Documentation decisions taken while merging the Phase 2 reviews. They organise the proposals; they do **not**
approve any of them.

| ID | Decision | Rationale |
| --- | --- | --- |
| DEC-013 | Phase 2 identifiers (`JRN-`, `CAP-`, `SE-`, `BRC-`, `BM-`) and the six verification tags are added to [CONVENTIONS](../CONVENTIONS.md#3-identifiers) | Traceability from journey → capability → screen → proposal |
| DEC-014 | **BRC-SHELL-01** is read as one pattern for both focused frames: the shell-less reader (FP-043, WBS §1.2 `(reader)`) and the studio writing frame (FP-058, WBS §1.2 `(studio)`) | Same root cause (sticky bars under the site header, verified at runtime for the reader); one `AppShell` variant |
| DEC-015 | Story card variants live in FP-037 (`grid`, `row`, `rail`); FP-045 only chooses the variant per screen ("compact" = `rail`) | Two reviews proposed the same component |
| DEC-016 | FP-052 is merged into FP-044 (in-story continuity); the Home "Continue reading" rail moves from FP-044 to FP-047 (cross-story "what's new") | Three proposals overlapped; one resolver (FP-012) |
| DEC-017 | Legal page content and copyright requests: FP-065. Footer, icons, manifest, default share card: FP-039 | Two reviews proposed legal pages |
| DEC-018 | FP-060 (pre-publish review) reuses the reader-visibility model of FP-054 and delivers FP-034's first-publish confirmation | Avoid two visibility indicators |
| DEC-019 | FP-066 (operations area) displays job health specified in FP-010 and leaves per-target history to FP-024 | Avoid three specifications of the same data |
| DEC-020 | Colliding IDs renumbered at merge: engagement & library Q-NOTI-04/05 → **Q-NOTI-06/07**, Q-CMT-03 → **Q-CMT-04**; account & platform BRC-SHELL-01 → **BRC-SHELL-02** | Two reviews picked the same next number |
| DEC-021 | Phase 1 line citations corrected: `report-button.tsx` (−278), `report-card.tsx` (−87), `require-user.ts:78-82` → `:29-33`, `moderation.api.ts:221-228` → `model/report.ts:161-162`; all 1,924 citations now point inside their files | Found during Phase 2; see [coverage report](../audits/coverage-report.md#7-phase-2-update-2026-11-05) |
| DEC-022 | Breakpoint conflict resolved: one review proposed header section links from `md`, another a bottom nav below `lg`. Adopted (as a proposal): **bottom nav below `lg`, header section links from `lg`** (BRC-SHELL-02); the FP-019 amendment was aligned | Avoids two navigation systems at 768–1023 px; keeps a touch-friendly nav on tablets |

### Decisions that block the highest-value Phase 2 proposals

| Question / BRC | Blocks | Why it matters first |
| --- | --- | --- |
| Q-READ-02 + BRC-SHELL-01 | FP-043 (P1), FP-058 | Shell-less reader and writing frames; default of paragraph-comment markers |
| Q-X-02 (+ Q-MOD-08) | FP-065 (P1), FP-039 | Legal content for terms, privacy, guidelines, copyright channel |
| Q-STM-03 (optional) | FP-054 default change only | FP-054 itself needs no decision; changing the default visibility does |
| Q-EDT-06 | FP-058 priority (P1 vs P2) | Is mobile web authoring a launch target? |
| Q-LIB-03 + BRC-LIB-01 | FP-048 stages B/C | One "keep" model replaces save vs follow |
| Q-HOME-02 + BRC-HOME-01 | FP-040/FP-041 ordering | Meaning of "recently updated" |
| Q-STORY-02 + BRC-STORY-01 | FP-044 | Caught-up / read-again behaviour |
| Q-CMT-04, Q-NOTI-06 + BRC-CMT-01, BRC-NOTI-01 | FP-049 | Reply-to-reply and thread notifications |
| Q-MOD-06 + BRC-MOD-02 | FP-063 | Appeal window and reviewer |
| Q-MOD-07 | FP-064 | Scope of a block |

## 5. Phase 2 business-rule change proposals

Each `BRC-*` proposes a change to a rule documented as Verified in `domains/**`. The rule stays in force until the
proposal is approved here and implemented. Status for all: **Proposed — awaiting approval**.

#### From the account & platform review

| ID | Current rule | Proposed change | Why | Blocks |
| --- | --- | --- | --- | --- |
| BRC-AUTH-01 | BR-AUTH-003: username and display name are optional fields on the sign-up form, sent as metadata | Remove them from the sign-up form; collect them in the welcome step (FP-035) where availability is checked. The trigger keeps deriving defaults (BR-AUTH-004 unchanged). | Shorter form, no silent username changes at sign-up (F-AUTH-01) | FP-035, FP-009 |
| BRC-SHELL-02 | BR-SHELL-004: bottom nav shown below `md` (768 px) | Show it below `lg` (1024 px); header section links from `lg` | Tablet portrait has no navigation today (runtime) | FP-019 |
| BRC-I18N-01 | BR-I18N-006: language button in the main header for everyone | Move it into the user menu (members), guest "⋯" menu, footer and auth layout; Settings keeps the full control | Header density at 390 px; label-in-name fix | FP-019, FP-021 |

#### From the discovery & reading review

| ID | Rule(s) affected | Current (Verified) | Proposed | Raised by | Question |
| --- | --- | --- | --- | --- | --- |
| BRC-HOME-01 | BR-HOME-002 (order), BR-HOME-009 ("Updated <relative>"), BR-AUTHOR-008 (following order) | Order by `stories.updated_at`, which moves on any story-row update including metadata edits and republished edits (N-03) | "Recently updated" and the card's "Updated" mean **a new chapter was published**: order by `last_chapter_published_at` (FP-040), then `first_published_at`, then id. Metadata edits no longer move a story. | FP-040, FP-041, SE-AUTHOR-02 | Q-HOME-02 |
| BRC-HOME-02 | BR-HOME-009 (card content) | One card layout; cover, title, author, category, status, synopsis excerpt, reads, votes, updated | Card variants `grid` / `row` / `compact` with an optional facts line (chapters, words/reading time) and in-card reason/rank/progress slots | FP-040, FP-045 | — (design approval only) |
| BRC-STORY-01 | BR-STORY-012, BR-PROG-008 | No target after the last chapter is completed → "Start reading" (chapter 1) | Five CTA states: Start reading · Continue · Ch. N · Caught up (ongoing/hiatus, all read; action Follow) · Read again (completed story, all read) · plus "Continue · Ch. N+1" when new chapters appear | FP-044 | Q-STORY-02 |
| BRC-SRCH-01 | BR-SRCH-003 (matching and relevance), BR-SRCH-009 (suggestions) | Stories match by title only (LIKE or trigram) | Weighted match over title, author name, tag names (and synopsis if approved), with `match_field`. Suggestions include top authors and tags. | FP-042 | Q-SRCH-02 |
| BRC-READ-01 | BR-READ-013 (four preferences) | Size, spacing, font, background | Add a fifth closed-list preference `paragraphComments` (`all` / `withComments` / `off`) with a default per Q-READ-02. Same storage, sync and ≤ 512-byte limit (BR-READ-014…017). | FP-043 | Q-READ-02 |
| BRC-RANK-01 | BR-RANK-004 (positions), BR-RANK-006 (URL params) | Positions over all eligible stories; `period` only | Optional `scope` (category slug or `new`). Positions are continuous within the scope. | FP-046 | Q-RANK-02 |

#### From the engagement & library review — BRC-LIB-01 — Save and story-follow become one "keep" with a notify setting

| Field | Value |
| --- | --- |
| Rules affected | BR-LIB-001 (independence), BR-LIB-008 (tab content and Following sort), BR-LIB-005 (button set) — all Verified; WBS 4.3 note "hai khái niệm tách biệt" |
| Proposed text | "A story is *in my library* when I saved it or follow it. Following is shown as the notify setting of a library story. Saving a story for the first time also follows it unless the reader's 'notify by default' setting is off. Unfollowing keeps the save. Unsaving removes both. Existing save-only rows keep notify off; existing follow-only rows show as saved with notify on. The Following list is ordered by latest chapter publish time." |
| Unchanged | Tables, RPCs `set_story_follow`/`set_story_save`, counters (BR-LIB-004), notification audience (BR-NOTI-003 still = follows) |
| Migration | Staged A → B → C (§1.6); no backfill; rollback = UI revert |
| Approval | Product owner; open question Q-LIB-03 |

#### From the engagement & library review — BRC-CMT-01 — "Reply" available on replies (storage stays one level)

| Field | Value |
| --- | --- |
| Rules affected | BR-CMT-005 (one level; reply inherits paragraph) — kept for storage; SCR-CMT-01-AC10 "a reply has no Reply button" — changed |
| Proposed text | "A reply may be answered. The answer is stored as a reply to the same top-level comment, with `reply_to_comment_id` naming the reply it answers and a '@Name ' text prefix the writer may edit. Replying to a reply via API with a `parent_comment_id` that is itself a reply still fails with 22023." |
| Approval | Product owner; Q-CMT-04 |

#### From the engagement & library review — BRC-NOTI-01 — Reply notifications reach thread participants

| Field | Value |
| --- | --- |
| Rules affected | BR-NOTI-004 (recipient = parent author only), BR-NOTI-002 catalogue row |
| Proposed text | "For each visible reply, notify: the parent comment's author; the author of the addressed reply; and up to 10 most recent other distinct repliers of the thread. Exclude the replier, inactive accounts, users who muted the thread (BR-NOTI-018) and users who switched off `notify_comment_replied`. One notification per recipient per reply." |
| Approval | Product owner; Q-NOTI-06 |

#### From the studio management review

| ID | Rule | Current (Verified) | Proposed | Reason |
| --- | --- | --- | --- | --- |
| BRC-STM-01 | BR-STM-003 Studio row content | "n chapters" = all chapter rows the team can read (drafts, archived, deleted included) | Card shows "n published · m drafts" (deleted excluded, archived counted only in Chapters tab) and, for owner/co-author, reads + followers | The current count misleads; supports FP-055 |
| BRC-TEAM-01 | BR-TEAM-009 Team screen is owner-only | Co-authors/editors see "Only the owner can manage this" | Viewing members is open to every team role; managing (invite, cancel, remove others, change role) stays owner-only | Transparency; RLS already allows reading |
| BRC-STAT-01 | BR-STAT-003 Retention | Ratio of lifetime reads N / N−1, shown for every chapter but the first | Keep the stored value; **display** "Too early" when chapter N was first published < 7 days ago (threshold configurable in the client constant) | Avoid false drop-off alarms for new chapters |

#### From the writing & history review

| ID | Rule affected | Proposed change | Why | Linked |
| --- | --- | --- | --- | --- |
| BRC-SHELL-01 | BR-SHELL-001 "Every regular page uses the main shell" | Studio writing screens (SCR-EDT-01, SCR-HIST-01, SCR-HIST-02) render in a studio writing frame without the mobile bottom navigation and with a screen-specific sticky action bar instead of the browsing header (route group `(studio)` as planned in WBS §1.2). | Keyboard + bottom nav + header leave little writing space; sticky bars collide (preview). | FP-058, Q-EDT-06; consolidate with the reader agent's shell-less `(reader)` proposal |
| BRC-HIST-01 | BR-HIST-006 "Restore a version into the draft" (step 4: delete the device backup; no undo) | Before writing, store the current saved draft as a `before_restore` checkpoint (server) and keep the device backup until the restore succeeds; offer Undo. | F-HIST-01; Q-HIST-01 | FP-059, FP-003 |
| BRC-EDT-01 | BR-EDT-021/022 "snapshot taken from the draft as it is at the due time" | (Only if Q-EDT-02/Q-EDT-05 decide so) store `scheduled_revision` at scheduling; at due time publish only if the draft revision still equals it, otherwise keep the chapter scheduled-failed and notify the author (FP-010 failure path). | Half-finished edits going live; enables scheduling the next version of a live chapter. | FP-010, Q-EDT-02, Q-EDT-05 |

#### From the trust & safety review

| ID | Rule affected | Current (Verified) | Proposed | Why | Linked |
| --- | --- | --- | --- | --- | --- |
| BRC-MOD-01 | BR-MOD-001 Moderator role | Role = JWT `app_metadata.role`, set by service role; revocation effective at token refresh | Role stored in `staff_roles` (moderator/admin) and projected into the JWT by a Custom Access Token hook; sensitive RPCs also check the table | Role UI with audit (WBS 6.1 not done); immediate revocation for sensitive actions (Q-MOD-02) | FP-066, Q-MOD-02, Q-MOD-09 |
| BRC-MOD-02 | BR-MOD-016 Effects of a suspension | Every write gated by `is_active_account()` is refused | Exception: a suspended account may submit an appeal against its own suspension or against actions on its content, and may manage its blocks | A suspension must be contestable; blocking only protects the user | FP-063, FP-064, FP-002 |
| BRC-MOD-03 | BR-MOD-004 Who may report (guest behaviour) | Guest → `/login?next=<pathname>`; query string and hash not kept | `next` keeps path + query + hash and a `report=<kind>:<id>` intent; the dialog reopens after sign-in | Guest intent is lost, especially for comments (JRN-MOD-07) | SE-MOD-02-AC03 |
| BRC-MAT-01 | BR-MAT-003 Changing the choice | Every control re-asks the age statement when going hidden → shown | When `ageConfirmed` is true, turning 18+ on needs no repeated age statement | Matches WBS 5.6 "ẩn rồi bật lại không hỏi hai lần" (Documented) | Q-MAT-01, SE-MAT-01-AC08 |
| BRC-MAT-02 | BR-MAT-011 The 18+ mark belongs to the author | Only owner/co-author set `is_mature`; moderators have no action | A moderator may set `is_mature = true` through `moderate('set_mature')` with an audit row. While that action is the latest on the story, the author cannot clear the flag (guard trigger like `stories_guard_removal`) but can appeal (FP-063) | Proportionate remedy for mis-rated stories instead of removal | Q-MAT-04, FP-024 |


## 6. Phase 2 open questions

Status for all rows: **Open**. Numbering continues each code's Phase 1 sequence.

#### From the account & platform review

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-AUTH-04 | Should the first-run welcome be offered to every new member (skippable) and should username/display name move from sign-up into it? | Conversion vs. identity quality; changes BR-AUTH-003 | FP-035, BRC-AUTH-01 | JRN-ACC-01 |
| Q-AUTH-05 | Deactivation and deletion semantics: is a deactivated account hidden like a suspended one, can it reactivate by signing in, and is there a grace period (proposed 14 days) before anonymisation? | Irreversible data change; needs legal input with Q-X-01 | FP-008 | JRN-ACC-04 |
| Q-AUTH-06 | After a password reset or change, should other sessions be ended (default on, user can untick)? | Security remedy for compromised accounts; tied to Q-AUTH-01 | FP-009 | JRN-ACC-03 |
| Q-SET-01 | Should app theme and reduced-motion follow the account across devices (like language) or stay on the device (like the reader preferences on Royal Road, BM-01)? | Schema columns vs. device-only | FP-036 | JRN-ACC-05 |
| Q-SHELL-02 | Tablet and header layout: bottom nav up to `lg`? Where do the 18+ toggle and language control live when they leave the header? | Navigation at 768 px; trust-safety owns the 18+ control | FP-019, BRC-SHELL-02, BRC-I18N-01 | SE-SHELL-01 |
| Q-SHELL-03 | Who supplies brand assets (logo, app icon, default share image) and the footer's About/Contact text? | Needed for FP-039 and WBS 7.5 | FP-039 | SE-SHELL-01 |
| Q-SEO-03 | Should filtered Home pages (`/?category=…`, `/?tag=…`) be indexable landing pages with their own canonical/title, or canonicalise to `/`? | Duplicate content vs. category landing SEO | FP-039 (defaults) | CAP-PLAT-07 |

Existing questions this draft relies on: Q-AUTH-01, Q-AUTH-02, Q-SHELL-01, Q-I18N-01, Q-X-01, Q-X-02, Q-X-03.

---

#### From the discovery & reading review

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-HOME-02 | Should "Recently updated" (feed order, card "Updated", following feed) mean "a new chapter was published" instead of "the story row changed"? | Today a typo fix or a republished edit moves a story to the top (N-03). This is a ranking-fairness and trust question. | FP-040 ordering use, FP-041 default sort, BRC-HOME-01 | SE-HOME-01, SE-AUTHOR-02 |
| Q-HOME-03 | Which length buckets and reading speed should be used (e.g. short < 20k words, medium 20–100k, long > 100k; ~200 words/min for Vietnamese)? Per language or global? | Filter semantics and the reading-time label | FP-040 (reading time), FP-041 (length filter) | FP-040 |
| Q-STORY-02 | What should a reader who read every published chapter see: "Caught up · Follow" (ongoing), "Read again" (completed)? Should finished, completed stories leave the library "Reading" tab and the continue rail? | Today they are told to "Start reading" (N-04). This overlaps library behaviour. | FP-044, BRC-STORY-01 | SE-STORY-01 |
| Q-SRCH-02 | Should story search also match author names, tags and the synopsis, and with which relative weights? | Relevance vs noise. The synopsis needs a new index. | FP-042, BRC-SRCH-01 | SE-SRCH-01 |
| Q-READ-02 | In the immersive reader: (a) is the shell-less layout (no site header, no bottom nav) approved as planned in WBS §1.2? (b) auto-hide bars on mobile? (c) default for paragraph-comment markers (`all` / `withComments` / `off`)? | Comment visibility drives comment engagement (WBS Q6 made paragraph comments an M2 feature). Hiding markers by default may reduce it. | FP-043, BRC-READ-01 | SE-READ-01 |
| Q-RANK-02 | Which stories count as "new" for the New & rising scope: first published within 30 days? Only an author's first story? A minimum number of chapters? | Prevents gaming (re-creating stories) and defines exposure fairness | FP-046, BRC-RANK-01 | SE-RANK-01 |

---

#### From the engagement & library review

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-LIB-03 | Approve the unified keep model (BRC-LIB-01)? Should "notify by default on save" be on, and should it apply only to new saves? | Changes an approved WBS 4.3 decision and notification volume | FP-048 stages B and C | JRN-RDR-08, §1.6 |
| Q-LIB-04 | Which count does the Library show: chapters published since my last read ("new") or published chapters after my continue chapter ("left")? Both? | Badge meaning, sort order, and consistency with Q-PROG-01 | FP-047 | SE-LIB-01 |
| Q-CMT-04 | Allow answering a reply in place (stored one level, @Name prefix) — BRC-CMT-01? | Changes SCR-CMT-01-AC10; moderation and abuse surface | FP-049 | JRN-RDR-09 |
| Q-NOTI-06 | Who is notified in a thread (parent author, addressed reply author, other participants), with what cap, and is a thread mute needed — BRC-NOTI-01? | Notification volume vs. conversation continuity | FP-049 | JRN-RDR-09 |
| Q-NOTI-07 | Email digest: opt-in or opt-out, daily or weekly default, which email provider, legal text for unsubscribe and consent? | First out-of-app channel; legal (relates to Q-X-02) | FP-026 (amended) | JRN-RDR-10/11 |

---

#### From the studio management review

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-STM-03 | Should new stories still default to Private (BR-STM-006), or default to Public/Unlisted, given that first publish keeps visibility? | Every author who keeps the default publishes invisibly; FP-054 mitigates but does not change the default | FP-054 (optional part) | studio-manage draft, JRN-AUT-01 |
| Q-STM-04 | Should followers be notified when a story changes to Completed or Hiatus (new notification types)? | Readers learn lifecycle changes only from a badge | FP-026 scope | JRN-AUT-03 |
| Q-TEAM-04 | Is ownership transfer needed (owner leaves, or owner account deleted under DEC-007 while co-authors remain)? | Shared stories may become unmanageable | — (no FP yet) | CAP-AUTH-11 |
| Q-STAT-02 | May authors see *who* follows a story, or only counts and daily totals? | Privacy of `story_follows` (own-read RLS today) | FP-056 | JRN-AUT-05/06 |
| Q-CMT-03 | Should editors see the author comments tab (read-only), and is a cross-story comments inbox wanted later? | Role matrix BR-TEAM-010 excludes editors from moderation | FP-057 | JRN-AUT-05 |

#### From the writing & history review

| ID | Question | Why it matters | Linked |
| --- | --- | --- | --- |
| Q-EDT-06 | Is writing chapters in the mobile **web** app (390 px) a launch target, or is mobile authoring deferred to the Capacitor app (WP 7.1 "studio rút gọn")? | Sets FP-058 priority (P1 vs P2) and whether the docked toolbar is built for web or only for Capacitor. | FP-058 |
| Q-EDT-07 | Should chapters have a structured author's note (before/after the chapter), outside the body, word count, diff and paragraph comments? | Authors otherwise write notes into the body, inflating counts and creating comment anchors on notes. | CAP-AUTH-28 |
| Q-EDT-08 | Should the editor open offline (recently edited chapters cached on the device) and sync on reconnect, with CAS conflicts handled as today? | Commute writing; scope of WP 7.4 (offline is planned for reading only). | CAP-AUTH-34 |
| Q-HIST-03 | Checkpoint retention and visibility: how many automatic checkpoints per chapter / how long; may named checkpoints be deleted and by whom; purge on account deletion (WBS Q7)? | Storage, privacy of removed text. | FP-059 |
| Q-NOTI-04 | When a chapter's first publish produced no follower notification (story private/suppressed at processing), should the announcement be re-armed for the next time the chapter is published while the story is public? | Today `first_published_at` is set anyway, so followers are never told. | FP-060, BR-NOTI-003 |

Existing questions this draft depends on: Q-EDT-01, Q-EDT-02, Q-EDT-04, Q-EDT-05, Q-HIST-01, Q-NOTI-02, Q-NOTI-03,
Q-READ-01 (chapter number shown in the editor header).

---

#### From the trust & safety review

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-MOD-05 | Should the queue group reports by target ("cases") and sort by severity tier? Which reasons form which tier (proposal: tier 1 sexual/violence/hate, tier 2 harassment/copyright, tier 3 spam/other)? | Time-to-action on the most harmful content | FP-024 (amendment), SE-MOD-01 | JRN-MOD-01 |
| Q-MOD-06 | Appeals: who may appeal (affected party only?), within what window (proposal 30 days), one per action, and must a different moderator decide? | Due process vs. a small team | FP-063 | JRN-MOD-05 |
| Q-MOD-07 | Scope of a block: also stop the blocked user commenting on the blocker's stories and remove their follow? | Author protection vs. openness of public stories | FP-064 | JRN-MOD-07 |
| Q-MOD-08 | Copyright requests from non-members: published contact address only, or an anonymous form once captcha (FP-009) exists? Who owns the address? | Legal reachability vs. anonymous abuse | FP-065 | JRN-MOD-05 |
| Q-MOD-09 | Is a separate `admin` role needed for staff and threshold changes, or are all moderators trusted with them? | Least privilege | FP-066 | JRN-MOD-06 |
| Q-MAT-05 | Should sign-up ask for a birth year (or an "I am 18+" statement) so that accounts declared under 18 cannot turn on 18+ content? | Age-appropriate experience for minors (CAP-TNS-14); today any account can self-declare at any time | — (no FP until decided) | JRN-MOD-04 |
| Q-MAT-06 | Should "continue" at the gate reveal only that story (per-story pass) instead of turning 18+ on for every list? The current behaviour is documented in WBS 5.6. | Readers who follow one shared link may not want their lists to change. The proposal keeps global + explains + Undo (SE-MAT-01) | SE-MAT-01 copy | JRN-MOD-04 |

---


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
| DEC-013 | Lucian UX/UI Prompt is a **reference** for interaction/motion: vendored agent skill (`.claude/skills/lucian-uxui`, with StoryNest override rules) + motion tokens and a global reduced-motion clamp in `packages/design-tokens`; elements are rewritten as `packages/ui` widgets, never pasted into screens. All 400 elements checked one by one in [lucian-uxui-mapping](../audits/lucian-uxui-mapping.md): 24 applied (all 14 high-value ports done), 116 to port (50 M, 66 L; frontend only, existing data), 38 need backend, 37 covered, 185 no surface | Project owner, 2026-11-05 | Trial, porting in batches by value (rollback: revert the batch commits; the skill folder is self-contained) | Port rows may add frontend behaviour; anything needing a table/RPC/column stays in "Needs backend" |

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

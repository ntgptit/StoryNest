# Draft studio-manage

Scope: author experience outside the chapter editor — Studio home, story setup and lifecycle, chapter organisation,
collaboration, statistics and reader interaction from the author side. Writing/editor/history/publishing (SCR-EDT-01,
SCR-HIST-01/02) belong to the `studio-write` agent and are only referenced. Baseline commit `204a1ea`, analysed
2026-11-05.

**Evidence limitation.** Every Studio screen requires a signed-in session. No runtime screenshots exist for
SCR-STM-01/02/03, SCR-CHM-01, SCR-TEAM-01 or SCR-STAT-01 (Phase 1 only verified the guest redirect to
`/login?next=…`, DEC-011). Everything below about these screens is `Verified (Code)`, `Documented` or `Inferred`;
layout effects (wrapping, heights at 390/768/1280 px) are **Inferred from Tailwind classes**, never observed.
`Verified (Runtime)` is used only for reader-facing pages a guest can open (story page, author page) that show the
*result* of author choices. Friction is marked **Confirmed** only when the code makes it certain; otherwise
**Hypothesised**.

## 1. Journeys

### JRN-AUT-01 — Becoming an author (reader → first story)

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-01 |
| User goal | A reader who wants to write finds where to start, creates a first story and understands what to do next. |
| Current workflow | Bottom nav "Viết" / user menu "Studio" (`shell/components/main-shell.tsx:16`, `user-menu.tsx:64`) → guest is redirected to `/login?next=/studio` (BR-STM-023) → after sign-in `/studio` (SCR-STM-01) shows header button "Write a new story" and, with no stories, the empty state "You don't have any stories yet / Stories you create or are invited to collaborate on will appear here." → `/studio/new` (SCR-STM-02) → "Create story" → lands on Edit story (SCR-STM-03) → must find "Manage chapters" → add chapter → "Write" (SCR-EDT-01). |
| Friction points | (1) **Confirmed** — the empty state has no call to action and no guidance; the only create button sits in the page header (`studio-screen.tsx:119-124,142`), although `EmptyState` supports an `action` (`packages/ui/src/widgets/empty-state.tsx:15-16,31`). (2) **Confirmed** — after creating, the author lands on a long settings form whose only forward path is a small text link "Manage chapters" (`story-form-screen.tsx:93-98`); the next step ("write chapter 1") is two screens away. (3) **Confirmed** — adding a chapter does not open it; the author must find "Write" on the new row (`chapter-manager-screen.tsx:299-306`). (4) **Confirmed** — a new story is private + draft by default (`studio/model/story-form.ts:21-32`, BR-STM-006) and publishing the first chapter leaves visibility unchanged ("Visibility stays the owner's choice", `20261103000200_publish_chapter_rpc.sql:193`), so a first-time author who never touches Visibility publishes into a story nobody else can open, and no follower notification is sent (`20261103000300_outbox_worker_and_cron.sql:50`). Neither the editor nor the chapter manager mentions visibility (grep of `packages/features/src/editor` finds no visibility reference). (5) **Hypothesised** — desktop users have no visible route to the Studio except the avatar menu (U-SHELL-01). (6) **Hypothesised** — profile bio/avatar are never suggested to new authors; at runtime the dev author page shows "Tác giả chưa viết giới thiệu" and letter placeholders instead of covers (`rt2/shots/m-author.png`, Verified (Runtime) on dev data only). |
| Missing capabilities | Guided first-run (what a story is, the 3 steps to go live); a direct "create → first chapter → editor" path; a clear "who can read this right now" status. |
| Proposed improvement | Onboarding empty state + first-story checklist (FP-055); go-live status and checklist (FP-054); after create, land in the story workspace on the Chapters tab with "Write chapter 1" as the primary action (FP-053, SE-STM-02); "Add and write" in the chapter manager (SE-CHM-01); desktop nav entry "Write" (FP-019). |
| Expected value | Fewer abandoned first stories; first chapters actually reach readers; lower support load ("my story doesn't show"). |
| Affected screens | SCR-SHELL-01, SCR-STM-01, SCR-STM-02, SCR-STM-03, SCR-CHM-01, SCR-EDT-01 (ref), SCR-PRF-02 |
| Dependencies | FP-019 (desktop nav), FP-032 (guest "Start writing" CTA), FP-034 (first-publish confirmation) |
| Evidence | Code refs above; WBS 3.1/3.2 "Đã làm" notes; runtime author page (dev data) |

### JRN-AUT-02 — Creating a new story and managing its metadata

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-02 |
| User goal | Set title, URL, synopsis, cover, category, tags, language, status, visibility and 18+ correctly, and see how readers will see it. |
| Current workflow | WF-STM-02 (create) → WF-STM-04 (cover, edit page only) → WF-STM-03 (edit settings, tags) → WF-STM-07 (slug change, redirects per BR-STM-010). One form for create and edit (`story-form-screen.tsx:109-453`). |
| Friction points | (1) **Confirmed** — cover cannot be set during creation ("Save the story first…", `story-form-screen.tsx:206-210`); after create the toast/redirect does not point at the cover block. (2) **Confirmed** — the "Public" hint ignores that a Draft story is invisible; switching a live story back to Draft hides it with no warning (U-STM-01, BR-STM-019/020). (3) **Confirmed** — no preview of the reader-facing card/page before saving; "View story page" exists only on the Studio row (`studio-screen.tsx:91-96`). (4) **Confirmed** — the edit header says "Edit story" without the story's name (`story-form-screen.tsx:92`); browser tab title is the static "Chỉnh sửa truyện" (`apps/web/src/lib/strings.ts`, `studio/story/[id]/page.tsx:8`). (5) **Confirmed** — Save, Cancel and the destructive "Delete story" share one row (`story-form-screen.tsx:397-433`). (6) **Confirmed** — no unsaved-changes guard (U-STM-03 → FP-003); tags lost on partial failure (U-STM-06 → FP-018). (7) **Hypothesised** — single 12-field column with no grouping makes the essential fields (title, synopsis, cover) look as important as rarely changed ones (language, slug). |
| Missing capabilities | Live reader preview; grouped "Basics / Discovery / Audience & visibility" sections; impact warning before a change that removes reader access. |
| Proposed improvement | Grouped form inside the story workspace with a reader-card preview and go-live panel (SE-STM-02/03, FP-053, FP-054); post-create focus on cover + first chapter; keep all existing fields and validation. |
| Expected value | Better-quality metadata (covers, synopses, tags) feeding discovery; fewer accidental hides. |
| Affected screens | SCR-STM-02, SCR-STM-03, SCR-STORY-01 (result) |
| Dependencies | FP-003, FP-018, FP-017 (category provisioning) |
| Evidence | Code refs above; runtime story/author pages show letter placeholders for coverless stories (orchestrator observation, `rt2/shots/m-story.png`) |

### JRN-AUT-03 — Managing story visibility and lifecycle

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-03 |
| User goal | Move a story through draft → ongoing → completed/hiatus, choose private/unlisted/public, delete and restore safely, and know at any moment who can read it. |
| Current workflow | Status and Visibility selects in SCR-STM-03 (BR-STM-019/020); first publish moves draft → ongoing (BR-STM-020); "Delete story" (owner, soft) → Studio "Show deleted stories (n)" → Restore (WF-STM-05/06). |
| Friction points | (1) **Confirmed** — reader access depends on three fields (visibility, status ≠ draft, `deleted_at`) plus "has a published chapter" for anything to read, but no screen states the combined result (`auth_and_rls.sql:93-101`). (2) **Confirmed** — moderator-removed story looks self-deleted, Restore always fails (F-MOD-02/F-STM-02 → FP-006). (3) **Confirmed** — delete failure is silent (F-STM-03 → FP-018). (4) **Confirmed** — co-authors can delete via API (F-STM-01 → FP-001). (5) **Confirmed** — no impact information in the delete or visibility change: the author is not told how many followers/library savers lose access, although `story_stats.followers/saves` exist and are readable by the team (`init_schema.sql:320-328`, `auth_and_rls.sql:363-364`). (6) **Hypothesised** — "Completed" and "Hiatus" are silent to followers; readers learn it only from the badge (runtime story page shows status badge "Đang ra", `m-story.png`). (7) **Confirmed** — deleted stories never expire and have no "delete permanently"; acceptable (WBS 3.2 "không có xóa cứng"), no change proposed. |
| Missing capabilities | Computed reader-visibility state; change-impact warning; removal state (FP-006). |
| Proposed improvement | FP-054 (reader-visibility status, go-live checklist, impact warnings); FP-006 amendment (removed state in workspace header/dashboard); FP-001/FP-018 unchanged in scope. Open question Q-STM-04 on status-change notifications. |
| Expected value | Authors never hide or expose a story by accident; trust in moderation outcomes. |
| Affected screens | SCR-STM-01, SCR-STM-03, SCR-CHM-01, SCR-EDT-01 (ref) |
| Dependencies | FP-001, FP-006, FP-018, FP-026 (notification types) |
| Evidence | Code refs above |

### JRN-AUT-04 — Collaborating with editors and co-authors

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-04 |
| User goal | Owner invites the right person with the right role; collaborators know what they may do, who else is on the team, and can leave. |
| Current workflow | Owner: Studio row "Collaborators" → SCR-TEAM-01 invite by exact username + role → invitee notified → accepts in Studio inbox (SCR-STM-01 C03) → story appears with role badge (WF-TEAM-01…04). |
| Friction points | (1) **Confirmed** — editor role hint contradicts real rights (F-TEAM-01 → FP-016, Q-TEAM-01). (2) **Confirmed** — no leave, no role change (F-TEAM-02/03 → FP-016). (3) **Confirmed** — co-authors and editors cannot see who else is on the team: the Team URL shows "Only the owner can manage this" (`team-screen.tsx:62-64`), although RLS lets any team member read `story_collaborators` and active profiles (`auth_and_rls.sql:182-184,213-214`). (4) **Confirmed** — invite needs the exact username with no lookup/preview (`team-screen.tsx:238-252`); errors arrive only after sending. (5) **Confirmed** — no attribution: the chapter manager does not show who last edited or published a chapter although `chapter_drafts.updated_by` and `chapter_versions.created_by` exist (`init_schema.sql:127-148`, `chapters.api.ts:6-7`). (6) **Confirmed** — the invite form is the last element, below both lists (`team-screen.tsx:103-200,231`). (7) **Hypothesised** — an invitee cannot judge an invitation: the inbox shows story title, inviter and role but not what the role allows (`my-invitations.tsx:30-32`). |
| Missing capabilities | Read-only team view for collaborators; contributor attribution; username lookup; ownership transfer (see CAP-AUTH-11, Q-TEAM-04). |
| Proposed improvement | FP-016 amendment (read-only team view, leave, attribution, role copy in invite and inbox, lookup preview); Team as a workspace tab visible to all roles (FP-053); BRC-TEAM-01 (Team screen no longer owner-only for viewing). |
| Expected value | Fewer wrong-role invites, safer collaboration, accountability on shared stories. |
| Affected screens | SCR-TEAM-01, SCR-STM-01, SCR-CHM-01, SCR-NOTI-01 |
| Dependencies | FP-016, Q-TEAM-01, Q-TEAM-03 |
| Evidence | Code refs above; WBS 3.8 "Đã làm" |

### JRN-AUT-05 — Interacting with readers (author side)

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-05 |
| User goal | See and answer what readers say about my story, remove abuse, and know who follows me. |
| Current workflow | Author opens their own chapter in the reader, scrolls to comments or opens a paragraph sheet, replies or uses "Hide comment" (BR-CMT-014, owner/co-author). Followers: public counts on the story page and author page only. Notifications for authors: only `comment_replied` when someone replies *to the author's own comment* and collaboration events (`notifications/model/notification.ts:6-12`). |
| Friction points | (1) **Confirmed** — no notification when a reader comments on the author's story or follows it/them (only 5 notification types exist; FP-026 proposes the types). (2) **Confirmed** — no Studio place that lists recent comments across chapters; the author must open each chapter to find new comments (no such RPC/screen in `packages/features/src/studio` or `analytics`). (3) **Confirmed** — no shortcut from the public story page or reader back to the Studio for team members (grep of `story/`, `reader/`, `author/` screens finds no `/studio` link). (4) **Confirmed** — follower count is shown publicly on the story page (`m-story.png` people icon, Verified (Runtime)) but not in the Studio or stats screen (`story-stats-screen.tsx:111-124`). (5) **Hypothesised** — without an "Author" badge (U-CMT-04 → FP-025) author replies are not recognisable. |
| Missing capabilities | Author-side comment inbox with unreplied/hidden filters; follower trend; "Edit in Studio" from public pages. |
| Proposed improvement | FP-057 (reader conversations tab); FP-056 (followers in stats); FP-053 (team-only "Open in Studio" link on story page/reader); FP-026 and FP-025 unchanged but referenced. |
| Expected value | Faster author responses → stronger engagement loop (J3); abuse handled sooner. |
| Affected screens | SCR-STAT-01, SCR-STORY-01, SCR-READ-01, SCR-CMT-01, workspace tab (new) |
| Dependencies | FP-025, FP-026, Q-CMT-03, Q-STAT-02 |
| Evidence | Code refs above |

### JRN-AUT-06 — Understanding story performance

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-06 |
| User goal | Know whether the story is growing, which chapter loses readers and what changed after the last update. |
| Current workflow | Studio row "Stats" (owner/co-author) → SCR-STAT-01: 7/30/90-day tabs, three range totals (reads, new likes, new comments), reads-only daily bars, per-chapter table with retention (BR-STAT-001…010). |
| Friction points | (1) **Confirmed** — the page does not name the story and is reachable only from the Studio row (U-STAT-01 → FP-019, moved to FP-053). (2) **Confirmed** — no lifetime totals, followers or saves, although `story_stats` holds them (`init_schema.sql:320-328`). (3) **Confirmed** — no comparison with the previous period; the chart has no dates/axis and per-day values are mouse-only (`daily-chart.tsx:17-31`, U-STAT-02 → FP-022). (4) **Confirmed (definition) / Hypothesised (impact)** — retention compares lifetime reads of chapter N with lifetime reads of N−1 (`20261104002100_author_stats.sql:59-60`), so a chapter published yesterday always shows very low "retention" against a chapter that has been read for months. (5) **Confirmed** — selected range is local state, lost on reload (`story-stats-screen.tsx:50`). (6) Open — reads by the team count (Q-PROG-02). |
| Missing capabilities | Lifetime and follower figures; trend vs previous period; fair retention; accessible data table. |
| Proposed improvement | FP-056 (audience insights) + BRC-STAT-01 (retention definition); workspace header (FP-053). |
| Expected value | Authors make better decisions (which chapter to rework, when to publish); more return visits to Studio. |
| Affected screens | SCR-STAT-01, SCR-STM-01 (summary figures) |
| Dependencies | FP-022, Q-PROG-02, Q-STAT-01, Q-STAT-02 |
| Evidence | Code refs above; WBS 6.5 |

### JRN-AUT-07 — Maintaining published content

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-07 |
| User goal | Keep a long serial tidy: reorder, archive, fix URLs, see what is scheduled or has unpublished edits, update the story when a new chapter goes out. |
| Current workflow | SCR-CHM-01: one-step up/down arrows, Write, Change URL slug, Archive/Unarchive, Delete/Restore (WF-CHM-01…06); editing/publishing in SCR-EDT-01 (other agent). |
| Friction points | (1) **Confirmed** — reorder is one position per click/request (U-CHM-03 → FP-033). (2) **Confirmed** — scheduled date not shown (U-CHM-01 → FP-010). (3) **Confirmed** — renaming a chapter slug breaks old links; the dialog says so (`strings.en.ts:43-44`, F-CHM-03 → FP-011). (4) **Confirmed** — deleted story's chapter manager fails with "Chapter not found." (U-CHM-02 → FP-018). (5) **Confirmed** — rows show no word count, publish date, reads or "edited since publish"; the list selects only id/slug/order/status/schedule/deleted/updated_at + draft title (`chapters.api.ts:6-7`), although `chapter_versions.word_count/published_at` exist. (6) **Confirmed** — up to 7 actions per live row (2 icon buttons 36 px, 5 `sm` buttons 32 px — `chapter-manager-screen.tsx:177-238`, `packages/ui/src/components/button.tsx:22-25`), below the 44 px touch target; on 390 px the row wraps into several button lines (Inferred from `flex-wrap`). (7) **Confirmed** — the add form sits under the whole list (`chapter-manager-screen.tsx:252`). |
| Missing capabilities | Status-at-a-glance per chapter (published date, unpublished edits, last editor); compact row actions; add-at-top. |
| Proposed improvement | SE-CHM-01 (row redesign with overflow menu, status line, add-and-write); FP-033 amendment (move-to-position on mobile); FP-010/FP-011/FP-018 unchanged in scope. |
| Expected value | Faster maintenance of long serials; fewer mis-taps on destructive actions. |
| Affected screens | SCR-CHM-01, SCR-EDT-01 (ref) |
| Dependencies | FP-010, FP-011, FP-018, FP-033 |
| Evidence | Code refs above |

## 2. Capability rows

| Capability ID | Capability | Current StoryNest | Evidence | User value | Recommendation |
| --- | --- | --- | --- | --- | --- |
| CAP-AUTH-01 | First-run onboarding for new authors | Partial | Empty state without CTA/guidance (`studio-screen.tsx:142`); entry via bottom nav "Viết" | High — converts readers into writers | FP-055 |
| CAP-AUTH-02 | Studio dashboard: all my stories with health and next action | Partial | Rows show badges, chapter count, updated time only (`studio-screen.tsx:31-59`); no figures, sort/filter/search, no pagination (Q-STM-02); chapter count includes drafts and deleted chapters (`studio.api.ts:11` + `auth_and_rls.sql:103-112`) | High for multi-story authors | FP-055 |
| CAP-AUTH-03 | Story metadata (title, slug, synopsis, category, tags, language, status, visibility, 18+) | Implemented | BR-STM-005…021 | Core | none (layout/grouping in SE-STM-02/03) |
| CAP-AUTH-04 | Cover management | Implemented (edit only) | `cover-editor.tsx`; create shows "save first" | Discovery quality | none (post-create prompt in SE-STM-02) |
| CAP-AUTH-05 | Reader-visibility status & go-live readiness | Missing | No combined state anywhere; private default kept after first publish (`publish_chapter_rpc.sql:193`) | High — prevents "published but invisible" | FP-054 |
| CAP-AUTH-06 | Story lifecycle (status, visibility, delete/restore, moderator removal) | Partial | F-STM-01/02/03, U-STM-01 | Safety, trust | FP-001, FP-006, FP-018, FP-054 |
| CAP-AUTH-07 | Chapter organisation (add, reorder, slug, archive, delete/restore, schedule display) | Partial | U-CHM-01/03, F-CHM-03, U-CHM-02 | Serial upkeep | FP-033, FP-010, FP-011, FP-018 (+ SE-CHM-01) |
| CAP-AUTH-08 | Consistent story workspace navigation (Details / Chapters / Team / Stats) | Missing | See §3.0 matrix; WBS §1.2 planned a `(studio)` area (`docs/WBS.md:64`) | High — every Studio session | FP-053 |
| CAP-AUTH-09 | Invite / accept / cancel / remove collaborators | Implemented | WF-TEAM-01…04, BR-TEAM-001…012 | Core | none |
| CAP-AUTH-10 | Leave, change role, team transparency, contribution attribution | Missing | F-TEAM-02/03; Team owner-only (`team-screen.tsx:62-64`); `updated_by`/`created_by` unused in Studio | Medium–High on shared stories | FP-016 (amended) |
| CAP-AUTH-11 | Ownership transfer | Missing | No RPC/UI; owner is `stories.owner_id` | Low frequency, but matters for account deletion (DEC-007) | none — Q-TEAM-04 |
| CAP-AUTH-12 | Story statistics (daily, per chapter, retention) | Implemented (Partial depth) | BR-STAT-001…010; no lifetime/followers; mouse-only values | High | FP-056 |
| CAP-AUTH-13 | Audience growth (followers over time, period comparison) | Missing | `story_follows.created_at` exists (`init_schema.sql:220-225`), no aggregate | Medium–High | FP-056 |
| CAP-AUTH-14 | Comment moderation by the author (hide/unhide) | Implemented | BR-CMT-014, WBS 6.2 | Safety | none |
| CAP-AUTH-15 | Author-side comment inbox across chapters | Missing | No list outside the reader | High for active serials | FP-057 |
| CAP-AUTH-16 | Notifications about reader activity on my stories (new comment, new follower) | Missing | 5 types only (`notification.ts:6-12`) | High | FP-026 (existing; see §7) |
| CAP-AUTH-17 | Shortcut from public story/reader to Studio for team members | Missing | No `/studio` link in story/reader/author screens | Medium | FP-053 |
| CAP-AUTH-18 | Author profile and branding (name, bio, avatar, author page) | Partial | `app_users` has display_name/bio/avatar only (`init_schema.sql:13-26`); author page lists owned stories only (Q-AUTHOR-01) | Medium | none (bio/avatar nudge inside FP-054 checklist) |
| CAP-AUTH-19 | Announcements / messages to followers | Missing | No feature | Unproven demand | none (revisit after FP-026 telemetry) |

## 3. Screen enhancements

### 3.0 Studio information architecture (cross-screen assessment)

**Is there a consistent story workspace? No.** `Verified (Code)`. Each story-level screen is an independent page in
the full app shell (`apps/web/src/app/(main)/studio/**`; no `layout.tsx` under `studio/`), with its own header, back
link and width:

| Screen | Names the story | Up/back link | Links to sibling story tools | Content width | Browser tab title |
| --- | --- | --- | --- | --- | --- |
| SCR-STM-01 Studio home | — | — | Per row: Edit, Manage chapters, Collaborators (O), Stats (O, CA), View story page (`studio-screen.tsx:60-97`) | main column | "Studio" |
| SCR-STM-03 Edit story | **No** ("Edit story", `story-form-screen.tsx:92`) | none (Cancel → `/studio`) | "Manage chapters" only (`:93-98`) | `max-w-xl` 576 px | static "Chỉnh sửa truyện" |
| SCR-CHM-01 Chapters | In description (`chapter-manager-screen.tsx:122`) | "Back to story details" → Edit (`:123-128`) | none | `max-w-2xl` 672 px | static |
| SCR-TEAM-01 Team | In description (`team-screen.tsx:95`) | "Back to story details" | none | `max-w-2xl` | static |
| SCR-STAT-01 Stats | **No** (`story-stats-screen.tsx:68`) | "← Back to Studio" (`:69-75`) | none | `max-w-3xl` 768 px | static |
| SCR-EDT-01 Editor (ref) | — | → Chapters (`chapter-editor-screen.tsx:294`) | Preview, History | (other agent) | static |

Consequences (`Verified (Code)` unless marked): moving between Edit, Chapters, Team and Stats of one story always
goes back through the Studio list (Stats is not linked from anywhere but the list — U-STAT-01); "Back to story
details" sends an **editor** to a page that only shows the read-only notice (`story-form-screen.tsx:100-102`) — a dead
end; the story's state (visibility, status, removed/deleted) is visible only on the Studio row; the public story page
offers no way back into the Studio. WBS §1.2 planned a separate `(studio)/studio/` area (`docs/WBS.md:64`) that was
not built (`Documented`). Recommendation: **FP-053 story workspace** (shared header + role-aware tabs), applied to
SE-STM-03, SE-CHM-01, SE-TEAM-01, SE-STAT-01. The chapter editor and history stay outside the workspace frame (focused
writing surface, `studio-write` scope) but link back to it.

### SE-STM-01 — Studio home (SCR-STM-01)

**Current experience** — Purpose: list my owned and shared stories (BR-STM-001/002) and launch story tools. Structure:
PageHeader "Studio" + "Write a new story"; invitation inbox (only when pending, BR-TEAM-011); story rows (cover,
title, status/visibility/18+/role badges, "n chapters · Updated …", up to 5 `sm` buttons); empty/error/skeleton;
"Show deleted stories (n)" toggle with Restore. Known limitations: F-STM-02 (restore of removed story), U-STM-04
(inbox/deleted list silent on error), U-STM-05 (labels), Q-STM-02 (no pagination).

**Identified opportunities**
- Missing functionality: no per-story figures (reads, followers), no "continue writing", no next scheduled chapter or
  attention items (failed schedule, invisible story, removed story) — `Verified (Code)` (`studio.api.ts:11` selects
  only story columns + chapter count). No sort/filter/search — `Verified (Code)` (`studio-story.ts:53-60`).
- Data accuracy: "n chapters" counts drafts, archived and soft-deleted chapters because the team can read them —
  `Verified (Code)` (`studio.api.ts:11`, `auth_and_rls.sql:103-112`); authors may read it as "published chapters".
- UX/UI: 5 buttons of 32 px per row (`button.tsx:23`) with equal weight; on 390 px with a 64 px cover the buttons wrap
  to 2–3 lines per card — `Inferred` (classes `flex-wrap gap-2`, `w-16`). Title is not a link; the primary action per
  role is unclear — `Verified (Code)`.
- Onboarding: empty state without action or guidance — `Verified (Code)`.
- IA: the deleted list is a toggle at the very bottom; invitations above stories push the list down only when present
  (acceptable).

**Proposed experience**
- **Empty state (no stories, no invitations)**: `EmptyState` with action "Write your first story" (primary, `size="touch"`
  on mobile) and a 3-step explainer: "Create the story → Write chapter 1 → Publish and make it public" (FP-055).
- **Story card** (one per story, `packages/features/studio/components/studio-story-card.tsx`): whole title/cover is a
  link to the story workspace (FP-053, Chapters tab). Content: title, role badge (non-owners), **reader-visibility chip**
  from FP-054 ("Readers can see it" / "Only your team can see it" / "Deleted" / "Removed by a moderator"), status badge,
  18+ badge; one summary line "12 published · 2 drafts · next: Fri 20:00" and, for owner/co-author, "1.2k reads ·
  48 followers" from `story_stats`; attention line (amber) when FP-054/FP-010/FP-006 report a problem.
- **Actions**: primary "Continue writing · Chapter 13" (opens the most recently edited live chapter in SCR-EDT-01; all
  roles) or "Write chapter 1" when none; secondary overflow `DropdownMenu` "More" (Details, Chapters, Team, Stats,
  View story page) filtered by BR-STM-004. Mobile: primary button full width, overflow 44 px icon button. Tablet/desktop:
  primary + "View" + overflow inline.
- **Toolbar** above the list (shown from 4 stories): search by title (client-side), filter chips "All · Mine · Shared ·
  Needs attention", sort "Recently updated / Title / Most read". Chips scroll horizontally on 390 px (existing pattern).
- **Account strip** (desktop ≥ 1024 px as a right column, mobile as one row under the header): total followers of the
  author (`author_follower_count`), total reads across owned stories, pending invitations count (links to inbox).
- **Deleted stories**: keep the toggle; removed-by-moderator items show the FP-006 label instead of Restore.
- Density: card height target ≤ 140 px at 390 px (cover 56 px wide, one action row). Desktop 1280: two-column grid
  of cards is **not** recommended (titles truncate); keep a single list with the account strip on the right.

**Acceptance criteria**
- SE-STM-01-AC01 [Proposed] Given I have no stories and no invitations, When I open `/studio`, Then the empty state shows "Write your first story" And a 3-step explainer And the button opens `/studio/new`.
- SE-STM-01-AC02 [Proposed] Given a story with 3 published, 1 draft and 1 deleted chapter, When its card renders, Then it reads "3 published · 1 draft" And the deleted chapter is not counted.
- SE-STM-01-AC03 [Proposed] Given I am an editor on story S whose most recently edited live chapter is "Chương 5", Then S's primary action is "Continue writing · Chương 5" And it opens that chapter's editor, And S's card shows no reads/followers figures.
- SE-STM-01-AC04 [Proposed] Given a public story whose status is Draft, Then its card shows the chip "Only your team can see it" And an attention line linking to the go-live panel.
- SE-STM-01-AC05 [Proposed] Given 5 stories, When I type "anh" in search, Then only stories whose title matches accent-insensitively remain And clearing the field restores the list.
- SE-STM-01-AC06 [Proposed] Given a 390 px viewport, Then every interactive control on a card has a target of at least 44×44 px And a card's actions occupy one row.

**Impact** — Frontend: new card + toolbar + empty state in `features/studio`. Backend/API: one RPC
`studio_story_summaries()` (FP-055). Database: none beyond the RPC. Shared components: reuse `EmptyState`,
`DropdownMenu`, `Badge`, `StatPill`. Business rules: BRC-STM-01 (row content). Other screens: workspace (FP-053).

**Related** — FP-055, FP-054, FP-053, FP-006, FP-010, FP-020 (U-STM-04), FP-022 (U-STM-05); F-STM-02, Q-STM-02.

**Priority** — P2: every author session starts here, but nothing is broken; depends on FP-054 for the chip.

### SE-STM-02 — Create story (SCR-STM-02)

**Current experience** — Purpose: create a story (BR-STM-005…009). Structure: PageHeader "New story", cover hint
"save first", 9 fields in one `max-w-xl` column, "Create story"/"Cancel". On success → Edit story (SCR-STM-03).
Limitations: F-STM-04, U-STM-01, U-STM-03, U-STM-05, U-STM-06.

**Identified opportunities**
- Workflow: after creation the author lands on the same form again (edit mode) rather than on the next step (cover,
  first chapter) — `Verified (Code)` (`use-story-editing` → `/studio/story/{id}`, SCR-STM-02-A04).
- UX: all fields carry equal weight; Language, Status and URL slug are rarely changed at creation; Status offers
  "Ongoing/Completed/Hiatus" for a story with no chapters — `Verified (Code)` (`story-form-screen.tsx:329-352`).
- Expectation: Visibility defaults to Private with hint "Only you and your collaborators can view it." but nothing says
  the author must change it later to be read — `Verified (Code)` (`strings.en.ts:181-185`, `story-form.ts:29`).
- No live preview of the story card — `Verified (Code)`.

**Proposed experience**
- Two groups: **Basics** (title, synopsis, category, tags) visible; **More settings** (`details`-style disclosure,
  collapsed on mobile, open on ≥ 768 px): URL slug, language, 18+; Status is **not** shown at creation (stays Draft,
  BR-STM-006) — it becomes editable in Details once the story exists.
- **Visibility** stays (default Private, unchanged rule) as a 3-option radio group with consequences written out:
  "Private — only your team, even after you publish", "Unlisted — anyone with the link", "Public — listed on Home,
  search and rankings once a chapter is published" (fixes U-STM-01 copy).
- **Live card preview** (desktop right column at ≥ 1024 px; mobile collapsible "Preview" under the form) built from the
  existing `StoryCard` widget with the letter placeholder, so authors see why a cover matters.
- Primary "Create story", secondary "Cancel" (guarded per FP-003). On success → story workspace **Chapters** tab with
  a one-time banner "Story created. Next: add a cover · write chapter 1" (two buttons) instead of the edit form.
- Mobile: single column, sticky bottom action bar (Create / Cancel) above the bottom nav; desktop: form 576 px +
  preview 320 px.

**Acceptance criteria**
- SE-STM-02-AC01 [Proposed] Given the create form, Then Status is not shown And a created story has status Draft.
- SE-STM-02-AC02 [Proposed] Given I select "Private", Then the hint states that published chapters stay invisible to readers until visibility is changed.
- SE-STM-02-AC03 [Proposed] Given I type a title and pick a category, Then the preview card shows the title, category and the letter placeholder within 300 ms.
- SE-STM-02-AC04 [Proposed] Given the story is created, Then I land on `/studio/story/{id}/chapters` And a banner offers "Add a cover" (opens Details at the cover block) and "Write chapter 1" (creates chapter 1 and opens the editor).
- SE-STM-02-AC05 [Proposed] Given a 390 px viewport, Then "More settings" is collapsed by default And the action bar stays visible above the bottom navigation.

**Impact** — Frontend: `story-form-screen.tsx` split into sections, preview, post-create route. Backend: none
(chapter creation reuses `create_chapter`). Database: none. Shared: `StoryCard`, `RadioGroup` (new tiny UI primitive or
styled `Select` fallback). Business rules: none changed (defaults kept). Other screens: SCR-CHM-01 banner.

**Related** — FP-053, FP-054, FP-055, FP-003, FP-018; U-STM-01, U-STM-03, U-STM-06, F-STM-04.

**Priority** — P2: improves first-story success; the invisible-story risk itself is handled at P1 in FP-054.

### SE-STM-03 — Edit story (SCR-STM-03)

**Current experience** — Purpose: change settings, cover, tags; owner deletes/restores (WF-STM-03…07). Structure:
header "Edit story", "Manage chapters" link, deleted notice, editor read-only notice, cover block, 9 fields, Save/
Cancel/Delete row, confirm dialog. Limitations: F-STM-01/02/03/05/06, U-STM-01/02/03/05.

**Identified opportunities**
- IA: no story name, no sibling navigation, no "View story page" (see §3.0) — `Verified (Code)`.
- Safety: destructive "Delete story" sits beside "Save changes" (`story-form-screen.tsx:397-433`) — `Verified (Code)`;
  no impact info (followers/savers) — `Verified (Code)`.
- Visibility/status changes that hide a live story save silently — `Verified (Code)` (U-STM-01).
- Editors see only a notice; they cannot even see the metadata they write for — `Verified (Code)` (`:100-102`).
- Slug hint wrong in edit mode (U-STM-02).

**Proposed experience** (inside the FP-053 workspace, tab **Details**)
- Sections with headings: **Cover & basics** (cover block left of title/synopsis on ≥ 768 px), **Discovery**
  (category, tags, language), **Audience** (status, visibility, 18+) with the **go-live panel** (FP-054) at its top,
  **Danger zone** (owner only, separated card at the bottom: Delete story / Restore story with impact text "48 followers
  and 112 readers who saved it will lose access").
- Changing visibility to Private or status to Draft on a story readers can currently open shows an inline warning
  under the field before saving and a confirm dialog on Save (FP-054).
- Editor role: read-only rendering of the same sections (values as text, no inputs) + "Ask the owner to change these"
  — replaces the bare notice.
- Save bar: sticky at the bottom on mobile while the form is dirty ("Unsaved changes · Save"); desktop keeps the button
  under the form. Unsaved-changes guard per FP-003.
- Slug hint in edit mode: "Old links keep working: readers are redirected to the new address." (U-STM-02, BR-STM-010).

**Acceptance criteria**
- SE-STM-03-AC01 [Proposed] Given I open Details of "Ánh chiều", Then the workspace header shows "Ánh chiều" And the browser tab title contains "Ánh chiều".
- SE-STM-03-AC02 [Proposed] Given a public ongoing story with ≥ 1 published chapter, When I change Visibility to Private, Then a warning under the field says readers will lose access And Save asks for confirmation before writing.
- SE-STM-03-AC03 [Proposed] Given I am the owner, Then "Delete story" is shown only in the Danger zone card And its dialog states the current followers and saves counts.
- SE-STM-03-AC04 [Proposed] Given I am an editor, Then I see the story's title, synopsis, category, tags, status, visibility and 18+ as read-only text And no input, cover button or delete button.
- SE-STM-03-AC05 [Proposed] Given edit mode, Then the slug hint says old links redirect to the new address.
- SE-STM-03-AC06 [Proposed] Given the form is dirty on a 390 px viewport, Then a sticky save bar is visible And it disappears after a successful save.

**Impact** — Frontend: section layout, danger zone, read-only view, warnings. Backend/API: none (counts from
`story_stats`, already readable). Database: none. Shared: `ConfirmDialog` (with error display per FP-018).
Business rules: none changed. Other screens: workspace (FP-053).

**Related** — FP-053, FP-054, FP-001, FP-003, FP-006, FP-018; U-STM-01/02/03/05, F-STM-01/02/03.

**Priority** — P1 for the visibility/status warning (part of FP-054); P2 for the rest.

### SE-CHM-01 — Chapter manager (SCR-CHM-01)

**Current experience** — Purpose: order, slug, status and lifecycle of chapters (WF-CHM-01…06). Structure: header,
"Back to story details", ordered list of rows (Chapter n, draft title, status badge, `/slug`, up to 7 actions), numbering
note, add form at the bottom, rename dialog, confirm dialog. Limitations: F-CHM-01, F-CHM-03, U-CHM-01/02/03, U-STM-05.

**Identified opportunities**
- Status at a glance missing: no published date, word count, reads, "edited since publish", last editor —
  `Verified (Code)` (`chapters.api.ts:6-7`; data exists in `chapter_versions`, `chapter_drafts.updated_by`,
  `chapter_stats`).
- Row density and target size: up to 7 controls of 32–36 px (`button.tsx:22-25`) — `Verified (Code)`; multi-line
  wrapping on 390 px — `Inferred`.
- Workflow: "Add chapter" does not open the editor; add form at the end of long lists — `Verified (Code)`.
- Reader link: no "View in reader" for published chapters — `Verified (Code)`.
- Deleted chapters are listed inline (struck through) after live ones; fine for few, noisy for many — `Inferred`.

**Proposed experience** (workspace tab **Chapters**, default landing tab of a story)
- **Top bar**: primary "New chapter" (opens an inline sheet with title + slug; submit "Create and write" →
  `create_chapter` then navigate to SCR-EDT-01; secondary "Create only"). Counts: "12 published · 2 drafts · 1
  scheduled".
- **Row** (one line on ≥ 768 px, two lines on 390 px): drag handle/position number · title · status chip with detail
  ("Published 3 Nov", "Scheduled Fri 20:00" per FP-010, "Draft", "Archived") · "Edited since publish" dot when the draft
  is newer than the published version · meta "1,240 words · 312 reads" (reads only for owner/co-author) · "Last edited
  by Minh" when a collaborator edited (FP-016 amendment). Row actions: primary "Write" (44 px on mobile) + overflow
  menu: View in reader (published), Move to position… (FP-033), Change URL slug, Archive/Unarchive, Delete — filtered by
  BR-CHM-013. Up/down arrows remain on ≥ 768 px.
- **Deleted chapters** grouped in a collapsed "Deleted (n)" section with Restore (owner/co-author).
- Deleted story: whole tab read-only with the workspace banner (FP-018).
- Empty state: "No chapters yet" + primary "Write chapter 1".

**Acceptance criteria**
- SE-CHM-01-AC01 [Proposed] Given I submit "Create and write" with title "Chương 2", Then the chapter is created And I land in its editor.
- SE-CHM-01-AC02 [Proposed] Given a published chapter whose draft was saved after its last publish, Then its row shows "Edited since publish".
- SE-CHM-01-AC03 [Proposed] Given a published chapter, Then its row shows the first-published date and word count of the live version, And for owner/co-author its reads from `chapter_stats`.
- SE-CHM-01-AC04 [Proposed] Given a 390 px viewport, Then each live row shows at most one visible button plus an overflow button, each ≥ 44 px.
- SE-CHM-01-AC05 [Proposed] Given 2 deleted chapters, Then they appear only inside a collapsed "Deleted (2)" section.
- SE-CHM-01-AC06 [Proposed] Given I am an editor, Then the overflow menu offers View in reader, Move to position and Change URL slug only.

**Impact** — Frontend: row redesign, overflow menu, create sheet. Backend/API: extend `CHAPTER_COLUMNS` with
`published_version:chapter_versions!fk_chapter_published_version(word_count, published_at)`, draft `updated_at,
updated_by` and stats embed — or a `studio_chapter_list(story)` RPC if embeds prove heavy. Database: none. Shared:
`DropdownMenu`, `Sheet`. Business rules: none changed. Other screens: SCR-EDT-01 (navigation target).

**Related** — FP-033 (amended), FP-010 (amended), FP-011, FP-016 (amended), FP-018, FP-022, FP-053; U-CHM-01/02/03, F-CHM-01/03.

**Priority** — P2: highest-frequency maintenance screen; no data-loss risk.

### SE-TEAM-01 — Team (SCR-TEAM-01)

**Current experience** — Purpose: owner invites/cancels/removes collaborators (WF-TEAM-01/03/04). Structure: header,
back link, "Current collaborators", "Invitations" (all statuses), invite form at the bottom, remove dialog. Non-owners
see "Only the owner can manage this". Limitations: F-TEAM-01/02/03, U-TEAM-01, U-STM-05.

**Identified opportunities**
- Transparency: co-authors/editors see nothing about their team although RLS allows reading it — `Verified (Code)`.
- Order: primary action (invite) last — `Verified (Code)`.
- Invite by exact username without preview — `Verified (Code)`; risk of inviting the wrong person — `Hypothesised`.
- The owner is not listed as a member — `Verified (Code)` (`team-screen.tsx:103-134` lists collaborators only).
- Invitation history grows unbounded with cancelled/declined entries — `Verified (Code)` (BR-TEAM-006); low impact.

**Proposed experience** (workspace tab **Team**, visible to all roles)
- **Members** list first: owner row (badge "Owner") + collaborators with role badge, "joined" date and, per FP-016,
  role select (owner only) and "Remove" in an overflow menu; current user's own row has "Leave story" (non-owners).
- **Invite** card (owner only) directly under the header: username field with lookup preview (avatar + display name
  appears when the username resolves, using `search_authors` / `author_profile` — no new data exposure), role as two
  cards with accurate capability lists from BR-TEAM-010 (fixes F-TEAM-01 once Q-TEAM-01 is decided).
- **Invitations**: "Pending" shown; "History" (declined/cancelled/accepted) collapsed.
- Non-owners: read-only Members list + Leave; no invite card.
- Mobile: single column; desktop: members list left (max 640 px), invite card right column.

**Acceptance criteria**
- SE-TEAM-01-AC01 [Proposed] Given I am an editor on story S, When I open the Team tab, Then I see the owner and all collaborators with roles And no invite form And a "Leave story" action on my own row.
- SE-TEAM-01-AC02 [Proposed] Given I am the owner and type an existing username, Then the display name and avatar are shown before I send And an unknown username shows "No user found" without sending.
- SE-TEAM-01-AC03 [Proposed] Given I am the owner, Then the invite card is the first section under the header.
- SE-TEAM-01-AC04 [Proposed] Given 3 declined and 1 pending invitation, Then only the pending one is visible And "History (3)" is collapsed.
- SE-TEAM-01-AC05 [Proposed] Given I select the role "Editor", Then the role card lists exactly the editor rows of BR-TEAM-010.

**Impact** — Frontend: team screen restructure. Backend/API: none for read-only view (RLS already allows); username
preview reuses `author_profile(username)`. Database: none. Shared: `Avatar`, `DropdownMenu`. Business rules:
BRC-TEAM-01 (BR-TEAM-009 owner-only viewing). Other screens: SCR-STM-01 (inbox copy).

**Related** — FP-016 (amended), FP-053, FP-022; F-TEAM-01/02/03, U-TEAM-01; Q-TEAM-01, Q-TEAM-03, Q-TEAM-04.

**Priority** — P2: collaboration correctness is already P2 in FP-016; transparency is cheap with it.

### SE-STAT-01 — Story statistics (SCR-STAT-01)

**Current experience** — Purpose: owner/co-author audience figures (BR-STAT-001…010). Structure: header (no story
name), "Back to Studio", range tabs 7/30/90, three range tiles, reads-only daily bars without axis, per-chapter table
with retention, notes. Limitations: U-STAT-01, U-STAT-02, Q-STAT-01.

**Identified opportunities**
- Missing figures: lifetime reads/likes/comments, followers, saves (`story_stats`) — `Verified (Code)`.
- No trend comparison vs previous period — `Verified (Code)`.
- Chart: reads only, no date axis, values in `title` only — `Verified (Code)`.
- Retention unfair for recent chapters — `Verified (Code)` definition, impact `Inferred`.
- Range not in URL — `Verified (Code)`.

**Proposed experience** (workspace tab **Stats**, owner/co-author; tab hidden for editors as today)
- **Overview row** (StatPill/tiles): All-time reads · Followers · Saves · Likes · Comments (from `story_stats`); on
  390 px a 2-column grid, 768 px 3 columns, 1280 px 5 columns.
- **Range section**: tabs 7/30/90 written to `?range=`; tiles show the range value and "▲ 12% vs previous 30 days"
  (needs `p_days * 2` window, FP-056); metric switch Reads / Likes / Comments / New followers for the chart.
- **Chart**: date labels at start/middle/end, focusable bars or a "Show as table" toggle rendering an accessible
  `<table>` of the series (closes U-STAT-02 with FP-022).
- **By chapter**: add "Published" date column; retention shows "Too early" for chapters published less than 7 days ago
  (BRC-STAT-01); sort by any column; row links to the chapter in the chapter manager. Mobile: table keeps horizontal
  scroll but freezes the chapter column.

**Acceptance criteria**
- SE-STAT-01-AC01 [Proposed] Given story S with `story_stats.followers = 48`, When I open Stats, Then the overview shows "48" followers And the header names S.
- SE-STAT-01-AC02 [Proposed] Given I choose 7 days, Then the URL contains `range=7` And reloading keeps 7 days.
- SE-STAT-01-AC03 [Proposed] Given 120 reads in the last 30 days and 100 in the 30 days before, Then the Reads tile shows "+20%".
- SE-STAT-01-AC04 [Proposed] Given a chapter first published 2 days ago, Then its retention cell shows "Too early" with a tooltip/description explaining why.
- SE-STAT-01-AC05 [Proposed] Given keyboard-only use, When I activate "Show as table", Then every day's reads, likes and comments are readable as table cells.

**Impact** — Frontend: overview, comparison, chart labels, table toggle, URL state. Backend/API: extend
`author_story_daily` (days up to 180 for comparison, new-followers column) or add `author_story_summary` (FP-056).
Database: index `story_follows (story_id, created_at)` (today only `idx_story_follows_story (story_id)`, `init_schema.sql:363`). Shared: `StatPill`, `Tabs`. Business rules:
BRC-STAT-01, BR-STAT-004 extension (followers series). Other screens: SCR-STM-01 summary.

**Related** — FP-056, FP-053, FP-022, FP-019 (U-STAT-01 moved to FP-053); Q-STAT-01, Q-STAT-02, Q-PROG-02.

**Priority** — P3 for the insights; the naming/navigation part is P2 via FP-053.

## 4. New feature proposals

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

## 5. Amendments to existing FPs

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

## 6. BR change proposals and open questions

### BR change proposals (require approval; the BRs themselves are not edited)

| ID | Rule | Current (Verified) | Proposed | Reason |
| --- | --- | --- | --- | --- |
| BRC-STM-01 | BR-STM-003 Studio row content | "n chapters" = all chapter rows the team can read (drafts, archived, deleted included) | Card shows "n published · m drafts" (deleted excluded, archived counted only in Chapters tab) and, for owner/co-author, reads + followers | The current count misleads; supports FP-055 |
| BRC-TEAM-01 | BR-TEAM-009 Team screen is owner-only | Co-authors/editors see "Only the owner can manage this" | Viewing members is open to every team role; managing (invite, cancel, remove others, change role) stays owner-only | Transparency; RLS already allows reading |
| BRC-STAT-01 | BR-STAT-003 Retention | Ratio of lifetime reads N / N−1, shown for every chapter but the first | Keep the stored value; **display** "Too early" when chapter N was first published < 7 days ago (threshold configurable in the client constant) | Avoid false drop-off alarms for new chapters |

### Open questions (continue numbering)

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-STM-03 | Should new stories still default to Private (BR-STM-006), or default to Public/Unlisted, given that first publish keeps visibility? | Every author who keeps the default publishes invisibly; FP-054 mitigates but does not change the default | FP-054 (optional part) | studio-manage draft, JRN-AUT-01 |
| Q-STM-04 | Should followers be notified when a story changes to Completed or Hiatus (new notification types)? | Readers learn lifecycle changes only from a badge | FP-026 scope | JRN-AUT-03 |
| Q-TEAM-04 | Is ownership transfer needed (owner leaves, or owner account deleted under DEC-007 while co-authors remain)? | Shared stories may become unmanageable | — (no FP yet) | CAP-AUTH-11 |
| Q-STAT-02 | May authors see *who* follows a story, or only counts and daily totals? | Privacy of `story_follows` (own-read RLS today) | FP-056 | JRN-AUT-05/06 |
| Q-CMT-03 | Should editors see the author comments tab (read-only), and is a cross-story comments inbox wanted later? | Role matrix BR-TEAM-010 excludes editors from moderation | FP-057 | JRN-AUT-05 |

## 7. Notes for consolidation

- **Candidate new findings** (no IDs assigned by this agent; suggest next free IDs): (a) Studio "n chapters" counts
  drafts/archived/deleted chapters (`studio.api.ts:11` + `auth_and_rls.sql:103-112`) → suggest F-STM-07, fixed by
  FP-055/BRC-STM-01; (b) default-private story stays private after first publish with no signal anywhere → suggest
  F-STM-08 (A, workflow break of J2), fixed by FP-054 + FP-034 amendment; (c) collaborators cannot view their own team
  → suggest U-TEAM-02, FP-016 amendment; (d) Studio row/chapter row buttons 32–36 px (`button.tsx:22-25`) → add to
  U-STM-05 / FP-022.
- **studio-write agent** (draft `studio-write.md`): capabilities split CAP-AUTH-01…19 (this draft) / CAP-AUTH-20+
  (theirs); writing/publishing capabilities are theirs. Their FP-060 (pre-publish review) already warns about private
  stories at publish time — deliver the FP-034 amendment above **through FP-060** if it is accepted, and make FP-060
  consume FP-054's `readerAccess` model; their Q-NOTI-04 (re-arm follower announcement) complements Q-STM-03. Their
  FP-061 (editing presence) badge in the chapter manager and SE-CHM-01 "Last edited by" should share one row slot.
  FP-054 depends on the first-publish dialog (FP-034/FP-060). Agree on one `readerAccess` model in
  `features/studio/model` that the editor imports. The workspace (FP-053) deliberately excludes SCR-EDT-01/HIST-01/02;
  their back links should target the workspace Chapters tab (URL unchanged). "Edited since publish" in SE-CHM-01 uses
  the same comparison the editor's publish panel would need — share it.
  Naming: their FP-058 "writing workspace" (editor frame) and this FP-053 "story workspace" (story tools frame) are
  different surfaces — keep both names distinct in the merged backlog. Their request for a "Version history" entry in
  the chapter row menu fits the SE-CHM-01 overflow menu (add it there; all roles).
- **account/platform agent**: FP-019 amended (studio bullet moved to FP-053; "Write" label on desktop). Shell route
  groups: if the `(reader)` shell-less group is proposed, the workspace route group `(workspace)` under
  `studio/story/[id]` is compatible (different subtree).
- **community agent**: FP-057 overlaps FP-025 (Author badge) and FP-026 ("comment on my story" notification should
  deep-link to the Comments tab). If the community agent proposes a reader-side comment feature with an RPC by story,
  merge into FP-057's `author_story_comments`. Q-CMT-03 numbering assumes Q-CMT-02 is still the max.
- **discovery agent**: FP-054's "Public is listed on Home/search/ranking once a chapter is published" copy must match
  BR-STORY discovery rules and the suspension policy (FP-002). Q-AUTHOR-01 (co-written stories on author page) is
  related to collaboration transparency but left with discovery.
- **trust-safety agent**: FP-006 amendment adds Studio surfaces only; reason wording follows Q-MOD-04/Q-AUTH-03.
- **Numbering checked** against `decision-register.md` (2026-11-05): max Q-STM-02, Q-TEAM-03, Q-STAT-01, Q-CMT-02
  → new Q-STM-03/04, Q-TEAM-04, Q-STAT-02, Q-CMT-03. Proposed BR ids BR-STM-026/027 and a BR-CMT number are
  placeholders for the owning files.
- **Not verified**: anything visual on Studio screens (no signed-in runtime run); whether `chapters(count)` embed
  performance or the proposed RPCs meet the WBS 0.6 query budget; Wattpad/AO3/Royal Road benchmark statements
  are from general product knowledge, not checked live.

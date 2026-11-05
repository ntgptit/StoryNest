# Product Discovery

What StoryNest needs beyond fixing defects, to become a complete and pleasant reading and writing product. Phase 2
of the functional specification (2026-11-05), built on the Phase 1 spec, the code at `97ccecd` (identical to the
Phase 1 baseline `204a1ea` for application code), guest runtime checks and an external benchmark.
Everything in this document is **Proposed** unless tagged otherwise; approval goes through the
[decision register](decision-register.md) and [`docs/WBS.md`](../../WBS.md) stays the planning authority.
Companion documents: [screen-enhancements.md](screen-enhancements.md) and [feature-backlog.md](feature-backlog.md).
Entry point: [README](../README.md).

**Method.** Seven specialist reviews (account & platform, discovery & reading, engagement & library, studio
management, writing & history, trust & safety, external benchmark) with a final cross-domain consolidation. Evidence
tags: `Verified (Code)`, `Verified (Runtime)`, `Documented`, `Inferred`, `Proposed`, `Unknown`; friction is marked
*Confirmed* or *Hypothesised*.

**Limits.** No signed-in flow was run at runtime (DEC-011: no test accounts on the shared dev project), so member,
author and moderator friction is code-based. There is no usage analytics, so every growth/retention claim is a
hypothesis. Benchmark entries are mostly confirmed from official text in search results; see §5.

## 1. Product capability assessment

### 1.1 Maturity in one table

| Area | Implemented | Partial | Missing | Assessment |
| --- | --- | --- | --- | --- |
| Reading experience | 2 | 3 | 6 | Comfortable text and settings exist; the frame, continuity and end-of-story handling are missing |
| Content discovery | 4 | 7 | 7 | Correct basics (search, rankings, tags); no filters/sort, title-only search, no desktop section nav |
| Reader engagement | 5 | 5 | 7 | Follow, vote, comment and in-app notifications work; return loops and out-of-app channels missing |
| Growth and retention | 0 | 4 | 3 | Sharing previews exist without a share action; no measurement of retention |
| Author experience | 14 | 12 | 24 | Strong writing/publishing core; go-live visibility, workspace, mobile editing and insights missing |
| Trust and safety | 4 | 6 | 16 | Reports and console work; guidelines, appeals, blocking, transparency and operator tools missing |
| Account and personalisation | 4 | 3 | 13 | Email sign-up/sign-in and profile work; OAuth, onboarding, lifecycle and privacy controls missing |
| Platform completeness | 0 | 9 | 10 | Tokens, i18n and SEO basics in place; error pages, tablet/desktop nav, site frame, CSP missing |

(171 capability rows; 2 Unverified, 1 Not applicable. A few capabilities appear from two viewpoints — e.g. sign-up
abuse protection as CAP-ACCT-20 and CAP-TNS-17, account lifecycle as CAP-ACCT-14…16 and CAP-TNS-20 — and are
counted in both areas.)

### 1.2 Strengths (keep and build on)

| Strength | Evidence |
| --- | --- |
| The core loop works end to end: create story → write → autosave with conflict detection → publish/schedule → readers read → followers notified | Verified (Code) WF-EDT-01…10, WF-NOTI-01; Verified (Runtime) reading path |
| Data integrity is strong: RLS on every table, writes through transactional RPCs, immutable versions, idempotent outbox, deduplicated read counting | Verified (Code) + 31 SQL test files passing |
| Paragraph comments bound to stable block IDs — a pattern competitors handle less well when authors edit (BM-12, BM-13) | Verified (Code) BR-CMT-*, BR-EDT-* |
| All UI text is translated (vi/en) with no hard-coded strings, and design tokens are enforced by tooling. **Not yet end-to-end bilingual:** server rendering, `<html lang>` and page titles stay Vietnamese in English mode (U-I18N-01, FP-021) | Verified (Code) `check:hardcode`, `check:tokens`; Verified (Runtime) RT-08 |
| Discovery basics are correct: diacritic-insensitive search, rankings by period, recommendations with reasons, consistent eligibility filters in RPC-backed lists | Verified (Runtime) RT-11/RT-12, discovery consistency matrix |
| Moderation exists with a written reason and an audit row for every action | Verified (Code) BR-MOD-* |

### 1.3 Most important weaknesses

| # | Weakness | Evidence | Addressed by |
| --- | --- | --- | --- |
| W1 | **The reading screen is not finished as a reading screen.** It sits inside the full app shell; once the reader scrolls, the Display/Contents toolbar and the progress bar are covered by the site header, and the bottom nav covers the text. WBS §1.2 planned a shell-less `(reader)` route. | Verified (Runtime) scrolled screenshots at 390 and 1280 px; `reader-screen.tsx:74` vs `app-shell.tsx:24` | FP-043 (P1) |
| W2 | **A new author's first chapter reaches nobody by default.** New stories start Private + Draft; first publish changes status only; nothing shows who can read the story. | Verified (Code) `studio/model/story-form.ts:28-29`, `publish_chapter_rpc.sql:193-196` | FP-054 (P1) |
| W3 | **Readers are not helped to come back.** No continue row on Home, no "new chapter" marks, no share action, no channel outside the app, conversations stop after one reply. | Verified (Code) JRN-RDR-06/10/11 | FP-044, FP-047, FP-051, FP-049, FP-026 |
| W4 | **Navigation and density do not scale beyond phones.** Tablet (768 px) has no navigation at all; desktop has no section links; story cards are ~450–510 px tall. | Verified (Runtime) `t-home.png`, metrics | FP-019, FP-037, FP-045 |
| W5 | **The author workspace is fragmented and not mobile-ready.** Edit/Chapters/Team/Stats are separate pages with different headers and widths; the editor's save state and Publish sit below the whole chapter. | Verified (Code) studio specs §3.0 below | FP-053, FP-058, FP-060 |
| W6 | **Launch prerequisites are missing in trust & safety and accounts:** no legal pages/footer, no appeal, no block, 18+ gate client-only, no account lifecycle. | Verified (Code); WBS 6.4/6.9 ⬜ | FP-065, FP-039, FP-063, FP-064, FP-005, FP-008 |
| W7 | Phase 1 P1 defects are still open (role limits in UI only, inconsistent suspension, text loss on leaving the editor, soft 404s). | [functional gap analysis](../audits/functional-gap-analysis.md) | FP-001…FP-004 |

## 2. User roles and goals

| Role | Who (from the spec) | Primary goals | Journeys |
| --- | --- | --- | --- |
| Guest reader | Anonymous visitor (`requireUser` returns null) | Understand what StoryNest is, find something good quickly, read without friction, decide to join | JRN-RDR-01…06, JRN-ACC-01 |
| Member reader | Signed-in, `account_status = active` | Continue where they left off, keep and organise stories, hear about new chapters, talk with readers and authors | JRN-RDR-06…11, JRN-ACC-02…05 |
| Author (owner) | `stories.owner_id` | Start writing easily, publish to the right audience, keep readers, understand performance, maintain the story | JRN-AUT-01…11 |
| Co-author / editor | Accepted collaborator role | Write and edit within their rights without conflicts | JRN-AUT-04, 08–11 |
| Moderator | JWT `app_metadata.role = 'moderator'` | Triage reports fast, decide with context, act proportionately and reversibly, be accountable | JRN-MOD-01…05 |
| Platform operator | `service_role` today (no UI) | Keep jobs and limits healthy, manage staff roles, answer legal requests | JRN-MOD-05, JRN-MOD-06 |
| Reporter / affected member | Any member | Report safely and learn the outcome; understand and contest an action taken on them | JRN-MOD-07, JRN-MOD-08 |

## 3. End-to-end journey analysis

35 journeys: 11 reader, 11 author, 8 moderation/operator, 5 account. Each table lists the current workflow, friction
(Confirmed / Hypothesised, with evidence), missing capabilities, the proposed improvement and affected screens.
The Phase 1 [workflow map](../workflow-map.md) J1–J7 remain the functional journeys; these JRN entries add the
product view on top of them.

### 3.1 Reader and guest

#### JRN-RDR-01 — First visit (guest)

| Field | Value |
| --- | --- |
| Journey ID | JRN-RDR-01 |
| User goal | Understand what StoryNest offers and find a first story worth opening in under a minute, without an account. |
| Current workflow | Lands on `/` (SSR, WF-HOME-01): hero h1 + intro → "Recently updated" + "See rankings" link → category chips → popular-tag chips → 2/3/4-column card grid with infinite load. Or lands on a story/chapter from a shared link or a search engine (WF-STORY-01, WF-READ-01) with no onboarding. Header: SearchBox (icon on mobile), 18+, VI/EN, Sign in. Bottom nav on mobile: Home, Library, Write, Me (Library, Write and Me send a guest to login). |
| Friction points | **Confirmed:** (1) At 390 px the hero and two chip rows push the first story title to y ≈ 668 px, and each card is 451 px tall, so a guest sees about two stories per screen (Verified (Runtime) `m-home.png`, metrics). (2) There is no call to action, no "what is StoryNest", and no trending or curated entry (U-HOME-02, `apps/web/src/app/(main)/home-hero.tsx:6-12`). (3) On desktop the only route to Rankings is a small text link; there is no section navigation (U-SHELL-01, `d-home.png`). (4) The category chip row is cut off on mobile ("Phiêu lưu" truncated at the edge) with no sign that more exist (Verified (Runtime)). (5) Tag chip "##Kiemhiep" (U-TAX-02, runtime). (6) 3 of the 4 bottom-nav items lead a guest to a login wall (Verified (Code) `features/src/shell/components/main-shell.tsx:13-18`). **Hypothesised:** (7) "Recently updated" (the only ordering) favours stories whose metadata or chapters were just edited, not quality or popularity (N-03). Cold visitors are more likely to convert on popular or completed stories. |
| Missing capabilities | Guest landing with a value proposition and CTA. Trending / new / completed entry points. Compact card density on phones. Visible category overview. |
| Proposed improvement | Amend FP-032 (guest landing composition). FP-045 (row cards on phones). FP-046 (New & rising). FP-041 ("Completed" quick filter). FP-019 (desktop nav). FP-017 amendment (all-categories sheet). |
| Expected value | More stories evaluated per visit; a shorter path to the first chapter; a sign-up CTA where the guest is already engaged. |
| Affected screens | SCR-HOME-01, SCR-SHELL-01, SCR-STORY-01 |
| Dependencies | FP-002 (the home feed must use the shared discovery predicate before more rails are built on it), FP-021 (SSR language), FP-019 |
| Evidence | `m-home.png`, `d-home.png`, metrics.json (`m/home`: 451 px cards), U-HOME-02, U-SHELL-01, U-TAX-02, RT-07 |

#### JRN-RDR-02 — Discovering interesting stories (browse, categories, tags, rankings, recommendations, authors)

| Field | Value |
| --- | --- |
| Journey ID | JRN-RDR-02 |
| User goal | Find something that matches my taste (genre, mood, length, completeness) or what others are enjoying, and find new authors. |
| Current workflow | Home: category chips (root only) and up to 12 popular tags filter the feed (WF-HOME-02). Rankings by period from the Home link (WF-RANK-01). Members get "Recommended for you" (up to 8, unfiltered home only, BR-REC-005). Story page ends with "You might also like" (WF-REC-01). Author pages are reachable from the story page author link or the Authors search tab only (discovery overview §Navigation). |
| Friction points | **Confirmed:** (1) Sub-categories are never shown as chips, and the story-page category badge is not a link (U-TAX-01). (2) A filtered view keeps the generic hero h1; the category or tag is not the page heading (Verified (Code) `apps/web/src/app/(main)/page.tsx:66-70`). (3) Rankings cannot be scoped to a category (N-10). (4) The card's author name is not a link (BR-HOME-009), so authors are discovered only via the story page. (5) No entry point favours new stories or authors: the feed is recency-of-edit, rankings are cumulative (N-03, BR-RANK-001). (6) "You might also like" renders after the **whole** chapter list (`story-screen.tsx:210`), which is unbounded (F-STORY-02), so on long stories it is far below the fold. (7) The recommendation reason and the ranking period line sit **outside** the card as loose text (`recommendations/components/recommendation-list.tsx:38-46`; `d-story.png`, `d-ranking.png`). **Hypothesised:** (8) Guests get no personalisation, so returning guests always see the same feed (FP-027 would provide signals). |
| Missing capabilities | Category landing heading and sub-category browsing; per-category ranking; new and rising discovery; author links from cards; compact recommendation rows. |
| Proposed improvement | FP-046 (ranking scopes: category, new). FP-017 amendment (sub-categories, category heading). FP-045 (card variants with reason/rank inside, author link in row variant). SE-STORY-01 (similar stories moved into a desktop aside / above the long chapter list). FP-029 amendment. |
| Expected value | More paths to a matching story; fairer exposure for new authors (supply-side health); better use of the already-built recommendation engine. |
| Affected screens | SCR-HOME-01, SCR-RANK-01, SCR-STORY-01, SCR-AUTHOR-01 |
| Dependencies | FP-017 (approved category tree, Q-TAX-01/02), FP-002 |
| Evidence | U-TAX-01, `d-ranking.png`, `d-story.png`, `m-home.png`, code refs above |

#### JRN-RDR-03 — Searching and filtering

| Field | Value |
| --- | --- |
| Journey ID | JRN-RDR-03 |
| User goal | Find a known story or author quickly, or narrow a broad interest ("completed romance under 50k words, updated recently"). |
| Current workflow | Header SearchBox (≥ sm: combobox with ≤ 5 title suggestions, BR-SRCH-009; < sm: icon → `/search`) → `/search?q=&tab=` with Stories / Authors / Tags tabs (WF-SRCH-01/02). Diacritic-insensitive (RT-11). Story results are cards with offset paging capped at 200 (BR-SRCH-007). |
| Friction points | **Confirmed:** (1) The Stories tab matches titles only (N-06), so typing an author name or a genre word into the header box gives no story suggestions or results. The reader must guess the right tab. (2) There are no filters or sort on search results or the home feed: no status (completed/ongoing), length, updated-within or "sort by" (Verified (Code) `discovery.api.ts:63-86,100-129`, `search.sql:64-86`). (3) The mobile search page is not autofocused (U-SRCH-02). (4) The cap is shown as "No more results" (F-SRCH-01). (5) Silent load-more errors (U-SRCH-01). (6) 9 of 15 controls are below 44 px at 390 px (metrics `m/search`). (7) Two results fill the whole 390 px screen (`m-search.png`). **Hypothesised:** (8) Readers of Vietnamese web fiction filter by "hoàn thành" (completed) before investing in a long serial. Common practice on comparable platforms; not measured here. |
| Missing capabilities | Cross-field relevance, filters, sort, recent searches, no-result recovery. |
| Proposed improvement | FP-042 (search relevance beyond titles + no-result recovery + recent searches). FP-041 (shared filter/sort model for search and browse). FP-045 (row results on phones). Quick fixes U-SRCH-02, F-SRCH-01. FP-020. |
| Expected value | Fewer empty searches; fewer tab switches; narrowing without scrolling hundreds of cards. |
| Affected screens | SCR-SRCH-01 (+ header SearchBox), SCR-HOME-01 |
| Dependencies | FP-040 (length and last-chapter data for filters), Q-SRCH-02, Q-HOME-03 |
| Evidence | `m-search.png`, `d-search.png`, metrics, `search.sql:75-83`, RT-11 |

#### JRN-RDR-04 — Choosing a story (story page as the decision page)

| Field | Value |
| --- | --- |
| Journey ID | JRN-RDR-04 |
| User goal | Decide in seconds whether this story is worth my time. Readers usually want to know: what is it about, how long is it, is it finished or still updating (and how often), is it popular, who wrote it, what do others like it. |
| Current workflow | Story page (WF-STORY-01): cover, title, author link, category + status (+18+) badges, four icon-only counters, primary CTA, Follow / Save / Add to list, Report (own row), synopsis, tags, chapter list (Chapter N · title · N words), similar stories (BR-STORY-010…015). |
| Friction points | **Confirmed:** (1) There is no total length (words, reading time) and no chapter count in the header. The count appears only in the chapter-list header (Verified (Code) `story-screen.tsx:163-170`; runtime `m-story.png`). (2) There is no "last updated" or new-chapter date, and chapter rows have no dates although `publishedAt` is loaded (U-STORY-02, `story/model/story-detail.ts:53,63`). (3) The four counters are icon + number only. Labels are `sr-only` or a mouse `title` (`packages/ui/src/widgets/stat-pill.tsx:21-29`), so a sighted touch user must guess what the book, heart, speech-bubble and people icons count (`m-story.png`: "4 0 0 0"). (4) At 1280 px the header uses about half of the 1024 px column and the rest is empty. Similar stories come after the full chapter list (`d-story.png`). (5) "Báo cáo" (Report) sits on its own row between the actions and the synopsis (runtime). That secondary action gets the same weight as Follow/Save. (6) 13 of 22 controls are below 44 px at 390 px (metrics). (7) Report is shown to the owner (F-STORY-01). (8) A caught-up member is offered "Start reading" (N-04). **Hypothesised:** (9) Long synopses push the chapter list and CTA context down on mobile (no clamp, `story-screen.tsx:121-123`). |
| Missing capabilities | Decision facts (length, reading time, completion, cadence), labelled social proof, caught-up state, desktop two-column layout, secondary-action overflow. |
| Proposed improvement | FP-040 (story facts). FP-044 (CTA states and chapter read marks). FP-045 (desktop layout and compact similar rows). SE-STORY-01. FP-022 amendment. |
| Expected value | Faster, more confident decisions. Fewer starts that end in a bounce. Better use of the desktop width. |
| Affected screens | SCR-STORY-01, every list that shows the shared card |
| Dependencies | FP-040 before the facts appear on cards. Q-STORY-02, Q-HOME-03. |
| Evidence | `m-story.png`, `t-story.png`, `d-story.png`, metrics `story`, U-STORY-02, F-STORY-01 |

#### JRN-RDR-05 — Reading chapters (comfort, navigation, continuity, immersive mode, progress)

| Field | Value |
| --- | --- |
| Journey ID | JRN-RDR-05 |
| User goal | Read without distraction for a long session: comfortable typography, minimal chrome, always know where I am, move to the next chapter instantly. |
| Current workflow | Chapter reader (WF-READ-01…05) inside the main shell: site header → sticky reader toolbar (back to story, Display sheet, Contents sheet, 2 px progress bar) → "Chapter N" + h1 → blocks with a paragraph-comment button after each paragraph → end marker → vote → report → comment thread → prev/next. Typography preferences apply before paint and sync to the account (BR-READ-013…018). |
| Friction points | **Confirmed:** (1) Full app shell around the reader, against the WBS plan (N-02). About 18 % of a 390 × 844 screen is chrome at the top of a chapter, and the fixed bottom nav overlays the text while reading (`m-reader.png`). (2) Prev/next only after the whole comment thread (U-READ-01). (3) Progress = page scroll including comments (F-PROG-01). (4) A comment button on every paragraph, even with 0 comments, at 50 % opacity (N-09, U-CMT-01). (5) No "chapter 2 of 4" position anywhere in the reader. The TOC shows no read marks and does not scroll to the current chapter on long lists (`reader/components/toc-sheet.tsx:62-81`; `m-reader-toc.png`). (6) 17 of 21 controls are below 44 px at 390 px and 16/16 at 768/1280 (metrics `reader`). (7) The last chapter of an ongoing story gives no "more coming / follow" cue (N-05). **Inferred (Code), high confidence:** (8) Once scrolled, the reader toolbar and progress bar are hidden under the site header (N-01), so Display/Contents need a scroll back to the top. **Hypothesised:** (9) The silent position restore can jump the page after the reader started (N-08). |
| Missing capabilities | Immersive mode (shell-less, auto-hiding chrome), always-visible progress and position, end-of-chapter / end-of-story panel, control of comment markers, keyboard navigation. |
| Proposed improvement | FP-043 (immersive reader route and chrome). FP-012 amendment (nav placement, completion, keys). FP-044 (end-of-story / caught-up panel, TOC read marks, resume notice). FP-022 amendment (targets). |
| Expected value | Longer, less interrupted sessions; more next-chapter clicks (the core engagement metric for serial fiction); fewer accidental taps. |
| Affected screens | SCR-READ-01 (+ settings sheet, TOC sheet, paragraph sheet entry), SCR-SHELL-01 |
| Dependencies | FP-012, FP-004 (not-found inside the new layout), FP-005 (gate before text), Q-READ-02 |
| Evidence | `m-reader.png`, `t-reader.png`, `d-reader.png`, `m-reader-toc.png`, `m-reader-paragraph-sheet.png`, `rt/shots/mobile-reader-last.png`, metrics, N-01, N-02, N-05, N-09 |

#### JRN-RDR-06 — Continuing an unfinished story (cross-device, from home, library or notification)

| Field | Value |
| --- | --- |
| Journey ID | JRN-RDR-06 |
| User goal | Pick up exactly where I stopped, on any device, from wherever I am (home, library, a "new chapter" notification). |
| Current workflow | Members: position saved by block + percent at most every 5 s (BR-PROG-006). Restored on reopening the chapter (BR-PROG-007). Story page CTA "Continue reading · Chapter N" (BR-PROG-008). Library "Reading" tab "Continue with chapter N" (SCR-LIB-01-A02, another agent's screen). Notification `chapter_published` opens the chapter (WF-NOTI-05). Guests: nothing (F-PROG-04). |
| Friction points | **Confirmed (Code):** (1) Home has no "Continue reading" entry. A member must go through Library or find the story again (`apps/web/src/app/(main)/discover-home.tsx:11-15`). (2) Story page and library compute different targets (F-PROG-02). (3) A caught-up reader sees "Start reading" (N-04). (4) Restore is silent, with no "start from the beginning" (N-08). (5) Guests lose their place (F-PROG-04 → FP-027). (6) Notification links break after a chapter slug rename (F-NOTI-01 → FP-011). (7) The story page and TOC do not show which chapters are read or new since the last visit (Verified (Code) `story-screen.tsx:189-205`, `toc-sheet.tsx:43-59`). **Not runtime-verified:** all signed-in behaviour (DEC-011). |
| Missing capabilities | Home continue rail, chapter read state, "new since last visit", caught-up state, resume notice. |
| Proposed improvement | FP-044 (continuity layer: home continue rail, read marks, new badges, CTA states, resume notice, end-of-story panel). FP-012 (one resolver). FP-027 amendment (guests feed the same UI). FP-011 / FP-013 (links, owned elsewhere). |
| Expected value | Higher return-reading rate. Continue from the first screen of the app. No restart confusion for caught-up readers. |
| Affected screens | SCR-HOME-01, SCR-STORY-01, SCR-READ-01, SCR-LIB-01 (reference), SCR-NOTI-01 (reference) |
| Dependencies | FP-012 (shared resolver), FP-027, FP-011, FP-013, Q-PROG-01, Q-STORY-02 |
| Evidence | `progress/model/progress.ts:51-59`, `story-screen.tsx:60-62,105-109`, `use-reading-tracker.ts:69-70`, `rt/shots/mobile-reader-last.png`, F-PROG-02/04, F-NOTI-01 |

---

#### JRN-RDR-07 — Following authors or stories

| Field | Content |
| --- | --- |
| Journey ID | JRN-RDR-07 |
| User goal | "I like this story/author: make sure I don't miss what comes next." |
| Current workflow | **Story follow:** story page → "Theo dõi" (Bell icon) → toast "Đã theo dõi. Bạn sẽ nhận thông báo khi có chương mới." → `chapter_published` notifications on the *first* publish of each chapter (WF-LIB-01, BR-LIB-002, BR-NOTI-003). Followed stories appear in Library → "Đang theo dõi", ordered by follow time (BR-LIB-008). **Author follow:** author page → "Theo dõi" (UserPlus icon) → toast "Đã theo dõi tác giả." → the author's stories appear on `/following` ("Từ tác giả bạn theo dõi"), reachable only from a Home link (WF-AUTHOR-02/03, BR-AUTHOR-007/008). An author follow produces **no notification** (BR-NOTI-003 exceptions). |
| Friction points | (1) **Confirmed:** the same words "Theo dõi"/"Đang theo dõi" mean two different things. A story follow notifies the reader. An author follow only feeds a page the reader must visit (`features/story/strings.ts:18-23` vs `features/author/strings.ts:10-12`; Runtime `m-story.png`, `m-author.png`). (2) **Confirmed:** the Library tab "Đang theo dõi" lists *story* follows, but the route `/following` lists *author* follows' stories (`features/library/strings.ts:9`, `features/discovery/strings.ts:8`). (3) **Confirmed:** there is no list of followed authors and no unfollow outside each author page (F-AUTHOR-01). (4) **Confirmed:** the Following tab is sorted by follow time, not by the latest chapter, so a tab meant for "what's new" does not show what is new (`features/library/api/library.api.ts:55-58`). (5) **Hypothesised:** readers who follow an author expect to hear about new stories and chapters, as they do for story follows. |
| Missing capabilities | Notification for a new story or chapter by a followed author (already scoped in FP-026). A followed-authors list (FP-019). A "new chapters" signal on followed stories inside the app (no FP yet → FP-047). One clear vocabulary (→ FP-048). |
| Proposed improvement | Keep **two** follow concepts but name them by effect: a story gets "Notify me of new chapters" (bell), an author gets "Follow author" with the explicit consequence "Their new stories appear in your feed" (FP-048). Add a Library "Authors" tab with the followed-authors list (FP-019 amendment). Order followed stories by the latest chapter and badge new chapters (FP-047). Add a followed-author notification type that is suppressed when the reader already follows that story, so nobody is notified twice (FP-026 amendment). |
| Expected value | Fewer wrong expectations about who notifies; one place to manage everything followed. Hypothesis: more readers return when an author they like starts a new story. |
| Affected screens | SCR-STORY-01, SCR-AUTHOR-01, SCR-AUTHOR-02, SCR-LIB-01, SCR-NOTI-01, SCR-SET-01 |
| Dependencies | FP-019 (`list_followed_authors`), FP-026 (new type), FP-047, FP-048; Q-NOTI-03 |
| Evidence | BR-LIB-001/002/008, BR-AUTHOR-005…010, BR-NOTI-003; Runtime `m-story.png`, `m-author.png`; code refs above |

#### JRN-RDR-08 — Saving and organising content (library, reading lists)

| Field | Content |
| --- | --- |
| Journey ID | JRN-RDR-08 |
| User goal | "Keep stories I want to read later, and group them my way (and maybe share a group)." |
| Current workflow | The story page offers **three** keep-actions side by side: "Theo dõi", "Lưu vào thư viện", "Thêm vào danh sách" (`features/story/components/story-actions.tsx:24-58`). Save → Library "Đã lưu" (BR-LIB-003/008). Add to list → bottom sheet with list toggles and quick-create (BR-LIST-011). Lists are managed in Library → "Danh sách" (C08) and on `/lists/[id]` (edit C07, reorder ↑/↓, remove, delete). Reading progress also creates a "Đang đọc" entry automatically (BR-LIB-007). |
| Friction points | (1) **Confirmed (Runtime):** at 390 px the three actions plus "Báo cáo" take two rows under "Bắt đầu đọc" (`m-story.png`). (2) **Confirmed:** Save and Follow are independent (BR-LIB-001). A reader who saves gets no new-chapter notices, and the save button never says so. A reader who follows does not get a Saved entry. **Hypothesised:** most readers expect "keep" to imply "tell me about updates" (benchmark: Wattpad's single "Add to library" plus separate reading lists, Inferred). (3) **Confirmed:** the system itself treats save and follow as one "interest" signal: `recommend_for_me` excludes both and scores both equally (BR-REC-004). The distinction is a storage detail that leaks into the UI. (4) **Confirmed:** "Removed from your reading list." (Reading tab) collides with "Reading lists" (U-LIB-02). (5) **Confirmed:** the Lists tab is not addressable and "Back to library" lands on Reading (U-LIB-01). (6) **Confirmed:** there is no copy-link or share action for unlisted/public lists (U-LIST-01). (7) **Confirmed:** the list owner cannot add stories from the list page and must visit each story (`features/lists/strings.en.ts` `page.emptyOwner`). (8) **Confirmed:** unavailable stories silently vanish from lists (F-LIST-02). |
| Missing capabilities | One coherent "keep" model; adding from the list page; sharing a list (→ FP-051); list previews when shared (generic title "Danh sách đọc", BR-LIST-014). |
| Proposed improvement | **FP-048 "One Save":** a single primary "Lưu" button whose state sheet holds "Notify me of new chapters" (on by default, BRC-LIB-01) and the reading-list toggles (today's C09). The Library becomes Reading · Saved (with a bell indicator and a "Notifying me" filter) · Lists · Authors. The migration is staged and needs no data migration (see §1.6). List page: "Add stories" picker from my Saved/Reading (SE-LIST-01) and Share (FP-051). |
| Expected value | One decision instead of three at the moment of interest. The library matches what readers think they did. Hypothesis: a higher share of keepers receive update notifications, which drives returns (JRN-RDR-11). |
| Affected screens | SCR-STORY-01 (action group), SCR-LIB-01, SCR-LIST-01 (+C07, C08, C09) |
| Dependencies | BRC-LIB-01 / Q-LIB-03 approval; FP-015 (URL tabs, paging); FP-014 (list integrity) |
| Evidence | BR-LIB-001, BR-LIB-008, BR-LIST-011, BR-LIST-014, BR-REC-004, U-LIB-01/02, U-LIST-01, F-LIST-02; Runtime `m-story.png` |

#### JRN-RDR-09 — Voting and commenting (chapter, paragraph, replies, author interaction)

| Field | Content |
| --- | --- |
| Journey ID | JRN-RDR-09 |
| User goal | "React to what I just read, talk about a moment in it, and hear back from other readers or the author." |
| Current workflow | At the end of the chapter: vote → report → comments (newest first, 20 per page) → prev/next (`features/reader/screens/reader-screen.tsx:106-125`). Paragraph button → bottom sheet with that paragraph's thread, oldest first (`features/reader/components/reader-blocks.tsx:47-76`). Replies are one level deep. "Reply" appears only on top-level comments (`features/comments/components/comment-item.tsx:170`, SCR-CMT-01-AC10). A reply notifies **only the parent comment's author** (`supabase/migrations/20261104001100_comment_reply_notifications.sql:9-15`, `:45-66`). Story owner and co-authors can hide comments. Readers are never told about a hide (F-NOTI-04). |
| Friction points | (1) **Confirmed:** conversations break after one turn. If A comments, B replies and A answers B, then B is **not** notified (A is the parent author, and B is not a recipient). (2) **Confirmed:** B cannot answer B's own repliers in place, because a reply has no "Reply" button. (3) **Confirmed:** the author's replies look like anyone's: plain name, no badge or avatar (U-CMT-04 → FP-025), and the notification reads "<name> replied to your comment" even when the author replied. (4) **Confirmed (Runtime):** the paragraph button is a 14 px icon at 50 % opacity (`m-reader.png`). On the guest reader, 17 of 21 controls are under 44 px (`metrics.json` m/reader) (U-CMT-01 → FP-022). (5) **Confirmed:** guest sign-in from the thread drops the anchor and the open sheet (U-CMT-02). (6) **Confirmed:** the "Comments" heading shows no count (`reader-screen.tsx:166`), and there is no sort toggle (Q-CMT-02). (7) **Hypothesised:** on desktop, the bottom sheet covers the paragraph being discussed. A side panel keeps it visible (`reader-blocks.tsx:65` `side="bottom"` at every width). (8) **Confirmed:** a reply gives no success toast (U-CMT-03). |
| Missing capabilities | Two-way conversation loop (→ FP-049). Author recognition in the thread and in notifications (FP-025 + FP-049). Reliable deep link to a reply (FP-013). |
| Proposed improvement | FP-049: "Reply" on replies posts into the same thread with an "@Name" prefix (storage stays one level, BRC-CMT-01). Everyone who took part in a thread is notified, with a per-thread mute (BRC-NOTI-01). Author replies read "The author of <story> replied to you". SE-CMT-01: count in the heading, a larger paragraph target, a side panel ≥ md, a sort toggle (subject to Q-CMT-02), and "Sign in" that returns to the same anchor. |
| Expected value | Discussions that continue past one turn. Readers see that the author listens. Hypothesis: comment replies are the strongest non-chapter reason to return. |
| Affected screens | SCR-CMT-01, SCR-READ-01, SCR-NOTI-01 |
| Dependencies | FP-013 (`?comment=` deep link), FP-025 (author badge), FP-022 (targets), FP-007 (abuse limits also cover new reply paths) |
| Evidence | BR-CMT-005, BR-NOTI-004, migration refs above; Runtime `m-reader.png`, `d-reader.png`, `m-reader-paragraph-sheet.png` |

**Reader side of author–reader interaction (JRN-AUT-xx owns the author side).** Today a reader can see an author
reply only if the reader wrote the parent comment, and nothing marks that reply as the author's. A reader cannot tell
whether the author reads paragraph comments. A hidden comment disappears with no notice to its writer (F-NOTI-04 →
FP-006/FP-026). Reader-side needs: (a) the author badge in the thread (FP-025), (b) "the author replied"
notification wording (FP-049), (c) when the reader is caught up, a follow prompt from the latest chapter so the
author's next chapter reaches them (FP-052). Author-side tools (pin a comment, notification of comments on my story)
belong to the AUT agent and to FP-026.

#### JRN-RDR-10 — Receiving updates (notifications, bell, preferences)

| Field | Content |
| --- | --- |
| Journey ID | JRN-RDR-10 |
| User goal | "Tell me, without nagging, when something I care about happens, and take me straight there." |
| Current workflow | Server-made notifications for five types (BR-NOTI-002). A live bell with an unread badge appears in the header only when signed in (`features/notifications/components/notification-bell.tsx:10-38`). `/notifications` shows a text-only list, 20 per page, with "Mark all as read". Opening an item marks it read and follows a frozen link. Three on/off switches live only on `/settings` (BR-NOTI-007, WF-SET-02). **In-app only** (BR-NOTI-017). |
| Friction points | (1) **Confirmed:** no channel outside the app (no email, no push). A reader who does not open the app never learns about a new chapter. (2) **Confirmed:** one notification per chapter and no grouping. A scheduled or batch publish of N chapters produces N lines (`chapter_published:<chapter>` dedupe, BR-NOTI-003). (3) **Confirmed:** items show text only: no story cover, actor avatar or type icon (`features/notifications/screens/notifications-screen.tsx:91-122`). (4) **Confirmed:** the inbox has no route to the preference switches, and the settings sections have no anchors (`features/settings/screens/settings-screen.tsx:31`). (5) **Confirmed:** there is no per-item delete (F-NOTI-03) and no per-story mute. To stop a noisy story, the reader must find the story and unfollow it. (6) **Confirmed:** links break after a chapter slug rename (F-NOTI-01), the excerpt survives moderation (F-NOTI-02), and a reply notification doesn't open the reply (U-NOTI-01). (7) **Confirmed:** the bell is 36 px (`notification-bell.tsx:29` `size-9`) and the inbox is reachable only through it (screen-inventory §4). (8) **Hypothesised:** bursts of `chapter_published` from binge publishers will lead readers to switch "New chapters" off globally, which kills the main return loop. |
| Missing capabilities | Out-of-app digest (FP-026). Grouped and scannable inbox, per-story mute, settings link (→ FP-050). Safe deep links (FP-011, FP-013). |
| Proposed improvement | FP-050: grouped items ("3 new chapters of <story>"), cover or avatar plus a type icon, an "All / Unread" filter, a per-item ⋯ menu (Mark unread, Delete [FP-013], "Stop notifications for this story" = unfollow, with undo), a "Notification settings" link to `/settings#notifications`, a 44 px bell, and a "Notifications" entry in the user menu. FP-026 amendment: an email **digest** of new chapters as the first out-of-app channel, opt-in, daily or weekly (Q-NOTI-07). |
| Expected value | The inbox stays useful as follows grow. Readers can tune notifications instead of switching them off. Hypothesis: a digest is the cheapest way back for lapsed readers. |
| Affected screens | SCR-NOTI-01, SCR-SHELL-01, SCR-SET-01 |
| Dependencies | FP-011, FP-013, FP-026, WP 6.7 (push), SMTP provider (email) |
| Evidence | BR-NOTI-002/003/007/017, F-NOTI-01…04, U-NOTI-01/02; code refs above |

#### JRN-RDR-11 — Returning to the application (re-engagement loops)

| Field | Content |
| --- | --- |
| Journey ID | JRN-RDR-11 |
| User goal | "When I come back, show me right away where I was and what's new for me." |
| Current workflow | A member opening `/` sees the hero, then "Recommended for you", then the latest feed (`apps/web/src/app/(main)/discover-home.tsx:11-15`). There is **no continue-reading or updates row**. Continuing means opening Library (bottom nav on mobile, user menu on desktop), where "Đang đọc" lists stories by `last_read_at` with "Continue with chapter N". Library entries carry no "new chapter" signal (`features/library/model/library.ts:49-58`). Out-of-app triggers: none (BR-NOTI-017). In-app trigger: the bell badge, which counts only notifications. At the end of the latest published chapter, "Chương sau" is a disabled placeholder with no explanation and no prompt to follow (`features/reader/components/chapter-nav.tsx`; Runtime `m-reader.png`, `d-reader.png`). |
| Friction points | (1) **Confirmed:** Home doesn't help a returning reader resume. (2) **Confirmed:** Library cannot answer "which of my stories have new chapters?" The data exists: `chapters.first_published_at` (`supabase/migrations/20261103000200_publish_chapter_rpc.sql:188`) and `user_story_progress.last_read_at` / `user_chapter_progress.completed_at` (`supabase/migrations/20261103000000_init_schema.sql:258-281`). (3) **Confirmed:** "Continue" targets disagree between the story page and the library (F-PROG-02 → FP-012). (4) **Confirmed:** the moment of highest intent (finishing the newest chapter) offers no follow and no explanation that more is coming. (5) **Confirmed:** on desktop the Library has no primary navigation entry (U-SHELL-01 → FP-019). (6) **Confirmed:** a guest who presses Follow, Save or Vote is sent to sign in, but the action is not completed on return (`story-actions.tsx:25-26`). The intent is lost at the point of conversion. (7) **Hypothesised:** without an out-of-app channel, the return rate depends entirely on habit. |
| Missing capabilities | Updates state in the Library and on Home (→ FP-047). A caught-up prompt (→ FP-052). Intent replay after sign-in (→ FP-048). Out-of-app digest (FP-026). Share-driven acquisition (→ FP-051). Reading streaks and goals: **not recommended now** (see CAP-ENG-16). |
| Proposed improvement | FP-047: one `list_library` RPC that adds "N new chapters / N left / Caught up / Finished" to every entry. A members-only "Continue reading" row at the top of Home. A dot on the Library nav item when kept stories have unread new chapters. FP-052: a "You're caught up" card that offers the bell, plus a "Finished" card with recommendations. FP-048: replay the pending action after sign-in. |
| Expected value | Return visits land on an obvious next action. Hypothesis to measure: share of member sessions that open a chapter within 1 click of landing; 7-day and 28-day return of followers after a new chapter (computable from `chapter_reads`, `user_story_progress`, `notifications.read_at`; no new tracking needed). |
| Affected screens | SCR-HOME-01, SCR-LIB-01, SCR-READ-01, SCR-SHELL-01, SCR-NOTI-01 |
| Dependencies | FP-012 (single continue rule), FP-015 (paging), FP-019 (desktop nav), FP-026 (digest) |
| Evidence | Code refs above; Runtime `m-reader.png`, `d-reader.png` (disabled "Chương sau" on the last chapter for guests) |

#### Saved vs Following vs Reading lists — concept model analysis (input to FP-048)

| Concept today | Storage | What the reader gets | Visible as |
| --- | --- | --- | --- |
| Reading | `user_story_progress` (automatic) | Continue link | Library "Đang đọc" |
| Saved | `story_saves` | A shelf entry, **no** notifications | Button "Lưu vào thư viện", tab "Đã lưu" |
| Following (story) | `story_follows` | New-chapter notifications, a shelf entry in another tab | Button "Theo dõi" (bell), tab "Đang theo dõi" |
| Following (author) | `user_follows` | Stories in `/following`, **no** notifications | Button "Theo dõi" (person), Home link "Từ tác giả bạn theo dõi" |
| Reading list | `reading_lists(_items)` | Named, ordered, shareable group | Button "Thêm vào danh sách", tab "Danh sách", `/lists/[id]` |

Assessment: Reading (automatic) and Lists (curation and sharing) are distinct jobs and should stay. **Saved and story
Following answer the same question ("keep this story for me") but split it into two independent switches**. The
second switch also decides whether the reader is notified. Story Following and author Following share one label but
behave differently. Proposed model (FP-048):

- **Save** (one primary button) = keep in my library. **Notify me of new chapters** = a bell sub-setting of a saved
  story, on by default (BRC-LIB-01), switchable per story from the Save sheet, the Library row and the notification
  menu.
- **Lists** stay a secondary layer inside the same Save sheet (today's C09). Adding to a list does not auto-save
  (unchanged).
- **Follow author** stays separate, gets distinct wording, and is listed in the Library "Authors" tab.

Non-breaking migration path (no table dropped, no row rewritten):

| Stage | Change | Data | Approval |
| --- | --- | --- | --- |
| A (copy and IA only) | Rename story follow to "Thông báo chương mới" / "Notify me"; explain under the buttons; Library "Đang theo dõi" → "Thông báo" with the bell; fix "reading list" wording; Authors tab | None | None beyond FP approval (copy) |
| B (merged UI, union read) | One "Lưu" button + sheet. "In library" = `story_saves ∪ story_follows`. A follow-only legacy row shows as Saved with the bell on; a save-only row shows with the bell off. The Following tab becomes the "Notifying me" filter of Saved. `?tab=following` keeps working as an alias | Read-side union in `list_library` (FP-047). `set_story_follow` and `set_story_save` unchanged | **BRC-LIB-01** (BR-LIB-008 tab content) |
| C (default) | Saving also sets the follow (bell on) unless the reader turned "notify by default" off. Unsave removes both, with undo. Unfollow keeps the save | One new RPC `set_story_kept(story, kept, notify)` wrapping the two existing RPCs in one transaction; counters unchanged | **BRC-LIB-01** (BR-LIB-001 "neither implies the other") + Q-LIB-03 |

Rollback at any stage: restore the two buttons. Data was never merged.

---

### 3.2 Author and story team

#### JRN-AUT-01 — Becoming an author (reader → first story)

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-01 |
| User goal | A reader who wants to write finds where to start, creates a first story and understands what to do next. |
| Current workflow | Bottom nav "Viết" / user menu "Studio" (`shell/components/main-shell.tsx:16`, `user-menu.tsx:66`) → guest is redirected to `/login?next=/studio` (BR-STM-023) → after sign-in `/studio` (SCR-STM-01) shows header button "Write a new story" and, with no stories, the empty state "You don't have any stories yet / Stories you create or are invited to collaborate on will appear here." → `/studio/new` (SCR-STM-02) → "Create story" → lands on Edit story (SCR-STM-03) → must find "Manage chapters" → add chapter → "Write" (SCR-EDT-01). |
| Friction points | (1) **Confirmed** — the empty state has no call to action and no guidance; the only create button sits in the page header (`studio-screen.tsx:119-124,142`), although `EmptyState` supports an `action` (`packages/ui/src/widgets/empty-state.tsx:15-16,31`). (2) **Confirmed** — after creating, the author lands on a long settings form whose only forward path is a small text link "Manage chapters" (`story-form-screen.tsx:102-107`); the next step ("write chapter 1") is two screens away. (3) **Confirmed** — adding a chapter does not open it; the author must find "Write" on the new row (`chapter-manager-screen.tsx:371-378`). (4) **Confirmed** — a new story is private + draft by default (`studio/model/story-form.ts:21-32`, BR-STM-006) and publishing the first chapter leaves visibility unchanged ("Visibility stays the owner's choice", `20261103000200_publish_chapter_rpc.sql:193`), so a first-time author who never touches Visibility publishes into a story nobody else can open, and no follower notification is sent (`20261103000300_outbox_worker_and_cron.sql:50`). Neither the editor nor the chapter manager mentions visibility (grep of `packages/features/src/editor` finds no visibility reference). (5) **Hypothesised** — desktop users have no visible route to the Studio except the avatar menu (U-SHELL-01). (6) **Hypothesised** — profile bio/avatar are never suggested to new authors; at runtime the dev author page shows "Tác giả chưa viết giới thiệu" and letter placeholders instead of covers (`rt2/shots/m-author.png`, Verified (Runtime) on dev data only). |
| Missing capabilities | Guided first-run (what a story is, the 3 steps to go live); a direct "create → first chapter → editor" path; a clear "who can read this right now" status. |
| Proposed improvement | Onboarding empty state + first-story checklist (FP-055); go-live status and checklist (FP-054); after create, land in the story workspace on the Chapters tab with "Write chapter 1" as the primary action (FP-053, SE-STM-02); "Add and write" in the chapter manager (SE-CHM-01); desktop nav entry "Write" (FP-019). |
| Expected value | Fewer abandoned first stories; first chapters actually reach readers; lower support load ("my story doesn't show"). |
| Affected screens | SCR-SHELL-01, SCR-STM-01, SCR-STM-02, SCR-STM-03, SCR-CHM-01, SCR-EDT-01 (ref), SCR-PRF-02 |
| Dependencies | FP-019 (desktop nav), FP-032 (guest "Start writing" CTA), FP-034 (first-publish confirmation) |
| Evidence | Code refs above; WBS 3.1/3.2 "Đã làm" notes; runtime author page (dev data) |

#### JRN-AUT-02 — Creating a new story and managing its metadata

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-02 |
| User goal | Set title, URL, synopsis, cover, category, tags, language, status, visibility and 18+ correctly, and see how readers will see it. |
| Current workflow | WF-STM-02 (create) → WF-STM-04 (cover, edit page only) → WF-STM-03 (edit settings, tags) → WF-STM-07 (slug change, redirects per BR-STM-010). One form for create and edit (`story-form-screen.tsx:118-471`). |
| Friction points | (1) **Confirmed** — cover cannot be set during creation ("Save the story first…", `story-form-screen.tsx:234-238`); after create the toast/redirect does not point at the cover block. (2) **Confirmed** — the "Public" hint ignores that a Draft story is invisible; switching a live story back to Draft hides it with no warning (U-STM-01, BR-STM-019/020). (3) **Confirmed** — no preview of the reader-facing card/page before saving; "View story page" exists only on the Studio row (`studio-screen.tsx:91-96`). (4) **Confirmed** — the edit header says "Edit story" without the story's name (`story-form-screen.tsx:101`); browser tab title is the static "Chỉnh sửa truyện" (`apps/web/src/lib/strings.ts`, `studio/story/[id]/page.tsx:8`). (5) **Confirmed** — Save, Cancel and the destructive "Delete story" share one row (`story-form-screen.tsx:426-462`). (6) **Confirmed** — no unsaved-changes guard (U-STM-03 → FP-003); tags lost on partial failure (U-STM-06 → FP-018). (7) **Hypothesised** — single 12-field column with no grouping makes the essential fields (title, synopsis, cover) look as important as rarely changed ones (language, slug). |
| Missing capabilities | Live reader preview; grouped "Basics / Discovery / Audience & visibility" sections; impact warning before a change that removes reader access. |
| Proposed improvement | Grouped form inside the story workspace with a reader-card preview and go-live panel (SE-STM-02/03, FP-053, FP-054); post-create focus on cover + first chapter; keep all existing fields and validation. |
| Expected value | Better-quality metadata (covers, synopses, tags) feeding discovery; fewer accidental hides. |
| Affected screens | SCR-STM-02, SCR-STM-03, SCR-STORY-01 (result) |
| Dependencies | FP-003, FP-018, FP-017 (category provisioning) |
| Evidence | Code refs above; runtime story/author pages show letter placeholders for coverless stories (orchestrator observation, `rt2/shots/m-story.png`) |

#### JRN-AUT-03 — Managing story visibility and lifecycle

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

#### JRN-AUT-04 — Collaborating with editors and co-authors

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-04 |
| User goal | Owner invites the right person with the right role; collaborators know what they may do, who else is on the team, and can leave. |
| Current workflow | Owner: Studio row "Collaborators" → SCR-TEAM-01 invite by exact username + role → invitee notified → accepts in Studio inbox (SCR-STM-01 C03) → story appears with role badge (WF-TEAM-01…04). |
| Friction points | (1) **Confirmed** — editor role hint contradicts real rights (F-TEAM-01 → FP-016, Q-TEAM-01). (2) **Confirmed** — no leave, no role change (F-TEAM-02/03 → FP-016). (3) **Confirmed** — co-authors and editors cannot see who else is on the team: the Team URL shows "Only the owner can manage this" (`team-screen.tsx:70-72`), although RLS lets any team member read `story_collaborators` and active profiles (`auth_and_rls.sql:182-184,213-214`). (4) **Confirmed** — invite needs the exact username with no lookup/preview (`team-screen.tsx:238-252`); errors arrive only after sending. (5) **Confirmed** — no attribution: the chapter manager does not show who last edited or published a chapter although `chapter_drafts.updated_by` and `chapter_versions.created_by` exist (`init_schema.sql:127-148`, `chapters.api.ts:6-7`). (6) **Confirmed** — the invite form is the last element, below both lists (`team-screen.tsx:111-208,240`). (7) **Hypothesised** — an invitee cannot judge an invitation: the inbox shows story title, inviter and role but not what the role allows (`my-invitations.tsx:30-32`). |
| Missing capabilities | Read-only team view for collaborators; contributor attribution; username lookup; ownership transfer (see CAP-AUTH-11, Q-TEAM-04). |
| Proposed improvement | FP-016 amendment (read-only team view, leave, attribution, role copy in invite and inbox, lookup preview); Team as a workspace tab visible to all roles (FP-053); BRC-TEAM-01 (Team screen no longer owner-only for viewing). |
| Expected value | Fewer wrong-role invites, safer collaboration, accountability on shared stories. |
| Affected screens | SCR-TEAM-01, SCR-STM-01, SCR-CHM-01, SCR-NOTI-01 |
| Dependencies | FP-016, Q-TEAM-01, Q-TEAM-03 |
| Evidence | Code refs above; WBS 3.8 "Đã làm" |

#### JRN-AUT-05 — Interacting with readers (author side)

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-05 |
| User goal | See and answer what readers say about my story, remove abuse, and know who follows me. |
| Current workflow | Author opens their own chapter in the reader, scrolls to comments or opens a paragraph sheet, replies or uses "Hide comment" (BR-CMT-014, owner/co-author). Followers: public counts on the story page and author page only. Notifications for authors: only `comment_replied` when someone replies *to the author's own comment* and collaboration events (`notifications/model/notification.ts:6-12`). |
| Friction points | (1) **Confirmed** — no notification when a reader comments on the author's story or follows it/them (only 5 notification types exist; FP-026 proposes the types). (2) **Confirmed** — no Studio place that lists recent comments across chapters; the author must open each chapter to find new comments (no such RPC/screen in `packages/features/src/studio` or `analytics`). (3) **Confirmed** — no shortcut from the public story page or reader back to the Studio for team members (grep of `story/`, `reader/`, `author/` screens finds no `/studio` link). (4) **Confirmed** — follower count is shown publicly on the story page (`m-story.png` people icon, Verified (Runtime)) but not in the Studio or stats screen (`story-stats-screen.tsx:131-146`). (5) **Hypothesised** — without an "Author" badge (U-CMT-04 → FP-025) author replies are not recognisable. |
| Missing capabilities | Author-side comment inbox with unreplied/hidden filters; follower trend; "Edit in Studio" from public pages. |
| Proposed improvement | FP-057 (reader conversations tab); FP-056 (followers in stats); FP-053 (team-only "Open in Studio" link on story page/reader); FP-026 and FP-025 unchanged but referenced. |
| Expected value | Faster author responses → stronger engagement loop (J3); abuse handled sooner. |
| Affected screens | SCR-STAT-01, SCR-STORY-01, SCR-READ-01, SCR-CMT-01, workspace tab (new) |
| Dependencies | FP-025, FP-026, Q-CMT-03, Q-STAT-02 |
| Evidence | Code refs above |

#### JRN-AUT-06 — Understanding story performance

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-06 |
| User goal | Know whether the story is growing, which chapter loses readers and what changed after the last update. |
| Current workflow | Studio row "Stats" (owner/co-author) → SCR-STAT-01: 7/30/90-day tabs, three range totals (reads, new likes, new comments), reads-only daily bars, per-chapter table with retention (BR-STAT-001…010). |
| Friction points | (1) **Confirmed** — the page does not name the story and is reachable only from the Studio row (U-STAT-01 → FP-019, moved to FP-053). (2) **Confirmed** — no lifetime totals, followers or saves, although `story_stats` holds them (`init_schema.sql:320-328`). (3) **Confirmed** — no comparison with the previous period; the chart has no dates/axis and per-day values are mouse-only (`daily-chart.tsx:17-31`, U-STAT-02 → FP-022). (4) **Confirmed (definition) / Hypothesised (impact)** — retention compares lifetime reads of chapter N with lifetime reads of N−1 (`20261104002100_author_stats.sql:59-60`), so a chapter published yesterday always shows very low "retention" against a chapter that has been read for months. (5) **Confirmed** — selected range is local state, lost on reload (`story-stats-screen.tsx:56`). (6) Open — reads by the team count (Q-PROG-02). |
| Missing capabilities | Lifetime and follower figures; trend vs previous period; fair retention; accessible data table. |
| Proposed improvement | FP-056 (audience insights) + BRC-STAT-01 (retention definition); workspace header (FP-053). |
| Expected value | Authors make better decisions (which chapter to rework, when to publish); more return visits to Studio. |
| Affected screens | SCR-STAT-01, SCR-STM-01 (summary figures) |
| Dependencies | FP-022, Q-PROG-02, Q-STAT-01, Q-STAT-02 |
| Evidence | Code refs above; WBS 6.5 |

#### JRN-AUT-07 — Maintaining published content

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-07 |
| User goal | Keep a long serial tidy: reorder, archive, fix URLs, see what is scheduled or has unpublished edits, update the story when a new chapter goes out. |
| Current workflow | SCR-CHM-01: one-step up/down arrows, Write, Change URL slug, Archive/Unarchive, Delete/Restore (WF-CHM-01…06); editing/publishing in SCR-EDT-01 (other agent). |
| Friction points | (1) **Confirmed** — reorder is one position per click/request (U-CHM-03 → FP-033). (2) **Confirmed** — scheduled date not shown (U-CHM-01 → FP-010). (3) **Confirmed** — renaming a chapter slug breaks old links; the dialog says so (`strings.en.ts:43-44`, F-CHM-03 → FP-011). (4) **Confirmed** — deleted story's chapter manager fails with "Chapter not found." (U-CHM-02 → FP-018). (5) **Confirmed** — rows show no word count, publish date, reads or "edited since publish"; the list selects only id/slug/order/status/schedule/deleted/updated_at + draft title (`chapters.api.ts:6-7`), although `chapter_versions.word_count/published_at` exist. (6) **Confirmed** — up to 7 actions per live row (2 icon buttons 36 px, 5 `sm` buttons 32 px — `chapter-manager-screen.tsx:177-238`, `packages/ui/src/components/button.tsx:22-25`), below the 44 px touch target; on 390 px the row wraps into several button lines (Inferred from `flex-wrap`). (7) **Confirmed** — the add form sits under the whole list (`chapter-manager-screen.tsx:307`). |
| Missing capabilities | Status-at-a-glance per chapter (published date, unpublished edits, last editor); compact row actions; add-at-top. |
| Proposed improvement | SE-CHM-01 (row redesign with overflow menu, status line, add-and-write); FP-033 amendment (move-to-position on mobile); FP-010/FP-011/FP-018 unchanged in scope. |
| Expected value | Faster maintenance of long serials; fewer mis-taps on destructive actions. |
| Affected screens | SCR-CHM-01, SCR-EDT-01 (ref) |
| Dependencies | FP-010, FP-011, FP-018, FP-033 |
| Evidence | Code refs above |

#### JRN-AUT-08 — Writing and editing a chapter

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-08 |
| User goal | Write a chapter comfortably (often in short sessions on a phone), format it the way readers will see it, know how long it is, and move on to the next chapter. |
| Current workflow | Studio → story row "Manage chapters" → chapter row "Write" → SCR-EDT-01 (WF-CHM-06, WF-EDT-01/02). Screen = back link + Preview/History buttons, title input, formatting toolbar (H2, B, I, U, S, divider, picture, undo, redo), body (min 50vh), publish panel, footer "n words · status" + "Save draft". All inside the main shell (header + mobile bottom nav). |
| Friction points | **F1 Confirmed (Code)** — no screen heading or context: `editorText.title` "Edit chapter" exists but is never rendered; no story title or chapter number on screen (`editor/strings.en.ts:2`, `chapter-editor-screen.tsx:290-390`; U-EDT-03). **F2 Confirmed (Code)** — toolbar is not sticky: it scrolls away once the author is a screen into the text (`chapter-editor-screen.tsx:368-377`, no `sticky`). **F3 Confirmed (Code)** — save status and word count are in the footer **below the publish panel**, i.e. under the whole chapter (`:379-389`), so status is invisible while writing. **F4 Inferred (Code)** — at 390 px the 9 toolbar buttons (36 px, `button.tsx:25`, gap 4 px, `editor-toolbar.tsx:86`) need 356 px but 348 px are available → wraps to 2 rows; all targets 32–36 px < 44 px project rule (`tokens.css:74`). **F5 Hypothesised** — with the on-screen keyboard open (~45 % of an 844 px phone), the sticky 56 px header (`app-shell.tsx:24`) plus the fixed 64 px bottom nav (`bottom-nav.tsx:47`; on Android Chrome it sits above the keyboard when the viewport resizes) leave roughly 250–300 px for text, and the toolbar is off screen. **F6 Confirmed (Code)** — no find/replace, no placeholder on an empty body, no selection/reading-time count (`extensions.ts:48-66`). **F7 Confirmed (Code)** — shortcuts undiscoverable, Mod+S opens the browser save dialog (U-EDT-04). **F8 Confirmed (Code)** — after publishing, no way to go to the next chapter or create it from the editor (only "Back to chapters"). **F9 Hypothesised** — paste from Word/Google Docs keeps supported marks but empty paragraphs used as spacing become empty blocks (BR-EDT-003 "Inferred, not tested"); Vietnamese IME on mobile not tested (WBS 3.5 note "kiểm thử bằng bàn phím thật (IME tiếng Việt) chưa làm"). |
| Missing capabilities | Focused / distraction-free writing frame; mobile keyboard-aware toolbar; always-visible save status; find & replace; writing stats (selection, reading time); paste clean-up; chapter-to-chapter navigation; author's note as structured field (open question, CAP-AUTH-28). Chapter templates: **not justified** (serial chapters are free-form; the only recurring structure, the author's note, is better a field — Q-EDT-07). |
| Proposed improvement | FP-058 (focused, mobile-ready workspace incl. chapter context and prev/next), FP-062 (writing aids), FP-034 amendment (shortcuts/Mod+S), FP-030 amendment (touch image controls). |
| Expected value | Authors can write a whole chapter on a phone without fighting the layout; fewer formatting round-trips to Preview; faster serial cadence. |
| Affected screens | SCR-EDT-01 (primary), SCR-CHM-01 (create next chapter reuse), SCR-SHELL-01 (frame) |
| Dependencies | BRC-SHELL-01 (studio frame without bottom nav), Q-EDT-06 (is mobile web authoring a launch target), WP 7.1/7.3 (Capacitor keyboard), FP-022 (toolbar a11y). |
| Evidence | `packages/features/src/editor/screens/chapter-editor-screen.tsx:290-390`, `editor/components/editor-toolbar.tsx:46-121`, `packages/ui/src/components/button.tsx:21-28`, `packages/ui/src/widgets/app-shell.tsx:24-29`, `packages/ui/src/widgets/bottom-nav.tsx:47`, `packages/design-tokens/src/tokens.css:74,1131-1132`, WBS §1.2 `(studio)` group (`docs/WBS.md:64`), WBS 3.5 note. |

#### JRN-AUT-09 — Saving and recovering drafts

| Field | Value |
| --- | --- |
| Goal | Never lose a word — offline, on tab close, across two devices, across co-authors — and recover an earlier draft state when something goes wrong. |
| Current workflow | Autosave 2 s / max 10 s with CAS revision (BR-EDT-008/009); local device backup every 0.5 s + banner on return (BR-EDT-011); `beforeunload` prompt (BR-EDT-012); conflict alert + "Load latest version" (BR-EDT-013); history restore overwrites draft (BR-HIST-006). |
| Friction points | **F1 Confirmed (Code)** — in-app navigation (Preview, Version history, Back, header, bottom nav) neither saves nor warns; text only survives as a device backup (F-EDT-02, `chapter-editor-screen.tsx:312-337`). **F2 Confirmed (Code)** — backup banner forces a blind choice: Restore vs Discard with only a relative time; no way to see what differs, and with an older base "restoring will overwrite newer changes" (`:309-333`). **F3 Confirmed (Code)** — conflict is detected only at save time, i.e. after the second person has typed; collaborators get no warning that someone else has the chapter open (BR-EDT-013). **F4 Confirmed (Code)** — there is no server-side history of the draft: only published versions exist (`chapter_versions`), so an author who writes for weeks before publishing has no way back; restore and "Load latest version" replace the draft with no undo (F-HIST-01). **F5 Confirmed (Code)** — permanent save errors retry forever (F-EDT-03). **F6 Hypothesised** — two tabs of one browser share one backup key (Q-EDT-04; WBS 3.6 "chưa kiểm chứng"). **F7 Confirmed (Code)** — the editor cannot open without network ("Couldn't load the draft"), so writing offline on a commute is impossible even though a device backup exists (`chapter-editor-screen.tsx:92-103`). **F8 Hypothesised** — save status lives under the chapter (JRN-AUT-08 F3), so offline/error states are noticed late. |
| Missing capabilities | Flush-before-leave guard; compare-before-restore of the device backup; server draft checkpoints (automatic + named); editing presence; offline open. |
| Proposed improvement | FP-003 amendment (flush/guard on all exits, backup compare, multi-tab), FP-059 (draft checkpoints), FP-061 (presence), FP-010 (permanent errors, already there), FP-058 (status chip always visible). Offline open → Q-EDT-08 (deferred to WP 7.x). |
| Expected value | Removes the remaining silent-loss paths; gives authors an "undo across days"; cuts co-author conflicts before they happen. |
| Affected screens | SCR-EDT-01, SCR-HIST-01 |
| Dependencies | Q-HIST-01, Q-HIST-03, Q-EDT-04, Q-EDT-08; Supabase Realtime (already used for notifications). |
| Evidence | BR-EDT-008…013, BR-HIST-006; `packages/features/src/editor/model/local-backup.ts:1-52`, `editor/model/autosaver.ts`, `history/hooks/use-history.ts:32-62`; WBS 3.6 note. |

#### JRN-AUT-10 — Publishing and scheduling chapters

| Field | Value |
| --- | --- |
| Goal | Check the chapter as readers will see it, publish it (now or at a planned time), know who will be told, fix mistakes after publishing, take it offline if needed. |
| Current workflow | Preview (SCR-HIST-02, saved draft only) → back to editor → publish panel: Publish / Publish new version, Schedule… (`datetime-local` + zone), Unpublish / Cancel schedule (owner, co-author) (WF-EDT-07/08/09, WF-HIST-04). First publish → outbox `chapter.published` → followers notified within ~1 min (BR-NOTI-003). |
| Friction points | **F1 Confirmed (Code)** — Preview shows the last *saved* draft; unsaved text is missing (F-EDT-02/U-HIST-02). **F2 Confirmed (Code)** — preview has no publish action: author must go back and scroll to the panel under the chapter (`preview-screen.tsx:64-75`). **F3 Confirmed (Code)** — first publish is one click with no confirmation although it irreversibly notifies every follower and moves the story to "ongoing" (U-EDT-05, BR-EDT-020). **F4 Confirmed (Code)** — "Publish new version" gives no idea what changes for readers; republishing an unchanged draft creates an identical version (F-EDT-06). **F5 Inferred (Code)** — removing or merging a paragraph that carries reader paragraph-comments hides those comments: comments anchor to permanent `chapter_blocks` (`20261104000700_comments.sql:222-225`) but the reader renders only the live version's blocks (BR-READ-*), and nothing warns the author. **F6 Inferred (Code)** — publishing a first chapter while the story is private (or otherwise suppressed) sets `first_published_at` (`publish_chapter_rpc.sql:163,189`) but the handler sends nothing (BR-NOTI-003 "story … private"), and later publishes are silent → the one-time announcement is silently consumed. **F7 Confirmed (Code)** — a picture copied from another story fails only at publish with a generic "isn't ready to publish" (BR-EDT-016, BR-EDT-025). **F8 Confirmed (Code)** — Schedule offered on published chapters and always refused (F-EDT-01); failed scheduled publish invisible (F-EDT-05). **F9 Confirmed (Code)** — a scheduled chapter publishes "the draft as it is then": editing a scheduled chapter shows no warning that half-finished edits will go live (BR-EDT-021/022, Q-EDT-02). **F10 Confirmed (Code)** — publish panel renders nothing while its state loads or fails (F-EDT-04). **F11 Confirmed (Code)** — notification links break after chapter slug rename (F-NOTI-01) and lead to "not found" after unpublish. **F12 Inferred (Code)** — on mobile the panel sits after the whole chapter, the schedule dialog is a centred modal with a native picker (acceptable), all buttons 36 px. |
| Missing capabilities | Pre-publish review (diff vs live, audience, warnings, checks); publish from preview; scheduled-edit warning; schedule-next-version (Q-EDT-05); author receipt when a scheduled chapter goes live; resilient notification destinations. |
| Proposed improvement | FP-060 (pre-publish review sheet, also reachable from Preview), FP-034 amendment (merge first-publish confirmation into FP-060), FP-010 amendment (scheduled-edit banner, readable schedule summary, receipt), FP-011 amendment (unpublished/archived chapter destination), FP-020 (panel loading/error). |
| Expected value | No accidental announcements; authors see the consequence of every publish (who is told, what changes, which reader comments are affected); scheduling becomes trustworthy. |
| Affected screens | SCR-EDT-01, SCR-HIST-02, SCR-HIST-01 (diff reuse), SCR-NOTI-01, SCR-CHM-01 |
| Dependencies | Q-EDT-01, Q-EDT-02, Q-EDT-05, Q-NOTI-02, Q-NOTI-04 (new); outbox + pg_cron. |
| Evidence | BR-EDT-016…028, BR-HIST-005/007, BR-NOTI-003; `packages/features/src/editor/components/publish-panel.tsx:39-216`, `history/screens/preview-screen.tsx:29-99`, `supabase/migrations/20261103000200_publish_chapter_rpc.sql:161-212`, `supabase/migrations/20261104000800_story_follows_saves.sql:27-37` (`story_stats.followers`). |

#### JRN-AUT-11 — Revision management (history, compare, restore)

| Field | Value |
| --- | --- |
| Goal | See what was published when and by whom, find exactly what changed, and go back — to a published version or to an earlier unpublished state — without fear. |
| Current workflow | Editor "Version history" → SCR-HIST-01: list of published versions (newest first, live badge) above a viewer with Content / Compare (base = current draft or another version) and "Restore to draft" (confirm) (WF-HIST-01…03). |
| Friction points | **F1 Confirmed (Code)** — only *published* versions exist; drafting history is absent (JRN-AUT-09 F4). **F2 Confirmed (Code)** — single column: the full version list sits above the viewer (`history-screen.tsx:107,120-153`); with many versions the viewer is pushed far down and selecting a version does not scroll to it (Inferred for 20+ versions at 390 px). **F3 Confirmed (Code)** — Compare renders the **whole chapter** with badges on changed blocks (`:318-335`); no "changes only" filter, no next/previous change, paragraph-level only (old text struck through in full, no word highlight). **F4 Confirmed (Code)** — title change not compared; "paragraphs" wording for images/dividers; no "before" for changed images (U-HIST-01). **F5 Confirmed (Code)** — base-version load failure = endless skeleton (F-HIST-02). **F6 Confirmed (Code)** — restore overwrites the draft with no undo, re-reads the revision just before writing (misses edits made since History opened) and deletes the device backup (F-HIST-01). **F7 Confirmed (Code)** — no entry from the chapter manager (only from the editor). **F8 Hypothesised** — teams cannot tell why a version exists (no change note); low value for solo authors, so not proposed. |
| Missing capabilities | Draft checkpoints in the same history; master–detail layout; changes-only diff with navigation and word highlight; safe restore with undo. |
| Proposed improvement | FP-059 (checkpoints shown as a second list in SCR-HIST-01, same viewer/compare/restore), SE-HIST-01 (layout + diff UX, quick-fix level), FP-003 amendment (revision displayed + undo), FP-020 (F-HIST-02). Partial (single-paragraph) restore: **not recommended** — copy/paste from the Content view covers it. |
| Expected value | History becomes a real safety net for drafting, and diffs answer "what changed?" in seconds on a phone. |
| Affected screens | SCR-HIST-01, SCR-EDT-01 |
| Dependencies | Q-HIST-01, Q-HIST-03; BR-HIST-002 (immutability unchanged). |
| Evidence | BR-HIST-001…009; `packages/features/src/history/screens/history-screen.tsx:79-333`, `history/model/history.ts:90-172`, `history/hooks/use-history.ts:36-62`. |

---

### 3.3 Moderator, operator, reporter and affected member

#### JRN-MOD-01 — Reviewing reported content (moderator triage)

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-01 |
| User goal | Moderator: clear the queue, handling the most harmful items first, without two moderators doing the same work |
| Current workflow | WF-MOD-02. Avatar menu "Moderation" → `/moderation` → "Pending" tab (pending + reviewing, oldest first, 20 per page). There is **one card per report** with kind, status and reason badges, title or excerpt, state, details, "Reported by …" and "N pending reports about this item". Buttons per card open a reason dialog. Confirm runs the RPC, shows the toast "Done." and refetches every moderation query. |
| Friction points | **Confirmed (Code):** (1) N reports about one target produce N cards. The first action closes all of them (BR-MOD-017), but the others stay on screen until the refetch, which invites a second action and a PT409 (`moderation-screen.tsx:44-47,74-83` → `InfiniteList` of reports, `report-card.tsx:69-82`). (2) Only one order exists: oldest first. A hate or violence report waits behind older spam (`list_reports` only takes `p_newest_first`, `20261104002000_moderation.sql:280-285`). (3) The filed date is loaded but never shown (`report.ts:62` `createdAt` is used only as the cursor, U-MOD-01). (4) Nothing shows that another moderator is reviewing: `reviewed_by` is returned by the SQL type (`moderation.sql:209-210`) but dropped by `ReportRow` (`report.ts:37-54`). (5) There are only two tabs and no filter, and the tab is not in the URL (U-MOD-02). **Hypothesised:** at 390 px, a card with 3–4 small buttons wraps into several rows that mix destructive and neutral actions (`report-card.tsx:154-210`, `size="sm"`), which raises misclick risk. Not observed: the console was not run. |
| Missing capabilities | Case view grouped by target; severity priority; "under review by" visibility; filters and deep links; a responsive list/detail layout |
| Proposed improvement | Case-based queue, priority order, claim visibility, URL filters, list/detail layout: **FP-024 amendment** (§5) + **SE-MOD-01** |
| Expected value | One decision per target instead of N; the most harmful items are handled first; fewer conflicts between moderators |
| Affected screens | SCR-MOD-01 |
| Dependencies | FP-065 (guidelines define the severity tiers), Q-MOD-05 |
| Evidence | Verified (Code) as cited; Documented `docs/WBS.md:219` (scope of WP 6.1) |

#### JRN-MOD-02 — Investigating a violation (context, history, audit log)

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-02 |
| User goal | Moderator: before acting, understand what was reported and why, what happened to this target before, and the record of the account behind it |
| Current workflow | The card shows title or comment excerpt (≤ 300 chars), state, reporter name and the reporter's details. "Open content" leaves the console in the same tab. The audit log can be read by SQL only. |
| Friction points | **Confirmed (Code):** (1) There is no history UI (BR-MOD-018; `docs/WBS.md:219` "Chưa làm: xem lịch sử audit trên giao diện"). The data is already readable by moderators: `GRANT SELECT` + policy `moderation_actions_read` (`moderation.sql:50-51`), with index `idx_moderation_actions_target`, so this is a UI-only gap. (2) "Open content" for a **removed** story or chapter lands on the not-found state. The public queries filter `.is("deleted_at", null)` (`story/api/story.api.ts:33,50`, `reader/api/reader.api.ts:31`) although `can_read_story`/`can_read_chapter` already allow moderators (`20261103000100_auth_and_rls.sql:93-111`). So a moderator cannot re-read what was removed when they consider a reversal or an appeal. (3) A chapter report does not say which passage is meant, so the moderator has to read the whole chapter. (4) A user report shows nothing about the account's other reports or past actions, and a comment report does not show the comment's author (U-MOD-01). (5) Leaving the console to look at content loses the queue position: there is no "back to queue" and the tab is not in the URL (SCR-MOD-01-A04). |
| Missing capabilities | Per-target and per-account history; read-only preview of removed content for moderators; a passage anchor on chapter reports; investigation inside the console |
| Proposed improvement | Case detail with Subject preview (including removed content), History (target + owner account) and Other cases of the owner: **FP-024 amendment**, **SE-MOD-01-AC05/06/12**. Paragraph anchor: **SE-MOD-02-AC10**. Version history for moderators stays under Q-HIST-02. |
| Expected value | Decisions that are consistent and can be defended; reversals and appeals (FP-063) judged on the actual content |
| Affected screens | SCR-MOD-01; SCR-MOD-02 (anchor); SCR-READ-01 (paragraph sheet entry, owned by the reading agent) |
| Dependencies | FP-024; Q-HIST-02 |
| Evidence | Verified (Code) as cited |

#### JRN-MOD-03 — Applying and reversing moderation actions

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-03 |
| User goal | Moderator: apply the *smallest sufficient* action, record why in terms of policy, undo a mistake |
| Current workflow | WF-MOD-03 / WF-MOD-04: hide or unhide a comment, remove or restore the whole story, suspend or reinstate an account. Each needs a free-text reason of 3–1000 chars and writes an audit row. Content actions close every open report on the target. |
| Friction points | **Confirmed (Code):** (1) Actions are coarse. A chapter report can only remove the whole story (BR-MOD-013, Q-MOD-03). A "Sexual content" report on a story that should simply be rated 18+ can only be met by removal, because moderators cannot set `is_mature` (BR-MAT-011, Q-MAT-04). Suspension has no duration, and there is no warning step. (2) The dialog does not state the consequence (U-MOD-01, SCR-MOD-01-AC14). (3) "Restore story" is offered for stories the author deleted and always fails (F-MOD-03). (4) A moderator cannot lock a comment the author hid (F-MOD-04). (5) The reason is internal free text with no link to a policy section; the placeholder cites "the harassment policy", which does not exist (`moderation/strings.en.ts:96`; no policy page in `apps/web/src/app`, see FP-065). (6) A reversal tells nobody, and the closed reports stay closed (BR-MOD-017). **Hypothesised:** with inconsistent free-text reasons, the user-facing notices of FP-006 will be either empty or unsafe to show. |
| Missing capabilities | Graduated actions (mark 18+, chapter-level removal, timed suspension); consequence text; reason = guideline section + internal note + optional message to the user; notices on reversal |
| Proposed improvement | **FP-024 amendment** (graduated actions, consequence text, structured reason), **FP-006 amendment** (notice standard), BRC-MAT-02 (moderator sets 18+) |
| Expected value | Proportionate enforcement: fewer whole-story removals and authors kept on the platform; audit reasons that can be shown to users |
| Affected screens | SCR-MOD-01; SCR-STM-01 (removed state, FP-006); SCR-CMT-01 (comment note) |
| Dependencies | FP-006, FP-065, Q-MOD-03, Q-MAT-04 |
| Evidence | Verified (Code) as cited |

#### JRN-MOD-04 — Managing sensitive (18+) content

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-04 |
| User goal | Reader: never see adult content without opting in. Adult reader: opt in once. Moderator: correct a story with the wrong rating. Author: know when to mark a story 18+ |
| Current workflow | The author ticks "Mature content (18+)" in the story form. Lists exclude 18+ unless the device or account choice is "shown" (BR-MAT-006). A gate stands in front of 18+ story and chapter pages. The header shield button and `/settings` switch the choice. |
| Friction points | **Confirmed (Runtime):** the gate is shown to guests at 390/768/1280 px (`*-mature-gate.png`), while the tab title still leaks the story title (RT-06, F-MAT-01). The header control is a bare shield icon between Search and "VI", with no text and no visible state (`m-mature-gate.png`, `d-mature-gate.png`). On the 390 px gate page, 7 of 11 controls are < 44 px (`metrics.json`). **Confirmed (Code):** "Continue" at the gate switches 18+ **on for every list on the device/account** (`use-adult-content.ts:15`), but the gate copy only says "Confirm that you are 18 or older to view it" (`adult-content/strings.en.ts` `gate.description`). There is no toast and no undo (SCR-MAT-01 §D "Success: no toast"). "Go back" does nothing without history (U-MAT-01). Turning 18+ back on re-asks the age statement although WBS 5.6 says it should not (Q-MAT-01). Moderators cannot re-rate a story (BR-MAT-011). The Studio hint is inaccurate: "18+ stories are hidden from the home page by default." (`studio/strings.en.ts:237`) when they are hidden from **every** list and gated (BR-MAT-006/009). Age is only self-declared and no age is collected at sign-up (BR-MAT-002). **Hypothesised:** a reader who confirms in order to read one shared story does not expect their home and search lists to fill with 18+ stories. |
| Missing capabilities | Gate copy that states the effect, plus an undo; a header control that shows its state; a moderator re-rating action; author guidance on what counts as 18+; (decision) age at sign-up for minors |
| Proposed improvement | **SE-MAT-01**; **FP-005 amendment** (gate copy/undo, Studio hint, header state); **FP-024 amendment** + BRC-MAT-02 (moderator "Mark 18+"); **FP-065** (guidelines section "Mature content"); Q-MAT-05 (age at sign-up), Q-MAT-06 (scope of the gate confirmation) |
| Expected value | Fewer surprise exposures; mis-rated stories fixed without removal; authors rate correctly first time |
| Affected screens | SCR-MAT-01, SCR-SHELL-01, SCR-SET-01, SCR-STM-02/03 (hint), SCR-MOD-01 |
| Dependencies | FP-005, FP-022 (U-MAT-02), FP-065 |
| Evidence | Runtime screenshots + Verified (Code) as cited; Documented `docs/WBS.md:211` |

#### JRN-MOD-05 — Exceptional cases: appeals, legal/copyright takedowns, account lifecycle requests

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-05 |
| User goal | Affected member: contest a decision. Rights holder: get infringing content taken down (WBS 6.9 "DMCA/khiếu nại bản quyền"). Any person: exercise account or data rights. Operator: handle each through a recorded process |
| Current workflow | Appeals: none (WF-MOD-06 success criteria "Not met: … no appeal path"). Copyright: a **member** can report with reason "Copyright infringement" and free-text details. Guests are sent to sign in (BR-MOD-004) and `anon` cannot call `submit_report`. Legal pages: none (WBS 6.9 ⬜). Account lifecycle: none (WBS 6.4 ⬜, FP-008 blocked on Q-X-01). |
| Friction points | **Confirmed (Code):** no appeal entity, RPC or UI. No route or text for terms, privacy, community guidelines or copyright anywhere in `apps/web/src/app` or `packages/features/src` (repo search), and the shell has no footer to link them from (`shell/components/` has only header, menu and language switcher). Copyright reports carry no structured claim (original work, claimant relationship) (`report-button.tsx:102-123`). A suspended account cannot write anything gated by `is_active_account()` (BR-MOD-016), so it cannot even send a support request in-app. **Documented:** legal policy open (`docs/WBS.md` §4 "Còn mở"). **Inferred:** a mobile store release (Phase 7) requires a public privacy policy URL. |
| Missing capabilities | Appeal per action; community guidelines + terms + privacy + copyright pages; structured copyright claims and a contact path for rights holders without an account; operator handling of lifecycle requests |
| Proposed improvement | **FP-063** Appeals; **FP-065** Guidelines, legal pages and copyright requests; lifecycle → FP-008 (referenced, owned by the account agent) |
| Expected value | Due process for authors; a legal baseline before launch; takedowns that can be audited |
| Affected screens | SCR-MOD-01, SCR-MOD-02, SCR-STM-01, SCR-SHELL-01, SCR-AUTH-02 (consent line), new policy pages |
| Dependencies | FP-006 (notices are where the appeal starts), FP-008, Q-X-01, Q-X-02 |
| Evidence | Verified (Code) as cited; Documented `docs/WBS.md:222,227`, §4 |

#### JRN-MOD-06 — Platform operator tasks (roles, abuse thresholds, job health)

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-06 |
| User goal | Operator/admin: add or remove moderators, tune abuse limits during a spam wave, see that background jobs are healthy, and have every such change audited |
| Current workflow | Moderator role: service role writes `auth.users.raw_app_meta_data.role` (BR-MOD-001). Thresholds: `UPDATE public.abuse_limits …` by SQL (WF-ABU-03). Jobs: no health surface (F-JOB-02). |
| Friction points | **Confirmed (Code/Documented):** no UI for roles (`docs/WBS.md:219` "Chưa làm: cấp/thu vai moderator qua giao diện"). A revoked moderator keeps access until the JWT refreshes (Q-MOD-02). Threshold changes leave no audit row (Q-ABU-01). Dead letters and cron failures produce no signal (F-JOB-02, FP-010). There is no global browse of the audit log. **Hypothesised:** during an incident, depending on a person with SQL access delays the response. |
| Missing capabilities | Staff role management with audit; threshold editor with audit; job health panel; global audit log |
| Proposed improvement | **FP-066** Operations area in the console (+ BRC-MOD-01). Job health data comes from **FP-010** (`job_health()`), linked rather than duplicated. |
| Expected value | Faster incident response; accountability for every privileged change |
| Affected screens | SCR-MOD-01 (new Operations tab) |
| Dependencies | FP-010, FP-007, Q-MOD-02, Q-ABU-01, Q-MOD-09 |
| Evidence | Verified (Code) `20261104002200_abuse_limits.sql:3-7,38-39`; Documented `docs/WBS.md:219,226,251` |

#### JRN-MOD-07 — Reporter's side of a case

> Role is reader/member. Numbered under MOD to avoid colliding with other agents' RDR numbering; see §7.

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-07 |
| User goal | Reader: flag harmful content in a few taps, know it was received and handled, and protect themselves from the person meanwhile |
| Current workflow | WF-MOD-01. The ghost "Report" button sits on the story page (own row under the actions), at the end of a chapter, on others' comments and on author pages. A guest goes to `/login?next=<pathname>`. A member gets the dialog: reason Select (7 values), optional details ≤ 2000, toast "Report sent. Thank you." After that, nothing. |
| Friction points | **Confirmed (Runtime):** Report is visible to guests on the story page and the reader (RT-10). On the story page it occupies its own row below the actions at 390 and 1280 px (`m-story.png`, `d-story.png`). **Confirmed (Code):** (1) After sign-in the guest returns to the pathname only. The query, the hash and the dialog intent are lost, so the guest must find the button again, which matters for a comment deep in `#comments` (`report-button.tsx:86-88`, BR-MOD-004). (2) The owner sees Report on their own story or chapter (F-MOD-01 / F-STORY-01; `story-screen.tsx:129`, `reader-screen.tsx:159` pass no `ownerId`). (3) Reasons have no descriptions and there is no guideline link. (4) The button has no "Reported" state (U-MOD-03); re-reporting shows success again. (5) Reporters cannot see the status or the outcome (FP-031; BR-MOD-021). (6) There is no self-protection: a harasser's replies keep notifying the reporter, and no block exists (repo search: no block/mute table or RPC). |
| Missing capabilities | Intent kept across sign-in; reason help; success view with next steps; "Reported" state; "My reports" with outcome; block |
| Proposed improvement | **SE-MOD-02**; **FP-031 amendment**; **FP-064** Block; reporter notice in **FP-006 amendment** |
| Expected value | More, better-quality reports; trust that reporting works; immediate relief for harassment targets |
| Affected screens | SCR-MOD-02 and hosts SCR-STORY-01, SCR-READ-01, SCR-CMT-01, SCR-AUTHOR-01; SCR-SET-01 (blocked list) |
| Dependencies | FP-031, FP-064, FP-006, FP-065 |
| Evidence | Runtime screenshots; Verified (Code) as cited |

#### JRN-MOD-08 — Affected author or member's side of a case

> Role is author/member. Numbered under MOD; see §7.

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-08 |
| User goal | Author/commenter/suspended member: learn what was actioned, why (which rule), what they can still do, and how to contest it |
| Current workflow | WF-MOD-06. Removed story: readers get 404; Studio lists it under "Deleted stories" with a Restore button that fails. Hidden comment: inline "A moderator hid this comment. Only you can see it." Suspended: every write fails with each feature's generic "forbidden" text. |
| Friction points | **Confirmed (Code):** F-MOD-02 (a removal looks like the author's own deletion, and Restore fails), F-MOD-06 (no notice, no reason, no banner), no appeal (WF-MOD-06 "Not met"). Suspension effects are inconsistent (F-MOD-05, FP-002). |
| Missing capabilities | Notice with rule and date; a removed state distinct from a deletion; suspension banner; appeal |
| Proposed improvement | **FP-006 amendment** (notice standard and entry points), **FP-002 amendment** (banner content), **FP-063** (appeal) |
| Expected value | Less confusion and fewer support requests; due process; authors retained |
| Affected screens | SCR-STM-01, SCR-CMT-01, SCR-SHELL-01, SCR-NOTI-01 |
| Dependencies | FP-002, FP-006, FP-063 |
| Evidence | Verified (Code) `studio-screen.tsx:150-200`, `comments/components/comment-item.tsx:91-95` (per Phase 1), BR-MOD-016/021 |

---

### 3.4 Account (all roles)

#### JRN-ACC-01 — First visit → sign-up → confirm email → first session (onboarding and activation)

| Field | Value |
| --- | --- |
| Journey ID | JRN-ACC-01 |
| User goal | "I found a story I like. I want an account so I can save it, vote and come back, and I want the app to feel like mine quickly." |
| Current workflow | 1. Guest reads (no sign-up prompt on Home: U-HOME-02). 2. A member-only action ("Sign in to vote", Library/Write/Me in the bottom nav) sends them to `/login?next=…` (BR-AUTH-008), or the header "Sign in" sends them to `/login` **without** `next` (U-SHELL-04). 3. "Sign up" → `/register` with email, password, optional username, optional display name (SCR-AUTH-02). 4. "Check your email" card (SCR-AUTH-02-C09). 5. Email link → `/auth/callback` → session → redirect to `next` (default `/`) (`apps/web/src/app/auth/callback/route.ts:11-22`). 6. The member lands on Home or the original page. Nothing marks it as the first session: no welcome, no identity check, no starting point. |
| Friction points | **Confirmed:** (a) Sign-up form has 4 fields + no Google option (F-AUTH-02; `m-register.png` shows the form filling the first screen at 390 px). Verified (Runtime). (b) No language switch on auth pages (U-AUTH-01; `m-login.png`, `m-register.png`). Verified (Runtime). (c) The username the person typed can be silently changed (lower-cased, cut to 20, suffixed) by `handle_new_user` (`supabase/migrations/20261103000100_auth_and_rls.sql:33-46`, F-AUTH-01). Verified (Code). (d) No resend of the confirmation email (F-AUTH-03). Verified (Code). (e) A link opened on another device fails with "invalid or expired" (F-AUTH-04). Inferred. (f) New members have an empty library, so "Recommended for you" renders nothing (BR-REC-005: hidden when empty; `apps/web/src/app/(main)/discover-home.tsx:11-15`). Verified (Code). (g) No onboarding or welcome code at all (search for "onboard\|welcome" finds only the sign-in subtitle). Verified (Code). **Hypothesised:** (h) people who wanted to vote or save lose that intent after the email round-trip, because nothing reminds them what they were doing (Inferred). (i) No terms/privacy reference at sign-up (WBS 6.9 ⬜) may block launch legally (Inferred, Q-X-02). |
| Missing capabilities | CAP-ACCT-02 social sign-in, CAP-ACCT-03 resend / cross-device confirmation, CAP-ACCT-04 first-run welcome + activation checklist, CAP-ACCT-19 legal consent reference. |
| Proposed improvement | (1) Shorter sign-up: "Continue with Google" + email + password; username/display name move to the welcome step, where availability is shown (FP-009 amendment, BRC-AUTH-01). (2) Check-email card with resend + cooldown, "wrong address? change it", spam hint (FP-009). (3) **First-run welcome** `/welcome` (3 skippable steps: identity + avatar, reading interests + language, starter stories with one-tap Save) shown once, and only when it does not interrupt a pending intent; then an **activation checklist** on `/me` and Home (FP-035). (4) Terms/Privacy line under the sign-up button (FP-039). |
| Expected value | Fewer abandoned sign-ups (shorter form, Google), a first session that already has a personal library (seeds BR-REC-004 `library_similar` recommendations), fewer "who is user_3f2a…?" profiles. Measured with existing tables (saves, follows, `chapter_reads`, stories) through an operator query; no analytics service needed. |
| Affected screens | SCR-AUTH-02, SCR-AUTH-01, `/auth/callback`, new SCR-PRF-03 Welcome [Proposed], SCR-PRF-01, SCR-HOME-01 (checklist card; discovery agent owns the screen), SCR-SHELL-01 |
| Dependencies | FP-009 (Google, resend, username policy), FP-019 (`/me` hub hosts the checklist), FP-032 (guest CTA leads into sign-up), FP-021 (language), FP-039 (legal links), Q-AUTH-04, Q-X-02 |
| Evidence | Code refs above; runtime `m-register.png`, `t-register.png`, `m-login.png`; benchmark BM-33 (Wattpad genre picks at sign-up seed the feed; make them editable). |

#### JRN-ACC-02 — Returning member (same device, new device, after a break)

| Field | Value |
| --- | --- |
| Journey ID | JRN-ACC-02 |
| User goal | "Get back to what I was reading or writing, on whatever device I have now." |
| Current workflow | Same device: session cookie persists; header shows the avatar; Home looks like the guest Home plus "Recommended for you" / "From authors you follow" when non-empty (BR-HOME-008). New device: header "Sign in" → `/login` (no `next`) → `/` → `LanguageSync` applies the account language (BR-SET-004) → the reader must find their story through Library (bottom nav on mobile; user menu on tablet/desktop). |
| Friction points | **Confirmed:** (a) At 768 px and 1280 px there is no primary navigation: the bottom nav is hidden from `md` (`packages/ui/src/widgets/bottom-nav.tsx:47`) and the header has no section links (`packages/features/src/shell/components/site-header.tsx:13-22`). `t-home.png` and `d-home.png` show only brand, search, 18+, "VI" and "Sign in". Verified (Runtime) for guests; for members the user menu is the only path (Verified (Code), `user-menu.tsx:50-80`). (b) Header "Sign in" drops the current page (`user-menu.tsx:34-35`, U-SHELL-04). Verified (Code). (c) `/me` is not an account hub (no avatar, public page, Settings, Sign out; `apps/web/src/app/(main)/me/me-view.tsx:16-43`, U-PRF-01). Verified (Code). (d) Server-rendered pages flash Vietnamese before switching to English (RT-08, U-I18N-01). Verified (Runtime). **Hypothesised:** (e) Home has no "Continue reading" row for members, so the way back to the current story is Library → tab → card (Inferred from `discover-home.tsx:9-13`; owned by discovery/library agents). (f) Sign-out is global (BR-AUTH-017), so signing out of a shared computer also signs the person out of their phone, which they discover on return (Inferred, Q-AUTH-01). |
| Missing capabilities | CAP-PLAT-01 navigation at every width, CAP-PLAT-02 return to context, CAP-ACCT-06 account hub, CAP-ACCT-13 per-device sign-out. |
| Proposed improvement | FP-019 amendment: bottom nav kept up to `lg` (tablets), header section links from `lg`; all sign-in links carry `next` (incl. the auth layout "Back" link); `/me` becomes the hub. FP-009 amendment: "Sign out" = this device, plus "Sign out of all devices" in Settings → Account (needs Q-AUTH-01). FP-021: server-side language. Reading "Continue" row: referred to the discovery/library agents (section 7.1). |
| Expected value | Every section reachable in one tap/click at 390/768/1280; signing in never loses the page; fewer accidental global sign-outs. |
| Affected screens | SCR-SHELL-01, SCR-AUTH-01, SCR-PRF-01, SCR-SET-01, SCR-HOME-01 (reference only) |
| Dependencies | Q-SHELL-01, Q-SHELL-02, Q-AUTH-01, FP-019, FP-021, FP-012 (correct "Continue" target) |
| Evidence | `t-home.png`, `d-home.png`, `d-story.png` (no nav); code refs above; RT-08. |

#### JRN-ACC-03 — Password recovery

| Field | Value |
| --- | --- |
| Journey ID | JRN-ACC-03 |
| User goal | "I forgot my password. Let me back in and take me back to where I was." |
| Current workflow | SCR-AUTH-01 "Forgot password?" → `/forgot-password` (the `next` is dropped, SCR-AUTH-01-A04) → email → neutral "Instructions sent" (BR-AUTH-014) → email link → `/auth/callback?next=/reset-password` → recovery session → SCR-AUTH-04 new password + confirmation → toast "Password changed." → `/` signed in (WF-AUTH-04). |
| Friction points | **Confirmed:** (a) The original page is lost twice: sign-in → forgot drops `next`, and reset always lands on `/` (`reset-password-screen.tsx:29-41`). Verified (Code). (b) No "send again" or cooldown hint after the sent card (SCR-AUTH-03 D, AC05 [Proposed]). Verified (Code). (c) Any signed-in session can set a new password at `/reset-password` without the current one (F-AUTH-05; `apps/web/src/lib/auth/route-guard.ts:14-15`). Verified (Code). (d) Invalid-link card at `/reset-password` (`m-reset.png`) offers one text link and no explanation of why (expired vs. opened on another device). Verified (Runtime). **Hypothesised:** (e) A link opened in a different browser (e.g. mail app's in-app browser) fails because of PKCE (F-AUTH-04) and sends the user to `/login?error=callback` instead of back to "request a new link" (Inferred). (f) Other sessions stay signed in after a reset, so a person resetting because of a compromise is not protected (Unknown: depends on Supabase project settings, Q-AUTH-02). |
| Missing capabilities | CAP-ACCT-03 cross-device links, CAP-ACCT-11 reauthenticated password change, CAP-ACCT-13 "sign out other devices" after reset. |
| Proposed improvement | FP-009 amendment: carry `next` through forgot → email → reset → back to `next`; resend with 60 s cooldown; `token_hash` + `verifyOtp` callback (cross-device); recovery vs. normal session distinction; checkbox "Sign out of other devices" (default on) after reset (Q-AUTH-06); invalid-link card explains the two common causes and pre-fills the email when known. |
| Expected value | Recovery that ends where the person started; fewer support requests; a real security remedy for compromised accounts. |
| Affected screens | SCR-AUTH-01, SCR-AUTH-03, SCR-AUTH-04, `/auth/callback` |
| Dependencies | FP-009, Q-AUTH-01, Q-AUTH-02, Q-AUTH-06 |
| Evidence | `m-forgot.png`, `m-reset.png`; WF-AUTH-04; F-AUTH-04, F-AUTH-05. |

#### JRN-ACC-04 — Account lifecycle: change email/password, deactivate, delete (anonymise), export

| Field | Value |
| --- | --- |
| Journey ID | JRN-ACC-04 |
| User goal | "Keep my account secure and up to date; take a break; leave for good; take my data with me." |
| Current workflow | None. Settings has Language, Notifications, Reading, Adult content only (SCR-SET-01 B). No change email, no in-app change password, no deactivate, no delete, no export (F-AUTH-07, BR-AUTH-022, WBS 6.4 ⬜). The schema already has `account_status IN ('active','suspended','deactivated')` and `app_users.deleted_at` (`supabase/migrations/20261103000000_init_schema.sql:19-23`) but nothing writes `deactivated` or `deleted_at`. |
| Friction points | **Confirmed:** (a) A member who wants to leave has no self-service path (Verified (Code)). (b) Changing password requires the "forgot password" detour (Verified (Code)). (c) WBS Q7 decided "delete = anonymise, keep content" but the legal retention policy is still open (Q-X-01), and WBS §4 notes that followed stories and authors who want to take their stories down need a policy first (Documented). **Hypothesised:** (d) authors leaving with co-authored stories or pending invitations will leave teams in an inconsistent state (Inferred from BR-TEAM, Q-TEAM-03). (e) Without an export, a Vietnamese/EU-style data-access request must be handled by hand (Inferred; legal scope Unknown). |
| Missing capabilities | CAP-ACCT-11, CAP-ACCT-12, CAP-ACCT-14, CAP-ACCT-15, CAP-ACCT-16. |
| Proposed improvement | FP-008 amendment: a **Settings → Account** section (email + change, password + change, sign-out everywhere) and a **Settings → Privacy & data** section (export, deactivate, delete) with re-authentication, consequences listed in plain language, a pre-delete choice per owned story (keep under "Deleted user" / unpublish first, per WBS Q7 note), and a proposed 14-day grace period (Q-AUTH-05, new BR text, needs approval). |
| Expected value | Launch compliance (WBS 6.4 is MVP), trust, fewer manual support operations. |
| Affected screens | SCR-SET-01, SCR-PRF-01, SCR-AUTH-01 (reactivation notice on sign-in), SCR-AUTHOR-01 ("Deleted user" rendering, discovery agent), SCR-TEAM-01 (studio agent) |
| Dependencies | Q-X-01 (legal), Q-AUTH-05, FP-002 (non-active accounts everywhere), FP-016 (team lifecycle), Q-AUTH-02 (secure email change setting) |
| Evidence | Code refs above; WBS 6.4 and §4 Q7. |

#### JRN-ACC-05 — Language and accessibility preferences (guest and member)

| Field | Value |
| --- | --- |
| Journey ID | JRN-ACC-05 |
| User goal | "Use StoryNest in my language, comfortably (dark at night, larger controls, no motion), on every device." |
| Current workflow | Language: header "VI/EN" button on `(main)` pages (BR-I18N-006), stored on the device, synced to the account for members (BR-SET-004); Settings select. Reading comfort: reader settings sheet (font size, line spacing, font, background) on chapter pages and from Settings → Reading (WP 2.7). App theme: follows the OS only (`packages/design-tokens/src/tokens.css:6-7`); nothing sets the supported `.light`/`.dark` classes (`tokens.css:76-81`). Motion: no `prefers-reduced-motion` handling anywhere (search: no match). |
| Friction points | **Confirmed:** (a) No language switch on the auth pages (U-AUTH-01, `m-login.png`). Verified (Runtime). (b) Server HTML is always Vietnamese with `lang="vi"` (`apps/web/src/app/layout.tsx:35`, RT-08). Verified (Runtime). (c) Account language save fails silently (U-SET-01). Verified (Code). (d) The language button shows "VI" but is named "Switch to English" (`packages/features/src/shell/components/language-switcher.tsx:18-21`), so the visible label is not part of the accessible name (WCAG 2.5.3 Label in Name). Verified (Code). (e) No app-wide dark mode choice: a night reader whose OS is light can darken only the chapter (reader theme), while Home, story pages, Library and Settings stay light (Verified (Code); visual not observed: all screenshots are light). (f) Switching language remounts forms and discards input (U-I18N-02). Verified (Code). **Hypothesised:** (g) Users sensitive to motion get dialog/sheet animations (tw-animate-css) with no way to reduce them (Inferred). |
| Missing capabilities | CAP-ACCT-09 app theme, CAP-ACCT-10 accessibility preferences, CAP-PLAT-17 server-side language. |
| Proposed improvement | FP-036 (app theme System/Light/Dark + reduce motion, device + account, no-flash bootstrap); FP-021 amendment (switcher in auth layout and footer, label in name, sign-up sends language); FP-022 amendment (label-in-name, reduced motion base rule, focus ring); FP-037 (tokens). |
| Expected value | Comfortable long reading sessions (core use case), WCAG 2.1 AA progress (WBS 8.5), language parity from the first page. |
| Affected screens | SCR-SET-01, SCR-SHELL-01, SCR-AUTH-01…04, SCR-READ-01 (reader theme "site" follows the app theme; reading agent) |
| Dependencies | Q-SET-01, Q-I18N-01, FP-021, FP-022 |
| Evidence | Code refs above; RT-08; benchmark BM-02 (Wattpad keeps reader theme separate from app dark mode and has no web dark mode: anti-pattern for a web-first product). |

---

### 3.5 Cross-journey analyses

#### Saved vs Following vs Reading lists — concept model analysis (input to FP-048)

| Concept today | Storage | What the reader gets | Visible as |
| --- | --- | --- | --- |
| Reading | `user_story_progress` (automatic) | Continue link | Library "Đang đọc" |
| Saved | `story_saves` | A shelf entry, **no** notifications | Button "Lưu vào thư viện", tab "Đã lưu" |
| Following (story) | `story_follows` | New-chapter notifications, a shelf entry in another tab | Button "Theo dõi" (bell), tab "Đang theo dõi" |
| Following (author) | `user_follows` | Stories in `/following`, **no** notifications | Button "Theo dõi" (person), Home link "Từ tác giả bạn theo dõi" |
| Reading list | `reading_lists(_items)` | Named, ordered, shareable group | Button "Thêm vào danh sách", tab "Danh sách", `/lists/[id]` |

Assessment: Reading (automatic) and Lists (curation and sharing) are distinct jobs and should stay. **Saved and story
Following answer the same question ("keep this story for me") but split it into two independent switches**. The
second switch also decides whether the reader is notified. Story Following and author Following share one label but
behave differently. Proposed model (FP-048):

- **Save** (one primary button) = keep in my library. **Notify me of new chapters** = a bell sub-setting of a saved
  story, on by default (BRC-LIB-01), switchable per story from the Save sheet, the Library row and the notification
  menu.
- **Lists** stay a secondary layer inside the same Save sheet (today's C09). Adding to a list does not auto-save
  (unchanged).
- **Follow author** stays separate, gets distinct wording, and is listed in the Library "Authors" tab.

Non-breaking migration path (no table dropped, no row rewritten):

| Stage | Change | Data | Approval |
| --- | --- | --- | --- |
| A (copy and IA only) | Rename story follow to "Thông báo chương mới" / "Notify me"; explain under the buttons; Library "Đang theo dõi" → "Thông báo" with the bell; fix "reading list" wording; Authors tab | None | None beyond FP approval (copy) |
| B (merged UI, union read) | One "Lưu" button + sheet. "In library" = `story_saves ∪ story_follows`. A follow-only legacy row shows as Saved with the bell on; a save-only row shows with the bell off. The Following tab becomes the "Notifying me" filter of Saved. `?tab=following` keeps working as an alias | Read-side union in `list_library` (FP-047). `set_story_follow` and `set_story_save` unchanged | **BRC-LIB-01** (BR-LIB-008 tab content) |
| C (default) | Saving also sets the follow (bell on) unless the reader turned "notify by default" off. Unsave removes both, with undo. Unfollow keeps the save | One new RPC `set_story_kept(story, kept, notify)` wrapping the two existing RPCs in one transaction; counters unchanged | **BRC-LIB-01** (BR-LIB-001 "neither implies the other") + Q-LIB-03 |

Rollback at any stage: restore the two buttons. Data was never merged.

---


## 4. Capability gap matrix

Status: Implemented · Partial · Missing · Not Applicable · Unverified. "Recommendation" names the FP that closes
the gap or "none" when no change is recommended (with the reason).

### Reading experience (`CAP-READ`)

| Capability ID | Capability | Current StoryNest | Evidence | User value | Recommendation |
| --- | --- | --- | --- | --- | --- |
| CAP-READ-01 | Reading comfort: font size, line spacing, font, background, comfortable measure | Implemented | BR-READ-013…018, `reader-settings-sheet.tsx`, runtime `mobile-reader-settings-en.png` | High | none (keep; FP-043 adds the chrome around it) |
| CAP-READ-02 | Immersive / focus mode (no app chrome, auto-hiding controls) | Missing | N-02, WBS §1.2 `docs/WBS.md:63`, `m-reader.png` | High | FP-043 |
| CAP-READ-03 | Chapter navigation (prev/next near the end of the text, TOC, keyboard) | Partial | U-READ-01, N-01, `chapter-nav.tsx`, `toc-sheet.tsx` | High | FP-012 (amended) + FP-043 |
| CAP-READ-04 | Resume position across devices | Partial (members Implemented, silent; guests Missing) | BR-PROG-005/007, N-08, F-PROG-04 | High | FP-044, FP-027 |
| CAP-READ-05 | In-chapter progress visibility (bar, % / position "2 of 4") | Partial | F-PROG-01, N-01, `reader-screen.tsx:124,129` | Medium | FP-043, FP-012 |
| CAP-READ-06 | Story-level progress visibility (read marks, caught-up state) | Missing | N-04, `story-screen.tsx:189-205`, `toc-sheet.tsx:43-59` | High | FP-044 |
| CAP-READ-07 | Chapter discovery (new chapters since last visit, chapter dates, latest chapter) | Missing | U-STORY-02, N-07 | Medium | FP-040, FP-044 |
| CAP-READ-08 | Reader personalisation synced to the account | Implemented | BR-READ-016/017 | Medium | none |
| CAP-READ-09 | Control over paragraph-comment markers while reading | Missing | N-09, U-CMT-01 | Medium | FP-043 (preference; BRC-READ-01) |
| CAP-READ-10 | End-of-story / caught-up handling (follow for more, the end, what next) | Missing | N-04, N-05 | High | FP-044 |
| CAP-READ-11 | Offline reading (download chapters, sync queue) | Missing; planned for mobile (WBS 7.4) | `docs/WBS.md:241` | High on mobile | none: WBS 7.4 owns it (the FP-043 layout should keep the reader route free of shell-only dependencies so 7.1/7.4 can reuse it) |

### Content discovery (`CAP-DISC`)

| Capability ID | Capability | Current StoryNest | Evidence | User value | Recommendation |
| --- | --- | --- | --- | --- | --- |
| CAP-DISC-01 | Diacritic-insensitive search | Implemented | BR-SRCH-001…003, RT-11 | High | none |
| CAP-DISC-02 | Search relevance across title, author, tags and synopsis in one result list | Partial (title only) | N-06 | Medium | FP-042 |
| CAP-DISC-03 | Filter by completion status | Missing | `discovery.api.ts:63-86,100-129`, `search.sql:64-86` | High | FP-041 |
| CAP-DISC-04 | Filter by length | Missing (no data) | N-07 | Medium | FP-040 + FP-041 |
| CAP-DISC-05 | Filter by recency of the last new chapter | Missing | N-03 | Medium | FP-040 + FP-041 |
| CAP-DISC-06 | Language filter | Partial (API only) | F-HOME-02 | Low (vi-first) | Existing quick fix F-HOME-02 (could share the FP-041 filter bar) |
| CAP-DISC-07 | Sorting (updated / newest / most read / most voted) | Missing | `discovery.api.ts:116-118` (fixed order) | Medium | FP-041 |
| CAP-DISC-08 | Personal recommendations with reason | Implemented (members) | BR-REC-004…007 | Medium | FP-029 (amended) |
| CAP-DISC-09 | Similar stories with reason | Implemented | BR-REC-001…003 | Medium | FP-045 (placement and density) |
| CAP-DISC-10 | Browse by category / tag | Partial (root categories only, no category heading) | U-TAX-01, `page.tsx:66-70` | High | FP-017 (amended) |
| CAP-DISC-11 | Rankings by period | Implemented | BR-RANK-* , RT-12 | Medium | none |
| CAP-DISC-12 | Rankings by category | Missing | N-10 | Medium | FP-046 |
| CAP-DISC-13 | New-story / new-author discovery | Missing | N-03, BR-RANK-001 | Medium (supply health) | FP-046 |
| CAP-DISC-14 | Guest landing (value proposition, CTA, trending) | Partial | U-HOME-02, `m-home.png` | High | FP-032 (amended) |
| CAP-DISC-15 | Decision facts on cards and the story page (length, reading time, last chapter, completion) | Partial | N-07, U-STORY-02 | High | FP-040 |
| CAP-DISC-16 | Updates from followed authors at chapter level ("chapter 12 is out") | Partial (story grid only) | SCR-AUTHOR-02 spec, BR-AUTHOR-008 | Medium | FP-040 data + SE-AUTHOR-02 |
| CAP-DISC-17 | List density appropriate per viewport | Partial | metrics (451 px cards at 390 px) | High | FP-045 |
| CAP-DISC-18 | Section navigation to discovery areas on desktop | Missing | U-SHELL-01 | High | FP-019 (amended) |

### Reader engagement (`CAP-ENG`)

| Capability ID | Capability | Current StoryNest | Evidence | User value | Recommendation |
| --- | --- | --- | --- | --- | --- |
| CAP-ENG-01 | Follow a story to be told about new chapters | Implemented | BR-LIB-002, BR-NOTI-003 (Verified SQL test) | Core update loop | FP-048 (clearer model), FP-047 |
| CAP-ENG-02 | Follow an author | Partial — feed page only, no notification, no list of followed authors, same label as story follow | BR-AUTHOR-005…010, F-AUTHOR-01, `features/author/strings.ts:10-12` | Keeps readers with an author across stories | FP-019 (list), FP-026 (amend: new-story type), FP-048 (wording) |
| CAP-ENG-03 | Save a story to a private shelf | Implemented — independent of follow | BR-LIB-003, BR-LIB-001 | Read later | FP-048 |
| CAP-ENG-04 | Reading lists: curate, order, share | Partial — CRUD and ordering done; no share action, no add-from-list-page, silent unavailable items, generic share title | BR-LIST-001…014, U-LIST-01, F-LIST-02 | Curation and identity | FP-014, FP-051, SE-LIST-01; discovery FP-028 |
| CAP-ENG-05 | Continue reading in one tap | Partial — Library and story page only, targets disagree, absent from Home | BR-LIB-007, F-PROG-02, `discover-home.tsx:11-15` | Fast resume | FP-012, FP-047 |
| CAP-ENG-06 | In-app "what's new" awareness (new chapters per kept story, caught-up state, nav badge) | Missing | `library/model/library.ts:49-58`, `ui/src/widgets/bottom-nav.tsx:14-20` (no badge prop) | Main reason to come back | **FP-047** |
| CAP-ENG-07 | Vote on a chapter | Implemented | BR-VOTE-001…012 | Lightweight appreciation; feeds rankings | none |
| CAP-ENG-08 | Chapter and paragraph comments, likes, edit/delete, author hide | Implemented (paragraph target too small: U-CMT-01) | BR-CMT-001…021 | Discussion | SE-CMT-01; FP-022 |
| CAP-ENG-09 | Two-way conversations (answer a reply, all participants told) | Partial — one turn only | `…001100_comment_reply_notifications.sql:45-66`, `comment-item.tsx:174` | Discussions continue | **FP-049** |
| CAP-ENG-10 | Author presence in discussion (badge, "author replied") | Missing | U-CMT-04, BR-NOTI-015 text | Readers feel heard | FP-025 (amend), FP-049 |
| CAP-ENG-11 | Notification inbox with live bell | Implemented | BR-NOTI-010…014 | Awareness while in app | FP-050, FP-013, FP-011 |
| CAP-ENG-12 | Notification preferences (global, per story) | Partial — 3 global switches on `/settings` only; no per-story mute; not linked from the inbox | BR-NOTI-007, `settings-screen.tsx:33` | Control instead of opt-out | **FP-050** |
| CAP-ENG-13 | Out-of-app channels (email digest, push) | Missing | BR-NOTI-017, WBS 6.7 ⬜ | Reaches readers not in the app | FP-026 (amend: digest first) |
| CAP-ENG-14 | More reader notification types (followed author's new story, my comment hidden) | Missing | Q-NOTI-03, F-NOTI-04 | Fewer silent outcomes | FP-026; FP-006 |
| CAP-ENG-15 | End-of-chapter next step (caught-up follow prompt, finished-story path) | Missing | `reader-screen.tsx:151-169`, `chapter-nav.tsx`; Runtime `m-reader.png` | Converts peak intent into a follow | **FP-052** |
| CAP-ENG-16 | Reading streaks / goals | Missing | — | Unproven for serial fiction. Risk of gamification noise and pressure | none — not recommended until FP-047 return metrics exist |
| CAP-ENG-17 | Community spaces beyond chapters (forums, DMs, clubs) | Not Applicable (current scope) | WBS has no WP | High moderation cost | none |
| CAP-ENG-18 | @mentions | Missing | — | Address a person in a thread | Only the reply-to-reply prefill in FP-049; no general mentions (spam surface, FP-007) |

### Growth and retention (`CAP-GROW`)

| Capability ID | Capability | Current StoryNest | Evidence | User value | Recommendation |
| --- | --- | --- | --- | --- | --- |
| CAP-GROW-01 | Guest → member at intent points, with the action completed after sign-in | Partial — `next` path kept, hash and action lost | `story-actions.tsx:25-26`, `comment-thread.tsx:38`, U-CMT-02, U-SHELL-04 | Conversion without repeating clicks | FP-048 (intent replay), FP-019 |
| CAP-GROW-02 | First-session activation of a new member (empty library guidance) | Partial — empty states with no action | `library-screen.tsx:130-131` (EmptyState `action` unused) | New members find a first story to keep | SE-LIB-01 |
| CAP-GROW-03 | Repeat-usage loop (chapter → notify → read → comment → reply → return) | Partial — in-app only, conversation breaks after one turn | JRN-RDR-09/10/11 | Habit | FP-047, FP-049, FP-026 |
| CAP-GROW-04 | Sharing (story, chapter, list) | Partial — OG images and canonical URLs exist (WBS 6.6), **no share or copy action anywhere** (no `navigator.share`/clipboard use in `features/`) | WBS 6.6, U-LIST-01 | Word-of-mouth acquisition | **FP-051** |
| CAP-GROW-05 | Retention measurement (return cohorts, notification → read conversion) | Missing (Unverified whether any external analytics is planned) | No tracking code found; data exists in `chapter_reads`, `user_story_progress`, `notifications.read_at` | Validate every GROW hypothesis here | none — see §7 note (SQL view, no new service) |
| CAP-GROW-06 | Win-back of lapsed readers | Missing | BR-NOTI-017 | Re-activation | FP-026 (amend: digest) |
| CAP-GROW-07 | Referral / invite friends | Missing | — | Unclear without sharing data | none — revisit after FP-051 |

### Author experience (`CAP-AUTH`)

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
| CAP-AUTH-10 | Leave, change role, team transparency, contribution attribution | Missing | F-TEAM-02/03; Team owner-only (`team-screen.tsx:70-72`); `updated_by`/`created_by` unused in Studio | Medium–High on shared stories | FP-016 (amended) |
| CAP-AUTH-11 | Ownership transfer | Missing | No RPC/UI; owner is `stories.owner_id` | Low frequency, but matters for account deletion (DEC-007) | none — Q-TEAM-04 |
| CAP-AUTH-12 | Story statistics (daily, per chapter, retention) | Implemented (Partial depth) | BR-STAT-001…010; no lifetime/followers; mouse-only values | High | FP-056 |
| CAP-AUTH-13 | Audience growth (followers over time, period comparison) | Missing | `story_follows.created_at` exists (`init_schema.sql:220-225`), no aggregate | Medium–High | FP-056 |
| CAP-AUTH-14 | Comment moderation by the author (hide/unhide) | Implemented | BR-CMT-014, WBS 6.2 | Safety | none |
| CAP-AUTH-15 | Author-side comment inbox across chapters | Missing | No list outside the reader | High for active serials | FP-057 |
| CAP-AUTH-16 | Notifications about reader activity on my stories (new comment, new follower) | Missing | 5 types only (`notification.ts:6-12`) | High | FP-026 (existing; see §7) |
| CAP-AUTH-17 | Shortcut from public story/reader to Studio for team members | Missing | No `/studio` link in story/reader/author screens | Medium | FP-053 |
| CAP-AUTH-18 | Author profile and branding (name, bio, avatar, author page) | Partial | `app_users` has display_name/bio/avatar only (`init_schema.sql:13-26`); author page lists owned stories only (Q-AUTHOR-01) | Medium | none (bio/avatar nudge inside FP-054 checklist) |
| CAP-AUTH-19 | Announcements / messages to followers | Missing | No feature | Unproven demand | none (revisit after FP-026 telemetry) |
| CAP-AUTH-20 | Rich-text formatting limited to what a chapter stores (H2, B/I/U/S, break, divider, picture, undo/redo) | Implemented | BR-EDT-003, `editor/model/extensions.ts:48-66` | Reader-faithful formatting, no lossy saves | none |
| CAP-AUTH-21 | Live word count | Implemented | BR-EDT-007 | Length awareness | none |
| CAP-AUTH-22 | Writing stats: selection count, characters, est. reading time, words this session | Missing | `chapter-editor-screen.tsx:100,217-219` (total only) | Serial authors target consistent chapter length | FP-062 |
| CAP-AUTH-23 | Focus / distraction-free mode (no shell, panels hidden) | Missing | Editor inside `MainShell` (`apps/web/src/app/(main)/layout.tsx:4-7`) | Concentration on long sessions | FP-058 |
| CAP-AUTH-24 | Mobile editing: keyboard-aware sticky toolbar, ≥ 44 px targets, status always visible | Missing | JRN-AUT-08 F2–F5 | Most serial writing happens in short phone sessions (Hypothesised; benchmark: mobile-first writing apps) | FP-058 |
| CAP-AUTH-25 | Keyboard shortcuts incl. save, discoverable | Partial | BR-EDT-027, U-EDT-04 | Desktop speed | FP-034 (amended) |
| CAP-AUTH-26 | Find & replace within a chapter | Missing | No search extension (`extensions.ts`) | Rename a character / fix a repeated typo | FP-062 |
| CAP-AUTH-27 | Paste from Word / Google Docs with clean-up and a report of dropped content | Partial (Unverified) | BR-EDT-003 exception (Inferred, untested) | Most authors draft elsewhere first | FP-062 |
| CAP-AUTH-28 | Author's note (before/after chapter) as a field outside the body | Missing | `chapterBodySchema` has no such field | Keeps notes out of word count, diff and paragraph comments | none — Q-EDT-07 |
| CAP-AUTH-29 | Chapter templates | Missing | — | Low: chapters are free-form | none (not justified) |
| CAP-AUTH-30 | Team review notes / suggestions on a draft (editor role) | Missing | No draft-comment entity; BR-TEAM-010 | Editors have edit rights but no review channel | none — consolidation with collaboration agent (§7) |
| CAP-AUTH-31 | Autosave with visible status | Implemented (status placement weak) | BR-EDT-009; JRN-AUT-08 F3 | Trust | FP-058 (placement) |
| CAP-AUTH-32 | Local device backup + recovery banner | Implemented | BR-EDT-011 | Offline/tab-close safety | FP-003 (amended: compare before restore) |
| CAP-AUTH-33 | Flush/guard on in-app navigation | Missing | F-EDT-02 | Prevents stale preview and lost text | FP-003 |
| CAP-AUTH-34 | Open and edit a chapter while offline | Missing | `chapter-editor-screen.tsx:92-103` | Commute writing | none — Q-EDT-08 (WP 7.x) |
| CAP-AUTH-35 | Same-browser multi-tab handling | Unverified | Q-EDT-04, WBS 3.6 note | Avoid self-conflicts | FP-003 (amended) |
| CAP-AUTH-36 | Two-device / co-author conflict detection (CAS) | Implemented | BR-EDT-008/013 | No silent overwrite | none |
| CAP-AUTH-37 | Conflict prevention: who else is editing (presence) | Missing | BR-EDT-013 reacts only at save | Fewer conflicts in team stories | FP-061 |
| CAP-AUTH-38 | Server-side draft history (automatic + named checkpoints) | Missing | Only `chapter_versions` (published) | Undo across days, safe restore | FP-059 |
| CAP-AUTH-39 | Reader-faithful preview (incl. unsaved text, chapter header, phone width) | Partial | BR-HIST-007, U-HIST-02, F-EDT-02 | Confidence before publishing | SE-HIST-02 + FP-003 |
| CAP-AUTH-40 | Publish now with double-submit and revision safety | Implemented | BR-EDT-018/026 | Integrity | none |
| CAP-AUTH-41 | Pre-publish review: audience, diff vs live, warnings (comments on removed paragraphs, foreign images, empty) | Missing | JRN-AUT-10 F3–F7 | No accidental announcement; protects reader discussion | FP-060 |
| CAP-AUTH-42 | Skip identical republish | Missing | F-EDT-06 | Clean history | FP-034 |
| CAP-AUTH-43 | Scheduled publishing with failure feedback | Partial | BR-EDT-021/022, F-EDT-01/05 | Release planning | FP-010 |
| CAP-AUTH-44 | Warning when editing a scheduled chapter; schedule next version of a live chapter | Missing | BR-EDT-021, Q-EDT-02, Q-EDT-05 | Prevent half-edits going live | FP-010 (amended) |
| CAP-AUTH-45 | Unpublish / cancel schedule (role-gated, confirmed) | Implemented (copy issue U-EDT-01) | BR-EDT-023 | Recover from mistakes | FP-034 |
| CAP-AUTH-46 | Follower notification on first publish | Implemented (links fragile; private-story consumption) | BR-NOTI-003, F-NOTI-01, JRN-AUT-10 F6 | Audience reach | FP-011 (amended), FP-060, Q-NOTI-04 |
| CAP-AUTH-47 | Choose to announce a major republish | Missing | BR-NOTI-003 "republish is silent" | Low; risk of spam | none (keep BR) |
| CAP-AUTH-48 | Version list + read-only view | Implemented | BR-HIST-003/004 | Accountability | none |
| CAP-AUTH-49 | Compare: changes-only, next/prev change, word-level, title | Partial | BR-HIST-005, U-HIST-01 | Find changes fast | SE-HIST-01 (UI only, no FP) |
| CAP-AUTH-50 | Restore with undo | Partial | BR-HIST-006, F-HIST-01 | Fearless restore | FP-003 + FP-059 |
| CAP-AUTH-51 | Image block: alt text, touch controls (replace/remove), cleanup | Partial | BR-EDT-014, F-EDT-08/09 | A11y, mobile editing | FP-030 (amended) |

### Trust and safety (`CAP-TNS`)

| Capability ID | Capability | Current StoryNest | Evidence | User value | Recommendation |
| --- | --- | --- | --- | --- | --- |
| CAP-TNS-01 | Report story, chapter, comment, account | Implemented | BR-MOD-002…008; Runtime RT-10 | Readers can flag harm | none (polish in SE-MOD-02) |
| CAP-TNS-02 | Report reason guidance and a public content policy (community guidelines) | Missing | No policy route or text (repo search); moderator placeholder cites a non-existent policy (`moderation/strings.en.ts:96`) | Readers report accurately; authors know the rules; moderators cite rules | FP-065 |
| CAP-TNS-03 | Reporter feedback ("Reported" state, my reports, outcome) | Missing | U-MOD-03; BR-MOD-021 (RLS allows own rows, no UI) | Trust that reporting works | FP-031 (amended) |
| CAP-TNS-04 | Moderation queue triage | Partial (per-report list, 2 tabs) | BR-MOD-019, U-MOD-01/02 | Moderator throughput | FP-024 (amended) |
| CAP-TNS-05 | Case grouping and severity priority | Missing | `moderation-screen.tsx:105-116`; `list_reports` order only by date | Worst harm handled first; no duplicate work | FP-024 (amended) |
| CAP-TNS-06 | Investigation context (target/account history, preview of removed content) | Partial (data readable, no UI; removed content opens as not-found) | `moderation.sql:50-51`; `story.api.ts:33`, `reader.api.ts:31` | Correct, consistent decisions | FP-024 (amended) |
| CAP-TNS-07 | Graduated actions (mark 18+, chapter removal, timed suspension, lock author-hidden comment) | Partial (3 binary actions) | BR-MOD-011…014, BR-MAT-011, Q-MOD-03/04, Q-MAT-04 | Proportionate enforcement | FP-024 (amended), FP-006 |
| CAP-TNS-08 | Moderation transparency to affected parties (notice, rule, date) | Missing | F-MOD-02, F-MOD-06, BR-MOD-021 | Understanding, fewer support requests | FP-006 (amended) |
| CAP-TNS-09 | Appeals | Missing | WF-MOD-06 "Not met" | Due process; correction of errors | FP-063 |
| CAP-TNS-10 | Suspension enforced consistently | Partial | F-MOD-05, F-HOME-01, BR-MOD-016 | Moderation that actually works | FP-002 (amended) |
| CAP-TNS-11 | Block another user (self-service safety) | Missing | No block/mute table, RPC or UI (repo search over `supabase/migrations`, `packages/features`) | Immediate protection from harassment without waiting for a moderator | FP-064 |
| CAP-TNS-12 | Author-side comment moderation on own story | Implemented (OBJ-CMT) | `20261104001800_comment_moderation_by_author.sql`, WBS 6.2 | Authors keep their threads civil | none |
| CAP-TNS-13 | 18+ filter, gate, cross-device choice | Implemented (client-side gate; server leaks) | BR-MAT-001…010; Runtime RT-06 | Readers are not surprised by adult content | FP-005 (amended) |
| CAP-TNS-14 | Age-appropriate experience for minors (age at sign-up, 18+ locked for minors) | Missing (self-declaration only) | BR-MAT-002; WBS 5.6 "chưa có bước kiểm tra tuổi thật" | Protects minors on shared/personal devices | none until Q-MAT-05 is decided |
| CAP-TNS-15 | Content warnings / ratings beyond one 18+ flag | Missing | Only `stories.is_mature` | Finer reader choice | none: not justified now. Free tags already carry themes (OBJ-TAX), and a second rating axis would multiply the filter matrix of BR-MAT-006. Revisit after launch data. |
| CAP-TNS-16 | Rate limits and comment spam filter | Partial | BR-ABU-001…009, F-ABU-01/03 | Threads free of floods | FP-007 (amended) |
| CAP-TNS-17 | Sign-up abuse protection (captcha, sign-up limit) | Missing | BR-ABU-008, F-ABU-02 | Fewer throwaway abuse accounts | FP-009 (reference only) |
| CAP-TNS-18 | Terms of service and privacy policy | Missing | WBS 6.9 ⬜; no routes | Legal baseline; app-store requirement (Inferred) | FP-065 |
| CAP-TNS-19 | Copyright / legal takedown requests | Partial (member report with reason "copyright", free text only) | BR-MOD-003/004; WBS 6.9 | Rights holders served; audited takedowns | FP-065 |
| CAP-TNS-20 | Account lifecycle (deactivate, delete/anonymise, export) | Missing | WBS 6.4 ⬜, F-AUTH-07 | Privacy rights | FP-008 (reference only, account agent) |
| CAP-TNS-21 | Moderator role management | Missing (service-role SQL) | BR-MOD-001; `docs/WBS.md:219` | Team changes without engineers; quick revocation | FP-066 |
| CAP-TNS-22 | Abuse threshold administration with audit | Missing (SQL, no audit) | WF-ABU-03, Q-ABU-01 | Accountable tuning during incidents | FP-066 |
| CAP-TNS-23 | Audit log browsing | Missing UI (table readable by moderators) | BR-MOD-018 | Accountability, investigations | FP-024 (per target), FP-066 (global) |
| CAP-TNS-24 | Job health visible to operators | Missing | F-JOB-02 | Stoppages noticed | FP-010 (reference), surfaced in FP-066 |
| CAP-TNS-25 | Reporter identity kept private from the reported party | Implemented | Queue is moderator-only (`list_reports` 42501, `moderation.sql:292-294`); notifications have no moderation types | Safe to report | none (keep as a rule in FP-006/FP-031 notices) |
| CAP-TNS-26 | Moderation reaches every copy (notification excerpts) | Missing | F-NOTI-02 | Hidden abuse not readable elsewhere | FP-013 (reference only) |

### Account and personalisation (`CAP-ACCT`)

| Capability ID | Capability | Current StoryNest | Evidence | User value | Recommendation |
| --- | --- | --- | --- | --- | --- |
| CAP-ACCT-01 | Email + password sign-up with email confirmation | Implemented | Verified (Code) WF-AUTH-01/02, `auth.api.ts:19-35`; SMTP end-to-end not run (WBS 1.1) | Account creation | none (gaps under FP-009) |
| CAP-ACCT-02 | Social sign-in (Google, approved Q6) | Missing | F-AUTH-02; WBS 1.1 🟡 | Faster sign-up, no password to forget | FP-009 |
| CAP-ACCT-03 | Resend confirmation, cross-device email links | Missing | F-AUTH-03, F-AUTH-04 | Fewer dead ends after sign-up/reset | FP-009 |
| CAP-ACCT-04 | First-run welcome (identity, interests, starter stories) + activation checklist | Missing | Verified (Code): no onboarding code; callback goes straight to `next` (`route.ts:16-21`) | Cold start solved, member feels at home | **FP-035** |
| CAP-ACCT-05 | Public identity: display name, username, bio, avatar | Implemented | BR-PRF-001…012 | Recognisable author/reader | none (rename redirect FP-011) |
| CAP-ACCT-06 | Account hub (`/me`: avatar, public page, Settings, Sign out, own counts) | Partial | U-PRF-01; `me-view.tsx:16-43` | One place to manage "me" | FP-019 (amended) |
| CAP-ACCT-07 | Interface language, synced across devices | Implemented (silent save failure; SSR always vi) | BR-SET-004, U-SET-01, RT-08 | Language parity | FP-021 (amended) |
| CAP-ACCT-08 | Notification preferences | Partial (in-app only, 3 types) | BR-SET-005/006; F-SET-01 | Control noise | FP-026 (community agent) |
| CAP-ACCT-09 | Reading preferences (size, spacing, font, background) | Implemented (synced) | WBS 2.7; BR-READ-* | Comfortable reading | none |
| CAP-ACCT-10 | App-wide display and accessibility preferences (theme, reduced motion) | Missing | `tokens.css:6-7,76-81` (classes supported, never set); no `prefers-reduced-motion` rule | Night reading, motion sensitivity | **FP-036** |
| CAP-ACCT-11 | Change password while signed in (reauthenticated) | Missing | F-AUTH-05 | Security hygiene | FP-009 (amended) |
| CAP-ACCT-12 | Change email | Missing | F-AUTH-07 | Keep access when an address changes | FP-008 (amended) |
| CAP-ACCT-13 | Session control (this device vs. all devices) | Partial (global only) | BR-AUTH-017, Q-AUTH-01 | Shared-device safety without logging out the phone | FP-009 (amended) |
| CAP-ACCT-14 | Deactivate / reactivate | Missing (status value exists in schema) | `init_schema.sql:19-20` | Take a break without losing the account | FP-008 (amended) |
| CAP-ACCT-15 | Delete = anonymise, keep content (Q7) | Missing | BR-AUTH-022, WBS 6.4 ⬜ | Right to leave; legal | FP-008 (amended) |
| CAP-ACCT-16 | Personal data export | Missing | WBS 6.4 | Portability; legal | FP-008 (amended) |
| CAP-ACCT-17 | Privacy controls: block/mute users, hide follow lists, opt out of personalised recommendations | Missing | BR-REC-008 (no opt-out); no block/mute tables (Verified (Code): no migration defines them) | Safety, control over exposure | none here: block/mute → trust-safety agent (BM-29/30); recommendation opt-out → FP-029 (discovery). See 7.1 |
| CAP-ACCT-18 | Suspended member is told what happened and what still works | Missing | F-MOD-06 (alias F-AUTH-08) | Fairness, fewer confused retries | FP-006 (trust-safety); shell banner slot noted in SE-SHELL-01 |
| CAP-ACCT-19 | Terms/Privacy reference at sign-up | Missing | SCR-AUTH-02 B note; WBS 6.9 ⬜ | Legal launch requirement | **FP-039** |
| CAP-ACCT-20 | Sign-up abuse protection (captcha, rate limit, leaked-password check) | Missing | F-ABU-02, WBS 6.8 🟡 | Spam-free community | FP-009 |

### Platform completeness (`CAP-PLAT`)

| Capability ID | Capability | Current StoryNest | Evidence | User value | Recommendation |
| --- | --- | --- | --- | --- | --- |
| CAP-PLAT-01 | Primary navigation at every width (390 / 768 / 1280) | Partial (mobile only) | Verified (Runtime) `t-home.png`, `d-home.png`; `bottom-nav.tsx:47`, `site-header.tsx:17-28` | Reach every section | FP-019 (amended) |
| CAP-PLAT-02 | Return to context after sign-in / sign-up / reset | Partial | U-SHELL-04, U-CMT-02, SCR-AUTH-01-A04 | Intent preserved | FP-019 + FP-009 (amended) |
| CAP-PLAT-03 | Branded, translated not-found / error pages with correct status | Missing | RT-01; Verified (Runtime) `m-notfound.png`, `d-notfound.png` (English "404 This page could not be found." on a white panel inside the cream shell) | Recovery, SEO | FP-004 (amended) |
| CAP-PLAT-04 | One loading / error / load-more pattern | Partial | FP-020 findings | Predictable states | FP-020 (amended) |
| CAP-PLAT-05 | Page-shaped loading skeletons | Partial (one grid skeleton for every route) | U-SHELL-03; `page-skeleton.tsx` | Less layout jump | FP-020 (amended) + FP-037 |
| CAP-PLAT-06 | Performance budget (LCP/INP/bundle) on production | Unverified | WBS 8.4 not started; dev Lighthouse 100 documented for story/chapter (BR-SEO-010) | Fast first read on mobile networks | none (WBS 8.4) |
| CAP-PLAT-07 | Page metadata: home/ranking/author canonical + share image; hreflang | Partial (story/chapter only) | Verified (Code): only `story/[id]/[slug]/page.tsx:27-30` and `…/[chapterSlug]/page.tsx:28-30` set `alternates`/`openGraph`; BR-SEO-010 | Link previews, SEO | FP-039 (defaults), FP-004 (author), FP-021 (language) |
| CAP-PLAT-08 | Site identity: favicon, app icons, web manifest, default share card | Missing | Verified (Code): no `icon.*`, `apple-icon.*`, `manifest.*`, `opengraph-image` at app root; no `apps/web/public` | Recognisable tab/bookmark/home-screen icon; input to WBS 7.5 | **FP-039** |
| CAP-PLAT-09 | Footer with About / Terms / Privacy / Copyright / language | Missing | Verified (Runtime) no footer on any `d-*.png`; WBS 6.9 ⬜ | Trust, legal, SEO internal links | **FP-039** |
| CAP-PLAT-10 | Skip link and landmarks | Partial (landmarks yes, skip link no) | RT-09 | Keyboard efficiency | FP-022 |
| CAP-PLAT-11 | Connectivity awareness on the web (offline banner, paused writes explained) | Missing | SCR-SHELL-01 D "Offline: Missing"; TanStack v5 default `networkMode: 'online'` not overridden (`packages/features/src/_shared/query.ts:17-32`) | No endless spinners on trains/lifts | **FP-038** |
| CAP-PLAT-12 | Offline reading of downloaded chapters | Missing (planned for the Capacitor app) | WBS 7.4 ⬜ | Reading without a connection | none (WBS 7.4; FP-038 prepares the adapter seam) |
| CAP-PLAT-13 | Native mobile shell (Capacitor) | Missing | `apps/mobile/.gitkeep` only; WBS 7.1–7.5 ⬜ | App-store presence | none (WBS Phase 7) |
| CAP-PLAT-14 | Design-system consistency (card/grid/chip/surface primitives, type scale, control sizing) | Partial | Section 7.2 | Coherent, denser, cheaper UI | **FP-037** |
| CAP-PLAT-15 | Visible focus and non-text contrast (WCAG 1.4.11, 2.4.7) | Partial | Focus ring effective 25 % alpha (computed 1.25:1 light); input border 1.31:1 (section 7.2 DS-05) | Keyboard and low-vision users | FP-037 + FP-022 (amended) |
| CAP-PLAT-16 | Security headers / CSP | Missing | F-SHELL-02 | Security | FP-023 (amended) |
| CAP-PLAT-17 | Server-rendered language | Missing | U-I18N-01, RT-08 | No flash, correct `lang` | FP-021 |
| CAP-PLAT-18 | Shell-less reading route (WBS §1.2 `(reader)` group) | Missing | Orchestrator observation; reader is under `(main)` | Immersive reading | none here: reading agent (section 7.1) |
| CAP-PLAT-19 | Unsaved-changes guard | Missing | FP-003 | No lost text | FP-003 |
| CAP-PLAT-20 | Living component reference (gallery covers every widget, both themes) | Partial | U-DEV-01; gallery subtitle claims "light and dark" | Faster, consistent UI work | FP-037 (gallery part) |


## 5. External benchmarking


> Status: **Draft / research input**. Nothing here is a decision. Every "applicability" judgement is a
> recommendation for discussion and, if adopted, must become an `FP-NNN` proposal and/or a `DEC-NNN` record in the
> normal way (see `../decision-register.md`, `../feature-backlog.md`).

### 5.1 Method, date and limitations

**Date of research:** 2026-11-05.

**Platforms benchmarked:** Wattpad, Royal Road (RR), Archive of Our Own (AO3), Inkitt, plus two others: **Wuxiaworld**
(serialised web novels, used in place of Webnovel because its help center has official documentation for the same
patterns: paragraph comments and daily check-in) and **Substack** (serial publishing by email: scheduling and
cross-publication recommendations).

**Method.**
1. Web search (standard mode), restricted to official domains where possible (`support.wattpad.com`,
   `creators.wattpad.com`, `policies.wattpad.com`, `royalroad.com`, `archiveofourown.org`, `transformativeworks.org`,
   `support.substack.com`, `on.substack.com`, `support.wuxiaworld.com`, `inkitt.zendesk.com`).
2. Direct fetch of the primary page where the site allowed it.
3. Each entry is labelled with what was actually observed:
   - **Verified (source, fetched)**: I fetched the page and read the claim in it.
   - **Verified (source, search excerpt)**: the claim appears in the official page's text as returned by search; I
     could not fetch the full page (the site blocked automated fetching).
   - **Unverified**: the claim comes only from community, third-party or press sources, or I could not find it in an
     official source. These entries are kept only where the pattern is important; they need checking by hand before
     anyone relies on them.

> Note on terminology: in the rest of this functional spec "Verified" means *verified in StoryNest code*
> (`CONVENTIONS.md` §2). In this benchmark, "Verified (source)" means **confirmed in an external source about a
> competitor**. It says nothing about StoryNest's code.

**Limitations.**
- **Access blocks:** AO3 (`HTTP 418`), Royal Road (`403`), `support.wattpad.com` (`403`) and `inkitt.zendesk.com`
  (`403`) refused direct fetches. For those sites, verification rests on the official page text as returned by
  search. Exact wording, current UI labels and menu paths may differ from the live site.
- **Age of sources:** many help articles are several years old (some predate 2022). Limits and menus such as
  Wattpad's offline cap, RR prices and AO3 draft lifetime can change. Dates are given where known.
- **No hands-on testing:** no accounts were created and no product was used. This is a documentation benchmark, not a
  usability study.
- **Popularity ≠ demand:** a widely shipped feature shows that a competitor chose to build it. It does not show that
  users need it or that it worked. Where a source gives evidence of impact, it is quoted, and it is almost always the
  vendor's own claim (for example Substack's recommendation share or Wattpad's "77% of readers" statistic). No
  independent outcome data was found for any pattern.
- **Searches that returned nothing official:** Webnovel paragraph comments and the Webnovel power-stone ranking;
  Scribble Hub's Series Finder and tag exclusion; Royal Road's official content-warning policy and its Rising Stars
  algorithm; Royal Road's appeal process; Inkitt's author analytics; Wattpad's block/mute pages via open search
  (later found by restricting the search to the Wattpad domain).
- **StoryNest current state:** this document does not restate what StoryNest already implements. The domain specs
  under `../../domains/` are the reference. The *Spec area* hints (`READ`, `CMT`, …) use the object codes in
  `CONVENTIONS.md` §3, so each entry can be traced to the relevant domain.

### 5.2 Benchmark table

Column key: **Applicability** to StoryNest is High / Medium / Low, with the reason. **Cost / risk** gives a rough
build cost and the main product, abuse or legal risks.

#### 5.2.1 Reading experience (5)

| ID | Platform | Capability / interaction pattern | User problem addressed | Source | Verification | Applicability to StoryNest | Cost / complexity / risks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BM-01 | Royal Road | Floating **reader-preference panel** on every chapter page: font size 10–32, reader width 50–100%, chapter-only themes that override the site theme (incl. **OLED Black**), background dim for spare screen space. **Immersive mode**: double-tap the text on mobile, F11 on desktop. Settings are **stored locally, not synced** across devices. | Long reading sessions on very different screens; eye strain; distraction. | https://www.royalroad.com/support/knowledgebase/80 | Verified (source, search excerpt) | **High** (`READ`). This is the full set of controls a web reader needs. StoryNest should copy the controls but **not** RR's local-only storage: logged-in readers expect preferences to follow them (Wuxiaworld syncs its paragraph-comment display setting across web and app, see BM-13). | Low. Use CSS variables plus a profile setting. Risk: very narrow or very large text breaks the layout of inline-comment markers (BM-12). |
| BM-02 | Wattpad | Reader "Aa" menu: font size −/+, three colour schemes (black-on-white, white-on-black, **sepia**), font style (Android). **Reader theme is separate from the app-wide dark mode.** These controls are **app-only**: not on the web, and no dark mode on web. | Comfortable reading; night reading. | https://support.wattpad.com/hc/en-us/articles/201339934-Reading-preferences ; https://support.wattpad.com/hc/en-us/articles/360052978772-Dark-Mode-on-Web- | Verified (source, search excerpt) | **High** as a lesson. StoryNest is web-first, so treating the web reader as second-class (Wattpad tells web readers to use browser extensions) is an **anti-pattern** to avoid. Sepia plus a reader theme decoupled from the site theme is cheap and useful. | Low. No notable risk. |
| BM-03 | AO3 | **"Entire Work" vs "Chapter by Chapter"** toggle on each work, plus a profile preference "Show the whole work by default". Readers can also hide the creator's custom styling ("Hide Creator's Style", overridable per work). | Binge readers want one scrolling page; serial readers want per-chapter pages. Readers also need protection from unreadable author styling. | https://archiveofourown.org/faq/preferences?language_id=en | Verified (source, search excerpt) | **Medium** (`READ`, `PROG`). A full-work view helps completed stories and offline saving. It complicates per-chapter vote, comment and read counting (AO3 counts one hit across chapter navigation, see BM-25). | Medium. Long pages need lazy-loaded chapters; progress tracking must be per chapter inside one page. |
| BM-04 | Wattpad | **Offline list** in the app: add from Library while online, read later without a connection. Free users have a **capped** list (an older staff post cited 2 stories on iOS) and can swap stories in and out; **Premium = unlimited**. App-only. | Commuting, poor connectivity, data cost. | https://support.wattpad.com/hc/en-us/articles/360035376992-Offline-reading ; https://support.wattpad.com/hc/en-us/articles/360033645811-Adding-or-removing-a-story-for-offline-reading | Verified (source, search excerpt). The specific free cap is **Unverified** (old community-relayed figure). | **Medium** (`READ`, `LIB`). Relevant to Vietnamese mobile-web readers on patchy data. On web this means a PWA with a service-worker cache. The free cap is a monetisation lever, not a user need. | Medium–High. Cache invalidation when authors edit or unpublish chapters, **18+ content cached on shared devices** (needs a gate on reopen), storage quotas, and takedown compliance (cached copies of removed content). |
| BM-05 | AO3 | **Download whole work** as AZW3 / EPUB / PDF / HTML (MOBI deprecated). Whole work only, not single chapters; works in progress must be re-downloaded to get updates. Restricted or adult works may download the login or adult-gate page when fetched by scripts. | Archival, e-reader reading, preservation. | https://archiveofourown.org/faq/downloading-fanworks?language_id=en | Verified (source, search excerpt) | **Low** for StoryNest. It fits AO3's non-profit archive mission but conflicts with authors' control over unpublishing and scheduling, and makes copying trivial. If ever offered, it should be **author opt-in**. | Medium. Piracy and redistribution risk; the 18+ gate is bypassed once a file leaves the platform. |

#### 5.2.2 Discovery (6)

| ID | Platform | Capability / interaction pattern | User problem addressed | Source | Verification | Applicability to StoryNest | Cost / complexity / risks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BM-06 | AO3 | Work filter sidebar with **include and exclude** per category (ratings, warnings, categories, fandoms, characters, …), an **"Other tags to exclude"** free field with autocomplete, **completion status** (All / Complete only / WIP only), plus word count, language and sort. Excluding a **canonical** tag also excludes its synonyms and sub-tags. **Exclusions are not persistent**: they reset on each new listing. | Readers in large catalogues need to remove unwanted content and abandoned works quickly. | https://archiveofourown.org/help/work-filters-exclude-tags.html ; https://archiveofourown.org/admin_posts/10575 | Verified (source, search excerpt) | **High** (`SRCH`, `TAX`). "Completed only" and "exclude tag" are the two filters most often cited by serial-fiction readers. The non-persistence is a known gap: StoryNest should offer persistent blocked tags (BM-09) **and** per-search exclusions. | Medium. Exclusion over tag hierarchies or synonyms needs a tag graph (BM-07). A plain tag table supports simple exclusion only. |
| BM-07 | AO3 | **Tag wrangling**: volunteer wranglers map free-form user tags to **canonical** tags through synonyms and meta-tags. Only canonicals appear in autocomplete and filters. Creators' own tags are never changed. A tag is typically canonised after being used by about 3 users on 3 works ("rule of three", per an OTW Q&A). | Free tagging gives authors expressiveness; readers need consistent, filterable tags. | https://archiveofourown.org/wrangling_guidelines/2 ; https://www.transformativeworks.org/faq/what-is-tag-wrangling-and-how-does-it-work/ ; https://archiveofourown.org/admin_posts/36276 | Verified (source, search excerpt). "Rule of three" is from an OTW interview, not policy. | **Medium** (`TAX`). Bilingual VI/EN tags (e.g. "ngôn tình" / "romance", "đam mỹ" / "BL") create exactly the synonym problem AO3 solves. A **light version** (admin-managed synonym and alias table, no volunteer bureaucracy) is High value. The full AO3 system is not. | High at AO3 scale: over 2.5M canonical tags and a large volunteer committee. A light version is Medium: alias table plus moderator UI. Risk: inconsistent merges across languages. |
| BM-08 | Royal Road | **Advanced search** with separate "include tags" / "exclude matching any tags" fields; **tri-state genre chips** (click once to include, twice to exclude, three times to clear); status filter (ongoing / completed / hiatus / **stub** / dropped); length and rating filters. Exclusions do **not** carry over to ranking lists (forum reports). | Same as BM-06; compact control on small screens. | https://www.royalroad.com/support/knowledgebase/79 ; https://www.royalroad.com/forums/thread/113006 | Verified (source, search excerpt) for the search fields. Ranking-list limitation **Unverified** (forum, 2020–21). | **High** (`SRCH`, `TAX`). The tri-state chip is a strong mobile pattern for include/exclude. An explicit **story status** (incl. hiatus) as a filter fits serialised stories. | Low–Medium. Risk: tri-state controls are not obvious. They need a visible state (✓ / ✕) and an accessible label per state. |
| BM-09 | Wattpad | **Blocked Tags** in Content Preferences: persistent, applied to **Home and search**. A search **minus operator** (`-fanfic`). A **Mature toggle** for readers 17+ only. Introduced in 2020 after readers said their feeds didn't match their interests. | Recurring unwanted content in personal feeds. | https://support.wattpad.com/hc/en-us/articles/360039664431-Adjusting-your-Content-Preferences ; https://company.wattpad.com/archives/2020-2-26-introducing-home-content-preferences ; https://techcrunch.com/2020/02/26/storytelling-community-wattpad-embraces-adult-content-with-new-personalization-tools | Verified (source, search excerpt + TechCrunch fetched) | **High** (`REC`, `SET`, `HOME`). A persistent block list is cheap and directly reduces exposure to unwanted content. It also improves recommendation quality without ML. | Low. Risk: authors over-tagging or under-tagging defeats the filter. It depends on tagging rules being enforced (BM-27, BM-31). |
| BM-10 | Wattpad | **Tag rankings / Hot Lists**: an algorithm weighs popularity, trendiness, engagement, tag relevance and **last-update recency**. A rank is shown only if the story is in the top 1,000 for that tag. Max 25 tags per story. Rankings of Mature stories by authors under 17 are hidden. | Gives authors a visible goal; gives readers a "what's hot in X" entry point. | https://support.wattpad.com/hc/en-us/articles/201410220-Seeing-tag-rankings ; https://support.wattpad.com/hc/en-us/articles/360000769623-Story-rankings-FAQ | Verified (source, search excerpt). Specific weights **Unverified** (community speculation). | **Medium** (`RANK`). Per-tag rankings give niche authors a reachable top list (top 1,000 in a small tag is easy). **Popularity ≠ quality**: rankings reward update frequency and tag stuffing. Prefer engagement-normalised signals (completion, engaged readers, BM-24) over raw reads. | Medium. Gaming risk: read-for-read rings, vote farms and tag stuffing. Needs anti-abuse rules, a tag limit, and an opaque or rate-limited formula. |
| BM-11 | Inkitt | **Engagement-driven selection**: Inkitt says it analyses reading patterns and engagement (completion, re-engagement, sharing; a claimed 1,200+ "reading behaviour dimensions") to decide which stories it publishes on its Galatea app. Readers read free and give feedback. | Finding breakout stories without relying on editors' taste. | https://inkitt.zendesk.com/hc/en-us/articles/360011944239-How-does-Inkitt-make-their-publishing-decisions ; https://inkitt.zendesk.com/hc/en-us/articles/360011943059-How-do-I-download-a-book-to-my-library-or-add-it-to-my-reading-list | Verified (source, search excerpt), as Inkitt's own claim. Effectiveness claims (e.g. "40× traditional publishing") **Unverified**. | **Low–Medium** (`RANK`, `REC`). The transferable idea is internal: use **completion and return-reading** rather than views to surface "rising" stories. The publishing-deal model is out of scope. | Medium. Opaque algorithms erode author trust. If used, publish the broad signals (as Wattpad does in BM-10). |

#### 5.2.3 Engagement (7)

| ID | Platform | Capability / interaction pattern | User problem addressed | Source | Verification | Applicability to StoryNest | Cost / complexity / risks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BM-12 | Wattpad | **Inline (paragraph) comments**: hover a paragraph and click the bubble (web), or highlight a phrase and tap Comment (mobile). Shown to the right of the text. 2,000-character limit. **If the author edits the passage, the comment loses its anchor and falls back to the general comment area.** Readers can enable or disable inline comments in the app's reading settings (no web toggle). | Readers want to react in the moment; authors get precise feedback. | https://support.wattpad.com/hc/en-us/articles/115003128706-Viewing-inline-comments | Verified (source, search excerpt) | **High** (`CMT`, `EDT`). This is the signature engagement pattern of the category. The edit fallback shows the key technical requirement: the StoryNest rich editor must keep **stable block/paragraph IDs** across edits and versions (`HIST`), or comments become orphaned. | High. Anchoring model, rendering on narrow screens, and moderation of a much higher comment volume. Spoiler risk for readers further back. A per-reader show/hide toggle is essential. |
| BM-13 | Wuxiaworld | **Paragraph comments** with a **count badge** at the end of each paragraph. Reply, upvote and report work as for normal comments. A **reader setting (synced across web and app)** controls whether paragraph comments also appear in the chapter's general section. Chapters published before launch need republishing. Spoilers can lead to a comment ban. | Same as BM-12, plus control over clutter. | https://support.wuxiaworld.com/support/solutions/articles/157000360361-how-to-use-paragraph-comments-on-wuxiaworld- | Verified (source, fetched) | **High** (`CMT`, `READ`). This is a cleaner reference design than Wattpad's: one comment model with a paragraph anchor, the same moderation and reporting, and a **synced** visibility setting. The migration note (old chapters need republish) is a lesson for a phased rollout. | Same as BM-12. Reusing the existing comment entity with a nullable `paragraph_id` keeps moderation in one place. |
| BM-14 | Wattpad | **Library vs Reading Lists**: Library (with "Current Reads" and Archive) is **always private**. Reading lists are public by default and can be private since Sept 2026, with a public/private choice at creation. **Update notifications only fire for stories in the Library**, not for stories that are only in a reading list. A story can be in several lists. | Separating "I'm reading this" from "I recommend or collect this", and privacy of tastes (notably for mature content). | https://support.wattpad.com/hc/en-us/articles/53084137502356-Private-Reading-Lists ; https://support.wattpad.com/hc/en-us/articles/201365090-Managing-your-Library ; https://www.wattpad.com/1655123574-news-updates-new-your-reading-lists-can-now-be | Verified (source, search excerpt) | **High** (`LIB`, `LIST`, `NOTI`). StoryNest has follow, save and lists. Wattpad's model shows the need to **define which action triggers notifications** and to give lists a privacy setting. Wattpad shipped private lists very late, which suggests unmet demand over many years. | Low. Risk: confusing semantics if "follow" and "save" overlap. Make it explicit in the UI which one notifies. |
| BM-15 | AO3 | **Subscriptions** (to work, series or user) with **batched email**: subscription notifications go out at most hourly and list everything posted since the last one; kudos notifications go out daily. The stated aim is to avoid inbox floods when an author bulk-uploads. Bulk unsubscribe options. | Notification fatigue; authors posting many chapters at once. | https://archiveofourown.org/admin_posts/210 | Verified (source, search excerpt) | **High** (`NOTI`). StoryNest has scheduling and publish actions, so bursts are likely. **Digesting per story per window** is cheap and protects email deliverability and in-app noise. | Low–Medium. Needs a job or queue. Risk: delayed alerts for time-sensitive releases (keep in-app instant, batch email). |
| BM-16 | Royal Road | **Per-fiction notification bell** on the follow list (email and/or push per story). Global toggles for comment replies, mentions, PMs, new chapters and a **weekly summary**. **Push is Premium-only.** The V2 follow list reportedly has an "Open Next Chapter" button. | Fine-grained control: some stories matter more than others. One-tap continue reading. | https://www.royalroad.com/support/knowledgebase/96 ; https://www.royalroad.com/premium/subscription | Verified (source, search excerpt) for the bell and global settings. "Open Next Chapter" button **Unverified** (third-party userscript page). | **High** (`NOTI`, `LIB`, `PROG`). A per-story override on top of global defaults is the right model. The weekly summary is a low-noise re-engagement channel. **Do not paywall basic push**: it is a retention mechanism, not a premium perk. | Low–Medium. |
| BM-17 | Wattpad | **Three notification channels** (email, push, in-app feed). The in-app feed **cannot be filtered by type**. A known issue: up to 24 h delay before a newly added Library story starts notifying. iOS push is silent. | Multi-channel awareness of updates and replies. | https://support.wattpad.com/hc/en-us/articles/201463500-Notification-settings-the-various-types-and-how-to-change-them ; https://support.wattpad.com/hc/en-us/articles/34569431271188-Feed-Notifications ; https://support.wattpad.com/hc/en-us/articles/21875401161492-Not-receiving-story-update-notifications | Verified (source, search excerpt) | **Medium** (`NOTI`). Mostly an anti-pattern list: StoryNest's notification centre should support **type filters** (updates / replies / social / moderation) and notify immediately after follow. | Low. |
| BM-18 | Wuxiaworld | **Daily login streak plus reading missions**: automatic check-in each day grants a key. Consecutive days raise a "Reader Level" (10 tiers) that increases daily rewards, and **breaking the streak resets the level**. A daily mission rewards reading 10 *new* chapters. Rewards must be claimed by hand. | Habit formation and daily return visits. | https://support.wuxiaworld.com/support/solutions/articles/157000302589-cultivation-keys-daily-check-in-and-missions- | Verified (source, fetched) | **Low–Medium** (growth). The rewards are tied to a paid-unlock currency that StoryNest lacks. A **non-monetary reading streak** (badge or calendar) would be the transferable version. No retention evidence was found in any source, so it should be piloted. | Medium. Risks: streak anxiety, punitive resets, incentives to skim (the "10 new chapters" mission), gaming with bots. A forgiving design (grace days) is advised if piloted. |

#### 5.2.4 Author experience (8)

| ID | Platform | Capability / interaction pattern | User problem addressed | Source | Verification | Applicability to StoryNest | Cost / complexity / risks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BM-19 | Wattpad | **Publishing Scheduler**: choose Schedule instead of Publish Now, pick date and time, confirm with a checkbox. Up to **1 year ahead**. The author's Table of Contents shows scheduled parts and go-live times; **readers cannot see the schedule**. Web-only at the time of writing. Rationale cited: "77% of Wattpad readers are likely to read an ongoing story if it's updated regularly" (no outcome data for the feature itself). | Consistent cadence without being online; buffers for breaks. | https://creators.wattpad.com/blog/building-an-engaged-audience-with-the-wattpad-publishing-scheduler | Verified (source, fetched) | **High** (`EDT`, `CHM`). Validates StoryNest's scheduling scope. Useful details: explicit confirmation step, schedule visible in the chapter list, and a horizon limit. | Low–Medium. Time zone handling (VN vs EN audiences), editing a scheduled chapter, and collisions with collaborator edits. |
| BM-20 | Royal Road | **Scheduled release from the chapter editor** (times shown in the author's local time zone). Scheduled items are listed on the **Drafts page with a clock icon**. An **optional public schedule** shows readers the date of the next chapter. Official advice against bulk releases (no more than 2 a day, even spacing). Not available until the story is approved. | Reader anticipation and trust ("when is the next chapter?"); author cadence. | https://www.royalroad.com/support/knowledgebase/83 | Verified (source, search excerpt). Reports of slight timing drift **Unverified** (forum). | **High** (`EDT`, `STORY`, `NOTI`). The **public "next chapter on …" indicator** on the story page is a cheap pattern that StoryNest could add to existing scheduling. Unlike Wattpad, RR lets the author choose whether to reveal it. | Low. Risk: a missed date harms trust. Allow hiding it and auto-hide when a scheduled chapter is cancelled. |
| BM-21 | Substack | **Scheduling with timed paywall unlock**: schedule up to **3 months** ahead in the device's time zone. A paid post can be **scheduled to unlock for free readers** and be emailed to them at a later time. Scheduled items appear in a "Scheduled" section and can be unscheduled from the draft. | Early access for supporters, then a public release, without manual work. | https://support.substack.com/hc/en-us/articles/360037870412-How-do-I-schedule-an-article-to-publish-for-a-future-date-on-Substack | Verified (source, search excerpt) | **Low** now, **Medium** if StoryNest adds monetisation. The two-stage release (restricted audience first, then public) maps onto RR authors' common Patreon advance-chapter practice. | Medium. Needs audience segments and entitlement checks. Out of current scope. |
| BM-22 | AO3 | **Co-creator invitations with consent**: the invitee must have enabled "Allow others to invite me to be a co-creator". They receive an email and an accept/reject queue on the dashboard; rejected invites can't be re-accepted; invites can't be withdrawn. Introduced in 2019 because anyone could previously list another user as co-creator without approval. | Collaboration without impersonation or harassment (being attached to unwanted works). | https://archiveofourown.org/admin_posts/13694 ; https://archiveofourown.org/admin_posts/13691 ; https://archiveofourown.org/faq/preferences?language_id=en | Verified (source, search excerpt) | **High** (`TEAM`). StoryNest supports collaboration, so **explicit invite plus accept** (never silent attachment) and an **opt-out preference** for receiving invites are basic abuse-prevention. AO3 learned this after abuse. | Low. Also consider letting the inviter cancel a pending invite, which AO3 can't do and which is a gap. |
| BM-23 | Royal Road | **Author's note boxes**: separate pre-chapter and post-chapter note fields beside the chapter body in the editor. Authors use them for content warnings, polls, artist credits and shout-outs. Notes are reportedly excluded from export. | Separating meta-communication from story text; content warnings before the chapter starts. | https://www.royalroad.com/forums/thread/112073 ; https://www.royalroad.com/forums/thread/105566 | **Unverified** (community forum reports, several years old; no official doc found) | **Medium** (`EDT`, `READ`). Structured notes (not inline text) let StoryNest **collapse them, translate the UI around them, exclude them from word counts and read time, and show a per-chapter warning** before the text. | Low. Risk: authors put spoilers in pre-notes. Offer a "spoiler" collapse. |
| BM-24 | Wattpad | **Story Stats** (web only): Total Reads (every view), Unique Readers (daily), **Engaged Readers** (unique readers with 5+ minutes in a rolling 365 days), **demographics** (age, gender, country). Refreshed about every 24 h. Wattpad says Engaged Readers **do not** affect tag rankings. | Authors want to know whether the story is being read, not just opened. | https://creators.wattpad.com/creators-101/story-statistics | Verified (source, fetched) | **High** (`STAT`). "Engaged readers" is a better headline metric than raw reads and is cheap if read-time events exist (`PROG`). Demographics must be **aggregate with minimum thresholds** for privacy, notably for minors. | Medium. Data pipeline; k-anonymity thresholds for demographics; clear definitions to avoid "my reads dropped" support load. |
| BM-25 | AO3 | **Work statistics with de-duplication rules**: hits from the same IP count once per 24 h; **navigating between chapters counts one hit**; the creator's own logged-in visits don't count. One kudos per user per work. Subscriber **counts without identities**. Sortable by hits, kudos, comment threads, bookmarks, subscriptions, word count. | Trustworthy numbers; reader privacy. | https://archiveofourown.org/faq/statistics?language_id=en | Verified (source, search excerpt) | **High** (`STAT`, `PROG`, `VOTE`). The **explicit, published counting rules** (self-view exclusion, de-duplication window) are what StoryNest's read-count business rules should document. Showing counts but not identities of followers is a reasonable privacy default. | Low (rules), Medium (anti-inflation). |
| BM-26 | AO3 | **Per-work comment moderation**: when on, every new comment (guest or registered) needs creator approval before it is public. An "Unreviewed Comments" queue. Creator's own comments auto-approved. **Commenters see a notice** that moderation is on. Bulk on/off via Edit Works. Combinable with "Only registered users can comment" / "No one can comment". | Authors facing harassment or spam keep comments open without exposure. | https://archiveofourown.org/admin_posts/4106 ; https://archiveofourown.org/help/comments-moderated.html ; https://archiveofourown.org/admin_posts/4004 | Verified (source, search excerpt) | **High** (`CMT`). A graded set of author controls (open → registered-only → pre-moderated → closed) with a **visible notice to commenters** suits StoryNest's author comment moderation and its Vietnamese and English communities. | Low–Medium. Risk: unreviewed backlog for popular authors. Add queue counts to the author dashboard. |

#### 5.2.5 Trust & safety (6)

| ID | Platform | Capability / interaction pattern | User problem addressed | Source | Verification | Applicability to StoryNest | Cost / complexity / risks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BM-27 | AO3 | **Ratings plus mandatory archive warnings**: ratings Not Rated / General / Teen / Mature / Explicit. Four specific warnings (graphic violence, major character death, rape/non-con, underage) **or** the blanket "Creator Chose Not To Use Archive Warnings" (CNTW), which can be combined. Mature, Explicit and Not Rated trigger an **adult-content interstitial**. | Informed consent before reading; harm avoidance. | https://archiveofourown.org/admin_posts/31795 ; https://archiveofourown.org/tos_faq | Verified (source, search excerpt) | **High** (`STORY`, `TAX`, 18+ gate). A small **mandatory** warning set with an explicit "chose not to warn" option is more honest than optional free tags. **"Not Rated" is treated as adult**, a safe default worth copying. | Low to build, Medium to enforce. Warning lists must be localised (VI/EN) with identical semantics. |
| BM-28 | Wattpad | **Mature = 17+** (18+ in some jurisdictions), with a **mature toggle only for users 17+**. Age comes from the **self-declared birthdate** at signup, which press coverage notes is easily bypassed. Guidelines state "a Mature rating is not an exception"; enforcement includes **adjusting a story's rating**, removal and account restriction. | Age-appropriate access with minimal friction. | https://policies.wattpad.com/content ; https://techcrunch.com/2020/02/26/storytelling-community-wattpad-embraces-adult-content-with-new-personalization-tools | Verified (source, fetched) | **High** (18+ gate, `SET`). Shows the trade-off StoryNest also faces: a self-declared date of birth is low-friction but weak. **Moderator power to re-rate a story** (instead of removing it) is a proportionate tool to copy. Legal requirements in Vietnam for age verification need separate legal input (not researched here). | Low (DOB gate). High if real age assurance is required. Risk: regulatory exposure; minors entering false DOBs. |
| BM-29 | AO3 | **Mute vs block as separate tools**. **Mute** hides a user's works, bookmarks and comments from *your* view; it survives username changes; it is implemented client-side via generated CSS. **Block** prevents the user from commenting on your works, replying to your comments, and (later) leaving kudos. A limit of 2,000 accounts each. | Personal curation (mute) vs stopping an interaction (block). | https://archiveofourown.org/admin_posts/24853 ; https://archiveofourown.org/admin_posts/22650 ; https://archiveofourown.org/admin_posts/25456 ; https://archiveofourown.org/admin_posts/27130 | Verified (source, search excerpt) | **High** (`CMT`, `AUTHOR`, `SET`). Two distinct intents, one-directional effects, and a sensible cap. StoryNest should implement **block server-side** (RLS-enforced). AO3's CSS approach to mute is a cost shortcut, not a model. | Medium. Block must be enforced in every write path (comments, replies, votes, mentions, collaboration invites). |
| BM-30 | Wattpad | **Mute vs block**. Mute is **reciprocal** for communication (no follow, tag, messages or profile comments either way) but **stories stay readable**. Block also **prevents the blocked user from reading your stories**. The muted user sees a generic "can't interact" message identical to a closed account, so there's no confirmation that they were muted. | Harassment control without tipping off the harasser. | https://support.wattpad.com/hc/en-us/articles/203133434-Muting-or-unmuting-a-user ; https://support.wattpad.com/hc/en-us/articles/4408465238164-Blocking-a-user | Verified (source, search excerpt) | **High** (`CMT`, `AUTHOR`). The **non-revealing message** is a good safety detail. Blocking reading access is stronger than AO3 and helps authors with stalkers, but it is trivially bypassed by logging out on public stories. Be honest about this in the UI. | Medium. Same enforcement surface as BM-29, plus reader-side gating. |
| BM-31 | AO3 | **Policy & Abuse process**: reports are reviewed **by humans, not algorithms**. **Duplicate reports don't change the outcome** (they slow investigation). Mis-tagged ratings or warnings: the creator is **asked to fix** them; works are not deleted for wrong tags. If a complaint is rejected, the creator is never contacted. **Either party can appeal**, reviewed by an additional administrator. Users are asked not to hunt for mis-tagged works to report. | Fair, non-mob moderation; protection from report brigading. | https://archiveofourown.org/tos_faq ; https://archiveofourown.org/admin_posts/31798 ; https://archiveofourown.org/admin_posts/31795 | Verified (source, search excerpt) | **High** (moderation domain). StoryNest's moderator report queue can adopt: **report count is not a severity signal**, a **"request fix" action** before removal, and **appeal to a different moderator**. | Low for policy; Medium for tooling (appeal workflow, reviewer separation). |
| BM-32 | Wattpad | **Appeals and transparency**: anyone affected (incl. reporters) can appeal within **6 months** via the Help Center. Wattpad's published median review times were **17.8 days** (account closures) and **28.9 days** (story removals). Affected users get a notice explaining the decision (PM for story removals, email for account closures). **Automated text moderation can auto-ban, set maturity, or suppress a story from home, search, tags and recommendations pending human review.** Human reviewers handle appeals "to correct any potential machine errors". | Due process; EU DSA compliance; scale. | https://support.wattpad.com/hc/en-us/articles/23953958026516-Wattpad-s-EU-Digital-Services-Act-DSA-Information ; https://policies.wattpad.com/transparency-report/ | Verified (source, search excerpt) | **High** (moderation, `NOTI`). Copy the **statement of reasons**, a **fixed appeal window**, and **"suppressed pending review"** as an intermediate state (less harmful than removal). The long median times show the cost of under-staffed appeals. | Medium–High. Requires a moderation state machine, notices in both languages, and audit logs. Risk: false positives from automated moderation on Vietnamese text if models are English-centric. |

#### 5.2.6 Account & personalisation (2)

| ID | Platform | Capability / interaction pattern | User problem addressed | Source | Verification | Applicability to StoryNest | Cost / complexity / risks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BM-33 | Wattpad | **Genre picks at signup** seed the home feed. Later recommendations shift with reading behaviour. **Signup genre choices can't be edited later.** Preferred genres are private by default. | Cold start: an empty or irrelevant home feed for new readers. | https://support.wattpad.com/hc/en-us/articles/9326502160532-Recommendations-and-favorite-genres | Verified (source, search excerpt) | **High** (`HOME`, `REC`, `SET`). A 2–3-step onboarding (language VI/EN → genres → optional 18+ preference for adults) is cheap and fixes cold start. **Make choices editable**: Wattpad's non-editable picks are an anti-pattern. | Low. Risk: long onboarding increases drop-off. Keep it skippable. |
| BM-34 | AO3 | **Reader-controlled exposure preferences**: "Show me adult content without checking" (skip the interstitial), **"Hide warnings"** (warnings collapsed by default and revealed per work, for spoiler-sensitive readers), "Hide Creator's Style". All per account. | Adult readers dislike repeated gates; some readers treat warnings as spoilers. | https://archiveofourown.org/faq/preferences?language_id=en | Verified (source, search excerpt) | **Medium** (`SET`, 18+ gate). The "skip interstitial once confirmed adult" preference fits StoryNest's 18+ gate. "Hide warnings" is a niche but considerate option. Check it doesn't conflict with any legal duty to warn. | Low. Risk: the skip preference must never be available to accounts under 18. |

#### 5.2.7 Growth & retention (1)

| ID | Platform | Capability / interaction pattern | User problem addressed | Source | Verification | Applicability to StoryNest | Cost / complexity / risks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BM-35 | Substack | **Creator-to-creator recommendations**: a writer recommends other publications, and these are offered in the **subscribe flow** (capped at 3 shown, after testing 7) and on the profile. **Attribution analytics** show how many subscriptions a writer drove for others. Substack reports that writers who recommend are about 3× more likely to be recommended back, and that recommendations plus the app once drove about 50% of new subscriptions. | Discovery for small creators without an algorithm; network effects. | https://on.substack.com/p/substacks-recommendations-network ; https://on.substack.com/p/recommendations-update | Verified (source, search excerpt). The impact figures are **Substack's own claims**, with no independent check. | **Medium** (`AUTHOR`, `REC`, growth). "Authors I recommend" on the author page, plus a prompt after following an author, is a cheap human-curated discovery channel that suits a young catalogue. The "3 after following" cap reflects Substack's finding that fewer recommendations converted better. | Low–Medium. Risks: recommendation rings, low-intent follows that hurt engagement metrics (a community concern), and recommending 18+ authors to minors (filter by rating). |

**Entries per area:** Reading 5 · Discovery 6 · Engagement 7 · Author 8 · Trust & safety 6 · Account &
personalisation 2 · Growth & retention 1 = **35**. Several entries also serve growth and retention (BM-14 to BM-18,
BM-20, BM-24, BM-33).

### 5.3 Patterns most applicable to StoryNest

Ranked by expected value relative to cost. All are **Proposed**: none is a decision.

1. **Paragraph comments on stable block IDs (BM-12, BM-13).** This is the defining engagement pattern of the
   category. Wuxiaworld's design (one comment entity with an optional paragraph anchor, same report and moderation
   path, synced per-reader visibility setting) is cleaner than Wattpad's. The hard prerequisite is that the editor
   keeps paragraph IDs stable across edits and version history. Otherwise comments become orphaned, which is
   Wattpad's documented failure mode.
2. **Persistent blocked tags plus per-search include/exclude and "completed only" (BM-06, BM-08, BM-09).** This fills AO3's gap (exclusions reset on each listing) by pairing per-search filters with Wattpad-style
   persistent blocked tags. Tri-state chips (RR) keep it usable on mobile. It is cheap and reduces unwanted exposure, which
   supports the 18+ gate.
3. **Mandatory, small warning set with "chose not to warn", and "Not Rated = adult" (BM-27, BM-28, BM-34).** These
   are rating and warning semantics that hold up in moderation, combined with moderators' power to re-rate instead
   of removing. VI and EN labels must be equivalent.
4. **Separate block and mute, enforced server-side, with a non-revealing message (BM-29, BM-30).** Effects run in
   one direction, a cap applies, and blocks are enforced on every write path, including collaboration invites.
5. **Graded author comment controls with a visible notice (BM-26).** Open → registered-only → pre-moderated →
   closed, plus an unreviewed-queue count. It fits StoryNest's existing author comment moderation.
6. **Moderation due process: statement of reasons, fixed appeal window, appeal to a different moderator,
   "suppressed pending review", report count ≠ severity (BM-31, BM-32).** This protects against brigading and
   aligns with DSA-style expectations if EU users arrive.
7. **Published counting rules plus an "engaged readers" metric (BM-24, BM-25).** Excluding self-views, applying a
   de-duplication window, counting chapter navigation once, and making a time-based "engaged" metric the headline
   gives authors numbers they can trust and gives rankings a signal that is harder to game than raw reads (BM-10
   caveat).
8. **Notification hygiene: per-story bell on top of global defaults, batched email digests, type-filtered inbox,
   and explicit "which action notifies" semantics (BM-14 to BM-17).** This matters more because StoryNest has
   scheduling, which produces bursts. Do not paywall basic push (RR does).

**Strong candidates just outside the top 8:** consent-based collaborator invites, which StoryNest's `TEAM` should
meet as a baseline (BM-22). A public "next chapter on …" date (BM-20). Synced reader preferences with sepia and OLED
themes (BM-01, BM-02). Editable genre onboarding (BM-33).

**Deliberately not recommended now:** file downloads and exports (BM-05: author control and piracy), daily
check-in streaks tied to rewards (BM-18: no evidence of benefit, risk of dark patterns; a non-monetary pilot at
most), paywalled timed unlocks (BM-21: no monetisation scope), and full volunteer tag wrangling (BM-07: use a
lightweight alias table instead).

**Popularity vs demonstrated demand.** For most patterns above, the only evidence is that several competitors
independently built them, which suggests demand but does not prove impact. The only quantitative claims found come
from vendors themselves (Wattpad's "77% of readers", Substack's recommendation share, Inkitt's selection accuracy).
Before committing larger items (paragraph comments, offline, streaks), validate with StoryNest's own users through a
short survey or a usage proxy, such as how often comments quote a passage today.


## 6. Missing product capabilities (independent of existing defects)

Grouped from the "Missing" rows of §4, keeping only those with a clear user problem.

| Theme | Missing capability | Capability rows | Proposal |
| --- | --- | --- | --- |
| Reading | Immersive reading frame; story-level progress (read marks, caught-up); control of comment markers; end-of-story handling | CAP-READ-02, 06, 07, 09, 10 | FP-043, FP-044 |
| Discovery | Filters (completion, length, recency) and sort; rankings by category; new-author discovery; desktop section navigation | CAP-DISC-03…05, 07, 12, 13, 18 | FP-041, FP-046, FP-019 |
| Engagement | "What's new" awareness; end-of-chapter next step; author presence in discussions; channels outside the app; more notification types | CAP-ENG-06, 10, 13, 14, 15 | FP-047, FP-044, FP-049, FP-026 |
| Growth | Sharing; retention measurement | CAP-GROW-01…05 (see matrix) | FP-051; measurement view in §8 |
| Author | Reader-visibility status; consistent story workspace; team transparency/leave; audience growth; comment inbox; draft history; pre-publish review; mobile editing | CAP-AUTH-05, 08, 10, 13, 15, 24, 38, 41 | FP-054, FP-053, FP-016, FP-056, FP-057, FP-059, FP-060, FP-058 |
| Trust & safety | Public guidelines and legal pages; reporter feedback; transparency to affected parties; appeals; block; operator tools | CAP-TNS-02, 03, 08, 09, 11, 18, 21–24 | FP-065, FP-031, FP-006, FP-063, FP-064, FP-066 |
| Account | Social sign-in, resend/cross-device email links, first-run welcome, change password/email, lifecycle, privacy controls, suspension notice | CAP-ACCT-02…04, 11…18 | FP-009, FP-035, FP-008, FP-064, FP-002 |
| Platform | Branded 404/error, site identity and footer, security headers, server-rendered language, unsaved-changes guard, connectivity awareness | CAP-PLAT-03, 08, 09, 11, 16, 17, 19 | FP-004, FP-039, FP-023, FP-021, FP-003, FP-038 |

Explicitly **not recommended** now (reasons in the matrix): reading streaks/goals (CAP-ENG-16), referral programme
(CAP-GROW-07), @mentions (CAP-ENG-18), chapter templates (CAP-AUTH-29), content ratings beyond the 18+ flag
(CAP-TNS-15), offline reading on web before the Capacitor app (CAP-PLAT-12, WBS 7.4).

## 7. High-value feature opportunities

New proposals from Phase 2 (`FP-035…FP-066`, 31 active; FP-052 merged into FP-044). Full specifications, acceptance
criteria and technical impact are in the [feature backlog](feature-backlog.md#phase-2-proposals-product-discovery).

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

## 8. Risks and assumptions

| # | Risk / assumption | Mitigation |
| --- | --- | --- |
| R1 | Member, author and moderator friction is inferred from code; real behaviour (keyboard overlap, IME, toast placement, Realtime) may differ. *Update 2026-11-05: 50 signed-in runtime cases confirmed 18 findings and found F-STM-09 ([verification](../verification/README.md)); keyboard/IME/Realtime presence are still unverified* | Run the Playwright e2e with seeded test users (WBS 0.7) before implementing P1/P2 items; re-check each `Inferred` item |
| R2 | No analytics: growth/retention value is hypothesised | Add a cheap measurement first (SQL views over `chapter_read_events`, follows, notifications → reads) and review after 4 weeks |
| R3 | Benchmark ≠ demand: patterns from Wattpad/AO3/Royal Road reflect their audiences | Every FP is justified by a StoryNest journey; benchmark is supporting evidence only |
| R4 | Scope pressure from 31 new proposals on a single developer (WBS capacity) | Roadmap orders by journey; P3/Optional items are parked; several FPs are explicitly staged (A/B/C) |
| R5 | Shell-less frames and story workspace change routing and layouts | Route groups keep URLs unchanged; ship behind small PRs per frame; FP-004 retested inside the new frames |
| R6 | Model changes (one "keep", reply threads, "recently updated" meaning) alter approved rules | All are BR change proposals (BRC-*) and blocked until approved; staged migrations without data backfill |
| R7 | Legal content (terms, privacy, copyright, deletion policy) is outside engineering | FP-065/FP-039/FP-008 are blocked on Q-X-01/Q-X-02 and say so |
| R8 | Mobile web authoring may not be a launch target (Capacitor app planned) | Q-EDT-06 decides FP-058 priority |

## 9. Recommended product direction

**Finish the loops before widening the catalogue of features.** StoryNest's backend already supports most of what a
mature serial-fiction product needs; the gaps are in how the experience carries users from one step to the next.

1. **Safe launch baseline** — Phase 1 P1s (FP-001…FP-004), plus the reading frame (FP-043), the author go-live
   clarity (FP-054), legal pages and site frame (FP-065, FP-039), server-side 18+ (FP-005) and account lifecycle
   (FP-008, blocked on legal input).
2. **The reader return loop** — correct progress and continue (FP-012), in-story continuity (FP-044), what's new
   (FP-047), share (FP-051), a clearer keep model (FP-048 stage A), two-way replies (FP-049).
3. **The author publishing loop** — story workspace (FP-053), author dashboard (FP-055), pre-publish review (FP-060),
   focused writing frame (FP-058), draft checkpoints (FP-059).
4. **Discovery that scales with the catalogue** — consistent cards and layouts (FP-037, FP-045), decision facts
   (FP-040), filters and sort (FP-041), navigation at every width (FP-019).
5. **Community safety maturity** — moderation outcomes (FP-006), appeals (FP-063), block (FP-064), reporter feedback
   (FP-031), console productivity (FP-024).

Defer until evidence exists: FP-036, FP-038, FP-042, FP-046, FP-056, FP-057, FP-061, FP-062, FP-066.
The ranked backlog and phases are in the [implementation roadmap](implementation-roadmap.md#phase-2-update-product-discovery-2026-11-05).

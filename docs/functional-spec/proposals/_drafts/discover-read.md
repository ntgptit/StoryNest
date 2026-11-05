# Draft discover-read

Agent key `discover-read` · Phase 2 (product discovery and screen enhancement) · scope: discovery and reading for the
guest and member reader · reserved FP range FP-040…FP-046 (all seven used) · analysed 2026-11-05 against the Phase 1
spec (baseline `204a1ea`) and the current source.

**Evidence used**
- Guest runtime screenshots at 390 / 768 / 1280 px (`rt2/shots/{m,t,d}-{home,search,ranking,story,reader,author,mature-gate}.png`,
  `m-reader-toc.png`, `m-reader-paragraph-sheet.png`) and the Phase 1 shots (`rt/shots/mobile-reader-last.png`,
  `mobile-reader-settings-en.png`). Dev data has only 5 public stories without covers, so the density figures below
  describe the layout, not the catalogue.
- `rt2/metrics.json`: first-card height, number of controls, controls below 44 px, main width.
- Code, cited as `path:line`. **No signed-in flow was run at runtime.** Every statement about members (progress
  restore, Continue, For-you, following feed, library) is `Verified (Code)` or `Inferred`, never `Verified (Runtime)`.

**Key measurements (Verified (Runtime), metrics.json and screenshots)**

| Measure | 390 px | 768 px | 1280 px |
| --- | --- | --- | --- |
| Story card height (home / search / ranking) | 451 px | 507–535 px | 511–539 px |
| Story cards fully visible per screen (home, 844 px tall) | about 1 row of 2 cards; the first card title sits at y ≈ 668 | 3 per row | 4 per row |
| Content column (`main`) | 390 | 768 | 1024 (`max-w-5xl`) |
| Controls below 44 px: home · search · ranking · story · reader · author | 6/30 · 9/15 · 9/16 · 13/22 · 17/21 · 7/13 | 5/25 · 8/10 · 8/11 · 12/17 · 16/16 · 6/8 | 5/25 · 8/10 · 8/11 · 12/17 · 16/16 · 6/8 |
| Reader chrome at the top of a chapter (header 56 + reader toolbar 48 + bottom nav ≈ 51) | ≈ 155 px of 844 (18 %) | 104 px (no bottom nav ≥ md) | 104 px |

**New code-level observations (not in Phase 1 audits)**

| Ref | Observation | Tag |
| --- | --- | --- |
| N-01 | The reader toolbar is `sticky top-0 z-10` inside `main` (`packages/features/src/reader/screens/reader-screen.tsx:74`), while the shell header is `sticky top-0 z-30` and 56 px tall (`packages/ui/src/widgets/app-shell.tsx:24-25`). Both stick to the top of the viewport, so once the page scrolls the 48 px reader toolbar (back link, Display, Contents) **and the 2 px progress bar** slide underneath the opaque header and cannot be seen or used until the reader scrolls back up. The studio preview bar has the same pattern (`history/screens/preview-screen.tsx:48`). | Inferred (Code), high confidence. Screenshots were taken at the top of the page, so this was not observed at runtime. |
| N-02 | The chapter reader is mounted in the full `(main)` shell (`apps/web/src/app/(main)/story/[id]/[slug]/[chapterSlug]/page.tsx`, `apps/web/src/app/(main)/layout.tsx:5-6`), but WBS §1.2 plans a shell-less `(reader)` route group: "trình đọc toàn màn hình (không shell)" (`docs/WBS.md:63`). The fixed bottom nav (`packages/ui/src/widgets/bottom-nav.tsx:47`) covers the bottom of the text while reading at 390 px. | Verified (Code) + Verified (Runtime) (`m-reader.png`) |
| N-03 | "Recently updated" is ordered by `stories.updated_at` (`packages/features/src/discovery/api/discovery.api.ts:89-95`), which the `stories_touch` trigger bumps on **every** story-row update (`supabase/migrations/20261103000000_init_schema.sql:382`). Every `publish_chapter` call, including republishing an edit, updates the story row (`supabase/migrations/20261103000200_publish_chapter_rpc.sql:193-196`), and so does any title, synopsis, cover or visibility edit. The card's "Updated 3 hours ago" and the feed order therefore do not mean "new chapter". `chapters.first_published_at` (set once, `…publish_chapter_rpc.sql:188`) would give that meaning. | Verified (Code). Reader impact is hypothesised. |
| N-04 | A member who finished the last published chapter gets no continue target (`packages/features/src/progress/model/progress.ts:56-58`), so the story page falls back to "Start reading" → chapter 1 (`packages/features/src/story/screens/story-screen.tsx:61-62,105-109`). A caught-up reader of an ongoing story is invited to restart it. The rule is documented (BR-PROG-008) but its UX effect was not raised as a finding. | Verified (Code) |
| N-05 | The last chapter of an ongoing story ends like any other chapter: end marker, vote, report, comments, then a disabled "Next chapter". Nothing says "more is coming" or offers Follow (`reader/components/chapter-nav.tsx:35-41`; runtime `rt/shots/mobile-reader-last.png`). | Verified (Code) + Verified (Runtime) |
| N-06 | Story search matches **only the title** (`supabase/migrations/20261104001300_search.sql:75-83`). Author names and tags are separate tabs, and the synopsis is never searched. | Verified (Code) |
| N-07 | The data for decision facts does not exist: `story_stats` holds reads/votes/comments/followers/saves only (`init_schema.sql:320-328`), and the card query has no chapter count, total words or last-chapter date (`discovery.api.ts:13-19`). The story page computes the chapter count client-side from the full list (`story-screen.tsx:143-145`). | Verified (Code) |
| N-08 | The saved reading position is restored by scrolling silently once progress loads (`progress/hooks/use-reading-tracker.ts:69-70`). There is no notice and no "start from the beginning" option, and the jump can arrive after the reader has started reading on a slow connection. | Verified (Code) for the silent restore. The late jump is Inferred. |
| N-09 | Paragraph-comment buttons render after **every** paragraph and heading, also when the count is 0 (`reader/components/reader-blocks.tsx:41-59`; runtime `m-reader.png`). The reader cannot turn them off. | Verified (Code) + Verified (Runtime) |
| N-10 | Rankings have no category scope, and `top_stories` takes only period, mature flag, limit and offset (`supabase/migrations/20261104001500_rankings.sql:82-111`). Ranked cards show the story's all-time counters on the card and the period counters on a second line under the card, both with similar wording (`d-ranking.png`: card "4" and line "4 lượt đọc · 0 bình chọn"). | Verified (Code) + Verified (Runtime) |

---

## 1. Journeys

### JRN-RDR-01 — First visit (guest)

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

### JRN-RDR-02 — Discovering interesting stories (browse, categories, tags, rankings, recommendations, authors)

| Field | Value |
| --- | --- |
| Journey ID | JRN-RDR-02 |
| User goal | Find something that matches my taste (genre, mood, length, completeness) or what others are enjoying, and find new authors. |
| Current workflow | Home: category chips (root only) and up to 12 popular tags filter the feed (WF-HOME-02). Rankings by period from the Home link (WF-RANK-01). Members get "Recommended for you" (up to 8, unfiltered home only, BR-REC-005). Story page ends with "You might also like" (WF-REC-01). Author pages are reachable from the story page author link or the Authors search tab only (discovery overview §Navigation). |
| Friction points | **Confirmed:** (1) Sub-categories are never shown as chips, and the story-page category badge is not a link (U-TAX-01). (2) A filtered view keeps the generic hero h1; the category or tag is not the page heading (Verified (Code) `apps/web/src/app/(main)/page.tsx:66-70`). (3) Rankings cannot be scoped to a category (N-10). (4) The card's author name is not a link (BR-HOME-009), so authors are discovered only via the story page. (5) No entry point favours new stories or authors: the feed is recency-of-edit, rankings are cumulative (N-03, BR-RANK-001). (6) "You might also like" renders after the **whole** chapter list (`story-screen.tsx:186`), which is unbounded (F-STORY-02), so on long stories it is far below the fold. (7) The recommendation reason and the ranking period line sit **outside** the card as loose text (`recommendations/components/recommendation-list.tsx:38-46`; `d-story.png`, `d-ranking.png`). **Hypothesised:** (8) Guests get no personalisation, so returning guests always see the same feed (FP-027 would provide signals). |
| Missing capabilities | Category landing heading and sub-category browsing; per-category ranking; new and rising discovery; author links from cards; compact recommendation rows. |
| Proposed improvement | FP-046 (ranking scopes: category, new). FP-017 amendment (sub-categories, category heading). FP-045 (card variants with reason/rank inside, author link in row variant). SE-STORY-01 (similar stories moved into a desktop aside / above the long chapter list). FP-029 amendment. |
| Expected value | More paths to a matching story; fairer exposure for new authors (supply-side health); better use of the already-built recommendation engine. |
| Affected screens | SCR-HOME-01, SCR-RANK-01, SCR-STORY-01, SCR-AUTHOR-01 |
| Dependencies | FP-017 (approved category tree, Q-TAX-01/02), FP-002 |
| Evidence | U-TAX-01, `d-ranking.png`, `d-story.png`, `m-home.png`, code refs above |

### JRN-RDR-03 — Searching and filtering

| Field | Value |
| --- | --- |
| Journey ID | JRN-RDR-03 |
| User goal | Find a known story or author quickly, or narrow a broad interest ("completed romance under 50k words, updated recently"). |
| Current workflow | Header SearchBox (≥ sm: combobox with ≤ 5 title suggestions, BR-SRCH-009; < sm: icon → `/search`) → `/search?q=&tab=` with Stories / Authors / Tags tabs (WF-SRCH-01/02). Diacritic-insensitive (RT-11). Story results are cards with offset paging capped at 200 (BR-SRCH-007). |
| Friction points | **Confirmed:** (1) The Stories tab matches titles only (N-06), so typing an author name or a genre word into the header box gives no story suggestions or results. The reader must guess the right tab. (2) There are no filters or sort on search results or the home feed: no status (completed/ongoing), length, updated-within or "sort by" (Verified (Code) `discovery.api.ts:59-95`, `search.sql:64-86`). (3) The mobile search page is not autofocused (U-SRCH-02). (4) The cap is shown as "No more results" (F-SRCH-01). (5) Silent load-more errors (U-SRCH-01). (6) 9 of 15 controls are below 44 px at 390 px (metrics `m/search`). (7) Two results fill the whole 390 px screen (`m-search.png`). **Hypothesised:** (8) Readers of Vietnamese web fiction filter by "hoàn thành" (completed) before investing in a long serial. Common practice on comparable platforms; not measured here. |
| Missing capabilities | Cross-field relevance, filters, sort, recent searches, no-result recovery. |
| Proposed improvement | FP-042 (search relevance beyond titles + no-result recovery + recent searches). FP-041 (shared filter/sort model for search and browse). FP-045 (row results on phones). Quick fixes U-SRCH-02, F-SRCH-01. FP-020. |
| Expected value | Fewer empty searches; fewer tab switches; narrowing without scrolling hundreds of cards. |
| Affected screens | SCR-SRCH-01 (+ header SearchBox), SCR-HOME-01 |
| Dependencies | FP-040 (length and last-chapter data for filters), Q-SRCH-02, Q-HOME-03 |
| Evidence | `m-search.png`, `d-search.png`, metrics, `search.sql:75-83`, RT-11 |

### JRN-RDR-04 — Choosing a story (story page as the decision page)

| Field | Value |
| --- | --- |
| Journey ID | JRN-RDR-04 |
| User goal | Decide in seconds whether this story is worth my time. Readers usually want to know: what is it about, how long is it, is it finished or still updating (and how often), is it popular, who wrote it, what do others like it. |
| Current workflow | Story page (WF-STORY-01): cover, title, author link, category + status (+18+) badges, four icon-only counters, primary CTA, Follow / Save / Add to list, Report (own row), synopsis, tags, chapter list (Chapter N · title · N words), similar stories (BR-STORY-010…015). |
| Friction points | **Confirmed:** (1) There is no total length (words, reading time) and no chapter count in the header. The count appears only in the chapter-list header (Verified (Code) `story-screen.tsx:139-146`; runtime `m-story.png`). (2) There is no "last updated" or new-chapter date, and chapter rows have no dates although `publishedAt` is loaded (U-STORY-02, `story/model/story-detail.ts:44,54`). (3) The four counters are icon + number only. Labels are `sr-only` or a mouse `title` (`packages/ui/src/widgets/stat-pill.tsx:21-29`), so a sighted touch user must guess what the book, heart, speech-bubble and people icons count (`m-story.png`: "4 0 0 0"). (4) At 1280 px the header uses about half of the 1024 px column and the rest is empty. Similar stories come after the full chapter list (`d-story.png`). (5) "Báo cáo" (Report) sits on its own row between the actions and the synopsis (runtime). That secondary action gets the same weight as Follow/Save. (6) 13 of 22 controls are below 44 px at 390 px (metrics). (7) Report is shown to the owner (F-STORY-01). (8) A caught-up member is offered "Start reading" (N-04). **Hypothesised:** (9) Long synopses push the chapter list and CTA context down on mobile (no clamp, `story-screen.tsx:121-123`). |
| Missing capabilities | Decision facts (length, reading time, completion, cadence), labelled social proof, caught-up state, desktop two-column layout, secondary-action overflow. |
| Proposed improvement | FP-040 (story facts). FP-044 (CTA states and chapter read marks). FP-045 (desktop layout and compact similar rows). SE-STORY-01. FP-022 amendment. |
| Expected value | Faster, more confident decisions. Fewer starts that end in a bounce. Better use of the desktop width. |
| Affected screens | SCR-STORY-01, every list that shows the shared card |
| Dependencies | FP-040 before the facts appear on cards. Q-STORY-02, Q-HOME-03. |
| Evidence | `m-story.png`, `t-story.png`, `d-story.png`, metrics `story`, U-STORY-02, F-STORY-01 |

### JRN-RDR-05 — Reading chapters (comfort, navigation, continuity, immersive mode, progress)

| Field | Value |
| --- | --- |
| Journey ID | JRN-RDR-05 |
| User goal | Read without distraction for a long session: comfortable typography, minimal chrome, always know where I am, move to the next chapter instantly. |
| Current workflow | Chapter reader (WF-READ-01…05) inside the main shell: site header → sticky reader toolbar (back to story, Display sheet, Contents sheet, 2 px progress bar) → "Chapter N" + h1 → blocks with a paragraph-comment button after each paragraph → end marker → vote → report → comment thread → prev/next. Typography preferences apply before paint and sync to the account (BR-READ-013…018). |
| Friction points | **Confirmed:** (1) Full app shell around the reader, against the WBS plan (N-02). About 18 % of a 390 × 844 screen is chrome at the top of a chapter, and the fixed bottom nav overlays the text while reading (`m-reader.png`). (2) Prev/next only after the whole comment thread (U-READ-01). (3) Progress = page scroll including comments (F-PROG-01). (4) A comment button on every paragraph, even with 0 comments, at 50 % opacity (N-09, U-CMT-01). (5) No "chapter 2 of 4" position anywhere in the reader. The TOC shows no read marks and does not scroll to the current chapter on long lists (`reader/components/toc-sheet.tsx:41-60`; `m-reader-toc.png`). (6) 17 of 21 controls are below 44 px at 390 px and 16/16 at 768/1280 (metrics `reader`). (7) The last chapter of an ongoing story gives no "more coming / follow" cue (N-05). **Inferred (Code), high confidence:** (8) Once scrolled, the reader toolbar and progress bar are hidden under the site header (N-01), so Display/Contents need a scroll back to the top. **Hypothesised:** (9) The silent position restore can jump the page after the reader started (N-08). |
| Missing capabilities | Immersive mode (shell-less, auto-hiding chrome), always-visible progress and position, end-of-chapter / end-of-story panel, control of comment markers, keyboard navigation. |
| Proposed improvement | FP-043 (immersive reader route and chrome). FP-012 amendment (nav placement, completion, keys). FP-044 (end-of-story / caught-up panel, TOC read marks, resume notice). FP-022 amendment (targets). |
| Expected value | Longer, less interrupted sessions; more next-chapter clicks (the core engagement metric for serial fiction); fewer accidental taps. |
| Affected screens | SCR-READ-01 (+ settings sheet, TOC sheet, paragraph sheet entry), SCR-SHELL-01 |
| Dependencies | FP-012, FP-004 (not-found inside the new layout), FP-005 (gate before text), Q-READ-02 |
| Evidence | `m-reader.png`, `t-reader.png`, `d-reader.png`, `m-reader-toc.png`, `m-reader-paragraph-sheet.png`, `rt/shots/mobile-reader-last.png`, metrics, N-01, N-02, N-05, N-09 |

### JRN-RDR-06 — Continuing an unfinished story (cross-device, from home, library or notification)

| Field | Value |
| --- | --- |
| Journey ID | JRN-RDR-06 |
| User goal | Pick up exactly where I stopped, on any device, from wherever I am (home, library, a "new chapter" notification). |
| Current workflow | Members: position saved by block + percent at most every 5 s (BR-PROG-006). Restored on reopening the chapter (BR-PROG-007). Story page CTA "Continue reading · Chapter N" (BR-PROG-008). Library "Reading" tab "Continue with chapter N" (SCR-LIB-01-A02, another agent's screen). Notification `chapter_published` opens the chapter (WF-NOTI-05). Guests: nothing (F-PROG-04). |
| Friction points | **Confirmed (Code):** (1) Home has no "Continue reading" entry. A member must go through Library or find the story again (`apps/web/src/app/(main)/discover-home.tsx:11-15`). (2) Story page and library compute different targets (F-PROG-02). (3) A caught-up reader sees "Start reading" (N-04). (4) Restore is silent, with no "start from the beginning" (N-08). (5) Guests lose their place (F-PROG-04 → FP-027). (6) Notification links break after a chapter slug rename (F-NOTI-01 → FP-011). (7) The story page and TOC do not show which chapters are read or new since the last visit (Verified (Code) `story-screen.tsx:165-181`, `toc-sheet.tsx:43-59`). **Not runtime-verified:** all signed-in behaviour (DEC-011). |
| Missing capabilities | Home continue rail, chapter read state, "new since last visit", caught-up state, resume notice. |
| Proposed improvement | FP-044 (continuity layer: home continue rail, read marks, new badges, CTA states, resume notice, end-of-story panel). FP-012 (one resolver). FP-027 amendment (guests feed the same UI). FP-011 / FP-013 (links, owned elsewhere). |
| Expected value | Higher return-reading rate. Continue from the first screen of the app. No restart confusion for caught-up readers. |
| Affected screens | SCR-HOME-01, SCR-STORY-01, SCR-READ-01, SCR-LIB-01 (reference), SCR-NOTI-01 (reference) |
| Dependencies | FP-012 (shared resolver), FP-027, FP-011, FP-013, Q-PROG-01, Q-STORY-02 |
| Evidence | `progress/model/progress.ts:51-59`, `story-screen.tsx:60-62,105-109`, `use-reading-tracker.ts:69-70`, `rt/shots/mobile-reader-last.png`, F-PROG-02/04, F-NOTI-01 |

---

## 2. Capability rows

| Capability ID | Capability | Current StoryNest | Evidence | User value | Recommendation |
| --- | --- | --- | --- | --- | --- |
| CAP-READ-01 | Reading comfort: font size, line spacing, font, background, comfortable measure | Implemented | BR-READ-013…018, `reader-settings-sheet.tsx`, runtime `mobile-reader-settings-en.png` | High | none (keep; FP-043 adds the chrome around it) |
| CAP-READ-02 | Immersive / focus mode (no app chrome, auto-hiding controls) | Missing | N-02, WBS §1.2 `docs/WBS.md:63`, `m-reader.png` | High | FP-043 |
| CAP-READ-03 | Chapter navigation (prev/next near the end of the text, TOC, keyboard) | Partial | U-READ-01, N-01, `chapter-nav.tsx`, `toc-sheet.tsx` | High | FP-012 (amended) + FP-043 |
| CAP-READ-04 | Resume position across devices | Partial (members Implemented, silent; guests Missing) | BR-PROG-005/007, N-08, F-PROG-04 | High | FP-044, FP-027 |
| CAP-READ-05 | In-chapter progress visibility (bar, % / position "2 of 4") | Partial | F-PROG-01, N-01, `reader-screen.tsx:93,98` | Medium | FP-043, FP-012 |
| CAP-READ-06 | Story-level progress visibility (read marks, caught-up state) | Missing | N-04, `story-screen.tsx:165-181`, `toc-sheet.tsx:43-59` | High | FP-044 |
| CAP-READ-07 | Chapter discovery (new chapters since last visit, chapter dates, latest chapter) | Missing | U-STORY-02, N-07 | Medium | FP-040, FP-044 |
| CAP-READ-08 | Reader personalisation synced to the account | Implemented | BR-READ-016/017 | Medium | none |
| CAP-READ-09 | Control over paragraph-comment markers while reading | Missing | N-09, U-CMT-01 | Medium | FP-043 (preference; BRC-READ-01) |
| CAP-READ-10 | End-of-story / caught-up handling (follow for more, the end, what next) | Missing | N-04, N-05 | High | FP-044 |
| CAP-READ-11 | Offline reading (download chapters, sync queue) | Missing; planned for mobile (WBS 7.4) | `docs/WBS.md:241` | High on mobile | none: WBS 7.4 owns it (the FP-043 layout should keep the reader route free of shell-only dependencies so 7.1/7.4 can reuse it) |
| CAP-DISC-01 | Diacritic-insensitive search | Implemented | BR-SRCH-001…003, RT-11 | High | none |
| CAP-DISC-02 | Search relevance across title, author, tags and synopsis in one result list | Partial (title only) | N-06 | Medium | FP-042 |
| CAP-DISC-03 | Filter by completion status | Missing | `discovery.api.ts:59-95`, `search.sql:64-86` | High | FP-041 |
| CAP-DISC-04 | Filter by length | Missing (no data) | N-07 | Medium | FP-040 + FP-041 |
| CAP-DISC-05 | Filter by recency of the last new chapter | Missing | N-03 | Medium | FP-040 + FP-041 |
| CAP-DISC-06 | Language filter | Partial (API only) | F-HOME-02 | Low (vi-first) | Existing quick fix F-HOME-02 (could share the FP-041 filter bar) |
| CAP-DISC-07 | Sorting (updated / newest / most read / most voted) | Missing | `discovery.api.ts:91-93` (fixed order) | Medium | FP-041 |
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

---

## 3. Screen enhancements

### SE-HOME-01 — Home / Discover (SCR-HOME-01)

**Current experience** — Purpose: the public entry and browse page. Structure: hero (h1 + intro, all roles, also on
filtered views, `apps/web/src/app/(main)/page.tsx:66-70`), "Recommended for you" (member, unfiltered), section h2
"Recently updated" with shortcuts "From authors you follow" (member) and "See rankings", category chips (root only),
popular tags (≤ 12), 2/3/4-column card grid with infinite load (SCR-HOME-01-C01…C11). Actions: filter, open story,
shortcuts, load more. Known limitations: F-HOME-01 (suspended authors listed), F-HOME-02 (language filter not exposed),
U-HOME-01/U-SHELL-01 (rankings/following discoverability), U-HOME-02 (guest hero without CTA), U-HOME-03 (unknown
category), U-TAX-01/02.

**Identified opportunities**
- Density. Two 451 px cards per row at 390 px: the first story title is at y ≈ 668, under the hero and two chip rows. Verified (Runtime).
- The guest gets no value proposition, CTA or trending/popular entry. Verified (Code) `home-hero.tsx`.
- A member gets the same marketing hero on every visit and has no "Continue reading" entry (`discover-home.tsx:11-15`). Verified (Code).
- On a filtered view the h1 stays generic and the active category shows only as a highlighted chip. There is no breadcrumb and no sub-category row. Verified (Code) / U-TAX-01.
- The category chip row hides overflow with no affordance: "Phiêu lưu" is cut at 390 px. Verified (Runtime).
- No filter or sort beyond category/tag. The feed meaning is "last edited" (N-03). Verified (Code).
- "Recommended for you" is hidden while loading, so it pushes the feed down when it arrives (layout shift; `recommendation-list.tsx:25`). Inferred.
- The tag row repeats the "#" prefix bug (U-TAX-02). Verified (Runtime).

**Proposed experience**
- Sections, top to bottom.
  - **Guest:** compact hero (one-line value proposition + "Create account" primary + "Start writing" link; ≤ 120 px at 390 px; FP-032) → "Trending this week" rail (`top_stories('week')`, 8 items) → "New & rising" rail (FP-046) → browse section.
  - **Member:** no hero. "Continue reading" rail (FP-044, up to 6 in-progress stories with "Ch. N · 35 %") → "Recommended for you" rail (with a reserved skeleton, FP-020) → browse section.
  - **Filtered view (any role):** no hero and no rails. The h1 is the category or "#tag" name, followed by sub-category chips and a "Clear filters" action.
- Browse section: h2 "Browse", category chips plus an "All categories" chip that opens a sheet with the two-level tree (FP-017 amendment), popular tags, then the FP-041 filter/sort bar (Status · Length · Updated · Sort), then the list.
- Rails reuse `StoryCard` in the `compact` variant (FP-045). Horizontal scroll with snap on < md. 4-up grid on ≥ lg.
- List: `row` variant on < sm (cover 72 × 108, title, author, category · status, facts line "24 ch · 85k words · updated 2 d", ≈ 130 px tall, so about 5 stories per screen). `grid` variant on ≥ sm (3 columns at 768, 4 at 1280), with the cover capped so a card is ≤ 420 px.
- Primary action: open a story. Secondary: filter, sort, rails' "See all" (to `/ranking`, `/ranking?scope=new`, `/library`).
- Desktop (1280): rails as 4-up rows; the filter bar inline under the chips; shortcuts move to the header nav (FP-019).
- Tablet (768): rails 3-up with horizontal scroll; filter bar inline.
- Mobile (390): filter bar = one "Filters (2)" button opening a bottom sheet with Apply / Reset, plus a "Sort" select. Chips stay one scrolling line with a fade edge and the "All categories" chip.
- UI states: each rail hides on empty, and shows an inline retry on error without blocking the feed (BR-HOME-012 kept). An unknown category shows "This category doesn't exist" with a link to All (U-HOME-03).

**Acceptance criteria**
- SE-HOME-01-AC01 [Proposed] — Given a guest at 390 × 844 px, When `/` loads, Then at least one story title is visible above the fold and the hero (with a "Create account" CTA) is ≤ 120 px tall.
- SE-HOME-01-AC02 [Proposed] — Given a signed-in member with 2 stories in progress, When `/` loads unfiltered, Then no marketing hero is shown and a "Continue reading" rail lists both stories, each linking to the target computed by the shared continue resolver (FP-012).
- SE-HOME-01-AC03 [Proposed] — Given `/?category=lang-man`, When the page renders, Then the h1 is the category name, its direct sub-categories are shown as chips, and no hero or rails are rendered.
- SE-HOME-01-AC04 [Proposed] — Given more root categories than fit at 390 px, When the reader taps "All categories", Then a sheet lists every category (two levels) and choosing one applies the filter.
- SE-HOME-01-AC05 [Proposed] — Given a viewport < 640 px, When the feed renders, Then cards use the row variant and each is ≤ 140 px tall. Given ≥ 640 px, Then the grid variant is used.
- SE-HOME-01-AC06 [Proposed] — Given "Recommended for you" is loading, When the feed is already visible, Then the rail's reserved skeleton keeps the feed from shifting by more than 8 px when the rail resolves.
- SE-HOME-01-AC07 [Proposed] — Given status = completed and sort = most read are selected, When the URL is shared and opened in a new tab, Then the same filtered, sorted list is server-rendered.

**Impact** — Frontend: `discover-screen.tsx`, `discover-home.tsx`, `page.tsx`, `home-hero.tsx`, new rails · Backend/API:
browse RPC from FP-041, `top_stories` reuse · Database: FP-040 columns, FP-046 · Shared components: `StoryCard`
variants, `FilterBar`/`FilterSheet` (new in `packages/ui/widgets`) · Business rules: BR-HOME-002/003/008/009/010
(BRC-HOME-01, BRC-HOME-02) · Other screens: search, rankings, author, following (shared card and filter model).

**Related** — FP-032 (amended), FP-040, FP-041, FP-044, FP-045, FP-046, FP-017 (amended), FP-019, FP-020, FP-002,
F-HOME-01, F-HOME-02, U-HOME-01/02/03, U-TAX-01/02.

**Priority** — P2: the main entry for every new reader. The density and landing issues are confirmed at runtime but
not launch-blocking. Depends on FP-002 for a correct feed.

### SE-SRCH-01 — Search results + header SearchBox (SCR-SRCH-01)

**Current experience** — Purpose: find a known story, author or tag. Structure: header combobox (≥ sm) or icon (< sm), page
h1, search form, results heading, tabs Stories / Authors / Tags, card grid (stories), rows (authors), list
(tags ≤ 10) (SCR-SRCH-01-C01…C11). Limitations: F-SRCH-01 (cap message), U-SRCH-01 (silent load-more errors),
U-SRCH-02 (no autofocus, no dropdown feedback), N-06 (title-only stories).

**Identified opportunities**
- Stories tab and suggestions match the title only (N-06). An author name or genre word typed in the header gives nothing in the place readers look first. Verified (Code).
- No filters or sort on results. Verified (Code).
- Two 451 px cards fill the 390 px viewport (`m-search.png`). On desktop the 2 results occupy half a row with empty space. Verified (Runtime).
- No recent searches, and no recovery on zero results (popular tags, rankings link). Verified (Code) `search-screen.tsx:115-123`.
- The tabs give no hint that the Authors/Tags tabs hold matches (no counts or "has results" dot). Inferred: costs a tab switch to find out.
- 9/15 controls below 44 px at 390 px. Verified (Runtime) metrics.

**Proposed experience**
- Stories tab results come from the FP-042 relevance (title > author > tag > synopsis). Each row shows why it matched when the match was not the title: "by An Nhiên" or "#Tình yêu" highlighted.
- Above the stories list: the shared filter/sort bar (FP-041) with sort "Relevance" by default. Filters apply to the Stories tab only.
- Tabs: Stories / Authors (n) / Tags (n). Author and tag counts come from the first page (capped display "10+"). If Stories is empty but Authors has matches, the Stories empty state says "No story titles match — 2 authors match" with a button to switch.
- Empty query (mobile icon entry): autofocused field, "Recent searches" (device-local, max 8, clearable), "Popular tags" chips.
- Zero results: "No results for X" + popular tags + "See rankings" + spelling hint ("check spelling or try fewer words").
- Header SearchBox dropdown: one "Authors" suggestion and one "Tags" suggestion group in addition to titles (top 2 each, same 250 ms debounce). Feedback "Type at least 3 characters" and "No matches" in the listbox (U-SRCH-02).
- Mobile (390): row variant results. Filters in a bottom sheet. Sticky search field at the top of the page.
- Tablet (768): 3-column grid or rows (row variant ≥ sm optional, see FP-045). Inline filter bar.
- Desktop (1280): the filter bar inline under the tabs. Grid 4-up, or a two-column row list for dense scanning.
- States: cap message (F-SRCH-01), inline load-more retry (FP-020), "Searching…" skeleton in the chosen variant.

**Acceptance criteria**
- SE-SRCH-01-AC01 [Proposed] — Given author "An Nhiên" has 2 public stories whose titles do not contain "nhien", When a reader searches "an nhien" on the Stories tab, Then both stories are listed and each shows "by An Nhiên" as the match reason.
- SE-SRCH-01-AC02 [Proposed] — Given the reader opens `/search` with no query on a phone, Then the field has focus and up to 8 recent searches from this device are listed with a "Clear" action.
- SE-SRCH-01-AC03 [Proposed] — Given a query with no story, author or tag match, Then the page shows "No results", popular tags and a link to Rankings.
- SE-SRCH-01-AC04 [Proposed] — Given the Stories tab has 0 results and Authors has 2, Then the Stories empty state offers "Show 2 authors", which switches tab without a new history entry.
- SE-SRCH-01-AC05 [Proposed] — Given `/search?q=tinh&status=completed&sort=reads`, When it loads, Then only completed matching stories are listed, ordered by reads, and the filter chips reflect the URL.
- SE-SRCH-01-AC06 [Proposed] — Given the header combobox is open with "an", Then the listbox announces "Type at least 3 characters".

**Impact** — Frontend: `search-screen.tsx`, `search-box.tsx`, recent-search store (localStorage, try/catch as the
adult-content store does) · Backend/API: `search_stories` scoring change, optional `p_status/p_length/p_sort` params
(FP-041/042) · Database: trigram index on author display name already exists (`search.sql`), tag name index exists.
Synopsis needs a new index only if Q-SRCH-02 says yes · Shared components: filter bar, card variants · Business rules:
BR-SRCH-003/006/009 (BRC-SRCH-01) · Other screens: header (SCR-SHELL-01).

**Related** — FP-041, FP-042, FP-045, FP-020, FP-022, F-SRCH-01, U-SRCH-01/02, Q-SRCH-01, Q-SRCH-02.

**Priority** — P2: search is the main "known item" path. Title-only matching and the missing filters are confirmed
gaps, but the tabs give a workaround.

### SE-RANK-01 — Rankings (SCR-RANK-01)

**Current experience** — Purpose: what is popular now. Structure: page header, period tabs (Today / This week / This
month / All time, URL `?period=`), freshness note "Updated …", ranked card grid with a rank badge on the cover and
"<reads> reads · <votes> votes" under the card (SCR-RANK-01-C01…C06). Limitations: U-RANK-01 (UTC day), U-RANK-02
(badge semantics/overlap), U-SRCH-01 (silent load more), reachable only from a Home link (U-SHELL-01).

**Identified opportunities**
- No category scope (N-10). A reader who likes romance cannot see "top romance this week". Verified (Code).
- The card shows all-time reads/votes while the line under it shows period reads/votes, both with similar icons and words (`d-ranking.png`). Verified (Runtime). Readers may mistake one for the other (Inferred).
- No explanation of how the score works (reads + 5 × votes, BR-RANK-001) or why a story ranks. Verified (Code).
- No discovery of new stories (cumulative scores favour established stories). Verified (Code) / impact hypothesised.
- Density: 3 ranked cards fill 1294 px at 390 px (metrics). Verified (Runtime).

**Proposed experience**
- Controls: period tabs (unchanged) + scope chip row "All · Romance · Fantasy · … · New" (FP-046). Scope is in the URL (`?scope=<categorySlug>|new`).
- Ranked item (FP-045 `row` variant with rank): large rank number on the left (1–3 accented), small cover, title, author link, category, then **one** metric line inside the item: "1.2K reads · 34 votes this week". All-time counters are dropped from ranked items.
- An "How rankings work" info button next to the freshness note opens a small popover: score formula, refresh every 5 min, which time zone "Today" uses (Q-RANK-01).
- Mobile (390): row list (≈ 120 px each, about 6 per screen). The scope chips scroll with a fade.
- Tablet (768): two-column row list.
- Desktop (1280): two-column row list in the 1024 px column, or top 3 as large cards followed by rows. The scope chips are inline.
- States: inline load-more retry (FP-020). Empty scope: "No ranked stories in Romance yet" + link to All.

**Acceptance criteria**
- SE-RANK-01-AC01 [Proposed] — Given `/ranking?period=week&scope=lang-man`, Then only stories in "Lãng mạn" and its direct children are ranked, positions restart at 1, and the scope chip is marked current.
- SE-RANK-01-AC02 [Proposed] — Given a ranked item, Then it shows exactly one counter line with the period's reads and votes and the period name ("this week"), inside the item's link area.
- SE-RANK-01-AC03 [Proposed] — Given the reader opens "How rankings work", Then the popover states the score formula and refresh interval and is reachable by keyboard and closed with Esc.
- SE-RANK-01-AC04 [Proposed] — Given a 390 px viewport, Then at least 5 ranked items are visible per screen height after the controls.

**Impact** — Frontend: `ranking-screen.tsx`, ranked row · Backend/API: `top_stories` gains `p_category_ids` /
`p_scope` (FP-046) · Database: none for category (live join to `stories.category_id`). New scope per FP-046 ·
Shared components: `StoryCard` row variant with rank slot · Business rules: BR-RANK-006/008 (BRC-RANK-01) · Other
screens: Home rails (FP-032, FP-046).

**Related** — FP-046, FP-045, FP-019, FP-020, FP-022, U-RANK-01/02, Q-RANK-01, Q-RANK-02.

**Priority** — P3: works correctly today. Improvements raise relevance but nothing is broken.

### SE-AUTHOR-01 — Author page (SCR-AUTHOR-01)

**Current experience** — Purpose: know an author, follow them, see their stories. Structure: avatar, display name,
"@username · N followers · M stories", bio, Follow, Report (stacked on the right), "Author's stories" card grid
(SCR-AUTHOR-01-C01…C07). Limitations: F-AUTHOR-01 (no followed-authors list), F-AUTHOR-02 (title/SSR/404), U-AUTHOR-01
(toggle semantics), U-AUTHOR-02 (count mismatch), Q-AUTHOR-01 (co-written stories).

**Identified opportunities**
- At 390 px the meta line wraps over 2–3 lines ("@demo_an · 0 người / theo dõi · 2 truyện"). Follow and Report are stacked to the right and squeeze the name column (`m-author.png`). Verified (Runtime).
- Report has the same visual weight as Follow. Verified (Runtime).
- The story list has no sort or status filter, and cards lack length and last-chapter facts (N-07). Verified (Code).
- At 1280 px two cards use half a row and the header leaves most of the width empty (`d-author.png`). Verified (Runtime).
- The page gives no sign of the author's activity ("last chapter 2 days ago") to help the reader decide on a follow. Verified (Code): the data does not exist (N-07).

**Proposed experience**
- Header: avatar + name + @username on one line group. Below it, a stats row with visible labels ("2 stories · 0 followers · last update 2 d ago"; the last item from FP-040 `max(last_chapter_published_at)`). Then the bio (clamped to 4 lines with "More"). Then the actions row: **Follow** primary (full width on < sm) + "⋯" menu (Report author, Copy link).
- Stories: h2 + sort select (Recently updated / Most read) + status chips (All / Ongoing / Completed) when the author has > 4 stories. Row variant on < sm, grid ≥ sm, with the FP-040 facts line.
- Later: "Lists by this author" (FP-028) and "Co-written" (Q-AUTHOR-01) as further sections.
- Desktop (1280): two columns. Left 320 px profile card (sticky ≥ lg) with stats, bio and Follow. Right: the stories list as 3-column grid or rows.
- Tablet (768): single column, header in one row with Follow on the right.
- States unchanged, plus a real 404 (FP-004) and SSR (F-AUTHOR-02).

**Acceptance criteria**
- SE-AUTHOR-01-AC01 [Proposed] — Given a 390 px viewport, Then the author name, the stats line and a full-width Follow button are visible without horizontal overlap, and Report is reachable only through the "⋯" menu.
- SE-AUTHOR-01-AC02 [Proposed] — Given an author with 6 public stories of which 2 are completed, When the reader selects "Completed", Then exactly those 2 are listed and the URL keeps the choice (`?status=completed`).
- SE-AUTHOR-01-AC03 [Proposed] — Given the author's newest chapter was first published 2 days ago, Then the header shows "last update 2 days ago" (localized). Given the author has no published chapter, Then the item is omitted.
- SE-AUTHOR-01-AC04 [Proposed] — Given a 1280 px viewport, Then the profile and the story list are side by side and the Follow button stays visible while the list scrolls.

**Impact** — Frontend: `author-screen.tsx`, `follow-author-button.tsx` · Backend/API: `listLatestStories({authorId})`
gains status/sort from FP-041. `author_profile` may return `last_chapter_published_at` · Database: FP-040 ·
Shared components: actions overflow menu (reuse `DropdownMenu` from the user menu) · Business rules: BR-AUTHOR-002
(additive) · Other screens: none.

**Related** — FP-040, FP-041, FP-045, FP-004, FP-019, FP-022, FP-028, F-AUTHOR-01/02, U-AUTHOR-01/02, Q-AUTHOR-01.

**Priority** — P3: secondary page. The layout issues are confirmed but low impact.

### SE-AUTHOR-02 — Following feed (SCR-AUTHOR-02)

**Current experience** — Purpose: see updates from followed authors. Structure: page header, infinite card grid of
stories by followed authors ordered by `updated_at` (BR-AUTHOR-008), empty state, error (SCR-AUTHOR-02-C01…C05).
Member-only. **Not runtime-verified** (guest redirect only, RT-04). Limitations: reachable only from a Home link
(U-HOME-01), no followed-authors list (F-AUTHOR-01), empty state has no next step (SCR-AUTHOR-02-AC07 [Proposed]).

**Identified opportunities**
- The feed answers "which stories changed", not "what can I read now". A member must open each story to find the new chapter. Verified (Code): card only, BR-AUTHOR-008.
- `updated_at` also moves on metadata edits and republishes (N-03), so a typo fix brings a story back to the top. Verified (Code), impact Inferred.
- The page has no way to see or manage the followed authors (F-AUTHOR-01). Verified (Code).

**Proposed experience**
- Turn it into an "Updates" list: each item = story row (row variant) + "New: Chapter 12 · <title> · 2 h ago" linking straight to that chapter. Add "Continue · Ch. 9" when the member has progress on the story (FP-044 data). Order by `last_chapter_published_at` (BRC-HOME-01 semantics).
- At the top: an "Authors you follow" avatar strip (horizontal, "See all" → followed-authors list from FP-019 / F-AUTHOR-01).
- Empty state: "Follow authors to see their new chapters here" + "Browse rankings" + "Search authors".
- Mobile: rows. Desktop: two-column row list. A rail entry on Home for members ("From authors you follow", 4 items) can reuse it.

**Acceptance criteria**
- SE-AUTHOR-02-AC01 [Proposed] — Given a followed author published chapter 12 of story S 2 hours ago, Then S's item shows "New: Chapter 12 · <title>" linking to that chapter.
- SE-AUTHOR-02-AC02 [Proposed] — Given the author edited S's synopsis today but published no chapter for a month, Then S is not moved above stories with newer chapters.
- SE-AUTHOR-02-AC03 [Proposed] — Given the member follows no one, Then the empty state links to Rankings and to the Authors search tab.

**Impact** — Frontend: `following-screen.tsx` · Backend/API: `list_followed_stories` returns the newest published
chapter (id, slug, number, title, first_published_at) and orders by it · Database: FP-040 column + index · Shared:
row variant · Business rules: BR-AUTHOR-008 (BRC-HOME-01 applies) · Other screens: Home member rail.

**Related** — FP-040, FP-044, FP-045, FP-019, FP-011 (chapter links by id), F-AUTHOR-01, U-HOME-01.

**Priority** — P3: member-only and secondary. Valuable once follows grow.

### SE-STORY-01 — Story page (SCR-STORY-01)

**Current experience** — Purpose: decide and start or continue reading. Structure: cover, title, author, badges,
icon-only stats, CTA, Follow / Save / Add to list, Report (own row), synopsis, tags, chapter list, similar stories
(SCR-STORY-01-C01…C15). Layout: one column on mobile, `sm:grid-cols-[12rem_1fr]` header at ≥ 640 px
(`story-screen.tsx:68`), everything else full-width in the 1024 px column. Limitations: F-STORY-01, F-STORY-02,
F-STORY-03, F-STORY-04, U-STORY-01, U-STORY-02, U-READ-03, F-PROG-02/03, N-04, N-07.

**Identified opportunities**
- **Information for deciding.** No total words or reading time, no chapter count in the header, no last-update or new-chapter date, no chapter dates. Completion appears only as a small outline badge. Verified (Code) + Verified (Runtime).
- **Social proof unreadable.** The counters are icon + number, with labels only for screen readers or mouse hover. Verified (Code) `stat-pill.tsx:21-29` + Verified (Runtime).
- **Action hierarchy.** On mobile the CTA (190 px wide, not full width), then Follow + Save, then "Thêm vào danh sách" on its own row, then "Báo cáo" on its own row: four rows of actions, ≈ 160 px. Report is too prominent. Verified (Runtime) `m-story.png`.
- **Desktop layout.** The header uses about 690 of 1024 px, the synopsis is `max-w-prose`, and the right side of the page is empty below the header. Similar stories come only after the full chapter list. Verified (Runtime) `d-story.png` + Verified (Code) `story-screen.tsx:186`.
- **Long stories.** Unbounded chapter list (F-STORY-02) with no "jump to my chapter", no newest-first toggle and no read marks. Verified (Code).
- **Continue states.** A caught-up member sees "Start reading" (N-04). Verified (Code).
- **No share action.** Story links are the main growth channel (OG images exist), but there is no copy-link / native share. Verified (Code): no share component in `story/`.
- **Similar stories** render as full 451 px cards (one card ≈ 470 px at 390 px; `m-story.png`), with the reason outside the card. Verified (Runtime).

**Proposed experience**
- Header (all widths): title → author link (+ small avatar) → badges: category (now a link, U-TAX-01) · status with emphasis ("Completed" filled success tone; "Ongoing" outline) · 18+ → **facts line** (FP-040): "24 chapters · 85,000 words · ~6 h read · Updated 2 days ago". Then **labelled stats**: "1.2K reads · 340 votes · 56 comments · 120 followers". The labels are visible text, abbreviated on < sm ("1.2K reads").
- Actions: CTA is primary and full width on < sm, with states from FP-044: Start reading / Continue · Ch. N / Caught up · Follow for new chapters / Read again. Then one row: Follow (toggle), Save (toggle), "⋯" (Add to list, Share / copy link, Report). Report leaves its own row. It is hidden for the owner (F-STORY-01).
- Synopsis: clamped to 6 lines on < md with "Show more". Tags below it.
- Chapter list: rows show "Chapter N · title · words · date", with ✓ for read chapters and a "New" badge for chapters published since the member's `last_read_at` (FP-044). For > 30 chapters, show the first 10, a "… N chapters …" expander and the last 5, plus a "Jump to my chapter" link and a "Newest first" toggle (F-STORY-02 quick fix still applies to data loading).
- Similar stories: compact row variant (3–6 rows) with the reason inside the row (FP-045).
- **Mobile (390):** one column. Cover 128 px wide centred, or left-aligned 96 px beside the title (designer choice; the target is ≤ 520 px before the synopsis versus ≈ 650 px today). Optional sticky bottom CTA bar ("Continue · Ch. 5") once the header CTA scrolls out of view, sitting above the bottom nav. Its acceptance depends on Q-READ-02 chrome decisions; keep it off if the bottom nav remains.
- **Tablet (768):** header two columns (cover 12 rem + facts/actions). Body single column. Similar stories as a 2-column row list.
- **Desktop (≥ 1024/1280):** header band (cover 220 px + title/facts/stats/actions). Body in two columns: main 2/3 (synopsis, tags, chapter list) and aside 1/3 (About the author card with avatar, bio excerpt and Follow author; "You might also like" as 4–6 compact rows; later "In reading lists" FP-028). The aside is sticky on tall screens. This puts recommendations and the author above the fold on desktop instead of after the chapter list.
- Navigation: author card → SCR-AUTHOR-01. Category badge → `/?category=`. "Jump to my chapter" scrolls the list.

**Acceptance criteria**
- SE-STORY-01-AC01 [Proposed] — Given a story with 24 published chapters totalling 85,000 words whose newest chapter was first published 2 days ago, When the page loads, Then the header shows "24 chapters", "85,000 words", an estimated reading time, and "Updated 2 days ago" based on that chapter (not on metadata edits).
- SE-STORY-01-AC02 [Proposed] — Given any viewport, Then each counter shows a visible text label next to its number (not only an icon), and its accessible name contains the same label.
- SE-STORY-01-AC03 [Proposed] — Given a signed-in member viewing someone else's story at 390 px, Then the actions occupy at most two rows below the CTA, and Report is inside the "⋯" menu. Given the owner, Then Report is absent.
- SE-STORY-01-AC04 [Proposed] — Given a 1280 px viewport, Then the "You might also like" list and the author card are visible in an aside next to the chapter list without scrolling past the chapter list.
- SE-STORY-01-AC05 [Proposed] — Given a story with 120 chapters and a member whose current chapter is 87, When "Jump to my chapter" is pressed, Then the list reveals and focuses chapter 87.
- SE-STORY-01-AC06 [Proposed] — Given a member who read chapters 1–3 of 5, Then chapters 1–3 carry a "Read" mark with an accessible label, and chapters published after their last visit carry "New".
- SE-STORY-01-AC07 [Proposed] — Given "Share" in the "⋯" menu, When pressed on a device with Web Share, Then the native share sheet opens with the canonical URL. Otherwise the URL is copied and a toast confirms.
- SE-STORY-01-AC08 [Proposed] — Given a mature story, Then none of the new facts appear in server metadata or OG output (FP-005).

**Impact** — Frontend: `story-screen.tsx`, `story-actions.tsx`, `stat-pill.tsx` (visible-label mode), new
`StoryFacts`, author card · Backend/API: `getStory` columns (FP-040), chapter progress per story (FP-044) ·
Database: FP-040 · Shared components: `StatPill` variant, `StoryCard` row/compact, overflow menu · Business rules:
BR-STORY-012/013 (BRC-STORY-01), BR-HOME-009 shared card (BRC-HOME-02) · Other screens: reader (same chapter data),
SEO metadata unchanged except FP-005.

**Related** — FP-040, FP-044, FP-045, FP-022, FP-005, FP-011, F-STORY-01…04, U-STORY-01/02, U-TAX-01, U-READ-03.

**Priority** — P2: the decision page. It is the highest-leverage reading screen after the reader itself. The issues are
confirmed at runtime but none is broken.

### SE-READ-01 — Chapter reader (SCR-READ-01, incl. settings sheet, TOC sheet, paragraph-comment entry points)

**Current experience** — Purpose: read a chapter. Structure: main shell header → sticky reader toolbar (← story title,
"Hiển thị" Display, "Mục lục" Contents) with 2 px progress → "Chapter N" + h1 → blocks with trailing comment buttons
→ "— End of chapter —" → vote → report → comments → prev/next (SCR-READ-01-C01…C15). Settings sheet: 4 sizes, 3
spacings, 2 fonts, 4 backgrounds (`m` runtime `mobile-reader-settings-en.png`). TOC: right sheet with chapter label
and title, current highlighted (`m-reader-toc.png`). Paragraph sheet: bottom sheet with excerpt + thread
(`m-reader-paragraph-sheet.png`; owned by SCR-CMT-01). Limitations: U-READ-01, U-READ-02, U-READ-03, F-PROG-01,
U-CMT-01, F-STORY-01, N-01, N-02, N-05, N-08, N-09.

**Identified opportunities**
- **Shell vs WBS.** The reader renders in the full shell. WBS §1.2 planned a shell-less `(reader)` group. At 390 px ≈ 155 px of chrome, and the fixed bottom nav overlays the text. Verified (Code) + Verified (Runtime).
- **Hidden toolbar while scrolling.** N-01: toolbar and progress bar are covered by the header after the first scroll. Inferred (Code), high confidence. Runtime check needed.
- **Position and progress.** No "Ch. 2 / 4", no percent. The bar measures the whole page including comments (F-PROG-01). Verified (Code).
- **End of chapter.** Next is after the whole thread (U-READ-01). There is no end-of-story or caught-up state (N-05). Verified.
- **Comment markers.** Shown after every paragraph even at 0, at 50 % opacity, 14 px icon (N-09, U-CMT-01). Readers cannot hide them, and they break the visual rhythm of the text (`m-reader.png`, `d-reader.png`). Verified.
- **Targets.** 17/21 controls below 44 px at 390 px, 16/16 at ≥ 768 px (metrics). Verified (Runtime).
- **TOC.** No read marks, no "new", does not scroll the current chapter into view (`toc-sheet.tsx:36-60`). For a 300-chapter story the current one may be off-screen. Verified (Code).
- **Restore.** Silent jump to the saved position (N-08). Verified (Code).
- **Header duplication.** Many chapters start with a heading block equal to the chapter title (seen in dev data: "Câu trả lời đầu tiên" twice). Content issue, not a reader bug. Verified (Runtime). Out of scope except as an editor hint (studio agent).

**Proposed experience** (FP-043 + FP-044 + FP-012)
- **Route and layout.** Move the chapter route to `apps/web/src/app/(reader)/story/[id]/[slug]/[chapterSlug]/` with a `ReaderLayout` (no site header, no bottom nav). It keeps the providers, the `AdultContentSync`, the skip link and the toaster. The URL is unchanged (WBS Q2).
- **Reader top bar** (h-12, 44 px targets): ← back to story (story title, truncated) · centre "Ch. 2 / 4" (published position, Q-READ-01) · Display (Aa) · Contents · "⋯" (Report chapter, Share, Sign in with `next` for guests, Home). The 2 px progress bar sits at the very top edge and stays visible even when the bar hides.
- **Auto-hide.** On < lg the bar and a slim **bottom bar** (‹ Prev · "35 %" · Next ›) hide when scrolling down more than 24 px. They reappear on scroll up, on a tap on the text area (not on links or buttons), and always at the end of the chapter. `prefers-reduced-motion`: no slide animation. On ≥ lg the top bar stays visible (no bottom bar); keyboard ← / → for prev/next (FP-012), Esc closes sheets.
- **End-of-chapter panel** directly after "— End of chapter —":
  - (a) "Next: Chapter 3 · Người viết thư · 54 words" as a large primary card, + Vote.
  - (b) Last chapter, story ongoing: "You're caught up · Last updated 2 days ago" + Follow story (guest → login with `next`).
  - (c) Last chapter, story completed: "The end" + Add to list + 3 similar stories (rows).
  - Then Report (in "⋯" only) and the comments section, then the existing prev/next (kept for keyboard and screen-reader users).
- **Paragraph-comment markers.** A new reader preference "Paragraph comments: Show all / Only with comments / Hide" (BRC-READ-01; default per Q-READ-02, proposal "Only with comments"). In "Only with comments", 0-count markers are visually hidden until the paragraph is focused or tapped, and stay in the accessibility tree as buttons. In "Hide", the markers are removed and the chapter-level comments remain. Counts ≥ 1 render as a 44 px-target pill.
- **Settings sheet.** Add the comment-marker preference. Show a live preview line. Sheet `side="bottom"` on < sm for thumb reach. Keep `side="right"` on ≥ sm.
- **TOC sheet.** Header "Contents · 4 chapters". The current chapter is scrolled into view and focused on open. ✓ for read chapters and "New" badges (FP-044). For > 50 chapters a "Go to chapter…" number field.
- **Resume notice.** When the saved position is restored, a toast "Resumed where you left off" with the action "Start from the beginning" (FP-044).
- **Mobile (390):** shell-less, auto-hide bars, text column full width with 16 px gutters. The end panel cards are full width.
- **Tablet (768):** same as mobile, wider margins. The 66ch measure is kept (BR-READ-018).
- **Desktop (1280):** top bar always visible, centred 66ch column, toolbar content aligned to the column (today the toolbar spans `max-w-3xl` while the text is 66ch, `reader-screen.tsx:75,96`). The TOC can be pinned as a left rail on ≥ xl (optional, P3).

**Acceptance criteria**
- SE-READ-01-AC01 [Proposed] — Given any viewport, When a chapter URL opens, Then neither the site header nor the bottom nav is rendered, and the reader top bar shows back-to-story, "Ch. n / N", Display and Contents.
- SE-READ-01-AC02 [Proposed] — Given the reader has scrolled 2,000 px into a chapter, Then the progress bar is visible at the top edge, and Display and Contents can be reached with at most one upward scroll gesture or one tap on the text.
- SE-READ-01-AC03 [Proposed] — Given a 390 px viewport, When the reader scrolls down, Then the top and bottom bars hide within 200 ms (no animation with reduced motion), and When they scroll up or tap the text, Then both bars reappear.
- SE-READ-01-AC04 [Proposed] — Given chapter 2 of 4 is finished, Then a "Next: Chapter 3 · <title>" card appears directly after the end marker, before vote and comments.
- SE-READ-01-AC05 [Proposed] — Given the last published chapter of an ongoing story and a guest, Then the end panel says the reader is caught up, shows the last-update date and a "Follow story" button that leads to `/login?next=<chapter path>`.
- SE-READ-01-AC06 [Proposed] — Given the preference "Only with comments", Then paragraphs with 0 comments show no visible marker, paragraphs with ≥ 1 show a count pill with a ≥ 44 × 44 px target, and keyboard focus on a paragraph's hidden marker makes it visible.
- SE-READ-01-AC07 [Proposed] — Given a 120-chapter story at chapter 87, When Contents opens, Then chapter 87 is in view and focused.
- SE-READ-01-AC08 [Proposed] — Given a member reopens a chapter at a saved 60 % position, Then the page opens at the saved block and a toast offers "Start from the beginning", which scrolls to the top without clearing completion.
- SE-READ-01-AC09 [Proposed] — Given a 390 px viewport, Then every interactive control in the reader bars, end panel and chapter nav has a target ≥ 44 × 44 px (FP-022).
- SE-READ-01-AC10 [Proposed] — Given a mature story not confirmed on this device, Then the reader layout shows only the gate (no title, text or "Ch. n / N"), as today (BR-READ-010, FP-005).

**Impact** — Frontend: new `(reader)` route group + `ReaderLayout`, `reader-screen.tsx`, `reader-blocks.tsx`,
`toc-sheet.tsx`, `reader-settings-sheet.tsx`, `chapter-nav.tsx`, `use-reading-tracker.ts` (notice), progress bar
measure (FP-012) · Backend/API: none for layout. Chapter progress per story for read marks (FP-044) · Database: none
(preference stored in the existing `user_reader_preferences` JSON ≤ 512 bytes, BR-READ-017) · Shared components:
`packages/ui` `ReaderBar` (new, presentation-only), `ReadingProgress` (target element), `Sheet` side by breakpoint ·
Business rules: BR-READ-013 (BRC-READ-01), BR-PROG-002/004 via FP-012, BR-SHELL-001 unaffected (the reader leaves
`(main)`) · Other screens: SCR-HIST-02 preview should reuse `ReaderLayout` (same N-01 bug), SCR-CMT-01 entry points,
SCR-SHELL-01 (no shell on reader routes).

**Related** — FP-043, FP-044, FP-012 (amended), FP-022 (amended), FP-004 (amended), FP-005 (amended), FP-019 (amended),
FP-030, U-READ-01/02/03, U-CMT-01, F-PROG-01, N-01, N-02, N-05, N-08, N-09.

**Priority** — P1: the core screen of the product. A likely defect (N-01) hides its controls and progress while
reading, and the shell contradicts the documented WBS plan. The rest is P2 polish delivered with it.

---

## 4. New feature proposals

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

### FP-044 — Reading continuity: continue rail, read marks, caught-up and end-of-story states

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

### FP-045 — Story card density and responsive list layouts

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

## 5. Amendments to existing FPs

| FP | Add / change | Why |
| --- | --- | --- |
| FP-004 | Add: when the chapter route moves to the `(reader)` group (FP-043), chapter not-found and error pages render inside `ReaderLayout` with "Back to story" (when the story is readable) and "Home". Re-test RT-01 for chapters: the `(main)/loading.tsx` streaming boundary will no longer wrap the reader, which may by itself restore the real 404 status (Inferred: FP-004 names `loading.tsx` streaming as the cause). Add AC: "Given a missing chapter, Then HTTP 404 inside the reader layout." | Keeps FP-004 correct after the route move and may simplify its fix. |
| FP-005 | Add: (a) the new reader layout (FP-043) must keep "gate before any text", including "Ch. n / N" and the chapter title in the bar. (b) FP-040 facts and the new rails (continue, new & rising, trending) obey the 18+ choice and never put facts of mature stories into metadata or OG. (c) Scoped rankings (FP-046) pass `include_mature`. | New surfaces must not reopen the client-only gate gaps (F-MAT-01). |
| FP-011 | Add: continue-rail items, end-of-chapter "Next" cards and following-feed "New: Chapter N" links should be built from chapter ids resolved to the canonical URL (or the `/story/{id}` short form + chapter id route if introduced), so they survive slug renames. | FP-044 and SE-AUTHOR-02 add many deep links into chapters. |
| FP-012 | Add: (a) the next-chapter control after the end marker is a **card** (number, title, words), not just a button, and is part of the FP-043 end panel. (b) Completion measured on the article blocks must work in the new layout where comments follow the end panel. (c) "Ch. n / N" in the reader bar uses the published position (Q-READ-01). (d) The shared `resolveContinueChapter` must also return the caught-up / read-again states of BRC-STORY-01, so the story page, library (SCR-LIB-01) and the Home continue rail agree. | One resolver for every continue surface. FP-043/044 depend on it. |
| FP-017 | Add browsing scope: sub-category chips under an active root category (U-TAX-01), the category name as the h1 of a filtered Home view, an "All categories" sheet on mobile (runtime: chip row is cut at 390 px), and the category badge on the story page as a link. | Browsing value from the approved category tree. Confirmed runtime overflow. |
| FP-019 | Add: the header nav on ≥ md must include Rankings and, for members, Following (currently only Home links, U-HOME-01). Reader routes are outside the shell after FP-043: the reader bar's "⋯" must offer Home and, for guests, "Sign in" with `next` including the chapter path. The mobile search icon opens `/search` with focus (U-SRCH-02). | Navigation changes when the reader leaves the shell. |
| FP-020 | Add: apply `loadMoreError` + retry to the filtered lists (FP-041), scoped rankings (FP-046) and the following "Updates" list. Rails (continue, For-you, trending, new) reserve a skeleton of their final height and render an inline retry on error, without blocking the feed (BR-HOME-012). | New lists inherit the same async pattern. Avoids the For-you layout shift. |
| FP-022 | Add the measured runtime counts as the baseline: controls < 44 px — reader 17/21 (390) and 16/16 (768/1280), story 13/22, search 9/15, ranking 9/16 (metrics.json). Add to scope: StatPill visible labels (story page), TOC items, ChapterNav, paragraph markers, reader bar (FP-043). | Quantified evidence for WBS 8.5 on the reading path. |
| FP-027 | Add: guest device progress feeds the same continuity UI as members (FP-044): Home continue rail, story CTA states, read marks, TOC marks, end panel. On sign-in, merge rather than overwrite: keep the furthest completed chapter per story (align with Q-PROG-01). | Guests get the continuity journey (JRN-RDR-06) without a second UI. |
| FP-029 | Add: "Not interested" on For-you rail items **and** on similar-story rows (story page aside). The reason line moves inside the card (FP-045). Hide For-you while the reader has fewer than N signals, and show "Follow or save stories to get suggestions" (BR-REC-008 says no hint exists). | Placement follows the new card variants. |
| FP-032 | Replace the solution text with a concrete guest landing: compact hero ≤ 120 px at 390 px with a value line + "Create account" + "Start writing"; "Trending this week" rail (`top_stories('week')`, 8); "New & rising" rail (FP-046); "Completed picks" rail (FP-041 `status=completed&sort=reads`, 8); then the browse section. Members: no hero (continue + For-you rails instead, FP-044). Evidence: runtime `m-home.png` (the first story title is at y ≈ 668 px). | Turns FP-032 into a measurable layout with runtime evidence. |

---

## 6. BR change proposals and open questions

### BR change proposals (each requires approval; the BR text is not edited here)

| ID | Rule(s) affected | Current (Verified) | Proposed | Raised by | Question |
| --- | --- | --- | --- | --- | --- |
| BRC-HOME-01 | BR-HOME-002 (order), BR-HOME-009 ("Updated <relative>"), BR-AUTHOR-008 (following order) | Order by `stories.updated_at`, which moves on any story-row update including metadata edits and republished edits (N-03) | "Recently updated" and the card's "Updated" mean **a new chapter was published**: order by `last_chapter_published_at` (FP-040), then `first_published_at`, then id. Metadata edits no longer move a story. | FP-040, FP-041, SE-AUTHOR-02 | Q-HOME-02 |
| BRC-HOME-02 | BR-HOME-009 (card content) | One card layout; cover, title, author, category, status, synopsis excerpt, reads, votes, updated | Card variants `grid` / `row` / `compact` with an optional facts line (chapters, words/reading time) and in-card reason/rank/progress slots | FP-040, FP-045 | — (design approval only) |
| BRC-STORY-01 | BR-STORY-012, BR-PROG-008 | No target after the last chapter is completed → "Start reading" (chapter 1) | Five CTA states: Start reading · Continue · Ch. N · Caught up (ongoing/hiatus, all read; action Follow) · Read again (completed story, all read) · plus "Continue · Ch. N+1" when new chapters appear | FP-044 | Q-STORY-02 |
| BRC-SRCH-01 | BR-SRCH-003 (matching and relevance), BR-SRCH-009 (suggestions) | Stories match by title only (LIKE or trigram) | Weighted match over title, author name, tag names (and synopsis if approved), with `match_field`. Suggestions include top authors and tags. | FP-042 | Q-SRCH-02 |
| BRC-READ-01 | BR-READ-013 (four preferences) | Size, spacing, font, background | Add a fifth closed-list preference `paragraphComments` (`all` / `withComments` / `off`) with a default per Q-READ-02. Same storage, sync and ≤ 512-byte limit (BR-READ-014…017). | FP-043 | Q-READ-02 |
| BRC-RANK-01 | BR-RANK-004 (positions), BR-RANK-006 (URL params) | Positions over all eligible stories; `period` only | Optional `scope` (category slug or `new`). Positions are continuous within the scope. | FP-046 | Q-RANK-02 |

### Open questions (continue the register numbering)

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-HOME-02 | Should "Recently updated" (feed order, card "Updated", following feed) mean "a new chapter was published" instead of "the story row changed"? | Today a typo fix or a republished edit moves a story to the top (N-03). This is a ranking-fairness and trust question. | FP-040 ordering use, FP-041 default sort, BRC-HOME-01 | SE-HOME-01, SE-AUTHOR-02 |
| Q-HOME-03 | Which length buckets and reading speed should be used (e.g. short < 20k words, medium 20–100k, long > 100k; ~200 words/min for Vietnamese)? Per language or global? | Filter semantics and the reading-time label | FP-040 (reading time), FP-041 (length filter) | FP-040 |
| Q-STORY-02 | What should a reader who read every published chapter see: "Caught up · Follow" (ongoing), "Read again" (completed)? Should finished, completed stories leave the library "Reading" tab and the continue rail? | Today they are told to "Start reading" (N-04). This overlaps library behaviour. | FP-044, BRC-STORY-01 | SE-STORY-01 |
| Q-SRCH-02 | Should story search also match author names, tags and the synopsis, and with which relative weights? | Relevance vs noise. The synopsis needs a new index. | FP-042, BRC-SRCH-01 | SE-SRCH-01 |
| Q-READ-02 | In the immersive reader: (a) is the shell-less layout (no site header, no bottom nav) approved as planned in WBS §1.2? (b) auto-hide bars on mobile? (c) default for paragraph-comment markers (`all` / `withComments` / `off`)? | Comment visibility drives comment engagement (WBS Q6 made paragraph comments an M2 feature). Hiding markers by default may reduce it. | FP-043, BRC-READ-01 | SE-READ-01 |
| Q-RANK-02 | Which stories count as "new" for the New & rising scope: first published within 30 days? Only an author's first story? A minimum number of chapters? | Prevents gaming (re-creating stories) and defines exposure fairness | FP-046, BRC-RANK-01 | SE-RANK-01 |

---

## 7. Notes for consolidation

- **Comments agent (SCR-CMT-01):** FP-043 changes only the *entry points* of paragraph comments (marker visibility preference, 44 px pills, the sheet side on phones). Thread content, sign-in return (U-CMT-02) and the reply deep links (U-NOTI-01) stay with that agent. Q-READ-02(c) affects comment engagement: consult them on the default.
- **Library / lists / notifications agent:** FP-044 adds a Home continue rail that must use the same resolver as SCR-LIB-01 "Continue with chapter N" (F-PROG-02, FP-012). Q-STORY-02 asks whether finished stories leave the library "Reading" tab. FP-045 card variants should also be used by SCR-LIB-01 / SCR-LIST-01 rows. Notification links into chapters (FP-011/FP-013) are referenced, not changed.
- **Shell / platform agent (SCR-SHELL-01, FP-019, FP-021, FP-023):** FP-043 removes the shell from reader routes. The header nav (FP-019) and SSR language (FP-021) must account for a second layout. A CSP (FP-023) must still allow the pre-paint reader script. `AdultContentSync` is currently mounted only in `MainShell` (`shell/components/main-shell.tsx:30`) and must also be mounted in `ReaderLayout`.
- **Studio agent:** the chapter preview (SCR-HIST-02) has the same sticky-under-header pattern as N-01 (`history/screens/preview-screen.tsx:48`) and should reuse `ReaderLayout`. FP-040 facts (chapter count, words, last chapter) are also useful on Studio rows and stats. Dev data shows chapters whose first heading block repeats the chapter title: an editor hint might help (not proposed here).
- **Trust & safety agent:** FP-005 amendment (new rails, facts, reader layout). Discovery predicate FP-002 is a prerequisite for FP-041's `browse_stories` RPC. Do the two together so the home feed is fixed once.
- **Overlap with existing quick fixes:** U-TAX-01, U-HOME-03, U-SRCH-02, F-SRCH-01, U-STORY-02, F-STORY-01, F-STORY-02, F-HOME-02 are absorbed by SE-HOME-01 / SE-SRCH-01 / SE-STORY-01 but remain valid as stand-alone quick fixes if the larger proposals are not approved.
- **Verification gaps to close at runtime before implementation:** (1) N-01, the toolbar hidden under the header (scroll a chapter at 390 and 1280 px and screenshot). (2) Any signed-in behaviour (continue CTA, restore, For-you, following feed); none was run (DEC-011). (3) The 404 status of chapters after the route move.
- **Numbering:** all of FP-040…FP-046 are used. New Q-ids continue from the register maxima (Q-HOME-01 → 02/03, Q-STORY-01 → 02, Q-SRCH-01 → 02, Q-READ-01 → 02, Q-RANK-01 → 02). New BR ids proposed (BR-STORY-017, BR-HOME-013/014, BR-SRCH-012, BR-READ-019, BR-PROG-016, BR-RANK-009) need checking against the owners' current maxima when merged.

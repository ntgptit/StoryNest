# Draft engage-library

Agent key `engage-library` · Phase 2 · 2026-11-05 · Scope: reader engagement and library — JRN-RDR-07…11,
capability areas ENG and GROW, screens SCR-CMT-01, SCR-NOTI-01, SCR-LIB-01, SCR-LIST-01 (+ C07, C08, C09).
Reserved FP range: FP-047…FP-052 (all six used).

**Evidence base and limits**

- Code and SQL read at the baseline. File references are relative to the repository root (`packages/features/src` is shortened to `features/`).
- Runtime evidence is **guest only**: `rt2/shots/{m,t,d}-{story,reader,author,list-missing}.png`, `m-reader-paragraph-sheet.png`,
  `rt2/metrics.json`. **No signed-in flow ran in a browser.** Library, notifications, list ownership, posting,
  replying, follow/save and the bell are `Verified (Code)` at best. Nothing below claims a runtime result for them.
- Friction is marked **Confirmed** when code, SQL or a guest screenshot shows it. It is marked **Hypothesised** when it
  is a reasoned user-behaviour claim that no research supports. The repository has no user research, analytics or
  support data, so every GROW statement about retention impact is a hypothesis.
- Benchmarks are named for orientation only (`Inferred`, not verified in this analysis).

---

## 1. Journeys

### JRN-RDR-07 — Following authors or stories

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

### JRN-RDR-08 — Saving and organising content (library, reading lists)

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

### JRN-RDR-09 — Voting and commenting (chapter, paragraph, replies, author interaction)

| Field | Content |
| --- | --- |
| Journey ID | JRN-RDR-09 |
| User goal | "React to what I just read, talk about a moment in it, and hear back from other readers or the author." |
| Current workflow | At the end of the chapter: vote → report → comments (newest first, 20 per page) → prev/next (`features/reader/screens/reader-screen.tsx:106-125`). Paragraph button → bottom sheet with that paragraph's thread, oldest first (`features/reader/components/reader-blocks.tsx:47-76`). Replies are one level deep. "Reply" appears only on top-level comments (`features/comments/components/comment-item.tsx:170`, SCR-CMT-01-AC10). A reply notifies **only the parent comment's author** (`supabase/migrations/20261104001100_comment_reply_notifications.sql:9-15`, `:45-66`). Story owner and co-authors can hide comments. Readers are never told about a hide (F-NOTI-04). |
| Friction points | (1) **Confirmed:** conversations break after one turn. If A comments, B replies and A answers B, then B is **not** notified (A is the parent author, and B is not a recipient). (2) **Confirmed:** B cannot answer B's own repliers in place, because a reply has no "Reply" button. (3) **Confirmed:** the author's replies look like anyone's: plain name, no badge or avatar (U-CMT-04 → FP-025), and the notification reads "<name> replied to your comment" even when the author replied. (4) **Confirmed (Runtime):** the paragraph button is a 14 px icon at 50 % opacity (`m-reader.png`). On the guest reader, 17 of 21 controls are under 44 px (`metrics.json` m/reader) (U-CMT-01 → FP-022). (5) **Confirmed:** guest sign-in from the thread drops the anchor and the open sheet (U-CMT-02). (6) **Confirmed:** the "Comments" heading shows no count (`reader-screen.tsx:122`), and there is no sort toggle (Q-CMT-02). (7) **Hypothesised:** on desktop, the bottom sheet covers the paragraph being discussed. A side panel keeps it visible (`reader-blocks.tsx:65` `side="bottom"` at every width). (8) **Confirmed:** a reply gives no success toast (U-CMT-03). |
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

### JRN-RDR-10 — Receiving updates (notifications, bell, preferences)

| Field | Content |
| --- | --- |
| Journey ID | JRN-RDR-10 |
| User goal | "Tell me, without nagging, when something I care about happens, and take me straight there." |
| Current workflow | Server-made notifications for five types (BR-NOTI-002). A live bell with an unread badge appears in the header only when signed in (`features/notifications/components/notification-bell.tsx:10-38`). `/notifications` shows a text-only list, 20 per page, with "Mark all as read". Opening an item marks it read and follows a frozen link. Three on/off switches live only on `/settings` (BR-NOTI-007, WF-SET-02). **In-app only** (BR-NOTI-017). |
| Friction points | (1) **Confirmed:** no channel outside the app (no email, no push). A reader who does not open the app never learns about a new chapter. (2) **Confirmed:** one notification per chapter and no grouping. A scheduled or batch publish of N chapters produces N lines (`chapter_published:<chapter>` dedupe, BR-NOTI-003). (3) **Confirmed:** items show text only: no story cover, actor avatar or type icon (`features/notifications/screens/notifications-screen.tsx:91-122`). (4) **Confirmed:** the inbox has no route to the preference switches, and the settings sections have no anchors (`features/settings/screens/settings-screen.tsx:31`). (5) **Confirmed:** there is no per-item delete (F-NOTI-03) and no per-story mute. To stop a noisy story, the reader must find the story and unfollow it. (6) **Confirmed:** links break after a chapter slug rename (F-NOTI-01), the excerpt survives moderation (F-NOTI-02), and a reply notification doesn't open the reply (U-NOTI-01). (7) **Confirmed:** the bell is 36 px (`notification-bell.tsx:25` `size-9`) and the inbox is reachable only through it (screen-inventory §4). (8) **Hypothesised:** bursts of `chapter_published` from binge publishers will lead readers to switch "New chapters" off globally, which kills the main return loop. |
| Missing capabilities | Out-of-app digest (FP-026). Grouped and scannable inbox, per-story mute, settings link (→ FP-050). Safe deep links (FP-011, FP-013). |
| Proposed improvement | FP-050: grouped items ("3 new chapters of <story>"), cover or avatar plus a type icon, an "All / Unread" filter, a per-item ⋯ menu (Mark unread, Delete [FP-013], "Stop notifications for this story" = unfollow, with undo), a "Notification settings" link to `/settings#notifications`, a 44 px bell, and a "Notifications" entry in the user menu. FP-026 amendment: an email **digest** of new chapters as the first out-of-app channel, opt-in, daily or weekly (Q-NOTI-05). |
| Expected value | The inbox stays useful as follows grow. Readers can tune notifications instead of switching them off. Hypothesis: a digest is the cheapest way back for lapsed readers. |
| Affected screens | SCR-NOTI-01, SCR-SHELL-01, SCR-SET-01 |
| Dependencies | FP-011, FP-013, FP-026, WP 6.7 (push), SMTP provider (email) |
| Evidence | BR-NOTI-002/003/007/017, F-NOTI-01…04, U-NOTI-01/02; code refs above |

### JRN-RDR-11 — Returning to the application (re-engagement loops)

| Field | Content |
| --- | --- |
| Journey ID | JRN-RDR-11 |
| User goal | "When I come back, show me right away where I was and what's new for me." |
| Current workflow | A member opening `/` sees the hero, then "Recommended for you", then the latest feed (`apps/web/src/app/(main)/discover-home.tsx:9-13`). There is **no continue-reading or updates row**. Continuing means opening Library (bottom nav on mobile, user menu on desktop), where "Đang đọc" lists stories by `last_read_at` with "Continue with chapter N". Library entries carry no "new chapter" signal (`features/library/model/library.ts:49-58`). Out-of-app triggers: none (BR-NOTI-017). In-app trigger: the bell badge, which counts only notifications. At the end of the latest published chapter, "Chương sau" is a disabled placeholder with no explanation and no prompt to follow (`features/reader/components/chapter-nav.tsx`; Runtime `m-reader.png`, `d-reader.png`). |
| Friction points | (1) **Confirmed:** Home doesn't help a returning reader resume. (2) **Confirmed:** Library cannot answer "which of my stories have new chapters?" The data exists: `chapters.first_published_at` (`supabase/migrations/20261103000200_publish_chapter_rpc.sql:188`) and `user_story_progress.last_read_at` / `user_chapter_progress.completed_at` (`supabase/migrations/20261103000000_init_schema.sql:258-281`). (3) **Confirmed:** "Continue" targets disagree between the story page and the library (F-PROG-02 → FP-012). (4) **Confirmed:** the moment of highest intent (finishing the newest chapter) offers no follow and no explanation that more is coming. (5) **Confirmed:** on desktop the Library has no primary navigation entry (U-SHELL-01 → FP-019). (6) **Confirmed:** a guest who presses Follow, Save or Vote is sent to sign in, but the action is not completed on return (`story-actions.tsx:21-22`). The intent is lost at the point of conversion. (7) **Hypothesised:** without an out-of-app channel, the return rate depends entirely on habit. |
| Missing capabilities | Updates state in the Library and on Home (→ FP-047). A caught-up prompt (→ FP-052). Intent replay after sign-in (→ FP-048). Out-of-app digest (FP-026). Share-driven acquisition (→ FP-051). Reading streaks and goals: **not recommended now** (see CAP-ENG-16). |
| Proposed improvement | FP-047: one `list_library` RPC that adds "N new chapters / N left / Caught up / Finished" to every entry. A members-only "Continue reading" row at the top of Home. A dot on the Library nav item when kept stories have unread new chapters. FP-052: a "You're caught up" card that offers the bell, plus a "Finished" card with recommendations. FP-048: replay the pending action after sign-in. |
| Expected value | Return visits land on an obvious next action. Hypothesis to measure: share of member sessions that open a chapter within 1 click of landing; 7-day and 28-day return of followers after a new chapter (computable from `chapter_reads`, `user_story_progress`, `notifications.read_at`; no new tracking needed). |
| Affected screens | SCR-HOME-01, SCR-LIB-01, SCR-READ-01, SCR-SHELL-01, SCR-NOTI-01 |
| Dependencies | FP-012 (single continue rule), FP-015 (paging), FP-019 (desktop nav), FP-026 (digest) |
| Evidence | Code refs above; Runtime `m-reader.png`, `d-reader.png` (disabled "Chương sau" on the last chapter for guests) |

### 1.6 Saved vs Following vs Reading lists — concept model analysis (input to FP-048)

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

## 2. Capability rows

| Capability ID | Capability | Current StoryNest | Evidence | User value | Recommendation |
| --- | --- | --- | --- | --- | --- |
| CAP-ENG-01 | Follow a story to be told about new chapters | Implemented | BR-LIB-002, BR-NOTI-003 (Verified SQL test) | Core update loop | FP-048 (clearer model), FP-047 |
| CAP-ENG-02 | Follow an author | Partial — feed page only, no notification, no list of followed authors, same label as story follow | BR-AUTHOR-005…010, F-AUTHOR-01, `features/author/strings.ts:10-12` | Keeps readers with an author across stories | FP-019 (list), FP-026 (amend: new-story type), FP-048 (wording) |
| CAP-ENG-03 | Save a story to a private shelf | Implemented — independent of follow | BR-LIB-003, BR-LIB-001 | Read later | FP-048 |
| CAP-ENG-04 | Reading lists: curate, order, share | Partial — CRUD and ordering done; no share action, no add-from-list-page, silent unavailable items, generic share title | BR-LIST-001…014, U-LIST-01, F-LIST-02 | Curation and identity | FP-014, FP-051, SE-LIST-01; discovery FP-028 |
| CAP-ENG-05 | Continue reading in one tap | Partial — Library and story page only, targets disagree, absent from Home | BR-LIB-007, F-PROG-02, `discover-home.tsx:9-13` | Fast resume | FP-012, FP-047 |
| CAP-ENG-06 | In-app "what's new" awareness (new chapters per kept story, caught-up state, nav badge) | Missing | `library/model/library.ts:49-58`, `ui/src/widgets/bottom-nav.tsx:14-20` (no badge prop) | Main reason to come back | **FP-047** |
| CAP-ENG-07 | Vote on a chapter | Implemented | BR-VOTE-001…012 | Lightweight appreciation; feeds rankings | none |
| CAP-ENG-08 | Chapter and paragraph comments, likes, edit/delete, author hide | Implemented (paragraph target too small: U-CMT-01) | BR-CMT-001…021 | Discussion | SE-CMT-01; FP-022 |
| CAP-ENG-09 | Two-way conversations (answer a reply, all participants told) | Partial — one turn only | `…001100_comment_reply_notifications.sql:45-66`, `comment-item.tsx:170` | Discussions continue | **FP-049** |
| CAP-ENG-10 | Author presence in discussion (badge, "author replied") | Missing | U-CMT-04, BR-NOTI-015 text | Readers feel heard | FP-025 (amend), FP-049 |
| CAP-ENG-11 | Notification inbox with live bell | Implemented | BR-NOTI-010…014 | Awareness while in app | FP-050, FP-013, FP-011 |
| CAP-ENG-12 | Notification preferences (global, per story) | Partial — 3 global switches on `/settings` only; no per-story mute; not linked from the inbox | BR-NOTI-007, `settings-screen.tsx:31` | Control instead of opt-out | **FP-050** |
| CAP-ENG-13 | Out-of-app channels (email digest, push) | Missing | BR-NOTI-017, WBS 6.7 ⬜ | Reaches readers not in the app | FP-026 (amend: digest first) |
| CAP-ENG-14 | More reader notification types (followed author's new story, my comment hidden) | Missing | Q-NOTI-03, F-NOTI-04 | Fewer silent outcomes | FP-026; FP-006 |
| CAP-ENG-15 | End-of-chapter next step (caught-up follow prompt, finished-story path) | Missing | `reader-screen.tsx:106-125`, `chapter-nav.tsx`; Runtime `m-reader.png` | Converts peak intent into a follow | **FP-052** |
| CAP-ENG-16 | Reading streaks / goals | Missing | — | Unproven for serial fiction. Risk of gamification noise and pressure | none — not recommended until FP-047 return metrics exist |
| CAP-ENG-17 | Community spaces beyond chapters (forums, DMs, clubs) | Not Applicable (current scope) | WBS has no WP | High moderation cost | none |
| CAP-ENG-18 | @mentions | Missing | — | Address a person in a thread | Only the reply-to-reply prefill in FP-049; no general mentions (spam surface, FP-007) |
| CAP-GROW-01 | Guest → member at intent points, with the action completed after sign-in | Partial — `next` path kept, hash and action lost | `story-actions.tsx:21-22`, `comment-thread.tsx:38`, U-CMT-02, U-SHELL-04 | Conversion without repeating clicks | FP-048 (intent replay), FP-019 |
| CAP-GROW-02 | First-session activation of a new member (empty library guidance) | Partial — empty states with no action | `library-screen.tsx:100-101` (EmptyState `action` unused) | New members find a first story to keep | SE-LIB-01 |
| CAP-GROW-03 | Repeat-usage loop (chapter → notify → read → comment → reply → return) | Partial — in-app only, conversation breaks after one turn | JRN-RDR-09/10/11 | Habit | FP-047, FP-049, FP-026 |
| CAP-GROW-04 | Sharing (story, chapter, list) | Partial — OG images and canonical URLs exist (WBS 6.6), **no share or copy action anywhere** (no `navigator.share`/clipboard use in `features/`) | WBS 6.6, U-LIST-01 | Word-of-mouth acquisition | **FP-051** |
| CAP-GROW-05 | Retention measurement (return cohorts, notification → read conversion) | Missing (Unverified whether any external analytics is planned) | No tracking code found; data exists in `chapter_reads`, `user_story_progress`, `notifications.read_at` | Validate every GROW hypothesis here | none — see §7 note (SQL view, no new service) |
| CAP-GROW-06 | Win-back of lapsed readers | Missing | BR-NOTI-017 | Re-activation | FP-026 (amend: digest) |
| CAP-GROW-07 | Referral / invite friends | Missing | — | Unclear without sharing data | none — revisit after FP-051 |

---

## 3. Screen enhancements

### SE-CMT-01 — Comment thread (SCR-CMT-01)

**Current experience** — Embedded panel in the chapter reader. Section `#comments` after vote and report, newest
first, 20 per page. Paragraph bottom sheet (max 85vh), oldest first. Composer with an 8,000-character counter.
One reply level. Likes. ⋯ menu for own edit/delete and manager hide/unhide. Report per item. Guests see "Đăng nhập để
bình luận". Known limitations: F-CMT-01 ("edited" after hide), F-CMT-03 (no live updates), U-CMT-01 (tiny
paragraph button), U-CMT-02 (sign-in loses place), U-CMT-03 (no reply toast, no retry on replies), U-CMT-04 (plain
names), U-NOTI-01 (reply deep link stops at the paragraph).

**Identified opportunities**
- Missing functionality: answering a reply and notifying participants — Verified (Code) `comment-item.tsx:170`, reply SQL `:45-66` → FP-049. Author badge — Verified (Code) `comment-item.tsx:106` → FP-025.
- UX/UI: the heading has no count — Verified (Code) `reader-screen.tsx:122`. The paragraph trigger is 14 px at 50 % opacity — Verified (Runtime) `m-reader.png`, `metrics.json` (17 of 21 controls < 44 px). Item actions are `h-7` (28 px) — Verified (Code) `comment-item.tsx:174-176`. The sheet loads as two tall blank skeleton blocks — Verified (Runtime) `m-reader-paragraph-sheet.png`.
- Workflow: guest sign-in returns to the top of the chapter — Verified (Code) `comment-thread.tsx:38`. Unsent text is discarded when the sheet closes — Verified (Code) (UI states table, "Unsaved changes: Missing").
- IA: on desktop the paragraph sheet is a bottom sheet covering the text — Inferred (`reader-blocks.tsx:65`; no desktop sheet screenshot). The paragraph under discussion is not highlighted in the text — Inferred.

**Proposed experience**
- Heading "Bình luận (N)" from `chapter_stats.comments` (already on the story page). An optional sort control "Mới nhất / Cũ nhất" (the unused `newestFirst` prop, `comment-thread.tsx:21-25`), subject to Q-CMT-02. "Hay nhất" (most liked) is out of scope until Q-CMT-02 is answered.
- Paragraph trigger: always visible at 70 % opacity and 100 % when count > 0, with a ≥ 24×24 px hit area (≥ 44 px on coarse pointers via padding, no layout shift), per FP-022.
- Paragraph thread: `Sheet side="bottom"` below `md`. **`side="right"`, width 420 px, from `md` up**, so the paragraph stays visible. While the sheet is open, the paragraph gets a subtle `bg-accent` highlight. The sheet title keeps the excerpt.
- Skeleton: three 56 px rows instead of two large blocks (FP-020 pattern).
- Composer: when closing a sheet or cancelling a reply with > 0 characters, ask "Bỏ bình luận đang viết?" (FP-003 pattern). The draft is kept in memory per thread while the chapter is open.
- Reply on replies and participant notification: FP-049. Author badge and avatar: FP-025. Deep-link highlight: FP-013.
- Guest: "Đăng nhập để bình luận" carries `next=<path>#comments` or `#b-<id>&sheet=1` (FP-019), and the sheet re-opens on return.
- Reply success: toast "Đã gửi trả lời." and the new reply scrolls into view (quick fix U-CMT-03).
- Density: 390 → full-width items with 12 px gaps; 768 → same; 1280 → thread column = reader measure (`--reader-measure`), side panel for paragraphs.

**Acceptance criteria**
- SE-CMT-01-AC01 [Proposed] Given a chapter with 12 visible comments, When the reader reaches the comments section, Then the heading reads "Bình luận (12)".
- SE-CMT-01-AC02 [Proposed] Given a touch device, When paragraph triggers render, Then each has a hit area of at least 24×24 CSS px and is visible without hover.
- SE-CMT-01-AC03 [Proposed] Given a viewport ≥ 768 px, When a paragraph trigger is pressed, Then the thread opens in a right-side panel and the paragraph stays visible and highlighted.
- SE-CMT-01-AC04 [Proposed] Given a viewport < 768 px, When a paragraph trigger is pressed, Then the thread opens as a bottom sheet (unchanged).
- SE-CMT-01-AC05 [Proposed] Given I typed text in a paragraph composer, When I close the sheet, Then I am asked to confirm discarding it; on "Keep writing" the sheet stays open with the text.
- SE-CMT-01-AC06 [Proposed] Given a guest presses "Đăng nhập để bình luận" in a paragraph sheet, When they sign in, Then the chapter opens with that paragraph's sheet open.
- SE-CMT-01-AC07 [Proposed] Given I post a reply, When it succeeds, Then the toast "Đã gửi trả lời." shows and my reply is visible in the expanded replies.
- SE-CMT-01-AC08 [Proposed] Given a sort control (if approved under Q-CMT-02), When I choose "Cũ nhất", Then the chapter thread lists oldest first and the choice persists for the session.

**Impact** — Frontend: `reader-blocks.tsx`, `comment-thread.tsx`, `comment-item.tsx`, `comment-composer.tsx`. Backend/API: none (count already in `chapter_stats`; reuse the chapter query). Database: none. Shared components: `Sheet` side by breakpoint (existing prop). Business rules: none (sorting needs Q-CMT-02). Other screens: SCR-READ-01 (paragraph highlight), SCR-AUTH-01 (`next` with hash, FP-019).

**Related** — FP-049 (new), FP-025, FP-013, FP-019, FP-022, FP-003, FP-020; F-CMT-01, F-CMT-03, U-CMT-01…04, U-NOTI-01.

**Priority** — **P2**. The paragraph target and sign-in return block the core interaction on phones (Confirmed). The side panel and sort are P3 polish.

### SE-NOTI-01 — Notifications + header bell (SCR-NOTI-01)

**Current experience** — `/notifications` (members): a page header with "Mark all as read", a text-only card list
(unread dot and bold), 20 per page with "Load more", empty and error states. The header bell (36 px) with a "9+"
badge owns the Realtime subscription. Opening an item marks it read and follows a frozen link. Known limitations:
F-NOTI-01 (stale chapter slug → 404), F-NOTI-02 (excerpt survives moderation), F-NOTI-03 (no delete or retention),
U-NOTI-01 (reply not opened), U-NOTI-02 (invite copy, empty copy omits replies).

**Identified opportunities**
- Missing functionality: per-story mute, delete, settings link — Verified (Code) (no `/settings` link in `notifications-screen.tsx`; no item menu). Out-of-app digest — Verified (Code) BR-NOTI-017.
- UX/UI: items are undifferentiated text (no cover, avatar or type icon) — Verified (Code) `notifications-screen.tsx:97-111`. Bell target is 36 px — Verified (Code) `notification-bell.tsx:25`. Hypothesised: the list gets hard to scan once a reader follows many stories.
- Workflow: N chapters published together produce N items — Verified (Code) dedupe `chapter_published:<chapter>` (BR-NOTI-003). Opening the first one doesn't clear the siblings — Verified (Code) `use-notifications.ts:90-137` (one id).
- IA: the inbox is reachable only through the bell, not the user menu or `/me` — Verified (Code) screen-inventory §4. On desktop the page uses the 1024 px column for one-line items — Inferred (main width from `metrics.json`; page not captured).

**Proposed experience**
- **Item anatomy** (new `NotificationRow` in `features/notifications/components`): leading 40 px visual (story cover thumb for `chapter_published`; actor `Avatar` for replies and collaboration), a small type icon overlay (BookOpen / MessageCircle / Users), the text (2 lines, clamp), relative time, an unread dot. Minimum row height 56 px.
- **Grouping (client-side, presentation only):** consecutive unread `chapter_published` items for the same story within one loaded page collapse into "<story>: 3 chương mới (12–14)". The link goes to the **first unread** chapter, and opening the group marks every id in it read (the mark-read update already takes an id array, `features/notifications/api/notifications.api.ts:59`). No storage change, so no BR change.
- **Filter:** segmented "Tất cả / Chưa đọc" (client filter on `read_at`; the paging query adds `.is('read_at', null)` when Unread is active).
- **Per-item ⋯ menu** (`DropdownMenu`, 44 px trigger): "Đánh dấu chưa đọc" (an UPDATE of `read_at = null` is allowed by the column grant `UPDATE (read_at)`, BR-NOTI-001), "Xóa" (FP-013), and for `chapter_published` "Tắt thông báo truyện này" (= `set_story_follow(false)`, toast with "Hoàn tác").
- **Header actions:** "Mark all as read" (unchanged) plus a "Cài đặt thông báo" icon link to `/settings#notifications` (adds `id="notifications"` to that settings section).
- **Bell:** 44×44 px hit area (icon unchanged). The user menu gains "Thông báo (N)". Desktop (≥ md) optionally opens a popover preview of the 5 latest with "Xem tất cả". This is P3 and needs the FP-019 header layout.
- **Empty state:** "Chưa có thông báo" + "Theo dõi truyện để nhận chương mới; trả lời và lời mời cũng hiện ở đây." + action "Khám phá truyện" → `/` (fixes U-NOTI-02).
- **Width:** content column `max-w-2xl` on ≥ md. 390 px: full width, 12 px gutter between rows.

**Acceptance criteria**
- SE-NOTI-01-AC01 [Proposed] Given three unread `chapter_published` items for story S (chapters 12–14) on the loaded page, When the list renders, Then one row "S: 3 new chapters (12–14)" is shown, and opening it opens chapter 12 and marks all three read (badge −3).
- SE-NOTI-01-AC02 [Proposed] Given a `chapter_published` item, When I choose "Stop notifications for this story" and confirm, Then my follow of S is removed, a toast offers "Undo", and Undo restores the follow.
- SE-NOTI-01-AC03 [Proposed] Given the notifications page, When I press "Notification settings", Then `/settings` opens scrolled to the notifications section.
- SE-NOTI-01-AC04 [Proposed] Given the "Unread" filter, When it is active, Then only unread items are listed, and "Load more" pages through unread items only.
- SE-NOTI-01-AC05 [Proposed] Given a read item, When I choose "Mark as unread", Then it shows as unread and the badge increases by one.
- SE-NOTI-01-AC06 [Proposed] Given a touch device, When the header renders, Then the bell's hit area is at least 44×44 CSS px.
- SE-NOTI-01-AC07 [Proposed] Given no notifications, When the page loads, Then the empty state mentions new chapters, replies and invites and offers "Explore stories".
- SE-NOTI-01-AC08 [Proposed] Given a reply notification, When rendered, Then the actor's avatar (or initial) and a comment icon are shown.

**Impact** — Frontend: `notifications-screen.tsx`, new `NotificationRow`, `notification-bell.tsx`, `user-menu.tsx`, settings section id. Backend/API: the list query also selects the actor avatar and story cover (join `app_users`, `stories`), plus the unread filter. Database: none (grants already allow `read_at` updates and delete). Shared components: `Avatar`, `StoryCover` small size, `DropdownMenu`. Business rules: none (grouping is presentation). Other screens: SCR-SET-01 (anchor), SCR-SHELL-01 (bell, menu).

**Related** — FP-050 (new), FP-013, FP-011, FP-026, FP-019, FP-022; F-NOTI-01…04, U-NOTI-01/02.

**Priority** — **P2** for the settings link, per-story mute, 44 px bell and empty copy (small, Confirmed gaps). **P3** for grouping, filter, avatars and the desktop popover.

### SE-LIB-01 — Library (SCR-LIB-01)

**Current experience** — `/library` (members): header, tabs Đang đọc / Đã lưu / Đang theo dõi / Danh sách (component
state, default Reading). Each tab is a grid of full `StoryCard`s (2/3/4 columns) with "Continue with chapter N" or
"Open story", a remove button and a time line. Placeholders for unavailable stories. Max 50 per tab, no paging. Lists
tab = C08. Known limitations: F-LIB-01 (50 cap), U-LIB-01 (tab not in URL), U-LIB-02 (no undo, wording),
U-LIB-03 (aria label), F-PROG-02 (continue target).

**Identified opportunities**
- Missing functionality: no new-chapter or caught-up state per entry — Verified (Code) `library/model/library.ts:49-58`. No followed-authors tab — Verified (Code) F-AUTHOR-01. No progress ("chapter 3 of 12") — Verified (Code) (only `number`).
- UX/UI: full discovery cards (synopsis, counters, tags) are used for a shelf the reader already knows — Verified (Code) `library-screen.tsx:103-111`. The same `StoryCard` measures ~451 px tall at 390 px on Home (Verified (Runtime) `metrics.json` m/home); with entry actions, Inferred ~520 px per row of 2, so 50 entries ≈ 13,000 px. Empty states have no action although `EmptyState` supports one — Verified (Code) `library-screen.tsx:100-101`, `ui/src/widgets/empty-state.tsx:10-29`.
- Workflow: Following is ordered by follow time, not by update — Verified (Code) `library.api.ts:55-58`. Removal is immediate without undo — Verified (Code) BR-LIB-011.
- IA: Saved vs Following split (§1.6). The "Đang theo dõi" tab name collides with author following — Verified (Code).

**Proposed experience**
- **Tabs (stage A of FP-048):** Đang đọc · Đã lưu · Thông báo (renamed Following, bell icon) · Danh sách · Tác giả (new, FP-019 `list_followed_authors`). Selected tab in `?tab=` (FP-015). **Stage B:** Đang đọc · Đã lưu (union, with a "Đang nhận thông báo" filter chip) · Danh sách · Tác giả.
- **Entry layout:** new `LibraryRow` (in `packages/ui/src/widgets`, built from `StoryCover`). Cover 56×84, then title (2 lines), author, and a status line chosen by priority: "**3 chương mới**" (primary badge), "Còn 5 chương", "Đã đọc hết · Đang ra", or "Hoàn thành ✓". It shows a progress meter (chapters completed / published) and, at the end, the primary action "Đọc tiếp ch. N" (Reading) or "Đọc chương mới" (when new > 0), with a ⋯ menu: Notify on/off (bell), Add to list…, Remove (with undo). 390 px: a single-column list, 96 px rows. 768 px: two columns. 1280 px: two columns in `max-w-5xl` (no 4-column grid for rows).
- **Sorting:** Reading = `last_read_at` desc, but stories with new chapters are pinned to the top under the label "Có chương mới". Saved/Notify = latest chapter publish desc (fall back to saved/followed time).
- **Empty states with actions:** Reading → "Khám phá truyện" (`/`). Saved → "Xem bảng xếp hạng" (`/ranking`). Notify → "Bật chuông ở trang truyện để nhận chương mới". Authors → "Tìm tác giả" (`/search?tab=authors`).
- **Placeholders:** keep, add the title snapshot (FP-015).
- **Paging:** `InfiniteList` with keyset over the new `list_library` RPC (FP-047, FP-015).

**Acceptance criteria**
- SE-LIB-01-AC01 [Proposed] Given I last read story S on day D and two chapters of S were first published after D, When I open Reading, Then S is listed under "Has new chapters" with "2 new chapters" and the primary action opens the first of them (subject to Q-LIB-04 and FP-012).
- SE-LIB-01-AC02 [Proposed] Given I completed the last published chapter of an ongoing story, When the row renders, Then it reads "Caught up · Ongoing" and has no "Continue" action.
- SE-LIB-01-AC03 [Proposed] Given a 390 px viewport and 10 Reading entries, When the tab renders, Then entries are single-column rows of ≤ 104 px each, and every action has a ≥ 44 px target.
- SE-LIB-01-AC04 [Proposed] Given `/library?tab=authors`, When it opens, Then the authors I follow are listed with "Unfollow" each (FP-019).
- SE-LIB-01-AC05 [Proposed] Given an empty Saved tab, When it renders, Then it shows an action that opens Rankings.
- SE-LIB-01-AC06 [Proposed] Given the Following tab ("Notifying me"), When it loads, Then stories are ordered by their latest chapter publish time, newest first.
- SE-LIB-01-AC07 [Proposed] Given a row's ⋯ menu, When I switch "Notify me" off, Then my follow is removed, the row stays in Saved (stage B), and the bell icon shows off.
- SE-LIB-01-AC08 [Proposed] Given the old URL `/library?tab=following` after stage B, When opened, Then Saved opens with the "Notifying me" filter active.

**Impact** — Frontend: `library-screen.tsx` (rows, tabs, sorting), new `LibraryRow` widget, empty actions. Backend/API: `list_library(tab, cursor)` RPC (SECURITY INVOKER) returning entry + counts (FP-047). Database: possibly an index on `chapters(story_id, first_published_at)` where `status='published'` (Inferred; check the plan). Shared components: `LibraryRow` (new, `packages/ui/src/widgets`), `InfiniteList`. Business rules: BR-LIB-007/008 extended (BRC-LIB-01 for stage B); BR-LIB-009 replaced by paging (FP-015). Other screens: SCR-HOME-01 (Continue row reuses `LibraryRow`), SCR-SHELL-01 (nav dot).

**Related** — FP-047, FP-048 (new), FP-015, FP-012, FP-019, FP-022; F-LIB-01, U-LIB-01…03, F-AUTHOR-01, F-PROG-02.

**Priority** — **P2**. The Library is the main return surface. The URL tab, paging and undo are already P2 in FP-015. New-chapter state is the highest-value addition.

### SE-LIST-01 — Reading list (SCR-LIST-01, incl. C07 list form dialog, C08 My lists, C09 add-to-list sheet)

**Current experience** — `/lists/[id]` (open to guests per visibility): header (title, description, owner
Edit/Delete), meta line (owner: visibility badge + "Back to library"; visitor: "<name>'s list" as plain text), a
`StoryCard` grid with owner ↑/↓/Remove. C07: dialog (name ≤ 120, description ≤ 1,000, visibility select with hint).
C08: rows in the Library Lists tab (title, count, updated, badge). C09: a story-page sheet of toggles plus
quick-create (private). Known limitations: F-LIST-01 (reorder blocked), F-LIST-02 (silent unavailable items), F-LIST-03
(unlisted enumerable), U-LIST-01 (no copy link), U-LIST-02/03, F-MAT-02 (18+ in others' lists), U-LIB-01. The
not-found state is a dead end with no action — Verified (Runtime) `m-list-missing.png`.

**Identified opportunities**
- Missing functionality: share or copy link — Verified (Code) (`list-screen.tsx:87-124`; no share code in `features/`). Add stories from the list page — Verified (Code) `lists/strings.en.ts` `page.emptyOwner` sends the owner to each story. Visitor cannot reach the owner — Verified (Code) `list-screen.tsx:115-116` (plain `span`).
- UX/UI: a list of ≤ 500 items in a full-card grid with one-step ↑/↓ — Verified (Code) `list-screen.tsx:142-163`. Hypothesised: reordering long lists is tedious (same pattern as U-CHM-03). C08 rows are text-only with no visual cue of content — Verified (Code) `my-lists.tsx:29-102`. C09 quick-create silently ignores > 120 characters (U-LIST-02).
- Workflow: shared links preview as the generic "Danh sách đọc" title — Verified (Code) BR-LIST-014 (`apps/web/src/app/(main)/lists/[id]/page.tsx:7-14`). The not-found state has no way forward — Verified (Runtime).
- IA: C09 is a third keep-action next to Follow and Save (§1.6) → it moves into the unified Save sheet (FP-048).

**Proposed experience**
- **Header actions:** owner sees "Chia sẻ" (FP-051; shown only for unlisted/public; for a private list it opens "Change visibility to share?"), "Thêm truyện", Edit, ⋯ (Delete). Visitor sees "Chia sẻ". The owner name becomes a link to `/author/<username>` when the owner has an author page (BR-AUTHOR-001), else plain text.
- **"Thêm truyện" picker** (owner): a sheet with tabs "Đang đọc / Đã lưu" (reuses `list_library` from FP-047, compact rows with a checkbox), multi-select, "Thêm N truyện" → sequential `add_story_to_list` calls with progress. Stories already in the list are shown checked and disabled.
- **Items:** compact `LibraryRow` variant (cover, title, author, status) instead of the full card, so more stories fit per screen. Owner controls in a row ⋯ menu: Move to top, Move up, Move down, Move to bottom, Remove. The order is still saved through `reorder_list_items` (whole-array RPC, so any move is one request). Optional drag handle ≥ md (P3, keyboard alternative required, FP-022).
- **Unavailable items (owner):** placeholder row with Remove (FP-014 / Q-LIST-01).
- **Not found:** add the action "Về trang chủ", and for a signed-in user "Danh sách của tôi" → `/library?tab=lists`.
- **C07 dialog:** a live counter on name (120) and description (1,000). Unsaved-changes confirm on close (FP-003 pattern). The visibility select shows the hint under the field (already) plus, for Public, "Có thể xuất hiện trên trang tác giả của bạn" only once FP-028 ships.
- **C08 My lists:** each row shows a 3-cover mosaic (first three readable items) at 48 px height. The "New list" button stays primary. Rows are ≥ 56 px.
- **C09 sheet:** becomes the lower half of the FP-048 Save sheet ("Lưu vào danh sách"). Quick-create gets `maxLength=120` and an inline error (FP-014).
- **Metadata (FP-051):** for unlisted/public lists, `<title>` and OG title = list title + "· StoryNest", OG image = first cover. Keep `noindex` until Q-SEO-02.
- Breakpoints: 390 → single-column rows. 768 → 2 columns. 1280 → 2 columns `max-w-5xl`. The header actions wrap under the title at 390.

**Acceptance criteria**
- SE-LIST-01-AC01 [Proposed] Given I own a public list, When I press "Share", Then the native share sheet opens with the list URL and title, or, without Web Share, the URL is copied and the toast "Đã sao chép liên kết." shows.
- SE-LIST-01-AC02 [Proposed] Given I own a private list, When I press "Share", Then I am asked to change the visibility to "Anyone with the link" first, and nothing is copied until I confirm.
- SE-LIST-01-AC03 [Proposed] Given I own a list, When I open "Add stories" and select 3 stories from Saved, Then all 3 are appended in the selected order and the toast "Đã thêm 3 truyện." shows.
- SE-LIST-01-AC04 [Proposed] Given a list of 40 stories, When I choose "Move to top" on the 40th, Then it becomes first after one request and the order persists after reload.
- SE-LIST-01-AC05 [Proposed] Given a visitor on someone's public list whose owner has an author page, When the meta line renders, Then the owner name links to `/author/<username>`.
- SE-LIST-01-AC06 [Proposed] Given a missing or private list, When the not-found state shows, Then it offers "Go to home" (and "My lists" for members).
- SE-LIST-01-AC07 [Proposed] Given an unlisted list is shared in a chat app, When the link preview is fetched, Then the title is the list title and the page stays `noindex`.
- SE-LIST-01-AC08 [Proposed] Given the My lists tab, When a list has ≥ 1 readable story, Then its row shows up to three covers.

**Impact** — Frontend: `list-screen.tsx`, `my-lists.tsx`, `list-form-dialog.tsx`, `add-to-list-button.tsx` (→ FP-048 sheet), new picker sheet. Backend/API: list page metadata loader (server read of title for unlisted/public only), reuse `list_library`. Database: none (FP-014 handles RLS and RPC). Shared components: `ShareButton` (FP-051), `LibraryRow`. Business rules: BR-LIST-014 metadata exception changes (presentation; not a rule change beyond the title). Other screens: SCR-LIB-01 (Lists tab), SCR-STORY-01 (sheet).

**Related** — FP-051, FP-048, FP-047 (new), FP-014, FP-015, FP-028, FP-005, FP-003, FP-033 (same reorder pattern); F-LIST-01…04, U-LIST-01…03, F-MAT-02, U-LIB-01.

**Priority** — **P2** for Share and the not-found action (Confirmed dead ends, S effort). **P3** for the picker, compact rows, move-to-top and the mosaic.

---

## 4. New feature proposals

### FP-047 — "What's new" library state: new-chapter badges, Home "Continue reading", nav dot

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
| Decision required | Q-CMT-03, Q-NOTI-04 (blocked until approved) |

Acceptance criteria [Proposed]:
- Given A's comment with B's reply, When A replies using "Reply" on B's reply, Then the composer is prefilled with "@B ", the new reply is stored under A's comment, and B receives one `comment_replied` notification.
- Given participants B and C in A's thread and C muted it, When A posts a reply, Then B is notified and C is not.
- Given the story owner replies to reader A, When A opens notifications, Then the item reads "The author of <story> replied to you: …".
- Given a thread with 15 distinct prior repliers, When a new reply is posted, Then at most 10 participant notifications plus the parent and addressed recipients are created, and none goes to the replier.

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

### FP-052 — End-of-chapter next step ("caught up" and "finished" cards)

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

## 5. Amendments to existing FPs

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
| FP-026 More types and channels | (a) Order of delivery: first **in-app** `followed_author_new_story` and `followed_author_new_chapter`, suppressed when the reader already follows that story (no duplicates). (b) The first out-of-app channel is an **opt-in email digest** of new chapters for kept stories (daily or weekly, one email, unsubscribe link, sent by a pg_cron job reading unread `chapter_published`). Push follows with WP 6.7. (c) Add the switch "Email digest" to SCR-SET-01. New decision Q-NOTI-05. | The return loop has no out-of-app trigger today (BR-NOTI-017). A digest reuses stored notifications and needs only an SMTP provider (Supabase Auth already sends mail; provider choice is the only new dependency, so it is justified) |
| FP-028 Discoverable public lists | Reuse the FP-051 list metadata (title, OG image) for the author-page section. The author-page list section uses the C08 mosaic row. | Avoid two list-card designs |
| FP-005 Server-side 18+ | Note: the Library rows, Home Continue row, notification covers and chapter-end recommendations (FP-047, FP-050, FP-052) must apply the same 18+ visibility as lists (F-MAT-02). | New surfaces must not reintroduce the leak |

---

## 6. BR change proposals and open questions

### BRC-LIB-01 — Save and story-follow become one "keep" with a notify setting

| Field | Value |
| --- | --- |
| Rules affected | BR-LIB-001 (independence), BR-LIB-008 (tab content and Following sort), BR-LIB-005 (button set) — all Verified; WBS 4.3 note "hai khái niệm tách biệt" |
| Proposed text | "A story is *in my library* when I saved it or follow it. Following is shown as the notify setting of a library story. Saving a story for the first time also follows it unless the reader's 'notify by default' setting is off. Unfollowing keeps the save. Unsaving removes both. Existing save-only rows keep notify off; existing follow-only rows show as saved with notify on. The Following list is ordered by latest chapter publish time." |
| Unchanged | Tables, RPCs `set_story_follow`/`set_story_save`, counters (BR-LIB-004), notification audience (BR-NOTI-003 still = follows) |
| Migration | Staged A → B → C (§1.6); no backfill; rollback = UI revert |
| Approval | Product owner; open question Q-LIB-03 |

### BRC-CMT-01 — "Reply" available on replies (storage stays one level)

| Field | Value |
| --- | --- |
| Rules affected | BR-CMT-005 (one level; reply inherits paragraph) — kept for storage; SCR-CMT-01-AC10 "a reply has no Reply button" — changed |
| Proposed text | "A reply may be answered. The answer is stored as a reply to the same top-level comment, with `reply_to_comment_id` naming the reply it answers and a '@Name ' text prefix the writer may edit. Replying to a reply via API with a `parent_comment_id` that is itself a reply still fails with 22023." |
| Approval | Product owner; Q-CMT-03 |

### BRC-NOTI-01 — Reply notifications reach thread participants

| Field | Value |
| --- | --- |
| Rules affected | BR-NOTI-004 (recipient = parent author only), BR-NOTI-002 catalogue row |
| Proposed text | "For each visible reply, notify: the parent comment's author; the author of the addressed reply; and up to 10 most recent other distinct repliers of the thread. Exclude the replier, inactive accounts, users who muted the thread (BR-NOTI-018) and users who switched off `notify_comment_replied`. One notification per recipient per reply." |
| Approval | Product owner; Q-NOTI-04 |

### Open questions (continue the register numbering)

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-LIB-03 | Approve the unified keep model (BRC-LIB-01)? Should "notify by default on save" be on, and should it apply only to new saves? | Changes an approved WBS 4.3 decision and notification volume | FP-048 stages B and C | JRN-RDR-08, §1.6 |
| Q-LIB-04 | Which count does the Library show: chapters published since my last read ("new") or published chapters after my continue chapter ("left")? Both? | Badge meaning, sort order, and consistency with Q-PROG-01 | FP-047 | SE-LIB-01 |
| Q-CMT-03 | Allow answering a reply in place (stored one level, @Name prefix) — BRC-CMT-01? | Changes SCR-CMT-01-AC10; moderation and abuse surface | FP-049 | JRN-RDR-09 |
| Q-NOTI-04 | Who is notified in a thread (parent author, addressed reply author, other participants), with what cap, and is a thread mute needed — BRC-NOTI-01? | Notification volume vs. conversation continuity | FP-049 | JRN-RDR-09 |
| Q-NOTI-05 | Email digest: opt-in or opt-out, daily or weekly default, which email provider, legal text for unsubscribe and consent? | First out-of-app channel; legal (relates to Q-X-02) | FP-026 (amended) | JRN-RDR-10/11 |

---

## 7. Notes for consolidation

1. **Overlap with the READ / reader agent (SE-READ-01):** FP-052 (`ChapterEndCard`) and SE-CMT-01's paragraph side panel and highlight touch `reader-screen.tsx` / `reader-blocks.tsx`. If the READ agent proposes an end-of-chapter area, merge it into FP-052 (keep the lower ID owner's text, or whichever the orchestrator prefers) and align with FP-012's nav move.
2. **Overlap with HOME / discovery agent (SE-HOME-01):** FP-047 adds a members-only "Continue reading" row above "Recommended for you". The HOME agent may propose hero or rows for guests (FP-032). Order on member Home: Continue reading → Recommended for you → Latest.
3. **Overlap with STORY agent (SE-STORY-01):** FP-048 changes the story-page action group (one Save + sheet), and FP-051 adds Share. The STORY agent's layout of "Bắt đầu đọc / Báo cáo" (orchestrator observation: Report on its own row) should use the stage-B group: Read (primary) · Save (toggle + chevron) · ⋯ (Share, Report).
4. **Overlap with AUTHOR / discovery (SE-AUTHOR-01/02) and ACCOUNT (SE-SET-01):** the author-follow wording (FP-048 stage A), the Library Authors tab (FP-019) and the `/settings#notifications` anchor plus the email-digest switch (FP-026 amendment). If another agent proposes moving `/following` into the Library, it is the same item as SE-LIB-01's "Tác giả" tab plus a "Feed" view. Keep one.
5. **Overlap with SHELL agent:** the nav dot (`BottomNavItem.badge`) and the bell size / user-menu "Notifications" entry. These are small widget changes; assign them to whichever FP the SHELL agent owns (FP-019) if it prefers, and keep the ACs.
6. **AUT agent:** comment notifications for story authors and pinning are author-side (FP-026). FP-049's `actor_is_story_author` and FP-025's badge must use the same "story team" definition (owner + co-authors; editors? — align with BR-CMT-014 managers).
7. **T&S agent:** FP-049 adds new notification copies and a reply path. FP-007 limits and FP-013 excerpt blanking must cover them. Thread mute is user comfort, not moderation.
8. **GROW measurement (no FP, hypothesis support):** every GROW claim here is a hypothesis. A cheap, no-new-service option for whoever owns PLAT/STAT is a service-role SQL view or a weekly pg_cron snapshot. It would compute (a) 7-day and 28-day return of members (from `user_story_progress.last_read_at` / `chapter_reads`), (b) `chapter_published` → read within 48 h (join `notifications.read_at` / `chapter_reads`), and (c) follow and save ratio per story page view (needs view counts; not available today → Unknown). Recommend deciding this before FP-047, FP-048 and FP-052 ship, so their impact can be measured.
9. **Reading streaks / goals:** deliberately **not** proposed (CAP-ENG-16). No evidence of need. Serial-update loops (FP-047/FP-026) address return more directly. Revisit with data from note 8.
10. **Not verified:** all signed-in UI (Library, notifications, list owner view, add-to-list sheet, posting/replying, bell) was not exercised at runtime. Heights for Library rows are inferred from the Home `StoryCard` metrics. The desktop paragraph sheet was not captured. Query cost of `list_library` is unmeasured.

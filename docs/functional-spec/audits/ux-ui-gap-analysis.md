# UX/UI Gap Analysis

Category **C**: the behaviour works but could be clearer, easier or more consistent. Defects and missing behaviour
are in [functional-gap-analysis.md](functional-gap-analysis.md). Entry point: [README](../README.md).

Basis: code review against the project's own UI rules (README "Nguyên tắc UI", WBS DoD: loading/empty/error states,
390 px + desktop, i18n, touch target ≥ 44 px), WCAG 2.1/2.2 AA, and common reading/writing-app conventions.
Runtime observations (guest, 390 px and 1280 px): no horizontal scroll on any public page (RT-14); the reader settings
sheet, TOC, search and rankings worked as specified.

## 1. Summary

| Priority | Count |
| --- | --- |
| P2 | 8 |
| P3 | 54 |
| **Total** | **62** |

## 2. Cross-screen patterns

| Pattern | Where it breaks | Findings | Proposal |
| --- | --- | --- | --- |
| P1 Primary navigation & IA | No desktop nav; Ranking/Following only on Home; Settings only in avatar menu; stats only from Studio row | U-SHELL-01, U-PRF-01, U-STAT-01 | [FP-019](../proposals/feature-backlog.md#fp-019) |
| P2 Return-to-context after sign-in | Header "Sign in" and comment sign-in links drop the page/anchor | U-SHELL-04, U-CMT-02 | FP-019 |
| P3 Async states | Load-more errors silent; widgets render `null` on error | U-SRCH-01, U-STORY-01, U-STM-04 | [FP-020](../proposals/feature-backlog.md#fp-020) |
| P4 Unsaved changes | Language switch remounts forms; story/profile forms unguarded | U-I18N-02, U-STM-03, U-PRF-02 | [FP-003](../proposals/feature-backlog.md#fp-003) |
| P5 Precise conflict / limit messages | One PT409 message for several causes | U-TEAM-01, U-LIST-03, U-ABU-01, U-EDT-01 | Quick fixes |
| P6 Accessibility | Small targets, labels without item name, toggle semantics, mouse-only values, empty alt | U-CMT-01, U-SHELL-02, U-STM-05, U-EDT-03, U-RANK-02, U-MAT-02, U-AUTHOR-01, U-STAT-02, U-READ-02, U-LIB-03 | [FP-022](../proposals/feature-backlog.md#fp-022) |
| P7 Language parity | SSR always Vietnamese, auth pages lack switcher | U-I18N-01, U-AUTH-01, U-SET-01 | [FP-021](../proposals/feature-backlog.md#fp-021) |

## 3. Findings

### P2

| ID | Object / screen | Current behaviour → improvement | Evidence | Effort | FP |
| --- | --- | --- | --- | --- | --- |
| U-SHELL-01 | SHELL, HOME / SCR-SHELL-01 | Bottom nav is hidden from `md` up and the header has no section links, so desktop has no primary navigation; Rankings and Following are linked only from Home. (alias U-HOME-01) → header nav links or sidebar (Q-SHELL-01). **Addressed 2026-11-05:** desktop navigation row (SCR-SHELL-01-C13). | `packages/ui/src/widgets/bottom-nav.tsx:47`, `shell/components/site-header.tsx:10-24`, `discovery/screens/discover-screen.tsx:54-63`; runtime link lists | S | FP-019 |
| U-SHELL-04 | SHELL / SCR-SHELL-01 | Header "Sign in" links to `/login` without `next`; a reader mid-chapter lands on Home after signing in → `withNext('/login', pathname)`. | `shell/components/user-menu.tsx:30-36`; runtime (header link `/login`) | S | FP-019 |
| U-PRF-01 | PRF / SCR-PRF-01 | `/me` (bottom-nav "Me") shows only name, username, email, bio and Edit; no avatar, public page, Settings or Sign out → make it the account hub. | `apps/web/src/app/(main)/me/me-view.tsx:16-43` | S | FP-019 |
| U-I18N-02 | I18N / all forms | Switching language re-keys the page tree and discards unsaved input (story form, profile, possibly editor) → confirm when dirty or re-render without remount. | `packages/features/src/_shared/language.tsx:18-35` | M | FP-003 |
| U-READ-01 | READ / SCR-READ-01 | Previous/next chapter controls appear only after vote, report and the whole comment thread; no ←/→ shortcuts → place nav right after "— End of chapter —". | `reader/screens/reader-screen.tsx:88-91,113-125`; runtime (reader text order) | S | FP-012 |
| U-CMT-01 | CMT / SCR-CMT-01 | Paragraph "Comment on this paragraph" button: 14 px icon, `text-xs`, 50 % opacity until hover — hard to see and tap on phones → ≥ 24–44 px target, visible affordance. | `reader/components/reader-blocks.tsx:50-59` | S | FP-022 |
| U-NOTI-01 | NOTI → CMT | Reply notification scrolls to the paragraph but does not open the sheet, expand replies or highlight the reply → deep-link params. | `notifications/model/notification.ts:93-99`, `reader-blocks.tsx:36` | M | FP-013 |
| U-LIB-01 | LIB / SCR-LIB-01 | Library tab is component state; "Back to library" and deleting a list always land on "Reading" → `?tab=`. | `library/screens/library-screen.tsx:43`, `lists/screens/list-screen.tsx:119-123,223` | S | FP-015 |

### P3

| ID | Object / screen | Current behaviour → improvement | Evidence | FP |
| --- | --- | --- | --- | --- |
| U-AUTH-01 | AUTH / SCR-AUTH-01…04 | Auth layout has no language switcher (confirmed: no VI/EN button on /login at runtime). | `apps/web/src/app/(auth)/layout.tsx:5-13`; runtime | FP-021 |
| U-PRF-02 | PRF / SCR-PRF-02 | No unsaved-changes guard on edit profile. | `profile/screens/edit-profile-screen.tsx:147-154` | FP-003 |
| U-PRF-03 | PRF | Username rename breaks `/author/<username>` links (no redirect). | `author/model/author.ts:8` | FP-011 |
| U-SET-01 | SET / SCR-SET-01 | Saving the language to the account fails silently although the page says it is saved for every device. | `settings/hooks/use-language-sync.ts:47-56` | FP-021 |
| U-SET-02 | SET / SCR-SET-01 | Notification switches have no pending state; concurrent optimistic writes can roll back over a later value. | `settings/hooks/use-settings.ts:40-49` | Quick fix |
| U-SHELL-02 | SHELL | Header controls below 44 px (language 32 px, icons 36 px) despite the project `touch-target` rule. | `ui/components/button.tsx:22-25`, `shell/components/language-switcher.tsx:12-16` | FP-022 |
| U-SHELL-03 | SHELL | One card-grid skeleton for every route causes layout jumps. | `apps/web/src/app/(main)/loading.tsx` | Quick fix |
| U-I18N-01 | I18N | SSR always renders Vietnamese with `<html lang="vi">`; English applied after hydration; tab titles stay Vietnamese. | `apps/web/src/app/layout.tsx:41`, `apps/web/src/lib/strings.ts`; **runtime RT-08** | FP-021 |
| U-DEV-01 | DEV / SCR-DEV-01 | Gallery has no theme toggle and omits StoryCard, StoryCover, ReadingProgress, PageSkeleton. | `apps/web/src/app/dev/gallery/gallery.tsx` | Quick fix |
| U-TAX-01 | TAX / SCR-HOME-01, SCR-STORY-01 | Sub-categories never shown as chips; story-page category badge is not a link (tags are). | `discovery/model/categories.ts:16-21`, `story-screen.tsx:88,129` | Quick fix |
| U-TAX-02 | TAX / SCR-HOME-01 | Tag names may keep a leading "#", rendered as "##Kiemhiep" because the UI prefixes "#". Normalise on create; strip in display. | `…/20261104001400_tags.sql:57`, `discovery/screens/tag-filters.tsx:55`; **runtime RT-07** | FP-017 |
| U-HOME-03 | HOME / SCR-HOME-01 | An unknown `?category=` slug shows the generic "No stories yet" empty state with no sign the filter is invalid. | `discover-screen.tsx`; **runtime RT-15** | Quick fix |
| U-SRCH-01 | SRCH, RANK, AUTHOR | Next-page failures are silent on search, ranking, author page and following feed (Home shows them) → `loadMoreError` in `InfiniteList`. | `search-screen.tsx:142,172`, `ranking-screen.tsx:60` | FP-020 |
| U-SRCH-02 | SRCH / header SearchBox | Mobile search not autofocused; no feedback for < 3 chars or no match in the dropdown. | `search/components/search-box.tsx:24-29,45-49,98-133` | Quick fix |
| U-RANK-01 | RANK / SCR-RANK-01 | "Today" = UTC calendar day for reads but rolling 24 h for votes (Q-RANK-01). | `…/20261104001500_rankings.sql:23-34` | Quick fix |
| U-RANK-02 | RANK / SCR-RANK-01 | Rank badge `aria-label` on a generic span; badge overlaps the 18+ badge (CSS, not rendered). | `ranking-screen.tsx:105-111` | FP-022 |
| U-AUTHOR-01 | AUTHOR / SCR-AUTHOR-01 | Follow button changes label and `aria-pressed` together; unfollow has no confirmation. | `author/components/follow-author-button.tsx:27-42` | FP-022 |
| U-AUTHOR-02 | AUTHOR / SCR-AUTHOR-01 | Header story count ignores the reader's 18+ opt-in while the list honours it. | `…/20261104001600_author_follows.sql:43-45` | Quick fix |
| U-READ-02 | READ / SCR-READ-01 | Chapter images always `alt=""`; no alt column exists (see FP-030). | `reader/components/block-view.tsx:36` | FP-030 |
| U-READ-03 | READ, STORY | "Chapter N" uses `sort_order`, so drafts/archived chapters leave gaps (Q-READ-01). | `story/model/story-detail.ts:40,51` | FP-012 |
| U-STORY-01 | STORY, READ | Follow/Save/Add-to-list and Vote vanish silently when their state query fails. | `story/components/story-actions.tsx:19`, `reader/components/vote-button.tsx:20` | FP-020 |
| U-STORY-02 | STORY / SCR-STORY-01 | Updated/published dates are loaded but never shown. | `story/model/story-detail.ts:12,44,54` | Quick fix |
| U-CMT-02 | CMT | Sign-in from the thread drops `#comments` / `#b-<id>` and the open sheet. | `comments/components/comment-thread.tsx:38` | FP-019 |
| U-CMT-03 | CMT | Reply gives no toast, guests get no Reply button, reply-list errors have no retry. | `comment-item.tsx:170,195-199,245` | Quick fix |
| U-CMT-04 | CMT | Commenter shown as plain name: no avatar, profile link or "Author" badge. | `comment-item.tsx:106` | FP-025 |
| U-NOTI-02 | NOTI | Invite text always says "co-author"; invite notice stays actionable after it is answered; empty state omits replies. | `notifications/strings.en.ts:15,28-32` | FP-013 |
| U-LIB-02 | LIB | Removal is immediate with no undo; placeholder has no title; "reading list" wording clashes with Reading lists. | `library-screen.tsx:146-179` | FP-015 |
| U-LIB-03 | LIB / SCR-STORY-01 | Follow/Save group `aria-label` is "Sign in to follow or save stories" for signed-in users too. | `story/components/story-actions.tsx:25` | FP-022 |
| U-LIST-01 | LIST | No copy-link / share button. | `list-screen.tsx:87-124` | Quick fix |
| U-LIST-02 | LIST / add-to-list sheet | Quick create silently ignores names over 120 characters. | `lists/components/add-to-list-button.tsx:115,154-162` | FP-014 |
| U-LIST-03 | LIST | One PT409 message for "changed" and "limit reached". | `lists/model/list.ts:111-112` | FP-014 |
| U-STM-01 | STM / SCR-STM-02/03 | "Public" hint ignores that Draft stories are invisible; switching a live story to Draft hides it with no warning. | `studio/strings.en.ts:180-185` | Quick fix |
| U-STM-02 | STM / SCR-STM-03 | Edit-mode slug hint says "Generated from the title" and doesn't mention redirects. | `story-form-screen.tsx:134,252` | Quick fix |
| U-STM-03 | STM | No unsaved-changes guard on story forms. | `story-form-screen.tsx:93-98,175,398-403` | FP-003 |
| U-STM-04 | STM, TEAM / SCR-STM-01 | Invitation inbox and deleted list render nothing on load error. | `studio/components/my-invitations.tsx:14-18` | FP-020 |
| U-STM-05 | STM, CHM, TEAM | Tag remove target 20 px; repeated buttons (Write, Delete, Archive…) lack the item name. | `studio/components/tag-editor.tsx:85-101` | FP-022 |
| U-STM-06 | STM / SCR-STM-02 | Tags typed on create are lost if the tag save fails. | `story-form-screen.tsx:146-168` | FP-018 |
| U-CHM-01 | CHM | Scheduled date fetched but not shown ("Scheduled" badge only). | `chapter-manager-screen.tsx:152` | FP-010 |
| U-CHM-02 | CHM | Chapter manager of a deleted story fails with "Chapter not found." | `…/20261104000400_chapter_management.sql:49-52` | FP-018 |
| U-TEAM-01 | TEAM | One message for three invite conflicts. | `studio/model/collaboration.ts:134-135` | FP-016 |
| U-STAT-01 | STAT / SCR-STAT-01 | Stats page does not name the story; reachable only from the Studio row. | `analytics/screens/story-stats-screen.tsx:68-75` | FP-019 |
| U-STAT-02 | STAT | Per-day values only in a mouse `title` tooltip. | `analytics/components/daily-chart.tsx:17-31` | FP-022 |
| U-EDT-01 | EDT | Misleading copy: conflict banner says changes "will be lost" (they are backed up); cancel-schedule reuses the Unpublish dialog; save-first message always blames title/content. | `editor/strings.en.ts` | FP-034 |
| U-EDT-02 | EDT | Title input `maxLength` 400 while the limit is 200. | `chapter-editor-screen.tsx:354`, `editor/model/draft-form.ts:6` | FP-034 |
| U-EDT-03 | EDT | Word count inside `aria-live` (announced every keystroke); 36 px toolbar without arrow-key navigation; no H1/context. | `chapter-editor-screen.tsx`, `editor/components/editor-toolbar.tsx` | FP-022 |
| U-EDT-04 | EDT | Shortcuts undiscoverable; Mod+S opens the browser save dialog. | Tiptap defaults | FP-034 |
| U-EDT-05 | EDT | No confirmation before the first publish, which irreversibly notifies followers. | `editor/components/publish-panel.tsx` | FP-034 |
| U-HIST-01 | HIST | Compare ignores title changes, says "paragraphs" for images/dividers, no "before" for a changed image. | `history/model/history.ts` | Quick fix |
| U-HIST-02 | HIST / SCR-HIST-02 | Preview lacks "Chapter n" label and end marker; reuses history error text. | `history/screens/preview-screen.tsx` | Quick fix |
| U-MOD-01 | MOD / SCR-MOD-01 | Queue card lacks date, comment author, closed-by, consequence text. | `moderation/components/report-card.tsx:68-99,158-162` | FP-024 |
| U-MOD-02 | MOD / SCR-MOD-01 | Only Pending/Resolved tabs; no status/kind filter; tab not in URL. | `moderation-screen.tsx:45-60` | FP-024 |
| U-MAT-01 | MAT / SCR-MAT-01 | Gate "Go back" does nothing when there is no history (shared links). | `adult-content/components/adult-gate.tsx:24-26` | FP-005 |
| U-MAT-02 | MAT / header | 18+ control is icon-only, announced as a toggle but opens a dialog. | `adult-content/components/adult-content-button.tsx:29-38` | FP-022 |
| U-ABU-01 | ABU / SCR-CMT-01 | Same "too fast" message for the 10-minute and the daily comment limit. | `comments/model/comment.ts:131-136` | Quick fix |

## 4. Aliases

| Alias | Canonical |
| --- | --- |
| U-HOME-01 | U-SHELL-01 |

## 5. Phase 2 additions (2026-11-05)

Found during [screen enhancement](../proposals/screen-enhancements.md) review; related Phase 1 IDs are named, not
repeated. Totals after Phase 2: **71** UX/UI findings (9 P2 · 62 P3). U-SHELL-01 (no navigation from `md` up) is
now **Verified (Runtime)** at 768 px as well (`t-home.png`: no section navigation at all on tablet).

| ID | Pri | Object / screen | Current behaviour → improvement | Evidence | FP |
| --- | --- | --- | --- | --- | --- |
| U-SHELL-06 | P2 | SHELL / all | Focus ring is faint: `--ring` already has 50 % alpha and components add `ring-ring/50`, about 25 % effective (≈ 1.25:1 calculated in light mode) → full-strength ring token | `packages/design-tokens/src/tokens.css:52`, `packages/ui/src/components/button.tsx:8` (Inferred contrast) | FP-037, FP-022 |
| U-I18N-03 | P3 | I18N / header | Language button shows "VI" but its accessible name is "Switch to English" (WCAG 2.5.3 label in name) | `packages/features/src/shell/components/language-switcher.tsx:12-19`, `shell/strings.en.ts:17` | FP-022 |
| U-MAT-03 | P3 | MAT / SCR-MAT-01 | Continuing past the gate turns 18+ on for every list, but the gate does not say so | `packages/features/src/adult-content/hooks/use-adult-content.ts:15` | FP-005 |
| U-STM-07 | P3 | STM / SCR-STM-02/03 | 18+ hint says "hidden from the home page" while 18+ stories are hidden from every list | `packages/features/src/studio/strings.en.ts:187` | Quick fix |
| U-MOD-04 | P3 | MOD / SCR-MOD-01 | The queue drops "under review by": `reviewed_by` is returned by SQL but not mapped | `…/20261104002000_moderation.sql:209,233`, `packages/features/src/moderation/model/report.ts:37-54` | FP-024 |
| U-TEAM-02 | P3 | TEAM / SCR-TEAM-01 | Co-authors and editors cannot see who is on their own team although RLS allows it | `…/20261103000100_auth_and_rls.sql:214-215`, `team-screen.tsx:62-64` | FP-016 |
| U-HOME-04 | P3 | HOME, AUTHOR | "Updated" and the default order move on any story-row update (metadata edit, republish), not only on a new chapter (Q-HOME-02) | `discovery.api.ts` order by `updated_at` | FP-040, FP-041 |
| U-STORY-03 | P3 | STORY / SCR-STORY-01 | A member who has read every published chapter is offered "Start reading" (chapter 1) again; no "caught up" state | BR-STORY-012, BR-PROG-008 | FP-044 |
| U-LIB-04 | P3 | LIB, MOD / SCR-STORY-01 | A guest's Follow / Save / Vote / Report intent is lost at sign-in (the action is not completed afterwards) | `story-actions.tsx`, `report-button.tsx:86-88` | FP-048 |

## 6. Runtime verification of signed-in flows (2026-11-05)

New UX findings from the [runtime verification](../verification/README.md). Totals after this run: **73** UX/UI
findings (9 P2 · 64 P3). Confirmed at runtime: U-NOTI-01 (reply notification lands on `#comments`, nothing opened or
highlighted — VER-RDR-08), U-SHELL-04 (header "Đăng nhập" links to `/login` without `next` — VER-RDR-11), U-STAT-01
(stats page does not name the story — VER-AUT-13), U-READ-03 (library label uses the position after reordering —
VER-RDR-10).

| ID | Pri | Object / screen | Current behaviour → improvement | Evidence | FP |
| --- | --- | --- | --- | --- | --- |
| U-STM-08 | P3 | STM / SCR-STM-01 | When every story is deleted, Studio shows the empty state "Bạn chưa có truyện nào" above "Hiện truyện đã xóa (1)" — the author is told they have no stories | Runtime (VER-AUT-15 debug capture) | FP-055 |
| U-MOD-05 | P3 | MOD / SCR-MOD-01 | Every moderation action confirms with the same toast "Đã thực hiện." and the card moves to the other tab without saying where | Runtime (VER-MOD-04…09) | FP-024 |

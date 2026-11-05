# Screen Enhancements

Screen-by-screen assessment of every screen in the [screen inventory](../screen-inventory.md) (32 of 32), with the
proposed experience and testable acceptance criteria. Everything here is **Proposed**: no item is approved or
implemented, and nothing changes the Verified rules in `domains/**` until approved in the
[decision register](decision-register.md). Companion documents: [product-discovery.md](product-discovery.md)
(journeys, capability gaps, benchmark) and [feature-backlog.md](feature-backlog.md) (FP details).
Entry point: [README](../README.md).

## 1. How to read this document

- One section per screen: `SE-<CODE>-NN` mirrors `SCR-<CODE>-NN`. Sections follow the template in
  [CONVENTIONS](../CONVENTIONS.md#3-identifiers): current experience → opportunities → proposed experience
  (mobile 390 px / tablet 768 px / desktop 1280 px) → acceptance criteria (`SE-…-ACnn`, all `[Proposed]`) → impact
  → related FPs and findings → priority.
- Verification tags: `Verified (Runtime)` = observed in a browser as a guest on 2026-11-04/05 (screenshots at
  390/768/1280 px); `Verified (Code)` = read in source; `Inferred`; `Hypothesised` (friction not yet observed).
  **Signed-in screens (library, notifications, settings, Studio, editor, moderation) were assessed from code only.**
- Existing findings (`F-*`, `U-*`) and proposals (`FP-001…034`) are referenced, not repeated. A screen's
  improvements usually ship through the FP listed in "Related"; the AC here are the screen-level checks.
- Consolidation decisions that affect several screens are listed in §3 and recorded as DEC-013…DEC-022 in the
  decision register.

## 2. Summary

| Screen | Enhancement | Priority | Most important improvement | Main FPs |
| --- | --- | --- | --- | --- |
| SCR-AUTH-01 Sign in | [SE-AUTH-01](#se-auth-01--sign-in-scr-auth-01) | P2 | Return to the page the user came from; Google sign-in slot; label-in-name fixes | FP-009, FP-019 |
| SCR-AUTH-02 Sign up | [SE-AUTH-02](#se-auth-02--sign-up-scr-auth-02) | P2 | Shorter form (identity moves to the welcome flow), terms line, resend confirmation | FP-009, FP-035, FP-039 |
| SCR-AUTH-03 Forgot password | [SE-AUTH-03](#se-auth-03--forgot-password-scr-auth-03) | P3 | Resend with cooldown, clearer "check your email" state | FP-009 |
| SCR-AUTH-04 Reset password | [SE-AUTH-04](#se-auth-04--reset-password-scr-auth-04) | P2 | Separate recovery from signed-in password change (F-AUTH-05) | FP-009 |
| SCR-PRF-01 My profile | [SE-PRF-01](#se-prf-01--my-profile-scr-prf-01) | P2 | Account hub: avatar, public page, settings, sign-out, activation checklist | FP-019, FP-035 |
| SCR-PRF-02 Edit profile | [SE-PRF-02](#se-prf-02--edit-profile-scr-prf-02) | P3 | Username availability check, unsaved-changes guard | FP-003, FP-035 |
| SCR-SET-01 Settings | [SE-SET-01](#se-set-01--settings-scr-set-01) | P1 | Sectioned settings (Account, Reading, Notifications, Privacy, Display) ready to host account lifecycle | FP-008, FP-036 |
| SCR-HOME-01 Home | [SE-HOME-01](#se-home-01--home--discover-scr-home-01) | P2 | Denser cards, guest landing rails, continue rail for members, filters/sort | FP-032, FP-040, FP-041, FP-044, FP-045 |
| SCR-SRCH-01 Search | [SE-SRCH-01](#se-srch-01--search-results--header-searchbox-scr-srch-01) | P2 | Filters and sort, search beyond titles, no-result recovery | FP-041, FP-042 |
| SCR-RANK-01 Rankings | [SE-RANK-01](#se-rank-01--rankings-scr-rank-01) | P3 | Compact ranked rows, per-category scope | FP-045, FP-046 |
| SCR-AUTHOR-01 Author page | [SE-AUTHOR-01](#se-author-01--author-page-scr-author-01) | P3 | Real 404/metadata, author header density, lists by the author | FP-004, FP-028, FP-045 |
| SCR-AUTHOR-02 Following feed | [SE-AUTHOR-02](#se-author-02--following-feed-scr-author-02) | P3 | "New chapter" updates instead of plain list; followed-authors management | FP-044, FP-019 |
| SCR-STORY-01 Story page | [SE-STORY-01](#se-story-01--story-page-scr-story-01) | P2 | Decision facts (length, last chapter date), smart CTA (continue / caught up), two-column desktop | FP-040, FP-044, FP-045 |
| SCR-READ-01 Chapter reader | [SE-READ-01](#se-read-01--chapter-reader-scr-read-01-incl-settings-sheet-toc-sheet-paragraph-comment-entry-points) | **P1** | Shell-less immersive reader: toolbar/progress currently hidden under the header after scrolling (runtime) | FP-043, FP-012, FP-044 |
| SCR-CMT-01 Comment thread | [SE-CMT-01](#se-cmt-01--comment-thread-scr-cmt-01) | P2 | Tappable paragraph markers, sign-in returns to the paragraph, two-way replies | FP-049, FP-022 |
| SCR-NOTI-01 Notifications | [SE-NOTI-01](#se-noti-01--notifications--header-bell-scr-noti-01) | P2 | Settings link, mute a story, grouping and filter, working deep links | FP-050, FP-013 |
| SCR-LIB-01 Library | [SE-LIB-01](#se-lib-01--library-scr-lib-01) | P2 | New-chapter badges, URL tabs, paging, one clear "keep" model | FP-047, FP-048, FP-015 |
| SCR-LIST-01 Reading list | [SE-LIST-01](#se-list-01--reading-list-scr-list-01-incl-c07-list-form-dialog-c08-my-lists-c09-add-to-list-sheet) | P2 | Share, not-found action, add stories from the list page | FP-051, FP-014 |
| SCR-STM-01 Studio home | [SE-STM-01](#se-stm-01--studio-home-scr-stm-01) | P2 | Author dashboard: reader-visibility chip, continue writing, needs-attention | FP-055, FP-054 |
| SCR-STM-02 Create story | [SE-STM-02](#se-stm-02--create-story-scr-stm-02) | P2 | Explain who can read the story; guided first story | FP-054, FP-055 |
| SCR-STM-03 Edit story | [SE-STM-03](#se-stm-03--edit-story-scr-stm-03) | **P1** | Warn before a change hides a live story; show "readers can't see this yet" | FP-054, FP-053 |
| SCR-CHM-01 Chapter manager | [SE-CHM-01](#se-chm-01--chapter-manager-scr-chm-01) | P2 | Workspace tabs, scheduled dates, "write next chapter", history entry | FP-053, FP-033 |
| SCR-EDT-01 Chapter editor | [SE-EDT-01](#se-edt-01--chapter-editor-scr-edt-01) | **P1** | Sticky action bar with save state + Publish, sticky/docked toolbar, mobile frame | FP-058, FP-060, FP-003 |
| SCR-HIST-01 Version history | [SE-HIST-01](#se-hist-01--version-history-scr-hist-01) | P2 | Changes-only compare, undo after restore, mobile version picker | FP-059 |
| SCR-HIST-02 Chapter preview | [SE-HIST-02](#se-hist-02--chapter-preview-scr-hist-02) | P2 | Same reader component, phone-width toggle, Publish from preview | FP-058, FP-060 |
| SCR-TEAM-01 Team | [SE-TEAM-01](#se-team-01--team-scr-team-01) | P2 | Read-only team view for collaborators, leave/role change | FP-016, FP-053 |
| SCR-STAT-01 Statistics | [SE-STAT-01](#se-stat-01--story-statistics-scr-stat-01) | P3 | Name the story, workspace tabs, lifetime totals, accessible chart | FP-053, FP-056 |
| SCR-MOD-01 Moderation console | [SE-MOD-01](#se-mod-01--moderation-console-scr-mod-01) | P2 | Target history, preview removed content, consequence text, grouping | FP-024, FP-063, FP-066 |
| SCR-MOD-02 Report dialog | [SE-MOD-02](#se-mod-02--report-button-and-dialog-scr-mod-02) | P2 | Hide from owner (P1 quick fix), "Reported" state, guideline links | FP-031, FP-065 |
| SCR-MAT-01 18+ gate | [SE-MAT-01](#se-mat-01--adult-content-gate-and-header-18-control-scr-mat-01) | P2 | Server-side gate, clear scope of the choice, labelled header control | FP-005 |
| SCR-SHELL-01 Main shell | [SE-SHELL-01](#se-shell-01--main-shell-scr-shell-01) | **P1** | Navigation at every width (tablet has none — runtime), 404/error pages, footer | FP-019, FP-004, FP-039, FP-037 |
| SCR-DEV-01 Dev gallery | [SE-DEV-01](#se-dev-01--dev-gallery-scr-dev-01) | P3 | Theme toggle and missing widgets; acceptance surface for FP-037 | FP-037 |

Totals: 32 screens assessed · 5 P1 · 20 P2 · 7 P3 · 205 proposed acceptance criteria. No screen was rated
"No enhancement recommended".

## 3. Cross-screen decisions (consolidation)

| Topic | Decision (Proposed) | Affects |
| --- | --- | --- |
| Layout frames | Three frames: **main shell** (browse/manage), **reader frame** without site header/bottom nav (FP-043, WBS §1.2 `(reader)`), **studio writing frame** without bottom nav (FP-058, WBS §1.2 `(studio)`). One `AppShell` variant serves both focused frames; both need BRC-SHELL-01 approval. | SE-READ-01, SE-EDT-01, SE-HIST-01/02, SE-SHELL-01 |
| Sticky bars | No screen may stack a `top-0` sticky bar under the sticky site header (root cause of the hidden reader toolbar, runtime-verified, and the preview bar). | SE-READ-01, SE-HIST-02 |
| Story card | One `StoryCard` with variants `grid`, `row`, `rail` (FP-037); FP-045 only chooses per screen (the "compact" variant in FP-045 = `rail`). Grid cards drop to ≈ 300 px at 390 px; rankings, search and library use `row`. | SE-HOME-01, SE-SRCH-01, SE-RANK-01, SE-AUTHOR-01/02, SE-LIB-01, SE-LIST-01 |
| Continuity | FP-044 owns in-story continuity (read marks, caught-up / read-again CTA, end-of-chapter and end-of-story cards — FP-052 merged into it). FP-047 owns cross-story "what's new" (Home continue rail, library new-chapter badges, nav dot). Both use the single resolver from FP-012. | SE-HOME-01, SE-STORY-01, SE-READ-01, SE-LIB-01 |
| Who can read this story | One reader-visibility model (FP-054) shown in Studio and reused by the pre-publish review (FP-060). | SE-STM-01/02/03, SE-EDT-01 |
| Legal and site frame | FP-065 owns the legal pages' content and the copyright-request flow; FP-039 owns the footer, icons, manifest and default share card that link to them. | SE-SHELL-01, SE-AUTH-02, SE-MOD-02 |
| Navigation | FP-019 is extended (not duplicated): bottom nav below `lg` and header section links from `lg` (BRC-SHELL-02, DEC-022), Following and Authors reachable, Studio links move into the FP-053 workspace. | SE-SHELL-01, SE-HOME-01, SE-AUTHOR-02, SE-STM-* |
| Touch targets | Controls grow to 44 px on coarse pointers via the `touch` size (FP-037), instead of per-screen fixes; FP-022 audits the result. | all |

## 4. Studio story workspace (cross-screen analysis)


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

## 5. Design-system observations (cross-screen)

Sources: `packages/design-tokens/src/tokens.css`, `packages/ui/src/components/*`, `packages/ui/src/widgets/*`, the
screenshots at 390/768/1280 and `metrics.json`. All recommendations are **Proposed** and token-level; no full redesign is
justified — the palette, radius scale and component library (shadcn on Tailwind v4) are sound. What is missing is a
**density layer** (sizes that respond to pointer type), a **type scale**, and **context-specific variants** of the
StoryCard.

**DS-01 Typography hierarchy** — No type-scale tokens; only families (`tokens.css:189-191`). Observed page `h1`: `text-2xl`
(PageHeader, auth, edit profile), `text-2xl sm:text-3xl` (story, chapter), `text-3xl sm:text-4xl` (home hero); section `h2`:
`text-xl` (Home "Mới cập nhật"), `text-lg` (story, search, recommendations, author, stats), `text-base` (settings, team,
chapter manager); EmptyState/ErrorState `h2` `text-lg font-medium` vs. sections `font-semibold`. StoryCard "updated" line
uses an arbitrary `text-[0.7rem]` = 11.2 px (`story-card.tsx:90`), against the tokens' own "no arbitrary values" rule
(`tokens.css:3-4`). Verified (Code). Vietnamese stacked diacritics at 11–12 px with `text-xs` default leading (1.33) read
cramped (Inferred).
Recommendation — add `@utility` classes in `tokens.css`:
| Utility | Size / line-height / weight | Use |
| --- | --- | --- |
| `text-display` | 1.875rem → `sm` 2.25rem / 1.2 / 600 | Home hero only |
| `text-title` | 1.5rem → `sm` 1.875rem (content titles) / 1.25 / 600 | Page `h1` (PageHeader, story, chapter, auth) |
| `text-section` | 1.125rem / 1.4 / 600 | Every section `h2` incl. Settings, EmptyState/ErrorState |
| `text-card-title` | 0.9375rem / 1.35 / 600 | StoryCard, rows |
| `text-body` | 1rem / 1.6 | Default text (not the reader, which keeps `.reader-text`) |
| `text-meta` | 0.8125rem / 1.5 | Author, counts, timestamps |
| `text-caption` | 0.75rem / 1.5 (minimum) | Hints, legal line |
Extend `pnpm check:tokens` to reject `text-[…]`.

**DS-02 Spacing rhythm** — Section gaps vary (`gap-6` on `/me` and settings, `gap-8` on Home, `gap-3` inside
recommendation sections); surface padding `p-3`/`p-4`/`p-5`/`p-6` for similar boxes (settings `p-4`, `/me` `p-5`, auth `p-6`).
Verified (Code). Recommendation: tokens `--space-section: 2rem` (between page sections), `--space-stack: 1rem` (inside a
section), surface padding scale: `compact` 0.75rem (rows, cards), `default` 1rem (settings sections, panels), `roomy` 1.5rem
(auth, dialogs). Keep the 56 px header and `py-6` main.

**DS-03 Surfaces and radius** — About 20 hand-written `rounded-xl border …` boxes with differing `bg-card`, `shadow-xs`,
hover and focus treatments (grep of `rounded-xl border` / `rounded-lg border` in `packages/features`); there is no Card
primitive in `packages/ui`. Radius tokens (`--radius` 0.625rem; sm/md/lg/xl) are consistent and fine: controls `rounded-md`,
covers `rounded-lg`, cards `rounded-xl`, chips `rounded-full`. Recommendation: `Surface` in `packages/ui/components` with
`variant: "plain" | "interactive" | "dashed" | "inset"` and `padding: "compact" | "default" | "roomy"`; plain = `border
bg-card rounded-xl`; interactive adds `hover:bg-accent/40` + the focus ring; dashed for "unavailable" placeholders
(library); inset = `bg-muted/40` for grouped settings. Settings sections, `/me` boxes, auth card, list rows all map to it.

**DS-04 Control sizing and density (touch targets vs. density)** — Button `default` `h-9` (36 px), `sm` `h-8` (32 px),
`icon` `size-9` (36 px); Input `h-9` (`button.tsx:22-27`, `input.tsx:10`). The project token `--size-touch: 2.75rem` and the
`touch-target` utility exist (`tokens.css:73-74,205-208`) but the `touch` button size is used **nowhere in
`packages/features`**: outside `packages/ui` the only `touch-target`/`size="touch"` uses are the two Home chip rows and the gallery (plus `BottomNav` inside `packages/ui`), while
`size="sm"` appears 58 times and `size="icon"` 12 times. Runtime density signal: controls under 44 px — login 5/5,
reader 17/21, story 13/22 at 390 px (`metrics.json`; includes inline links, so it over-states). Verified (Code + Runtime).
Recommendation (keeps desktop density, fixes touch):
```css
:root { --size-control: 2.25rem; --size-control-sm: 2rem; --size-control-lg: 2.5rem; }
@media (pointer: coarse) { :root { --size-control: 2.75rem; --size-control-sm: 2.5rem; --size-control-lg: 3rem; } }
```
Map `Button` sizes `default/sm/lg/icon`, `Input`, `SelectTrigger`, `TabsList` to `h-(--size-control*)`; for `sm` on coarse
pointers add an invisible hit-area extension (`before:absolute before:-inset-1`) so the visual stays compact. Auth and
welcome primary actions use `lg` full width. `Switch` stays visually small but its row becomes the label (44 px row).

**DS-05 Colour, contrast and focus** (light theme computed from tokens; Inferred) —
| Pair | Ratio | Verdict |
| --- | --- | --- |
| `--foreground` on `--background` | 16.9:1 | Pass |
| `--muted-foreground` on `--background` / `--card` | 6.4 / 6.6:1 | Pass |
| `--primary` text on `--background` (links) | 4.8:1 | Pass AA (small text), little margin |
| `--primary-foreground` on `--primary` (buttons) | 4.8:1 | Pass AA |
| `--destructive` on `--background` | 4.7:1 | Pass AA |
| Focus ring: `ring-ring/50` over `--ring` that is already 50 % → ~25 % primary | 1.25:1 (dark 2.56:1) | **Fail** 3:1 (WCAG 1.4.11 / 2.4.7 visibility) |
| `--input` border vs. `--background` | 1.31:1 | **Fail** 3:1 for field boundaries |
| Placeholder cover `--secondary` vs. `--card` | 1.14:1 | Reads as an empty box |
Recommendation: `--ring: light-dark(oklch(0.56 0.15 45), oklch(0.72 0.14 50))` (opaque) and focus style `ring-2 ring-ring
ring-offset-2 ring-offset-background` in Button/Input/Badge/Tabs/StoryCard (replace `ring-[3px] ring-ring/50`); keep
`--border` (0.90) for decorative dividers but set `--input` to about `oklch(0.65 0.015 80)` (computed 3.15:1) for field
outlines; dark `--input` (16 % white, 3.85:1) already passes. Do not lighten `--primary` further (4.8:1 has no margin).

**DS-06 Story cards, covers and list patterns** — One StoryCard shape (`story-card.tsx:36-95`) everywhere: `p-3`, 2:3 cover,
2-line title, author, a wrapping row of two badges (category `secondary`, status `outline`), 2-line synopsis, counters,
"updated" line. Measured heights: 451 px at 390 (two columns of ~173 px; cover ≈ 224 px = half the card), 507–535 px at
768, 511–539 px at 1280 (four columns of 232 px inside the 1024 px column). On Home at 390 the first card starts at
y≈413 and ends at ≈864, i.e. below the 844 px fold and behind the bottom nav, so the first screen shows no complete card
(`m-home.png`). Badges wrap to two lines on long category names ("Lãng mạn học đường"), making rows uneven between
rows (`t-home.png` row 2). Ranking puts the rank badge over the cover corner and the period stats **under** the card
(`ranking-screen.tsx:105-121`, `d-ranking.png`); recommendations put the reason under the card
(`recommendation-list.tsx:38-47`) and on the story page show a single full-height card (`d-story.png`); Library renders a
full card plus buttons below it (`library-screen.tsx:137-170`); the author page repeats the author's name on every card
(`m-author.png`). The grid class string is copy-pasted in 8 files (`ranking-screen.tsx:20`, `discover-screen.tsx:19`,
`library-screen.tsx:27`, `search-screen.tsx:34`, `list-screen.tsx:25`, `recommendation-list.tsx:11`,
`following-screen.tsx:17`, `author-screen.tsx:21`). Placeholder covers are a single 36 px letter on `bg-secondary`
(`story-cover.tsx:28`). Verified (Code + Runtime).

Recommendation — StoryCard variants (FP-037):
| Variant | Anatomy | Target size | Notes |
| --- | --- | --- | --- |
| `grid` (compact browse) | cover 2:3 · title (2-line block, fixed height) · author · **one** meta line "Category · Status" (text, not two badges; 18+ stays a badge on the cover) · counters + relative time on one line; synopsis only from `sm` and only 2 lines | ≤ 360 px at 390 (from 451), ≈ 420 px at 1280 with 5 columns | Home feed, filtered Home, search when the reader browses by tag |
| `row` (compact list row) | `leading` slot (rank numeral, 2.5rem column) · cover thumb 64 × 96 · title (2 lines) · author · meta line · optional 2-line synopsis from `sm` · `meta` slot (period stats, reason, "New chapter 3h ago") · `footer` slot (progress bar, actions) | 112 px (+ footer) | Search results, Rankings, Following feed, Library, Reading list, author page on phones, Welcome step 3 |
| `rail` (horizontal shelf) | cover 2:3 at 112–128 px wide · title 2 lines · `meta` slot (reason) | ≈ 260 px tall, 2.5 items visible at 390 | "Recommended for you", "You may also like", "Trending" (FP-032); fixes the single full-height card |
Rules: captions live **inside** the card (`meta` slot), never below it; the whole card/row is one link, separate actions
sit outside the link; author name hidden on the author's own page (`hideAuthor`); counters use `StatPill` (StoryCard
duplicates its markup today, `story-card.tsx:78-89`). Containers: `StoryGrid` (2 / 3 / 4 / 5 columns at base / `sm` /
`lg` / `xl` with the `browse` width token), `StoryList` (rows with dividers inside one `Surface`, like the chapter list on
the story page), `StoryRail` (scroll-snap, peek, arrow buttons on fine pointers).
Placeholder cover: tinted background from a 6-step palette of new tokens `--cover-1…6` (light ≈ `oklch(0.86–0.90 0.04–0.05
h)`, hues from the chart palette; computed text contrast ≥ 11:1 with `--foreground`) chosen deterministically from the
category (or story id), with the title in `--font-reader` (serif, 2–4 lines) and the author's name small at the bottom —
a book-cover look instead of a letter. Row thumbnails keep the initial letter on the tint.
Screen matrix for other agents: Home feed → `grid`; Home "For you"/Story "You may also like"/Trending → `rail`; Search
stories tab → `row`; Rankings → `row` with `leading` rank (top 3 may use `grid`); Author page → `row` < `md`, `grid` ≥ `md`,
`hideAuthor`; Following feed → `row` with new-chapter meta; Library → `row` with progress footer; Reading list → `row`;
Welcome step 3 → `row` with Save toggle.

**DS-07 Chips and badges** — The same "tag" concept has three looks: 44 px outline chips on Home (`tag-filters.tsx:9-11`),
small `Badge variant="outline"` "#Tình yêu" on the story page (`d-story.png`), and category/status badges in cards that look
like buttons although they are not interactive. Category and tag chip rows on Home share one style, so the two filter
levels are not distinguishable (`m-home.png`). `CHIP` constants are duplicated (`category-chips.tsx:6`, `tag-filters.tsx:9`).
Verified (Code + Runtime). Recommendation: `Chip` component (`variant: "filter" | "tag"`, `selected`, `size` from
`--size-control-sm` with coarse hit-area extension): category filters = `filter` (filled when selected); tags = `tag`
(outline, "#" prefix rendered once, U-TAX-02); non-interactive status/category in cards = plain meta text (DS-06), so only
interactive things look like pills.

**DS-08 Form layout** — Auth forms are clean single-column cards. Inconsistencies: Edit profile builds its own `h1` and
error banner instead of `PageHeader` and the auth `FormError` (`edit-profile-screen.tsx:90-103` vs. `auth-card.tsx:28-37`);
forms (`max-w-xl`) sit left-aligned in the 1024 px column at 1280 px while auth forms are centred; settings switches use
18 × 32 px controls. Verified (Code). Recommendation: move `FormError` to `packages/ui` as `FormAlert`; all form pages use
`PageHeader` + `narrow` width token (centred `max-w-2xl`); sticky save bar on phones for long forms (edit profile, story
form); switch rows as labels.

**DS-09 Empty, error and loading states** — `EmptyState`/`ErrorState` are visually consistent (icon disc, `h2`, muted
text) — good. Gaps: `action` is optional and some page-level uses have none (list missing: dead end, `d-list-missing.png`);
the default Next 404 bypasses tokens entirely (white panel, English, `m-notfound.png`); one card-grid skeleton for every
route. Verified (Runtime + Code). Recommendation: guideline "a page-level EmptyState/ErrorState always has at least one
action"; `PageSkeleton` variants (`grid`, `detail`, `list`, `form`, `reader`); FP-004 pages built from these widgets.

**DS-10 Header controls and icon semantics** — The 18+ shield icon has no visible text; the language button's visible "VI"
is not in its accessible name (`language-switcher.tsx:17-20`); header "Sign in" is a filled primary button that competes with
each page's own primary CTA ("Bắt đầu đọc" on the story page, `m-story.png`). Recommendation: icon-only controls get a
tooltip on fine pointers and stay ≤ 3 in the header; "Sign in" uses the `outline` variant; language moves to menus
(BRC-I18N-01).

**DS-11 Motion and toasts** — No reduced-motion rule (Verified (Code)); Sonner at its default position with a fixed bottom
nav on phones (Inferred overlap). Recommendation: reduced-motion base rule in `tokens.css` (FP-036/FP-037); Toaster
`position="top-center"` below `lg`.

**DS-12 Content width** — One `max-w-5xl` column (`app-shell.tsx:25,29`) for browse grids, detail pages and forms; desktop
story page leaves the right half empty below the header block (`d-story.png`) and browse cards get very tall. Recommendation:
width tokens `--content-browse: 72rem` (5-column grids at `xl`), `--content-default: 64rem`, `--content-narrow: 42rem`
(forms, settings, `/me`), reader keeps `--reader-measure`; `AppShell` `width` prop. Story-page two-column layout at `lg`
(cover + actions sticky left, synopsis + chapters right) is for the reading/story agent to decide.

**DS-13 Dark mode and gallery** — Dark tokens are complete (`light-dark()` for every colour) but no screenshot or test
covers them; the gallery claims "light and dark" without a toggle and omits StoryCard/StoryCover/ReadingProgress/PageSkeleton
(U-DEV-01). Unknown (dark not observed). Recommendation: SE-DEV-01 + a dark-mode visual pass when FP-036 ships.

## 6. Screen enhancement sections

### SE-AUTH-01 — Sign in (SCR-AUTH-01)

**Current experience** — Centred card (`max-w-sm`) under a plain "StoryNest" brand link, outside the main shell
(`apps/web/src/app/(auth)/layout.tsx:5-13`, `packages/features/src/auth/components/auth-card.tsx:16`). Email, password
with show/hide, "Forgot password?", primary "Sign in", footer "Sign up". Error banner per BR-AUTH-013; `?error=callback`
notice. Known limitations: no Google (F-AUTH-02), no resend on "email not confirmed" (F-AUTH-03), no language switch
(U-AUTH-01), forgot link drops `next` (SCR-AUTH-01-A04), header entry has no `next` (U-SHELL-04).

**Identified opportunities**
- Missing functionality: Google button; resend confirmation inline on the "not confirmed" error; language switch. Verified (Code).
- UX/UI: all 5 interactive elements are under 44 px at every width (`metrics.json` login m/t/d: 5/5). Code confirms the primary button and inputs are `h-9` = 36 px (`packages/ui/src/components/button.tsx:22`, `input.tsx:10`) and the eye toggle is `size-9` inside the field. Verified (Runtime) + Verified (Code).
- UX/UI: at 1280 the card floats in a blank page with no way back except the brand (`d-login.png`); a reader who came from a chapter has no "Back to the story". Verified (Runtime).
- Workflow: `next` is lost on "Forgot password?" and when entering from the header. Verified (Code).
- IA: footer link "Sign up" is low-contrast muted text + primary link; acceptable. Contrast of primary on card computed 4.95:1 (passes AA). Inferred.

**Proposed experience**
- Layout: auth layout gets a top bar: left "← Back" (to `next` when it is a safe content path, otherwise Home), centre brand, right compact language menu (FP-021). Card unchanged in width (`max-w-sm`).
- Card content order: "Continue with Google" (outline, full width, 44 px) → divider "or" → email → password (+ "Forgot password?" right-aligned, now carries `next`) → primary "Sign in" (full width, 44 px) → footer "New to StoryNest? Create an account" (keeps `next`).
- "Email not confirmed" error banner gains an inline "Resend confirmation email" button with a 60 s cooldown and a neutral success text (FP-009).
- 390: card loses its border and shadow and becomes the page (edge-to-edge sections with 16 px gutters), so the form starts higher and the keyboard covers less; 768/1280: bordered card as today, vertically centred.
- Density: controls use the coarse-pointer control height (FP-037 `--size-control` = 44 px on touch, 40 px on fine pointers); the password toggle keeps a 44 px hit area.
- Already-signed-in-in-another-tab: listen to the auth broadcast and redirect to `next` (closes the Inferred "Missing" state in SCR-AUTH-01 D).

**Acceptance criteria**
- SE-AUTH-01-AC01 [Proposed] Given a guest on `/story/x/y` who clicks the header "Sign in", When they sign in successfully, Then they land on `/story/x/y`.
- SE-AUTH-01-AC02 [Proposed] Given `/login?next=%2Flibrary`, When the user follows "Forgot password?", completes the reset from the email link, Then they end on `/library`.
- SE-AUTH-01-AC03 [Proposed] Given the "email not confirmed" error, When the user presses "Resend confirmation email", Then a new email is requested, the button is disabled with a countdown for 60 s, and the same neutral message shows whether or not the account exists.
- SE-AUTH-01-AC04 [Proposed] Given a 390 px touch viewport, When the sign-in page renders, Then the email and password fields, the toggle, "Forgot password?" and "Sign in" each have a hit area of at least 44 × 44 px.
- SE-AUTH-01-AC05 [Proposed] Given the sign-in page in Vietnamese, When the user opens the language menu and chooses English, Then all card texts switch without reload and typed values are kept.
- SE-AUTH-01-AC06 [Proposed] Given `next` is a safe content path, When the page renders, Then a "Back" control returns to that path without signing in.

**Impact** — Frontend: auth layout, `SignInScreen`, `AuthCard` variant. Backend/API: none (resend uses `auth.resend`). Database: none. Shared components: `Button`/`Input` sizing via FP-037; `LanguageSwitcher` reused. Business rules: BR-AUTH-007 unchanged (all `next` still pass `safeRedirectPath`). Other screens: SCR-SHELL-01 (header link with `next`), SCR-AUTH-03/04.

**Related** — FP-009, FP-019, FP-021, FP-037; F-AUTH-02, F-AUTH-03, U-AUTH-01, U-SHELL-04.

**Priority** — P2: conversion and return-to-context for every member; nothing here blocks launch on its own, but Google sign-in (approved Q6) does sit in the M1 scope.

### SE-AUTH-02 — Sign up (SCR-AUTH-02)

**Current experience** — Card with email, password (+hint), optional username (+hint), optional display name, "Sign up",
footer "Sign in"; success → "Check your email" card with the address and a "Sign in" link (SCR-AUTH-02-C09). No captcha,
no terms reference, no Google.

**Identified opportunities**
- Missing functionality: Google (F-AUTH-02), captcha (F-ABU-02), resend on the check-email card (F-AUTH-03), Terms/Privacy reference (WBS 6.9). Verified (Code).
- UX/UI: four fields + two multi-line hints put the button at y≈557 of 844 px at 390 px (`m-register.png`); with the on-screen keyboard open (roughly the lower 40 % of the screen) the button and the later fields are hidden while typing (Inferred). The two optional fields are also the ones that cause silent username changes (F-AUTH-01). Verified (Runtime) + Verified (Code).
- Workflow: the check-email card's "Sign in" link invites people to sign in before confirming, which then fails with "email not confirmed". Inferred.
- Workflow: the language chosen on the device is not sent with sign-up, so confirmation emails cannot be localised (`auth.api.ts:24-31` sends only username/display name; email templates are not in the repo: Unknown).

**Proposed experience**
- Form: "Continue with Google" → divider → email → password (strength hint stays one line) → primary "Create account" → one line of small text "By creating an account you agree to the Terms and the Privacy Policy" with links (FP-039; checkbox only if legal requires it, Q-X-02) → footer "Already have an account? Sign in".
- Username and display name leave the form and move to the first-run welcome (FP-035) where availability is checked live (BRC-AUTH-01). If BRC-AUTH-01 is rejected: keep the fields but show a live preview of the final handle ("Your address will be storynest…/author/myname_2026") and availability (FP-009 AC).
- Captcha: invisible Turnstile/hCaptcha, challenge shown only when needed (FP-009).
- Sign-up sends `data.locale = <current language>` so Supabase templates can branch on it (FP-021 amendment).
- Check-email card: address in bold, "Open your email and tap the link. It may take a minute; check Spam/Promotions." Actions: "Resend" (60 s cooldown), "Use a different email" (back to the form with the email pre-filled), and the sign-in link renamed "I've confirmed, sign in".
- 390 vs 768/1280: same as SE-AUTH-01 (borderless on phone).

**Acceptance criteria**
- SE-AUTH-02-AC01 [Proposed] Given BRC-AUTH-01 is approved, When the sign-up form renders, Then it shows "Continue with Google", email and password only, and the identity fields appear in the welcome flow after confirmation.
- SE-AUTH-02-AC02 [Proposed] Given the check-email card, When the user presses "Resend", Then a new confirmation email is requested and the button shows a 60 s countdown.
- SE-AUTH-02-AC03 [Proposed] Given the check-email card, When the user presses "Use a different email", Then the form reappears with the previous email selected for editing.
- SE-AUTH-02-AC04 [Proposed] Given the interface is English, When the user signs up, Then the request carries `locale = "en"` in user metadata.
- SE-AUTH-02-AC05 [Proposed] Given the Terms and Privacy pages exist, When the sign-up form renders, Then both are linked under the submit button and open in the same tab with a way back.

**Impact** — Frontend: `SignUpScreen`, check-email card. Backend/API: `signUp` metadata (`locale`), `auth.resend`. Database: none (trigger unchanged unless FP-009 aligns username rules). Shared components: FP-037 sizing. Business rules: BRC-AUTH-01 (BR-AUTH-003). Other screens: SCR-PRF-03 Welcome [Proposed].

**Related** — FP-009, FP-035, FP-039, FP-021; F-AUTH-01…04, F-ABU-02.

**Priority** — P2: conversion-critical; legal line becomes P1 once Q-X-02 delivers content (tracked in FP-039).

### SE-AUTH-03 — Forgot password (SCR-AUTH-03)

**Current experience** — Card: heading, description, email, "Send link", "Back to sign in"; on success a neutral
"Instructions sent" status card replaces the form (BR-AUTH-014). `m-forgot.png` matches.

**Identified opportunities**
- Missing: resend/cooldown after the sent card (SCR-AUTH-03-AC05 [Proposed] already); `next` is not carried in. Verified (Code).
- UX: the sent card does not repeat the address, so a typo goes unnoticed. Verified (Code) (`forgot-password-screen.tsx` shows only the generic text).
- Workflow: the email link opened on another device ends on `/login?error=callback`, not on "request a new link" (F-AUTH-04). Inferred.

**Proposed experience** — Accept `?next=` and pass it into `redirectTo` (`/auth/callback?next=/reset-password?next=<next>`);
pre-fill the email when arriving from the sign-in form; sent card shows "We sent a link to **a@b.c** if it has an account",
"Resend" (60 s), "Use a different email", "Back to sign in". No layout change beyond SE-AUTH-01's auth frame.

**Acceptance criteria**
- SE-AUTH-03-AC01 [Proposed] Given the user typed an email on SCR-AUTH-01, When they follow "Forgot password?", Then the email field is pre-filled.
- SE-AUTH-03-AC02 [Proposed] Given the sent card, Then it shows the address the link was sent to and the neutral wording of BR-AUTH-014.
- SE-AUTH-03-AC03 [Proposed] Given `/forgot-password?next=%2Fstudio`, When the reset completes, Then the user lands on `/studio`.

**Impact** — Frontend: `ForgotPasswordScreen`, `withNext`. Backend/API: none. Database: none. Shared components: none. Business rules: BR-AUTH-014 unchanged. Other screens: SCR-AUTH-01, SCR-AUTH-04.

**Related** — FP-009; F-AUTH-04; SCR-AUTH-03-AC05.

**Priority** — P3: small convenience on a low-frequency path.

### SE-AUTH-04 — Reset password (SCR-AUTH-04)

**Current experience** — With a session: new password + confirmation, "Change password" → toast → `/`. Without a session:
"This link is invalid or has expired" + "Request a new link" (`m-reset.png`). Any normal session can use the form
without the current password (F-AUTH-05).

**Identified opportunities**
- Security: recovery vs. normal session not distinguished (F-AUTH-05). Verified (Code).
- Workflow: always lands on `/`; other sessions are not ended by the app (WF-AUTH-04 postconditions; Unknown in Supabase). Verified (Code) / Unknown.
- UX: the invalid-link card is a heading + one link (`m-reset.png`); it does not say the two usual causes (older link, opened in another browser/app). Verified (Runtime).

**Proposed experience** — The form is only offered for a **recovery** session (detected from the callback, e.g. a short-lived
`recovery` flag set by the callback after `verifyOtp({ type: 'recovery' })`); a normal signed-in user visiting
`/reset-password` is sent to Settings → Account → Change password (reauthentication, FP-009). Form adds
"Sign out of other devices" (checked by default; Q-AUTH-06). Success → toast "Password changed. You're signed in."
→ `next` (default `/`). Invalid-link card: explanation of both causes, "Request a new link" as a primary button (not a text
link), and "Back to sign in".

**Acceptance criteria**
- SE-AUTH-04-AC01 [Proposed] Given a normal (non-recovery) session, When `/reset-password` is opened, Then the user is redirected to the Settings change-password flow that requires the current password or a reauthentication code.
- SE-AUTH-04-AC02 [Proposed] Given a recovery session and "Sign out of other devices" checked, When the password is changed, Then all other sessions of the account are ended and this one stays signed in.
- SE-AUTH-04-AC03 [Proposed] Given the reset started from `/login?next=%2Flibrary`, When the password is changed, Then the user lands on `/library`.
- SE-AUTH-04-AC04 [Proposed] Given no session, When the page opens, Then a primary "Request a new link" button and a one-sentence explanation of the usual causes are shown.

**Impact** — Frontend: `ResetPasswordScreen`, route guard. Backend/API: callback (`verifyOtp`, recovery flag), `signOut({ scope: 'others' })`. Database: none. Shared components: none. Business rules: BR-AUTH-015 refined (recovery session only) — part of FP-009, needs approval. Other screens: SCR-SET-01 (Account section).

**Related** — FP-009; F-AUTH-04, F-AUTH-05; Q-AUTH-01, Q-AUTH-02, Q-AUTH-06.

**Priority** — P2: closes a security gap (F-AUTH-05) already rated P2.

### SE-PRF-01 — My profile (SCR-PRF-01)

**Current experience** — `PageHeader` "Your profile" + outline "Edit profile"; a definition list (display name, `@username`,
email, bio) in a `bg-card p-5` box (`apps/web/src/app/(main)/me/me-view.tsx:16-43`). Entry: bottom-nav "Me" (mobile) and
user menu "Profile". Web-only component (not a `packages/features` screen). Load errors show "No profile was found"
(F-PRF-01). No avatar, public page link, Settings or Sign out (U-PRF-01).

**Identified opportunities**
- IA: "Me" in the bottom nav leads to a read-only data sheet; Settings, Sign out and the public page live only in the avatar menu (U-PRF-01). Verified (Code).
- Missing: an activation checklist for new members (FP-035), own counts (stories, followers, following, lists) that already exist in other RPCs (author page header). Verified (Code) for absence.
- Architecture: web-only view breaks the WBS Q1 pattern; mobile will need a copy. Verified (Code).
- States: error shown as missing profile (F-PRF-01). Verified (Code).

**Proposed experience** — Turn `/me` into the **account hub** (move to `packages/features/src/profile/screens/me-screen.tsx`):
1. Identity header: 72 px avatar, display name (`text-title`), `@username`, one-line bio (expandable), primary "Edit profile", secondary "View public page" (`/author/<username>`).
2. Counts row (StatPill): stories, followers, following, reading lists (each a link: own author page, followers list later, Library → Following, Library → Lists).
3. Activation checklist card (FP-035) while incomplete and not dismissed.
4. Navigation list (row style, 56 px rows on touch): Library, Studio, Notifications, Settings, Moderation (moderators), Help/Terms (FP-039), "Sign out".
5. Email is shown under Settings → Account, not here (it is private data; the hub is visible on shared screens).
- 390: single column, rows full width. 768: same, `max-w-2xl`. 1280: two columns: identity + counts left (`max-w-sm`), checklist + navigation list right; or a single `max-w-3xl` column if the desktop header nav (FP-019) already covers Library/Studio.
- Error state: `ErrorState` with "Try again" (FP-020).

**Acceptance criteria**
- SE-PRF-01-AC01 [Proposed] Given a signed-in member on `/me`, Then their avatar, display name, `@username`, "Edit profile", "View public page", Settings and "Sign out" are visible without opening the user menu.
- SE-PRF-01-AC02 [Proposed] Given the profile query fails, Then an error state with "Try again" is shown and no "No profile was found" text.
- SE-PRF-01-AC03 [Proposed] Given a member who joined less than 14 days ago with an incomplete checklist, When `/me` opens, Then the checklist card shows the completed and remaining items; When they dismiss it, Then it does not show again on any device.
- SE-PRF-01-AC04 [Proposed] Given a 390 px touch viewport, Then each navigation row is at least 44 px tall and the whole row is the hit area.

**Impact** — Frontend: new shared `MeScreen`, web route uses it. Backend/API: reuse author-page counts RPC; `my_activation_status()` (FP-035). Database: `user_settings.checklist_dismissed_at` (FP-035). Shared components: `StatPill`, `Surface`, row list (FP-037). Business rules: BR-PRF-013 ("My profile content") rewritten — part of FP-019 approval. Other screens: SCR-SHELL-01 (user menu can shrink), SCR-SET-01.

**Related** — FP-019 (amended), FP-020, FP-035; F-PRF-01, U-PRF-01.

**Priority** — P2: it is the bottom-nav destination for every mobile member; today it dead-ends.

### SE-PRF-02 — Edit profile (SCR-PRF-02)

**Current experience** — Own `h1` (not `PageHeader`), avatar editor (80 px preview, add/change/remove), display name,
username (+hint), bio (5 rows, "Up to 1000 characters"), "Save changes" (disabled until dirty), "Cancel"
(`packages/features/src/profile/screens/edit-profile-screen.tsx:90-155`). No unsaved-changes guard (U-PRF-02), username
availability only on save (SCR-PRF-02-AC10 [Proposed]), rename breaks old links (U-PRF-03).

**Identified opportunities**
- UX: no live bio counter; picture removal has no confirmation or undo. Verified (Code).
- UX: username change consequences ("your address changes; old links stop working") are in a hint only. Verified (Code).
- Consistency: own heading markup and own error banner duplicate `PageHeader` and `FormError` (`edit-profile-screen.tsx:91-103` vs `auth-card.tsx:28-37`). Verified (Code).
- Missing: preview of how the profile looks publicly. Inferred value.

**Proposed experience** — `PageHeader` with back to `/me`; sections as `Surface`s: "Picture" (avatar editor; "Remove"
asks for confirmation via `ConfirmDialog` or offers an "Undo" toast), "Public details" (display name; username with live
availability + the resulting address `/author/<name>`; a warning row when the username differs from the saved one:
"Links to your old address will stop working" until FP-011 adds redirects), "About" (bio with live counter `n / 1000`).
Sticky save bar on 390 (bottom, above the bottom nav) once the form is dirty; inline buttons at 768/1280. Unsaved-changes
guard per FP-003. "Preview public page" opens `/author/<username>` in the same tab after save.

**Acceptance criteria**
- SE-PRF-02-AC01 [Proposed] Given the user types a username taken by someone else (any case), When they pause typing for 400 ms, Then "This username is already taken." appears before saving.
- SE-PRF-02-AC02 [Proposed] Given the bio has 990 characters, Then the counter shows "990 / 1000" and turns to the warning colour from 950.
- SE-PRF-02-AC03 [Proposed] Given a picture is set, When the user presses "Remove picture", Then they can confirm or undo, and the picture is not deleted from Storage until confirmed or the undo period ends.
- SE-PRF-02-AC04 [Proposed] Given unsaved edits on a 390 px screen, Then a sticky bar with "Save changes" and "Discard" stays visible above the bottom navigation.

**Impact** — Frontend: `EditProfileScreen`, `AvatarEditor`. Backend/API: `is_username_available(text)` SECURITY DEFINER RPC (shared with FP-035). Database: none. Shared components: `PageHeader`, `FormAlert` (moved `FormError`), `Surface`. Business rules: BR-PRF-010 ordering unchanged if removal is confirmed first. Other screens: SCR-PRF-03 Welcome reuses the identity form.

**Related** — FP-003, FP-011, FP-035, FP-037; U-PRF-02, U-PRF-03.

**Priority** — P3: low-frequency screen; the availability RPC is shared with FP-035, so build them together.

### SE-SET-01 — Settings (SCR-SET-01)

**Current experience** — `PageHeader` "Settings — Saved in your account, used on every device." then four bordered
sections (`settings-screen.tsx:29-38`, no `bg-card`): Language (select), Notifications (3 switches), Reading (opens the
reader settings sheet), Adult content (switch + age dialog). Entry only from the user menu. No account, security,
privacy or data management (F-AUTH-07); language save failure silent (U-SET-01); switches have no pending state (U-SET-02).

**Identified opportunities**
- Missing functionality: Account (email, password, sessions), Privacy & data (export, deactivate, delete), Display (app theme, reduced motion), reading interests (FP-035). Verified (Code).
- IA: the header copy "Saved in your account, used on every device" is not true for every section (reading preferences sync, language may fail silently, 18+ has device copy). Verified (Code).
- UX/UI: `Switch` is `h-[1.15rem] w-8` (≈ 18 × 32 px) (`packages/ui/src/components/switch.tsx`); the label is clickable via `htmlFor`, but the row itself is not, so on touch the reliable target is small. Verified (Code).
- Consistency: sections are transparent bordered boxes while `/me` uses `bg-card` boxes and auth uses `bg-card shadow-xs` (section 7.2 DS-03). Verified (Code).

**Proposed experience** — Group by user intent, in this order (each a `Surface` with an `h2` `text-section`):
1. **Account** — email (masked) + "Change" (FP-008), password + "Change" (reauth, FP-009), "Sign out of all devices" (FP-009), connected Google account when FP-009 ships.
2. **Language & display** — interface language (segmented VI/EN), theme System/Light/Dark, Reduce motion (FP-036).
3. **Reading** — inline summary of current reader preferences ("Medium text · Relaxed spacing · Serif · Sepia") + "Change" (sheet), reading interests chips (FP-035).
4. **Notifications** — existing switches, each disabled while saving (U-SET-02); room for email/push columns (FP-026, community agent).
5. **Content** — Adult content (18+) as today (OBJ-MAT, trust-safety agent owns rules).
6. **Privacy & data** — "Download my data", "Deactivate account", "Delete account" (FP-008), danger styling only on the last two.
- Whole switch rows become the hit area (`<label>` wraps the row; ≥ 44 px on touch).
- Save feedback: inline "Saved" status text per section (polite live region) instead of silence; language failure → "Saved on this device only. Retry" (U-SET-01).
- 390: one column, sections stacked. 768: same, `max-w-2xl`. 1280: two-column layout with a sticky section index on the left (`lg:grid-cols-[12rem_1fr]`) so the long page is navigable; anchors `#account`, `#display`… are linkable from `/me` and the welcome flow.
- Page description becomes "Your account, display, reading and notification settings."

**Acceptance criteria**
- SE-SET-01-AC01 [Proposed] Given a member on `/settings` at 1280 px, Then a section index lists Account, Language & display, Reading, Notifications, Content and Privacy & data, and selecting one scrolls to it and updates the URL hash.
- SE-SET-01-AC02 [Proposed] Given a notification switch save is pending, Then that switch is disabled and the row shows a pending indicator until it settles (U-SET-02).
- SE-SET-01-AC03 [Proposed] Given a 390 px touch screen, When the user taps anywhere on a switch row, Then the switch toggles.
- SE-SET-01-AC04 [Proposed] Given the language could not be saved to the account, Then the Language section shows "Saved on this device only" with "Retry".
- SE-SET-01-AC05 [Proposed] Given the Privacy & data section, When the member presses "Delete account", Then the FP-008 flow starts with reauthentication and a list of consequences; no data changes before final confirmation.

**Impact** — Frontend: `SettingsScreen` restructure, `SwitchRow`. Backend/API: FP-008 RPCs, FP-009 auth calls, FP-036 settings columns. Database: `user_settings` new columns (FP-035/FP-036). Shared components: `Surface`, segmented control (Tabs `line` variant or ToggleGroup — add to ui), row-as-label pattern. Business rules: BR-SET-007 save semantics extended (per-section status). Other screens: SCR-PRF-01 links into anchors.

**Related** — FP-008, FP-009, FP-021, FP-026, FP-035, FP-036, FP-037; F-AUTH-07, F-SET-01, U-SET-01, U-SET-02.

**Priority** — P1: it is the home of FP-008 (P1, MVP, WBS 6.4); restructuring before adding sections avoids a second redesign. The display and interests parts alone would be P3.

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

### SE-EDT-01 — Chapter editor (SCR-EDT-01)

**Current experience** — Purpose: write the chapter's working draft and publish it (BR-EDT-*). Structure (top→bottom,
single left-aligned column `max-w-3xl`, `chapter-editor-screen.tsx:291`): "Back to chapters" + outline buttons
Preview / Version history (32 px) → backup banner / conflict alert → title input (36 px, `maxLength 400`) → toolbar (9
icon buttons, 36 px, wraps) → body (`reader-text`, min 50vh) → publish panel (H2, state badge, Publish / Schedule… /
Unpublish) → footer "n words · status" + "Save draft". Lives in the main shell (sticky header, mobile bottom nav,
`pb-24`). Known limitations: F-EDT-01…10, U-EDT-01…05 (spec §F); no heading/context (U-EDT-03); no in-app flush
(F-EDT-02); panel disappears while loading (F-EDT-04).

**Identified opportunities**
- *Missing functionality*: focus mode, find & replace, writing stats, paste clean-up, empty-body placeholder, next/prev
  chapter, pre-publish review (FP-060), presence (FP-061), checkpoints entry (FP-059). — Verified (Code) absent.
- *UX/UI*: status and Save below the chapter (Verified (Code) `:379-389`); toolbar not sticky (Verified (Code));
  targets < 44 px (Verified (Code) `button.tsx:22-25`); 2-row toolbar at 390 px (Inferred (Code)); keyboard covers
  toolbar + bottom nav eats space (Hypothesised); on desktop the column is left-aligned leaving ~256 px empty on the
  right of the 1024 px main column at 1280 (Inferred (Code), `app-shell.tsx:29` + `:291`).
- *Workflow*: Preview/History exits lose unsaved text (Verified (Code), FP-003); publishing requires scrolling past the
  whole chapter (Verified (Code)); after publish there is no "next chapter" path (Verified (Code)).
- *IA*: no H1 / story / chapter number (Verified (Code), `strings.en.ts:2` unused); Save draft is a primary-looking
  button although autosave is the real mechanism (Verified (Code)).

**Proposed experience** (FP-058 unless noted; reuse `Button`, `Sheet`, `DropdownMenu`, `Tooltip`, `Badge`, `ConfirmDialog`)
- **Frame**: studio writing frame without the bottom nav (BRC-SHELL-01; WBS §1.2 `(studio)` group). Top **action bar**
  (sticky, 56 px incl. safe area) replaces the site header on this screen:
  `[← Chapters] [Story title · Ch. n (truncate)] [status chip] [Preview] [⋯] [Publish ▸]`.
  - *Status chip* (`aria-live` only on state change, not on word count — fixes U-EDT-03): Saved ✓ / Saving… / Unsaved /
    Offline – kept on this device / Not saved – fix title / Conflict. Tapping it opens details (last saved time,
    revision source, "Save now"). "Save draft" moves into the chip/⋯ (still Mod+S, FP-034).
  - *Publish ▸* (primary) opens the **Publish sheet** (FP-060): state badge, Publish/Publish new version, Schedule,
    Unpublish/Cancel, review summary. The bottom-of-page panel is removed. While state loads: skeleton in the sheet;
    error: retry (FP-020/F-EDT-04).
  - *⋯ menu*: Version history, Find & replace (FP-062), Writing stats, Focus mode, Keyboard shortcuts, Previous/Next
    chapter, "Write next chapter" (creates via existing `create_chapter`, CHM rules).
- **Writing column**: title as a borderless large field (H1 semantics via `aria-label` "Chapter title" + visually the
  page heading); body at reader measure (`max-w-[var(--reader-measure)]`, centred) so line length equals the reader.
  Placeholder "Start writing…" on an empty body (Tiptap Placeholder, already in `@tiptap/extensions@3.32.2`).
- **Toolbar**: ≥ md: sticky under the action bar, one row, 44 px targets, tooltips with shortcuts. < md: a single-row,
  horizontally scrollable bar of 44 px buttons docked to the bottom of the *visual* viewport while the body has focus
  (above the keyboard; `visualViewport` resize on web, Capacitor Keyboard plugin in WP 7.3); order B, I, H, picture,
  divider, U, S, then undo/redo pinned right. Hidden when the title has focus.
- **Focus mode** (toggle in ⋯, Mod+Shift+F on desktop): hides action bar except a faint status dot and "Exit focus",
  hides toolbar until text is selected (selection bubble on desktop via bubble-menu, already installed), typewriter
  scrolling optional (Proposed, off by default). Remembered per device (localStorage, best effort).
- **Banners** (backup, conflict, scheduled-edit warning from FP-010, presence from FP-061) stack under the action bar,
  compact one-line with "Details" expander on mobile.
- **Breakpoints**: 390 — action bar collapses Preview into ⋯, title truncates, Publish sheet = bottom sheet (max 85vh,
  scrollable, primary button sticky at its bottom), docked toolbar; 768 — Preview visible, toolbar sticky top, Publish
  sheet from the right (420 px); 1280 — centred writing column + optional **right rail** (320 px) showing the publish
  state, word stats and last checkpoint; rail hidden in focus mode.

**Acceptance criteria** [Proposed]
- SE-EDT-01-AC01 — Given the editor at 390 px with the keyboard open and the cursor in the body, When the author types, Then the formatting bar is visible directly above the keyboard, every button is ≥ 44×44 px, and no bottom navigation is shown.
- SE-EDT-01-AC02 — Given any autosave state change, When it happens, Then the action-bar status chip shows it without scrolling, and screen readers announce the state change but not word-count changes.
- SE-EDT-01-AC03 — Given the editor, When it loads, Then the story title and "Chapter n" (published position or sort order per Q-READ-01) are shown in the action bar and the page has exactly one H1-level heading.
- SE-EDT-01-AC04 — Given the author presses "Publish ▸", When the publish state is still loading or failed, Then the sheet shows a skeleton or an error with "Try again" — never nothing (F-EDT-04).
- SE-EDT-01-AC05 — Given focus mode is on, When the author selects text on desktop, Then a formatting bubble appears; When they press Esc or "Exit focus", Then the full frame returns and the setting is remembered on this device.
- SE-EDT-01-AC06 — Given a chapter was just published, When the success toast appears, Then it offers "Write next chapter", which opens the next existing draft chapter or, if none, the create-chapter flow of SCR-CHM-01.
- SE-EDT-01-AC07 — Given an empty body, When the editor shows, Then a placeholder hint is visible and is not part of the saved body or word count.
- SE-EDT-01-AC08 — Given 1280 px, When the editor shows, Then the writing column is centred at the reader measure and the right rail shows publish state and word stats; in focus mode the rail is hidden.
- SE-EDT-01-AC09 — Given unsaved changes, When the author taps "← Chapters", Preview or History, Then FP-003 flush/guard applies (save first; if offline, navigate and show "Saved on this device only").

**Impact** — Frontend: editor screen restructure, new `EditorActionBar`, `PublishSheet` (wraps current `PublishPanel`
logic), docked toolbar hook (`useVisualViewport`). Backend/API: none (FP-060 adds a read RPC). Database: none.
Shared components: `AppShell` variant without bottom nav (or a `StudioShell`), `Sheet` bottom/side usage, Tooltip.
Business rules: BRC-SHELL-01; BR-EDT-024 panel location text. Other screens: SCR-HIST-02 (Publish entry), SCR-CHM-01
(create next chapter), SCR-SHELL-01.

**Related** — FP-058, FP-060, FP-062, FP-003, FP-010, FP-020, FP-022, FP-030, FP-034; F-EDT-01…05, U-EDT-01…05.

**Priority** — **P1** for the FP-003 exits (data loss) and the status/publish placement; **P2** for the mobile frame
(P1 if Q-EDT-06 says mobile web authoring is a launch target); P3 for focus mode and right rail.

### SE-HIST-01 — Version history (SCR-HIST-01)

**Current experience** — Purpose: list published versions, view one read-only with reader rendering, compare
(block-level) with the draft or another version, restore into the draft (BR-HIST-001…009). Structure: PageHeader →
"Back to editor" → `<ol>` of version cards (full width) → viewer section (Content/Compare toggle, Restore, content or
diff). Single column `max-w-3xl` at every width (`history-screen.tsx:103`). Limitations: F-HIST-01 (restore without
undo), F-HIST-02 (endless skeleton), U-HIST-01 (title/wording), no checkpoints, no entry from chapter manager.

**Identified opportunities**
- *Missing functionality*: draft checkpoints (FP-059) — Verified (Code) absent; undo after restore — Verified (Code).
- *UX/UI*: list above viewer, no scroll-to-viewer on select (Verified (Code) `:116-149`); diff shows whole chapter,
  no changes-only filter / next change / word highlight (Verified (Code) `:318-335`); Content/Compare and Restore are
  32 px (Verified (Code)); "Compare" base defaults to draft but the summary does not say how the *live* version
  differs (Inferred).
- *Workflow*: restore → toast + "Open editor" link (fine); restore uses a fresh revision (F-HIST-01) — FP-003.
- *IA*: published versions and (future) checkpoints need one timeline with clear labels; the live version should be
  pinned/identifiable at a glance (Inferred).

**Proposed experience** (reuse `Tabs`, `Select`, `Sheet`, `Badge`, `ConfirmDialog`, `BlockView`)
- **Header**: "Version history · {chapter title}" + Back to editor; tabs **Published** | **Checkpoints** (FP-059; tab
  hidden until approved).
- **390 px**: version picker as a full-width trigger ("Version 5 · Live · 2 days ago ▾") opening a bottom sheet list;
  viewer directly under it; mode toggle as a 2-segment control (44 px); Restore in a sticky bottom bar of the viewer.
- **768 px**: same as mobile, picker as a `Select`; **1280 px**: master–detail — list left (300 px, scrollable,
  sticky), viewer right; selecting updates the viewer without page jump; keyboard ↑/↓ moves selection.
- **Compare**: default filter **Changes only** (with "Show whole chapter" toggle); "Previous / Next change" buttons
  with position "2 of 7"; changed text blocks show word-level `<ins>/<del>` highlighting (client-side word diff on the
  two texts, no new service) plus sr-only "Before/After"; title change row on top; image change shows before/after
  thumbnails; counters say "blocks" or split "paragraphs, pictures, dividers" (U-HIST-01). Quick base chips: "Current
  draft" · "Live version" · "Previous version".
- **Restore**: dialog states what will happen to the current draft ("It will be kept as a checkpoint" when FP-059 is
  approved, else "kept as a backup on this device" per FP-003) and sends the revision the screen loaded (FP-003).
  After success: inline status with **Undo** (restores the replaced draft) and Open editor.
- **Errors**: base load failure → ErrorState with retry (F-HIST-02 / FP-020).
- **Entry**: also from the chapter manager row menu (consolidation with CHM agent).

**Acceptance criteria** [Proposed]
- SE-HIST-01-AC01 — Given 12 versions at 390 px, When the author picks version 3 from the version picker, Then the viewer shows version 3 without the author scrolling past the list.
- SE-HIST-01-AC02 — Given 1280 px, When the history opens, Then the list and the viewer are side by side and the list stays visible while the viewer scrolls.
- SE-HIST-01-AC03 — Given Compare with 7 changed blocks in a 200-block chapter, When "Changes only" is on (default), Then only the 7 blocks (plus one context block each side, collapsed counts in between) are shown, and "Next change" moves focus to each in order.
- SE-HIST-01-AC04 — Given a paragraph where one word changed, When compared, Then that word is highlighted as removed/added and screen readers get "Before"/"After" text.
- SE-HIST-01-AC05 — Given the version title differs from the base, When compared, Then a "Title changed" row shows old and new titles (U-HIST-01).
- SE-HIST-01-AC06 — Given a successful restore, When the inline status shows, Then "Undo" puts back the exact draft that was replaced (same title, body and block ids) and is offered until the author leaves the screen.
- SE-HIST-01-AC07 — Given the base version fails to load, When Compare is shown, Then an error with "Try again" replaces the skeleton.
- SE-HIST-01-AC08 — Given a chapter with no published versions but with checkpoints (FP-059), When the history opens, Then the Checkpoints tab is selected instead of the empty state.

**Impact** — Frontend: history screen layout, diff filter/navigation, word diff util in `history/model`. Backend/API:
none for layout; restore revision via FP-003; checkpoints via FP-059. Database: none (FP-059 separate). Shared
components: `Tabs`, `Sheet`; maybe a `SegmentedControl` pattern on `Button`. Business rules: BR-HIST-005 (presentation
only; matching rule unchanged), BR-HIST-006 via BRC-HIST-01. Other screens: SCR-EDT-01, SCR-CHM-01 (entry).

**Related** — FP-059, FP-003, FP-020, FP-022; F-HIST-01, F-HIST-02, U-HIST-01.

**Priority** — **P2**: restore safety parts are P1 inside FP-003; layout and diff UX are P2 (history is used rarely
but at high-stakes moments); word-level diff P3.

### SE-HIST-02 — Chapter preview (SCR-HIST-02)

**Current experience** — Purpose: show the saved draft with the reader's components and settings sheet (BR-HIST-007).
Structure: sticky bar (Back to editor, ReaderSettingsSheet) → note "This is a draft…" → article (H1 title + blocks).
Rendered inside the main shell. Limitations: stale (saved draft only, F-EDT-02); no "Chapter n" label or end marker
(U-HIST-02); error text says "history" (U-HIST-02); no way to publish from here.

**Identified opportunities**
- *Missing functionality*: publish from preview; phone-width frame on desktop; unsaved-text indicator. — Verified
  (Code) absent.
- *UX/UI*: the preview bar is `sticky top-0 z-10` while the site header is `sticky top-0 z-30`
  (`preview-screen.tsx:48`, `app-shell.tsx:24`): both stick at 0, so once the page scrolls the bar slides under the
  header and "Back to editor" is hidden — Inferred (Code); same pattern in the reader (`reader-screen.tsx:74`), flagged
  for the reader agent. Header differs from the real reader, which shows "Chương 2" above the title
  (Verified (Runtime) guest reader `m-reader.png`; preview code has no label — Verified (Code)).
- *Workflow*: Preview → back → scroll → publish (Verified (Code)); the preview cannot tell the author whether it
  includes their latest typing (Verified (Code)).
- *IA*: the note is generic; it could state status ("Draft · not visible to readers" / "Scheduled for…" /
  "Published — this draft has unpublished changes").

**Proposed experience**
- Studio writing frame (BRC-SHELL-01): the preview bar becomes the only sticky bar: `[← Editor] [state badge] [Aa
  settings] [Publish ▸]`; Publish opens the same review sheet as the editor (FP-060).
- Chapter header identical to the reader (story title link disabled, "Chapter n" label, H1), end-of-chapter marker,
  and greyed placeholders where vote/comments will appear ("Readers can vote and comment here") so the author sees
  the real page rhythm, without interactive controls.
- Freshness line in the note: "Showing the draft saved at 10:42" and, if the editor still had unsaved text that could
  not be saved (offline flush failure, FP-003), "Changes made after that are not included".
- ≥ md: device toggle **Phone 390 · Tablet 768 · Full** constraining the article width (no iframe, CSS only) so desktop
  authors can check how long paragraphs and pictures look on a phone. 390: no toggle; bar 56 px with 44 px targets.
- Error text specific to preview ("Couldn't load the preview").

**Acceptance criteria** [Proposed]
- SE-HIST-02-AC01 — Given the preview is scrolled, When the author looks for "Back to editor", Then the preview bar remains visible (not covered by any header).
- SE-HIST-02-AC02 — Given the preview of chapter 4, Then "Chapter 4" appears above the title and an end-of-chapter marker after the last block, as in the reader.
- SE-HIST-02-AC03 — Given the author presses "Publish ▸" in the preview, When they confirm in the review sheet, Then the chapter is published with the revision shown in the preview and the preview's state badge updates.
- SE-HIST-02-AC04 — Given 1280 px and "Phone" selected, Then the article renders at 390 px width with the reader typography; the choice is not persisted to reader preferences.
- SE-HIST-02-AC05 — Given the draft fails to load, Then the error reads "Couldn't load the preview" with "Try again".
- SE-HIST-02-AC06 — Given the editor could not save before navigating (offline), When the preview opens, Then the note says later changes are not included.

**Impact** — Frontend: preview header/footer reuse of reader `ChapterHeader`-like parts (extract from `reader-screen`
into a shared presentational component), device toggle, Publish entry. Backend/API: none (uses FP-060 read RPC).
Database: none. Shared components: reader header/end marker extraction; `PublishSheet` from FP-058/060. Business
rules: BR-HIST-007 exceptions list shrinks (no BR conflict). Other screens: SCR-READ-01 (shared header component),
SCR-EDT-01.

**Related** — FP-003 (fresh preview), FP-058, FP-060, FP-020; F-EDT-02, U-HIST-02.

**Priority** — **P2** (staleness itself is P1 via FP-003; header parity is a quick fix; publish-from-preview and
device toggle P2/P3).

---

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

### SE-MOD-01 — Moderation console (SCR-MOD-01)

**Current experience**
- *Purpose:* report queue for moderators (BR-MOD-019/020). The route is `(main)/moderation`, inside the main shell
  with header and mobile bottom nav. WBS §1.2 planned an `(admin)/moderation` group (`docs/WBS.md` §1.2 tree line
  "(admin)/moderation/"). Verified (Code).
- *Structure:* PageHeader "Moderation" + description; Tabs "Pending" / "Resolved"; `InfiniteList` of `ReportCard`
  (badges → title → "Status · Open content" → details → "Reported by" → button row); a reason dialog per card
  (`moderation-screen.tsx:49-86`, `report-card.tsx:67-190`). Max width `max-w-3xl` (`moderation-screen.tsx:50`).
- *Actions:* content actions (hide/unhide, remove/restore, suspend/reinstate) and report actions (under review,
  resolve, dismiss). Each needs a 3–1000 char reason.
- *Known limitations:* U-MOD-01 (no date, comment author, closed-by, consequence), U-MOD-02 (no filters or URL),
  F-MOD-03 (Restore offered for author-deleted), F-MOD-04 (cannot lock author-hidden), F-MOD-07 (no history),
  Q-MOD-03, Q-HIST-02. **Not run at runtime** (signed-in only).

**Identified opportunities**
- *Missing functionality:* case grouping by target. Verified (Code): one card per report. Severity ordering. Verified
  (Code): date order only. History panel. Verified (Code): data readable via RLS, no UI. Preview of removed content.
  Verified (Code): `story.api.ts:33`, `reader.api.ts:31`. Graduated actions. Verified (Code): BR-MOD-011…014.
- *UX/UI:* destructive and neutral buttons share one wrapping row of `size="sm"` buttons. Verified (Code)
  `report-card.tsx:100-156`; the effect at 390 px is Inferred. There is no consequence text (Verified (Code)). The toast
  "Done." does not name the action (Verified (Code) `strings.en.ts:94`).
- *Workflow:* the "Under review" status is not shown to other moderators. Verified (Code): `reviewed_by` is dropped
  in `report.ts:37-54`. "Open content" leaves the console with no way back to the same position. Verified (Code).
- *Information architecture:* "Resolved" tab mixes resolved and dismissed (FP-024 already proposes "Closed"). There is
  no place for appeals (FP-063), legal requests (FP-065) or operations (FP-066). Inferred.

**Proposed experience**
- *Sections (reuse `PageHeader`, `Tabs`, `InfiniteList`, `Badge`, `Dialog`, `EmptyState`, `ErrorState`, `Skeleton`,
  `ConfirmDialog`, `DropdownMenu`):*
  1. **Queue bar:** tabs `Open` · `Closed` · `Appeals` (FP-063) · `Legal` (FP-065), shown to moderators. `Operations`
     (FP-066) is shown to admins only (Q-MOD-09). Filters (kind, reason, status) in a `DropdownMenu`. Sort "Priority"
     (default for Open) or "Oldest". Every value is held in the URL (`?tab=open&kind=comment&reason=harassment`).
  2. **Case list:** one row per **target**: kind icon + badge, title or excerpt (2 lines), state badge, "N reports",
     distinct reasons, oldest report age ("waiting 2 d"), priority marker (tier from FP-065 guidelines, Q-MOD-05),
     and "Under review by <name>" when claimed.
  3. **Case detail** (`/moderation/<kind>/<targetId>`):
     - *Subject*: read-only preview (story synopsis + chapter list; chapter text scrolled to the anchored paragraph;
       comment with its parent; account profile summary). This includes removed content, with a "Removed by a
       moderator · date" banner.
     - *Reports*: each report with reporter, reason, details and date.
     - *History*: audit rows for this target, then the owner account's last 10 actions and its other open cases.
     - *Decision panel*.
  4. **Decision panel:** a primary group "Take action" lists only the actions valid for the state: Hide comment ·
     Hide as moderator (author-hidden, FP-006) · Mark 18+ (BRC-MAT-02) · Remove chapter (if Q-MOD-03 = yes) · Remove
     story · Suspend (duration select if timed suspension is approved). A separate secondary button "No violation —
     dismiss reports". "Mark under review" sits as a ghost button in the header.
  5. **Action dialog:** title = action; **consequence text** (fixed per action, e.g. "Readers will get 'not found'.
     The author keeps the story in Studio as 'Removed by a moderator' and can appeal."); "Rule" Select (guideline
     sections, FP-065); "Internal note" (3–1000, logged, required); optional "Message to the user" (≤ 500, shown in the
     FP-006 notice); "Notify: author / reporters" read-only line; Confirm in the destructive variant for take-downs.
- *Primary vs secondary:* the take-down action that fits the most common reason is the primary. Dismiss is secondary;
  Under review is tertiary.
- *Interaction:* after Confirm, the case leaves Open optimistically (rolled back on error). The toast names the action
  and links to the case. A PT409 shows "Another moderator changed this case" with a "Reload case" button.
- *UI states:* skeleton rows; empty Open "Nothing waiting — oldest closed case 3 h ago"; load-more errors kept inline
  under the list instead of replacing it (fixes Inferred SCR-MOD-01-A03 behaviour).
- *Navigation:* back from detail restores the list, its filter and its scroll position. "Open public page" opens a new
  tab.
- *Responsive:*
  - **390 px:** list only; detail is a full page; the decision panel is a sticky bottom bar (primary + "More actions"
    sheet); controls ≥ 44 px; no bottom nav (admin layout).
  - **768 px:** list → detail as full page; decision panel inline at the top of the detail.
  - **1280 px:** two panes (list 380 px fixed, detail fluid, max 1200 px total); keyboard `j/k` to move, `Enter` to open
    (optional).
- *Density:* list rows 72–88 px; detail sections collapsible; history limited to 10 rows with "Show all".

**Acceptance criteria**
- **SE-MOD-01-AC01** [Proposed] Given two or more open reports on the same target, When the moderator opens the Open tab, Then exactly one case row is shown for that target with the report count, the distinct reasons and the age of the oldest report.
- **SE-MOD-01-AC02** [Proposed] Given open cases whose reasons belong to different severity tiers, When the Open tab loads with the default sort, Then cases are ordered by tier (highest first) and then by oldest report.
- **SE-MOD-01-AC03** [Proposed] Given the moderator sets tab, kind, reason and sort, When the page is reloaded or the URL is opened by another moderator, Then the same filtered list is shown.
- **SE-MOD-01-AC04** [Proposed] Given a case row, When it is activated, Then the detail opens at `/moderation/<kind>/<targetId>`: in a right pane at ≥ 1024 px, as a full page below 1024 px. Back returns to the list with filter and scroll position kept.
- **SE-MOD-01-AC05** [Proposed] Given a case whose story or chapter was removed by a moderator, When the detail opens, Then a read-only preview of the content is shown with a "Removed by a moderator" banner and no not-found state.
- **SE-MOD-01-AC06** [Proposed] Given a target with earlier moderation actions, When the detail opens, Then History lists each action with date, moderator display name, action and reason (newest first), followed by the owner account's last 10 actions and links to its other open cases.
- **SE-MOD-01-AC07** [Proposed] Given another moderator marked the case "Under review", When a second moderator views the row or the detail, Then "Under review by <name> · <relative time>" is shown. Starting an action shows a non-blocking warning naming that moderator.
- **SE-MOD-01-AC08** [Proposed] Given a take-down action is chosen, When the dialog opens, Then it shows the fixed consequence text and who will be notified, requires a guideline rule and an internal note of 3–1000 characters, and offers an optional message to the user (≤ 500).
- **SE-MOD-01-AC09** [Proposed] Given an action succeeds, Then every open report of the case closes, the case leaves the Open list at once, and the toast names the action (for example "Story removed") with a link to the case.
- **SE-MOD-01-AC10** [Proposed] Given a story or chapter case whose target was deleted by its author, Then neither "Remove story" nor "Restore story" is offered and the state reads "Deleted by author" (F-MOD-03).
- **SE-MOD-01-AC11** [Proposed] Given a 390 px viewport, When a case detail is open, Then the decision bar stays visible at the bottom, every control is ≥ 44 px high, take-down actions are visually separated from "No violation — dismiss reports", and no bottom navigation overlays it.
- **SE-MOD-01-AC12** [Proposed] Given a chapter report that carries a paragraph anchor (SE-MOD-02-AC10), When the detail opens, Then the preview scrolls to and highlights that paragraph.
- **SE-MOD-01-AC13** [Proposed] Given loading the next page fails, Then the already loaded cases stay visible and an inline "Couldn't load more · Try again" appears under the list.

**Impact**
- *Frontend:* `moderation-screen.tsx` → list/detail; new `case-detail`, `decision-panel`, `history-list`; URL-synced
  filters via `useNavigation` search params; new route `apps/web/src/app/(admin)/moderation/[kind]/[targetId]/page.tsx`
  (or under `(main)` if the shell agent keeps one shell).
- *Backend/API:* new `list_cases(tab, kind, reason, sort, cursor, limit)` that groups `content_reports` by target,
  with priority from a reason→tier map. New `moderation_target_history(kind, id)` that joins `moderation_actions` and
  actor display names (the direct table read works but lacks names). New `moderation_preview(kind, id)` that returns
  story/chapter/comment content regardless of `deleted_at` for `is_moderator()` (reuses `can_read_*`, which already
  admits moderators). `moderate` gains `set_mature`, optional `remove_chapter`, optional suspension `until`, and the
  `rule` / `user_message` arguments.
- *Database:* `moderation_actions` + `rule text`, `user_message text`; `content_reports` + `paragraph_id` (nullable);
  possibly `app_users.suspended_until`. Indexes on `content_reports(status, coalesce(target))`.
- *Shared components:* none new. `DropdownMenu`, `Sheet`, `Tabs` and `Badge` already exist in `packages/ui`.
- *Business rules:* BRC-MAT-02 (moderator sets 18+); new rules for cases, rule citation and timed suspension
  (pending Q-MOD-03/05).
- *Other screens:* SCR-STM-01 (removed state, FP-006), SCR-SHELL-01 (admin layout), SCR-SET/notifications (notices).

**Related** FP-024 (amended), FP-006, FP-063, FP-065, FP-066; F-MOD-03/04/07, U-MOD-01/02; Q-MOD-03/05, Q-MAT-04,
Q-HIST-02.

**Priority** **P2.** History, removed-content preview, consequence text, the F-MOD-03 fix and the case grouping are
needed for correct decisions and for appeals before launch. Priority sort, timed suspension and keyboard shortcuts
are P3.

### SE-MOD-02 — Report button and dialog (SCR-MOD-02)

Spec file `flag-content-dialog.md`.

**Current experience**
- *Purpose:* let a member flag a story, chapter, comment or account (WF-MOD-01).
- *Structure:* ghost `size="sm"` button with Flag icon and visible "Report" ("Báo cáo"). The Dialog has the title
  "Report content: <kind>", a description, a reason `Select` (7 values), a details `Textarea` (`maxLength` 2000, no
  counter), an alert line, and "Cancel" / "Submit report" (`report-button.tsx:79-140`).
- *Placement (Runtime):* story page: own row under Follow / Save / Add to list at 390 and 1280 px
  (`m-story.png`, `d-story.png`). Reader: centred after the vote button at the end of the chapter (`m-reader.png`).
  Visible to guests (RT-10).
- *Known limitations:* F-MOD-01/F-STORY-01 (owner sees it), U-MOD-03 (no "Reported" state), F-MOD-08 (unused Zod
  schema), guest intent lost after sign-in (BR-MOD-004).

**Identified opportunities**
- *Missing functionality:*
  - No reason descriptions and no guideline link. Verified (Code) `report-button.tsx:102-113`.
  - No structured copyright claim. Verified (Code).
  - No "Reported" state or status. Verified (Code), U-MOD-03.
  - No next step after sending (block, my reports). Verified (Code): toast only, `report-button.tsx:71-74`.
  - No passage anchor for chapter reports. Verified (Code): `submit_report(kind, target, reason, description)`,
    `moderation.sql:119`.
- *UX/UI:*
  - Report on its own row adds a full extra row on the story page (≈ 45 px at 390 px, read from the screenshot) for a rare action.
    Verified (Runtime).
  - The `sm` button is below 44 px. Verified (Runtime): 13 of 22 controls < 44 px on `m-story`, 17 of 21 on
    `m-reader` (`metrics.json`). The Report control's own height is Inferred from the screenshot.
  - A long form in a centred Dialog at 390 px may sit under the keyboard. Inferred.
- *Workflow:* guest → login → back to the pathname only. The dialog does not reopen and `#comments` is lost.
  Verified (Code) `report-button.tsx:86-88`.
- *Information architecture:* Report is a destructive/rare action, yet on the story page it is placed at the same
  visual level as engagement actions. Inferred.

**Proposed experience**
- *Placement:*
  - Story page: move "Report story" into a "More actions" (`MoreHorizontal`) `DropdownMenu` at the end of the
    secondary action row (with future "Share"). The menu trigger is 44 × 44 px. Same at 768/1280 px.
  - Reader: keep it at the end of the chapter as a quiet text button with a 44 px hit area.
  - Comment: inside the comment "⋯" menu (owned by the community agent).
  - Author page: inside a "⋯" menu next to Follow, together with "Block" (FP-064).
  - Hidden for owners on every host (F-STORY-01 quick fix).
- *Dialog content:*
  1. Reason Select. Under it, a one-line description of the selected reason (e.g. Harassment: "Targets a person with
     insults, threats or unwanted contact") and the link "Community guidelines ↗" to the matching section (FP-065).
  2. **Copyright branch** (FP-065): "Link to the original work" (URL, required), "I own this work or am authorised by
     the owner" (checkbox, required), and a note that the author will be told and can respond.
  3. Details with a counter shown from 1800 characters.
  4. **Paragraph anchor:** when opened from the reader's paragraph sheet ("Report this paragraph"), a read-only quote
     of the paragraph (first 140 chars) is shown and its anchor is sent.
- *Success view (replaces toast-only):* "Thanks — a moderator will review this." Then "See my reports" (FP-031),
  "Block <name>" for comment/user reports (FP-064), and the primary "Done".
- *Already reported:* the button reads "Reported" (check icon). Opening it shows "You reported this on <date> ·
  Status: Pending / Under review" and "Withdraw report" (FP-031 amendment).
- *Guest:* `next` keeps path + query + hash plus `report=<kind>:<id>`. After sign-in the host reopens the dialog for
  that target, unless the member owns it or already reported it.
- *Responsive:* 390 px → bottom `Sheet` (same pattern as the reader's paragraph comments, `m-reader-paragraph-sheet.png`)
  with a sticky footer above the keyboard. 768/1280 px → `Dialog` max-w-md.

**Acceptance criteria**
- **SE-MOD-02-AC01** [Proposed] Given the story owner on their own story page or chapter, Then no Report control is rendered on either (F-STORY-01).
- **SE-MOD-02-AC02** [Proposed] Given a story page at any width, Then "Report story" is an item of a "More actions" menu at the end of the secondary action row, the menu trigger is at least 44 × 44 px, and no row is used for Report alone.
- **SE-MOD-02-AC03** [Proposed] Given a guest who clicks Report on a comment while the URL has a query and `#comments`, When they sign in, Then they return to the same URL including query and hash and the report dialog opens for the same comment.
- **SE-MOD-02-AC04** [Proposed] Given the dialog, When a reason is selected, Then a one-line description of that reason appears under the select together with a link to the matching guideline section that opens in a new tab.
- **SE-MOD-02-AC05** [Proposed] Given reason "Copyright infringement", Then the fields "Link to the original work" (valid http(s) URL) and the authorisation checkbox appear, and "Submit report" stays disabled until both are valid.
- **SE-MOD-02-AC06** [Proposed] Given details of 1800 characters or more, Then a live counter "n/2000" is shown and announced politely to screen readers.
- **SE-MOD-02-AC07** [Proposed] Given a successful report on a comment or account, Then the dialog switches to a success view with "See my reports", "Block <name>" and "Done". For a story or chapter only "See my reports" and "Done" are shown.
- **SE-MOD-02-AC08** [Proposed] Given the member has an open report on this target, Then the control reads "Reported", and opening it shows the report date and status instead of the form.
- **SE-MOD-02-AC09** [Proposed] Given a 390 px viewport, When the dialog opens, Then it renders as a bottom sheet whose footer buttons are ≥ 44 px and remain visible while the on-screen keyboard is open.
- **SE-MOD-02-AC10** [Proposed] Given the reader's paragraph sheet, When "Report this paragraph" is used, Then the report is stored with the paragraph anchor and the dialog shows the quoted paragraph start.

**Impact**
- *Frontend:* `report-button.tsx` (success view, reported state, copyright branch, sheet on mobile, intent restore);
  hosts `story-screen.tsx:111-114`, `reader-screen.tsx:114-116`, `author-screen.tsx:89`, `comment-item.tsx:183`; the
  sign-in `next` handling (`withNext`).
- *Backend/API:* `submit_report` + optional `p_evidence jsonb` and `p_paragraph_id`; `my_reports()` / RLS read
  (FP-031); `withdraw_report(id)`.
- *Database:* `content_reports.evidence jsonb`, `content_reports.paragraph_id uuid` (nullable, no FK because blocks
  change between versions; validated against the published version at submit).
- *Shared components:* none new (`DropdownMenu`, `Sheet`, `Select`, `Checkbox` exist).
- *Business rules:* BRC-MOD-03 (intent kept after sign-in changes BR-MOD-004's "query/hash not kept"); new evidence
  rules (FP-065).
- *Other screens:* SCR-STORY-01, SCR-READ-01, SCR-CMT-01, SCR-AUTHOR-01, SCR-AUTH-01 (`next`).

**Related** FP-031 (amended), FP-064, FP-065, FP-006; F-MOD-01/F-STORY-01, F-MOD-08, U-MOD-03; RT-10.

**Priority** **P2** overall. AC01 is a P1 quick fix: it is already listed under "Quick fixes" and is a confusing dead
end for authors. AC10 (paragraph anchor) is P3.

### SE-MAT-01 — Adult-content gate and header 18+ control (SCR-MAT-01)

**Current experience**
- *Purpose:* stop an 18+ story opened by link from showing before age confirmation; let anyone switch 18+ in lists.
- *Structure (Runtime, `m/t/d-mature-gate.png`):*
  - Inside the full shell: header + bottom nav at 390 px.
  - A centred panel in the upper half of the page: shield icon in a circle, title "Truyện dành cho người lớn",
    description "Tác giả đã đánh dấu truyện này là 18+. Hãy xác nhận bạn từ 18 tuổi trở lên để xem.", then the
    buttons "Quay lại" (outline) and "Tôi từ 18 tuổi trở lên, tiếp tục" (primary) side by side.
  - The lower half of the viewport is empty at every width.
  - Header: a bare shield icon (ShieldAlert) between Search and "VI", with no text.
- *Actions:* confirm (sets `{ageConfirmed:true, show:true}` for the device/account), go back (history back),
  header dialog (show / keep hidden / hide again).
- *Known limitations:* F-MAT-01 (title leaks into the tab — Runtime RT-06), F-MAT-02, F-MAT-03, U-MAT-01 (Go back
  without history), U-MAT-02 (icon-only toggle semantics), Q-MAT-01 (re-asks after hiding).

**Identified opportunities**
- *Missing functionality:*
  - No statement that confirming changes all lists. Verified (Code): `use-adult-content.ts:15`, `strings.en.ts` gate
    copy.
  - No undo after confirming. Verified (Code).
  - No explanation of what 18+ covers and no link to a policy. Verified (Code): none exists.
- *UX/UI:*
  - Buttons are ~36 px high: 7 of 11 controls < 44 px at 390 px. Verified (Runtime) `metrics.json`.
  - The header icon gives no state and has no visible label. Verified (Runtime) screenshots.
  - The shield metaphor is ambiguous next to the search and language controls. Inferred.
- *Workflow:* the decline path ends in "Go back", which fails for shared links (U-MAT-01). There is no route onward
  ("Browse other stories"). Verified (Code) `adult-gate.tsx:25-27`.
- *Information architecture:* the 18+ setting has three entry points (header, gate, Settings) with three different
  wordings. Verified (Code) BR-MAT-003. The Studio hint misstates the effect (`studio/strings.en.ts:187`).

**Proposed experience**
- *Gate panel (keep `EmptyState`; content stays generic per FP-005, no title or cover):*
  - Title "Truyện 18+" / "18+ story".
  - Description: "The author marked this story as 18+. Continue only if you are 18 or older."
  - Second line, muted: "Continuing shows 18+ stories in lists on this device (and your account when signed in). You
    can turn this off any time from the 18+ button or Settings."
  - Link "What counts as 18+?" → guidelines § Mature content (FP-065).
  - Buttons: primary "I'm 18 or older, continue". Secondary: "Go back" when in-app history exists, otherwise "Back to
    home" (`/`).
- *After confirm:* content renders in place (unchanged), plus a toast "18+ stories are now shown" with the action
  "Undo" (≥ 6 s). Undo calls `disable()` and the gate returns.
- *Header control:*
  - Icon + short visible label "18+" at ≥ 768 px; icon-only at 390 px with a 44 × 44 hit area.
  - Accessible name carries the state ("Mature content (18+): hidden").
  - No `aria-pressed`, because it opens a dialog (U-MAT-02).
  - In the dialog, when `ageConfirmed` is already true, show only "Show 18+ stories" without restating age
    (BRC-MAT-01 / Q-MAT-01).
- *Responsive:*
  - 390 px: panel top-aligned with 48 px top padding; buttons stacked full-width, primary first, ≥ 44 px.
  - 768/1280 px: buttons inline, panel centred in the content column at max-w-md.
  - The empty lower area is acceptable, so no filler content is added (no story identity may be shown per FP-005).
- *Density:* unchanged; only the copy grows by one muted line.

**Acceptance criteria**
- **SE-MAT-01-AC01** [Proposed] Given an 18+ story and the choice "hidden", When the gate is shown, Then its text states that continuing shows 18+ stories in lists on this device (and account when signed in) and that this can be changed later.
- **SE-MAT-01-AC02** [Proposed] Given the gate, When the reader clicks "I'm 18 or older, continue", Then the story renders in place and a toast "18+ stories are now shown" with "Undo" is displayed for at least 6 seconds.
- **SE-MAT-01-AC03** [Proposed] Given the toast from AC02, When "Undo" is clicked, Then the choice returns to hidden, the gate is shown again and lists exclude 18+ stories.
- **SE-MAT-01-AC04** [Proposed] Given the gate opened in a tab without in-app history, Then the secondary button reads "Back to home" and navigates to `/` (U-MAT-01).
- **SE-MAT-01-AC05** [Proposed] Given the gate, Then a link "What counts as 18+?" opens the Mature content section of the community guidelines (FP-065).
- **SE-MAT-01-AC06** [Proposed] Given a 390 px viewport, Then both gate buttons are at least 44 px high and stacked full-width, with the primary action first.
- **SE-MAT-01-AC07** [Proposed] Given the header control, Then its accessible name includes the current state, it exposes no `aria-pressed`, and at ≥ 768 px a visible "18+" label accompanies the icon.
- **SE-MAT-01-AC08** [Proposed] Given `ageConfirmed = true` and 18+ hidden, When the reader opens the header dialog or the Settings switch, Then turning 18+ on needs one click on "Show 18+ stories" and repeats no age statement (BRC-MAT-01; blocked by Q-MAT-01).

**Impact**
- *Frontend:* `adult-gate.tsx` (copy, history-aware back, link, toast with undo), `adult-content-button.tsx` (label,
  ARIA, re-ask logic), `adult-content/strings*.ts`, `studio/strings*.ts` (hint, via FP-005 amendment).
- *Backend/API:* none.
- *Database:* none.
- *Shared components:* `useAppToast` already exists; needs an action button. If missing, use sonner's `action` (sonner
  is in `packages/ui/src/components/sonner.tsx`).
- *Business rules:* BRC-MAT-01 (no re-ask once confirmed). Q-MAT-06 (should the gate confirm reveal one story only?).
- *Other screens:* SCR-SHELL-01 (header), SCR-SET-01 (switch wording), SCR-STM-02/03 (hint).

**Related** FP-005 (amended), FP-022 (U-MAT-02), FP-065; F-MAT-01/03, U-MAT-01/02; RT-06; Q-MAT-01/06.

**Priority** **P2.** The server-side leak (FP-005) is the larger risk and stays P2/MVP. This copy, undo and target-size
work is S and should ship with it.

---

### SE-SHELL-01 — Main shell (SCR-SHELL-01)

**Current experience** — `AppShell`: sticky 56 px header (`max-w-5xl`), content column `max-w-5xl px-4 py-6`, mobile bottom
nav (Home, Library, Write, Me) hidden from `md`, generic grid skeleton, sonner toaster, no footer
(`packages/ui/src/widgets/app-shell.tsx:22-34`, `bottom-nav.tsx:47`, `main-shell.tsx:13-18`). Header right side: SearchBox
(icon < `sm`, field ≥ `sm`), 18+ button, "VI/EN", bell (members), user menu or "Sign in" (`site-header.tsx:13-22`).
Missing: desktop nav (U-SHELL-01), `next` on sign-in (U-SHELL-04), not-found/error pages (F-SHELL-01), skip link (RT-09),
offline state, footer.

**Identified opportunities**
- **Desktop navigation (1280)**: header has brand + controls only; Rankings, Following, Library, Studio are reachable only via Home links or the avatar menu. Verified (Runtime) `d-home.png`, `d-story.png`; Verified (Code).
- **Tablet 768**: the bottom nav is hidden at exactly 768 px (`md:hidden`), and the header has no links, so a tablet in portrait has **no** primary navigation; for guests only the brand link leads anywhere. Verified (Runtime) `t-home.png`, `t-story.png`.
- **Header density (390)**: guest header = brand + search icon + 18+ icon + "VI" + filled "Sign in" (`m-home.png`); a member adds bell and avatar = 6 controls in 358 px. The 18+ shield icon has no visible text. The language button's visible text "VI" is not in its accessible name "Switch to English" (WCAG 2.5.3). Verified (Runtime) + Verified (Code) `language-switcher.tsx:17-20`.
- Header targets under 44 px: language `size="sm"` 32 px, icons 36 px (U-SHELL-02). Verified (Code).
- **Footer absence**: no footer at any width; no About/Terms/Privacy/Copyright; nothing at the end of long pages (`d-home.png` ends with "You've seen all the stories"). Verified (Runtime).
- **Skip link**: none; first tab stop is the brand (RT-09). Verified (Runtime, Phase 1).
- **Loading**: one card-grid `PageSkeleton` for every route (U-SHELL-03) including forms, story page and reader. Verified (Code).
- **Error / 404**: Next default English page; at runtime it renders a white panel inside the cream shell (`m-notfound.png`, `d-notfound.png`) with HTTP 200 for missing stories (RT-01). Verified (Runtime).
- **Toasts**: sonner with default position (bottom-right; full-width bottom on small screens) while the bottom nav is fixed at the bottom with `z-40` (`providers.tsx:41`, `sonner.tsx`). Toasts may cover the nav on phones. Inferred (not observed).
- **Content width**: one `max-w-5xl` (1024 px) for every page; browse grids get 4 columns of 232 px cards that are 511 px tall at 1280 (`metrics.json` d-home), while forms (`max-w-xl`) sit left-aligned in the same column. Verified (Runtime) + Verified (Code).
- **Reader inside the shell**: chapter pages render with header + bottom nav (WBS §1.2 planned a shell-less `(reader)` group). Verified (Runtime) `m-reader.png`; the reading agent owns the decision; the shell must support a "chromeless" variant.
- **Offline**: no indicator; with TanStack v5 defaults, offline requests pause rather than fail (FP-038). Inferred.

**Proposed experience**
- **Breakpoints** (BRC-SHELL-02): bottom nav visible below `lg` (1024 px) instead of below `md`; from `lg` the header shows section links. Rationale: 768–1023 px devices are mostly touch tablets in portrait, where a bottom bar is the expected pattern and the header has no room for links plus a search field.
- **Header ≥ lg (1280)**: `[Brand] [Home] [Rankings] [Library] [Write]  ……  [Search field] [Bell] [Avatar]`. Active link `aria-current="page"` with a 2 px primary underline. "Following" becomes a Library tab or a Home section (FP-019; discovery agent). Language and theme move to the user menu and the footer; 18+ toggle placement per Q-SHELL-02 (trust-safety agent): proposed in the user menu for members and in the guest "⋯" menu, keeping the gate itself unchanged.
- **Header < lg (390/768)**: `[Brand] …… [Search icon] [Bell] [Avatar | Sign in]`; guests get a compact "⋯" menu (Language, 18+, Theme, About). Every control 44 × 44 on touch (FP-037 tokens). "Sign in" becomes an outline/ghost button so the page's own primary CTA is the only filled button above the fold.
- **Bottom nav** labels stay "Home / Library / Write / Me"; the user menu shows the same icons next to "Library / Studio / Profile" so both read as the same destinations (label unification is left to FP-019).
- **Footer** (FP-039): end-of-page footer on every `(main)` page; on < lg placed above the bottom-nav padding (not fixed).
- **Skip link**: first focusable element "Skip to content" → `<main id="content" tabindex="-1">` (FP-022).
- **Status slot**: a banner region under the header for: offline (FP-038), suspended account (FP-006), email not confirmed (if confirmation becomes optional later). One component, one queue, polite live region.
- **Loading**: `PageSkeleton` variants `grid | detail | list | form | reader` chosen per route segment via route-level `loading.tsx` files (FP-020/FP-037).
- **Errors**: `not-found.tsx`, `error.tsx` inside the shell, `global-error.tsx` with its own minimal styles (FP-004).
- **Toasts**: `position="top-center"` below `lg`, `bottom-right` from `lg`; or keep bottom with `mobileOffset` = bottom-nav height + safe area.
- **Content width tokens**: `AppShell` gets `width: "browse" | "default" | "narrow" | "reading"` → `max-w-6xl` (browse grids, 5 columns at `xl`), `max-w-5xl` (default), `max-w-2xl` centred (forms/settings), `--reader-measure` (reader). Fixes the left-aligned forms and the over-tall 4-column cards at 1280.
- **Chromeless variant** for the reader route (decision by the reading agent): `AppShell` prop `chrome="none"` hides header/bottom nav, keeping safe areas and the status slot.

**Acceptance criteria**
- SE-SHELL-01-AC01 [Proposed] Given a 768 × 1024 viewport on any `(main)` page, Then the bottom navigation is visible and Home, Library, Write and Me are one tap away.
- SE-SHELL-01-AC02 [Proposed] Given a 1280 px viewport, Then Home, Rankings, Library and Write links are visible in the header and the current section is marked `aria-current="page"`.
- SE-SHELL-01-AC03 [Proposed] Given keyboard focus at the top of any `(main)` page, When Tab is pressed once, Then "Skip to content" is focused and visible; When Enter is pressed, Then focus moves to the main content.
- SE-SHELL-01-AC04 [Proposed] Given a 390 px touch viewport, Then every header control has a hit area of at least 44 × 44 px and the header contains at most four controls besides the brand.
- SE-SHELL-01-AC05 [Proposed] Given the language control, Then its accessible name contains its visible text (e.g. visible "VI", name "Ngôn ngữ: VI — Tiếng Việt").
- SE-SHELL-01-AC06 [Proposed] Given any `(main)` page scrolled to the end, Then a footer with About, Terms, Privacy, Copyright and the language choice is shown, above the bottom navigation on phones.
- SE-SHELL-01-AC07 [Proposed] Given a toast is shown on a 390 px screen, Then it does not overlap the bottom navigation.
- SE-SHELL-01-AC08 [Proposed] Given the user navigates to `/settings`, Then the loading placeholder has the shape of a form (heading + sections), not a card grid.
- SE-SHELL-01-AC09 [Proposed] Given a missing story id, Then the response is 404 and the translated not-found page is rendered inside the shell with the same background as other pages (FP-004).

**Impact** — Frontend: `AppShell` (width, chrome, footer, status slot), `BottomNav` breakpoint, `SiteHeader` composition, `UserMenu`, route `loading.tsx` per segment, `not-found`/`error` files. Backend/API: none. Database: none. Shared components: `AppShell`, `BottomNav`, `PageSkeleton`, new `SiteFooter`, `StatusBanner`. Business rules: BR-SHELL-002 and BR-SHELL-004 (BRC-SHELL-02), BR-I18N-006 (BRC-I18N-01). Other screens: every `(main)` screen (width prop), SCR-READ-01 (chromeless), SCR-MAT-01 (18+ toggle placement).

**Related** — FP-004, FP-019, FP-020, FP-022, FP-037, FP-038, FP-039, FP-006; U-SHELL-01…04, F-SHELL-01, RT-01, RT-09.

**Priority** — P1: tablet portrait has zero navigation (runtime-confirmed) and missing/error pages are already P1 (FP-004); the density and footer parts are P2.

### SE-DEV-01 — Dev gallery (SCR-DEV-01)

**Current experience** — Development-only page with its own `AppShell` + `BottomNav` (Home, Gallery, Library, Me);
sections Buttons, Form controls, Display, Navigation/overlays, States, Infinite list (`apps/web/src/app/dev/gallery/gallery.tsx`).
Subtitle says "Every shared primitive and widget, light and dark" but there is no theme switch and StoryCard, StoryCover,
ReadingProgress, PageSkeleton are missing (U-DEV-01, BR-DEV-004).

**Identified opportunities**
- The gallery is the only place where the design system is visible, yet it omits the most-used widget (StoryCard, 8 call sites) and cannot show dark mode. Verified (Code) + Verified (Runtime, Phase 1 `mobile-dev-gallery.png`).
- No density/pointer simulation, so 36 px controls look fine on a desktop monitor. Inferred.
- Copy overclaims ("light and dark"). Verified (Code).

**Proposed experience** — Toolbar: Theme (System/Light/Dark/Sepia reader), Pointer (fine/coarse → toggles a
`data-pointer="coarse"` attribute mirroring the media query so `--size-control` can be previewed), Language (VI/EN, also
proves no hard-coded text). New sections: "Tokens" (colour swatches with computed contrast pairs, radius, type scale,
spacing), "Story" (StoryCard `grid`/`row`/`rail` with and without cover, long Vietnamese title, 18+ badge, rank leading
slot, progress slot; StoryCover placeholder), "Page states" (PageSkeleton variants, EmptyState with action, ErrorState),
"Shell" (header at 390/768/1280 via iframes or container queries). Keep it dev-only (BR-DEV-001).

**Acceptance criteria**
- SE-DEV-01-AC01 [Proposed] Given the gallery, When "Dark" is chosen, Then every section renders with the dark tokens without reload.
- SE-DEV-01-AC02 [Proposed] Given the gallery, Then StoryCard is shown in all variants with and without a cover image and with a 2-line Vietnamese title.
- SE-DEV-01-AC03 [Proposed] Given "Pointer: coarse", Then buttons, inputs and icon buttons render at the coarse control size (44 px).
- SE-DEV-01-AC04 [Proposed] Given any build, Then `/dev/gallery` remains 404 in production and `noindex,nofollow` (BR-DEV-001/002 unchanged).

**Impact** — Frontend: `gallery.tsx` only. Backend/API: none. Database: none. Shared components: consumes FP-037 variants. Business rules: BR-DEV-004 coverage updated. Other screens: none.

**Related** — FP-037, FP-036; U-DEV-01.

**Priority** — P3: developer-facing, but cheap and it is the acceptance surface for FP-037.

---

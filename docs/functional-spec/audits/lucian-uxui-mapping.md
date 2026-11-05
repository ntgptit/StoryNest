# Lucian UX/UI Prompt mapping (all 400 elements)

Every element of [Lucian UX/UI Prompt](https://lucianlabs.dev/uxui-prompt/) checked against StoryNest's existing UI. Catalog version `34c4b3e61d` (400 elements), checked 2026-11-05. Decision: [DEC-013](../proposals/decision-register.md). Porting rules: `.claude/skills/lucian-uxui/SKILL.md` (StoryNest project rules). Entry point: [README](../README.md).

## 1. Method

1. Triage the full catalog (id, category, title, tags, one-line summary) against the StoryNest screen inventory and `packages/ui` / `packages/features` components.
2. For each plausible match, read the StoryNest code (file in the table) and the element's code (`get <id>`) to confirm the behaviour is the same.
3. **Applied** only when the port changes presentation/motion and nothing else: same data, same actions, same validation, no new copy. Anything that would add behaviour is **Candidate (needs decision)** and is not built.

| Verdict | Meaning | Count |
| --- | --- | --- |
| Applied | Ported as a shared widget/token and used in the listed surface | 8 |
| Already covered | StoryNest already has an equivalent component; porting would add nothing | 14 |
| Candidate (needs decision) | Same surface, but the element brings new behaviour or data; needs a product/UX decision first | 61 |
| No match | No equivalent surface in StoryNest | 317 |
| **Total** | | **400** |

## 2. Applied

| # | Element | StoryNest surface | What was ported / left out |
| --- | --- | --- | --- |
| [006](https://lucianlabs.dev/uxui-prompt/#006) | Ink ripple subscribe button | SCR-STORY-01 Follow button | `RingingBellIcon`: bell swing when following turns on; ink ripple and subscriber roll not ported (Button stays shadcn) |
| [012](https://lucianlabs.dev/uxui-prompt/#012) | Bookmark ribbon | SCR-STORY-01 Save button | `SaveRibbonIcon` (packages/ui/widgets): pour, drop, ring, motion-safe burst; label/counter roll dropped (count not shown there) |
| [022](https://lucianlabs.dev/uxui-prompt/#022) | Heart burst like | SCR-READ-01 vote button | `HeartBurstIcon`: crouch-fill-leap, ring, 7 dot pairs; count roll not ported (count stays a live text) |
| [039](https://lucianlabs.dev/uxui-prompt/#039) | Sliding pill tabs | `TabsList` (ranking, library, search, moderation, stats) | Sliding pill measured from the active trigger; row stagger not ported. Falls back to the static active background until measured |
| [062](https://lucianlabs.dev/uxui-prompt/#062) | Sign-in card feedback | Auth `FormError` (sign in, sign up, forgot and reset password) | Head-shake keyframes when the error appears or changes; spinner/check/welcome pane not ported |
| [074](https://lucianlabs.dev/uxui-prompt/#074) | Notification bell dropdown | SCR-SHELL-01 header bell | Bell swing + badge pop when the unread count goes up (not on first load); dropdown list not ported (bell links to /notifications) |
| [079](https://lucianlabs.dev/uxui-prompt/#079) | Skeleton that blooms into a post | `Skeleton` primitive (all loading states) | One viewport-fixed streak shared by every block (`skeleton-shine`); bloom/blur-up reveal not ported |
| [355](https://lucianlabs.dev/uxui-prompt/#355) | Cloud autosave indicator | SCR-EDT-01 editor footer | `AutosaveIcon`: bobbing dots, drawn check, slash on failure; relative times and offline toggle not ported (no offline mode) |

Shared pieces: motion tokens in `packages/design-tokens/src/tokens.css` (`ease-*`, `animate-*`, `skeleton-shine`), a global `prefers-reduced-motion` clamp, and `useTriggerCount` (`packages/ui/src/lib`) so nothing animates on first render.

## 3. Candidate (needs decision)

| # | Element | StoryNest surface | Why it is not applied yet |
| --- | --- | --- | --- |
| [003](https://lucianlabs.dev/uxui-prompt/#003) | Hold to delete | Destructive confirms (`ConfirmDialog`) | Hold-to-confirm would replace the dialog flow |
| [005](https://lucianlabs.dev/uxui-prompt/#005) | Paper plane send button | Comment submit | Decorative send animation; keep the plain button unless asked |
| [019](https://lucianlabs.dev/uxui-prompt/#019) | Interest chips multi-select | Discover category chips / tag filters | Multi-select with a limit changes the filter rules (single category today) |
| [021](https://lucianlabs.dev/uxui-prompt/#021) | Day–night sky switch | Site theme | There is no site theme toggle (follows the OS); reader has its own themes |
| [029](https://lucianlabs.dev/uxui-prompt/#029) | Colored tag input | Studio `TagEditor` | Coloured tag input; tags have no colour today |
| [030](https://lucianlabs.dev/uxui-prompt/#030) | Date range calendar | Publish panel schedule / stats range | Single datetime today; range picker is new |
| [032](https://lucianlabs.dev/uxui-prompt/#032) | Drag-and-drop upload | Cover, avatar, chapter image upload | Drag-and-drop zone and progress panel would change the upload UI |
| [033](https://lucianlabs.dev/uxui-prompt/#033) | Inline title editing | Reading list title, chapter title | Inline editing would replace the current form/dialog |
| [036](https://lucianlabs.dev/uxui-prompt/#036) | Password strength meter | Sign-up / reset password | Adds a strength rule beyond the Zod minimum; needs a rule owner in packages/validation |
| [048](https://lucianlabs.dev/uxui-prompt/#048) | Swipe-linked underline tabs | SCR-SRCH-01 tabs | Swipe between tab panels is new on mobile |
| [054](https://lucianlabs.dev/uxui-prompt/#054) | Follow profile card | SCR-AUTHOR-01 follow + follower count | Rolling count after follow; needs the count in the button area |
| [069](https://lucianlabs.dev/uxui-prompt/#069) | Avatar crop editor | Avatar / cover editors | Both auto-crop (square, 2:3); interactive crop is a new step |
| [071](https://lucianlabs.dev/uxui-prompt/#071) | Swipe-to-delete with undo | Library / reading lists | Swipe-to-remove with undo changes how removal works |
| [085](https://lucianlabs.dev/uxui-prompt/#085) | Pull to refresh | Mobile lists | Pull-to-refresh is new behaviour for the Capacitor shell |
| [090](https://lucianlabs.dev/uxui-prompt/#090) | Error widget that plugs back in | `ErrorState` retry | Auto-retry with backoff changes request behaviour (TanStack Query already retries) |
| [091](https://lucianlabs.dev/uxui-prompt/#091) | Offline message queue | Comments / editor | Needs an offline queue; the editor only keeps a local backup |
| [092](https://lucianlabs.dev/uxui-prompt/#092) | Empty search that loosens filters | SCR-SRCH-01 empty results | Suggesting looser filters needs a search rule |
| [093](https://lucianlabs.dev/uxui-prompt/#093) | Celebration when every task is done | Reading progress / streaks | Celebration needs a goal or streak feature |
| [095](https://lucianlabs.dev/uxui-prompt/#095) | Bar chart that changes shape | SCR-STAT-01 `DailyChart` | Morphing bars + scrub tooltip would change the chart |
| [096](https://lucianlabs.dev/uxui-prompt/#096) | Stock line that splits as you scrub | SCR-STAT-01 | Line scrub chart; current chart is bars |
| [098](https://lucianlabs.dev/uxui-prompt/#098) | Live metric with rolling digits | Stat pills / vote count | Rolling digits on live counters |
| [151](https://lucianlabs.dev/uxui-prompt/#151) | Weekly contribution grid | SCR-STAT-01 / author | Contribution heatmap of reads or writing days is a new view |
| [176](https://lucianlabs.dev/uxui-prompt/#176) | Version filmstrip | SCR-HIST-01 version history | Filmstrip navigation of versions is a new layout |
| [177](https://lucianlabs.dev/uxui-prompt/#177) | Branching edit history | SCR-HIST-01 version history | History is linear (snapshots); branching does not apply as is |
| [178](https://lucianlabs.dev/uxui-prompt/#178) | Bulk selection dock | Moderation / chapter manager | Bulk selection dock; no bulk actions today |
| [184](https://lucianlabs.dev/uxui-prompt/#184) | Role permission matrix | SCR-TEAM-01 | Role/permission matrix; roles are fixed today |
| [197](https://lucianlabs.dev/uxui-prompt/#197) | Guided spotlight tour | Onboarding | No guided tour exists |
| [212](https://lucianlabs.dev/uxui-prompt/#212) | Hide-on-scroll header | SCR-READ-01 sticky toolbar | Hide-on-scroll changes reader navigation |
| [219](https://lucianlabs.dev/uxui-prompt/#219) | Circular-reveal dark mode | Site theme | Same as #021 |
| [220](https://lucianlabs.dev/uxui-prompt/#220) | Selection quote-share tooltip | Reader | Quote-share on selection needs sharing + paragraph links (paragraph comments exist) |
| [242](https://lucianlabs.dev/uxui-prompt/#242) | Category chip bar that follows scroll | Discover category chips | Scroll-following chip bar would need sections on one page |
| [244](https://lucianlabs.dev/uxui-prompt/#244) | Form validation that takes you to errors | Long forms | Error summary that jumps to fields (story form) |
| [246](https://lucianlabs.dev/uxui-prompt/#246) | Rank-swapping bar race | SCR-RANK-01 | Bar race over time needs historical ranking data |
| [250](https://lucianlabs.dev/uxui-prompt/#250) | Unsaved changes bar | Story form / settings | Sticky unsaved-changes bar; editor already warns on leave |
| [254](https://lucianlabs.dev/uxui-prompt/#254) | Share dialog with link access | Story / reading list | No share dialog exists |
| [258](https://lucianlabs.dev/uxui-prompt/#258) | Blur-up photo loading | `StoryCover` | Blur-up needs a low-res placeholder (no thumbnails in Storage) and SSR-safe load detection |
| [260](https://lucianlabs.dev/uxui-prompt/#260) | Scroll-filled sentence | Story landing | Scroll-filled sentence for long synopsis; decorative |
| [264](https://lucianlabs.dev/uxui-prompt/#264) | Email input that catches typos | Sign-up email | Typo suggestions for email domains |
| [267](https://lucianlabs.dev/uxui-prompt/#267) | Language switch with text swap | Header `LanguageSwitcher` | Text-swap animation only; low value |
| [268](https://lucianlabs.dev/uxui-prompt/#268) | Mention list that follows @ | Comments | No @mentions in comments |
| [269](https://lucianlabs.dev/uxui-prompt/#269) | Type-the-name delete confirmation | Story delete confirm | Type-the-name confirmation is a policy decision |
| [273](https://lucianlabs.dev/uxui-prompt/#273) | Detail side panel from a list row | Moderation console | Detail side panel from a report row |
| [275](https://lucianlabs.dev/uxui-prompt/#275) | Scroll-following table of contents | Reader TOC sheet | Ours lists chapters, not headings in the page |
| [281](https://lucianlabs.dev/uxui-prompt/#281) | Sweeping highlighter | Reader | Highlighting needs a highlight/annotation model |
| [285](https://lucianlabs.dev/uxui-prompt/#285) | Team invites through to acceptance | SCR-TEAM-01 invites | Invite-to-acceptance flow animation; invites already exist |
| [288](https://lucianlabs.dev/uxui-prompt/#288) | Expandable product details | SCR-STORY-01 description | Description is shown in full; a read-more clamp is a UX decision |
| [290](https://lucianlabs.dev/uxui-prompt/#290) | Ask-first notification permission | Notifications | No web push yet |
| [305](https://lucianlabs.dev/uxui-prompt/#305) | Filter drawer with live result count | Discover / search filters | Filter drawer with live result count needs a count query |
| [322](https://lucianlabs.dev/uxui-prompt/#322) | Rolling trending searches | Search | Trending searches need search analytics |
| [324](https://lucianlabs.dev/uxui-prompt/#324) | Push navigation stack | Mobile navigation | iOS push stack transitions in the Capacitor shell |
| [332](https://lucianlabs.dev/uxui-prompt/#332) | Collapsing large title | `PageHeader` on mobile | Collapsing large title is a navigation design change |
| [343](https://lucianlabs.dev/uxui-prompt/#343) | Rocket back-to-top button | Reader / long lists | Back-to-top does not exist yet |
| [359](https://lucianlabs.dev/uxui-prompt/#359) | Score-or-rank slope chart | SCR-RANK-01 | Rank-change slope chart needs previous-period ranks |
| [362](https://lucianlabs.dev/uxui-prompt/#362) | Rolling drum time picker | Publish panel schedule | Uses a native datetime input; a drum picker is a design change |
| [368](https://lucianlabs.dev/uxui-prompt/#368) | Sentence-following reading focus | SCR-READ-01 reader | Sentence focus mode is a new reader feature; hover-driven, needs a touch design |
| [372](https://lucianlabs.dev/uxui-prompt/#372) | Fill-to-level-up XP bar | Reader levels | No gamification |
| [376](https://lucianlabs.dev/uxui-prompt/#376) | Tap-through stories | Discover | Tap-through stories format does not exist |
| [379](https://lucianlabs.dev/uxui-prompt/#379) | Growing streak flame | Reading streaks | No streak feature |
| [386](https://lucianlabs.dev/uxui-prompt/#386) | Glowing unlockable badges | Badges | No achievements |
| [390](https://lucianlabs.dev/uxui-prompt/#390) | Rolling chapter numbers | SCR-READ-01 chapter header | Rolling chapter numbers while scrolling across chapters (reader shows one chapter) |
| [396](https://lucianlabs.dev/uxui-prompt/#396) | Tap-to-reveal spoiler cover | Reader / comments | Spoiler covers need a spoiler mark in the content model |

## 4. Full catalog

### Buttons (12)

No match: 8, Candidate (needs decision): 2, Applied: 2.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 001 | Liquid glass button | No match | — | No matching surface in StoryNest |
| 002 | Magnetic arrow button | No match | — | No matching surface in StoryNest |
| 003 | Hold to delete | Candidate (needs decision) | Destructive confirms (`ConfirmDialog`) | Hold-to-confirm would replace the dialog flow |
| 004 | Progress download button | No match | — | No matching surface in StoryNest |
| 005 | Paper plane send button | Candidate (needs decision) | Comment submit | Decorative send animation; keep the plain button unless asked |
| 006 | Ink ripple subscribe button | Applied | SCR-STORY-01 Follow button | `RingingBellIcon`: bell swing when following turns on; ink ripple and subscriber roll not ported (Button stays shadcn) |
| 007 | Play–pause morph | No match | — | No matching surface in StoryNest |
| 008 | Copy button that turns into a check | No match | — | No copy-to-clipboard action in the product |
| 009 | Rolling label button | No match | — | No matching surface in StoryNest |
| 010 | Split action button | No match | — | No matching surface in StoryNest |
| 011 | Radial floating button | No match | — | No matching surface in StoryNest |
| 012 | Bookmark ribbon | Applied | SCR-STORY-01 Save button | `SaveRibbonIcon` (packages/ui/widgets): pour, drop, ring, motion-safe burst; label/counter roll dropped (count not shown there) |

### Toggles & Pickers (12)

No match: 9, Candidate (needs decision): 2, Applied: 1.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 013 | Stretchy switch | No match | — | No matching surface in StoryNest |
| 014 | To-do checklist | No match | — | No matching surface in StoryNest |
| 015 | Plan radio cards | No match | — | No matching surface in StoryNest |
| 016 | Star rating | No match | — | No ratings in the product |
| 017 | Tilting value bubble slider | No match | — | No matching surface in StoryNest |
| 018 | Rolling quantity stepper | No match | — | No matching surface in StoryNest |
| 019 | Interest chips multi-select | Candidate (needs decision) | Discover category chips / tag filters | Multi-select with a limit changes the filter rules (single category today) |
| 020 | Product color picker | No match | — | No matching surface in StoryNest |
| 021 | Day–night sky switch | Candidate (needs decision) | Site theme | There is no site theme toggle (follows the OS); reader has its own themes |
| 022 | Heart burst like | Applied | SCR-READ-01 vote button | `HeartBurstIcon`: crouch-fill-leap, ring, 7 dot pairs; count roll not ported (count stays a live text) |
| 023 | Expanding notification settings | No match | — | No matching surface in StoryNest |
| 024 | Price histogram range filter | No match | — | No matching surface in StoryNest |

### Inputs & Search (12)

Candidate (needs decision): 5, Already covered: 4, No match: 3.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 025 | Notched floating label field | No match | — | No matching surface in StoryNest |
| 026 | 6-digit code input | No match | — | No matching surface in StoryNest |
| 027 | Expanding top-bar search | Already covered | Header `SearchBox` | Already a combobox with debounced suggestions and keyboard navigation |
| 028 | Auto-growing reply box | Already covered | `CommentComposer` | Textarea already grows (`field-sizing-content`) and shows a counter from 80% of the limit |
| 029 | Colored tag input | Candidate (needs decision) | Studio `TagEditor` | Coloured tag input; tags have no colour today |
| 030 | Date range calendar | Candidate (needs decision) | Publish panel schedule / stats range | Single datetime today; range picker is new |
| 031 | Custom select listbox | Already covered | shadcn `Select` | Radix listbox with keyboard and typeahead |
| 032 | Drag-and-drop upload | Candidate (needs decision) | Cover, avatar, chapter image upload | Drag-and-drop zone and progress panel would change the upload UI |
| 033 | Inline title editing | Candidate (needs decision) | Reading list title, chapter title | Inline editing would replace the current form/dialog |
| 034 | Airport autocomplete | Already covered | Header `SearchBox` | Same combobox/typeahead pattern already implemented |
| 035 | Money transfer amount | No match | — | No matching surface in StoryNest |
| 036 | Password strength meter | Candidate (needs decision) | Sign-up / reset password | Adds a strength rule beyond the Zod minimum; needs a rule owner in packages/validation |

### Menus & Tabs (12)

No match: 7, Already covered: 3, Applied: 1, Candidate (needs decision): 1.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 037 | Account switcher menu | Already covered | `UserMenu` dropdown | Radix dropdown; only the stagger differs |
| 038 | Right-click context menu | No match | — | No matching surface in StoryNest |
| 039 | Sliding pill tabs | Applied | `TabsList` (ranking, library, search, moderation, stats) | Sliding pill measured from the active trigger; row stagger not ported. Falls back to the static active background until measured |
| 040 | Expanding side rail | No match | — | No matching surface in StoryNest |
| 041 | Notched bottom tab bar | Already covered | `BottomNav` widget | Mobile tab bar with current-page state exists; notch indicator is decorative |
| 042 | Step-by-step wizard | No match | — | No matching surface in StoryNest |
| 043 | Stretching pagination | No match | — | No matching surface in StoryNest |
| 044 | FAQ accordion | No match | — | No matching surface in StoryNest |
| 045 | Full-screen menu from the button | No match | — | No matching surface in StoryNest |
| 046 | Command palette | No match | — | No matching surface in StoryNest |
| 047 | Period segmented control | Already covered | Ranking period / stats range tabs | Same sliding-pill behaviour now comes from #039 in `TabsList`; count-up/chart morph not applicable |
| 048 | Swipe-linked underline tabs | Candidate (needs decision) | SCR-SRCH-01 tabs | Swipe between tab panels is new on mobile |

### Cards & Content (13)

No match: 11, Candidate (needs decision): 1, Already covered: 1.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 049 | Layered editorial card | No match | — | No matching surface in StoryNest |
| 050 | Spotlight-tilt news card | No match | — | No matching surface in StoryNest |
| 051 | Add-to-cart product card | No match | — | No matching surface in StoryNest |
| 052 | Flip-around membership card | No match | — | No matching surface in StoryNest |
| 053 | Swipeable card stack | No match | — | No matching surface in StoryNest |
| 054 | Follow profile card | Candidate (needs decision) | SCR-AUTHOR-01 follow + follower count | Rolling count after follow; needs the count in the button area |
| 055 | Vinyl record player card | No match | — | No matching surface in StoryNest |
| 056 | Monthly–yearly pricing toggle | No match | — | No matching surface in StoryNest |
| 057 | Face-picker testimonial carousel | No match | — | No matching surface in StoryNest |
| 058 | Reading-progress article card | Already covered | `ReadingProgress` widget | Scroll progress bar already exists, rAF-throttled and tested |
| 059 | Event RSVP card | No match | — | No matching surface in StoryNest |
| 060 | Day–night compare slider | No match | — | No matching surface in StoryNest |
| 061 | Thumbnail-to-lightbox zoom | No match | — | No matching surface in StoryNest |

### Sign-in & Sign-up (8)

No match: 6, Applied: 1, Candidate (needs decision): 1.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 062 | Sign-in card feedback | Applied | Auth `FormError` (sign in, sign up, forgot and reset password) | Head-shake keyframes when the error appears or changes; spinner/check/welcome pane not ported |
| 063 | One-question-at-a-time sign-up | No match | — | No matching surface in StoryNest |
| 064 | Envelope magic-link sign-in | No match | — | No matching surface in StoryNest |
| 065 | Number-match device approval | No match | — | No matching surface in StoryNest |
| 066 | Social sign-in buttons | No match | — | No matching surface in StoryNest |
| 067 | Lockout countdown | No match | — | No matching surface in StoryNest |
| 068 | Read-to-agree terms | No match | — | No matching surface in StoryNest |
| 069 | Avatar crop editor | Candidate (needs decision) | Avatar / cover editors | Both auto-crop (square, 2:3); interactive crop is a new step |

### Alerts & Feedback (9)

No match: 5, Already covered: 2, Candidate (needs decision): 1, Applied: 1.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 070 | Stacking toasts | Already covered | `sonner` toasts | Stacking, swipe-dismiss and promise toasts are built in |
| 071 | Swipe-to-delete with undo | Candidate (needs decision) | Library / reading lists | Swipe-to-remove with undo changes how removal works |
| 072 | Collapsing inline alerts | No match | — | No matching surface in StoryNest |
| 073 | Rolling announcement banner | No match | — | No matching surface in StoryNest |
| 074 | Notification bell dropdown | Applied | SCR-SHELL-01 header bell | Bell swing + badge pop when the unread count goes up (not on first load); dropdown list not ported (bell links to /notifications) |
| 075 | Upload progress panel | No match | — | No matching surface in StoryNest |
| 076 | Gliding tooltip | Already covered | shadcn `Tooltip` | Radix tooltip with placement, focus and hover |
| 077 | Reaction popover | No match | — | No matching surface in StoryNest |
| 078 | Swipe-to-reply chat | No match | — | No matching surface in StoryNest |

### Loading & Progress (9)

No match: 7, Applied: 1, Candidate (needs decision): 1.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 079 | Skeleton that blooms into a post | Applied | `Skeleton` primitive (all loading states) | One viewport-fixed streak shared by every block (`skeleton-shine`); bloom/blur-up reveal not ported |
| 080 | Orbit sync spinner | No match | — | No matching surface in StoryNest |
| 081 | Payment ring and check | No match | — | No matching surface in StoryNest |
| 082 | Install progress on the icon | No match | — | No matching surface in StoryNest |
| 083 | Queue bar turning into progress | No match | — | No matching surface in StoryNest |
| 084 | Voice-reactive dot loader | No match | — | No matching surface in StoryNest |
| 085 | Pull to refresh | Candidate (needs decision) | Mobile lists | Pull-to-refresh is new behaviour for the Capacitor shell |
| 086 | Streaming AI answer | No match | — | No matching surface in StoryNest |
| 087 | Delivery steps with a truck | No match | — | No matching surface in StoryNest |

### Empty & Error States (6)

Candidate (needs decision): 4, Already covered: 1, No match: 1.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 088 | Empty folder that swallows paper | Already covered | `EmptyState` widget | Empty states exist; the folder animation is decorative |
| 089 | 404 that fixes the typo | No match | — | No matching surface in StoryNest |
| 090 | Error widget that plugs back in | Candidate (needs decision) | `ErrorState` retry | Auto-retry with backoff changes request behaviour (TanStack Query already retries) |
| 091 | Offline message queue | Candidate (needs decision) | Comments / editor | Needs an offline queue; the editor only keeps a local backup |
| 092 | Empty search that loosens filters | Candidate (needs decision) | SCR-SRCH-01 empty results | Suggesting looser filters needs a search rule |
| 093 | Celebration when every task is done | Candidate (needs decision) | Reading progress / streaks | Celebration needs a goal or streak feature |

### Widgets & Charts (7)

No match: 4, Candidate (needs decision): 3.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 094 | Weather sky you scrub through | No match | — | No matching surface in StoryNest |
| 095 | Bar chart that changes shape | Candidate (needs decision) | SCR-STAT-01 `DailyChart` | Morphing bars + scrub tooltip would change the chart |
| 096 | Stock line that splits as you scrub | Candidate (needs decision) | SCR-STAT-01 | Line scrub chart; current chart is bars |
| 097 | Donut that re-splits | No match | — | No matching surface in StoryNest |
| 098 | Live metric with rolling digits | Candidate (needs decision) | Stat pills / vote count | Rolling digits on live counters |
| 099 | Activity rings that lap | No match | — | No matching surface in StoryNest |
| 100 | Folding flip timer | No match | — | No matching surface in StoryNest |

### Layout, Schedule & Design (25)

No match: 25.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 101 | Split workspace | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 102 | Nested file tree | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 103 | Breadcrumb path | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 104 | Canvas minimap | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 105 | Studio floor plan | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 106 | Theater seat map | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 107 | Transit route picker | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 108 | Time zone overlap | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 109 | Weekly availability painter | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 110 | Schedule conflict fixer | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 111 | Task duration editor | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 112 | Rhythm step sequencer | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 113 | Pixel icon workbench | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 114 | Vector pen path | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 115 | Gradient stops | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 116 | Bezier easing curve | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 117 | Spacing ruler | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 118 | Type specimen | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 119 | Layered shadows | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 120 | Linked corner radius | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 121 | Grid layout builder | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 122 | Layer stacking order | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 123 | Blend modes | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 124 | Contrast checker | No match | — | Design/scheduling tools: StoryNest has no such tool |
| 125 | Snap guides | No match | — | Design/scheduling tools: StoryNest has no such tool |

### Document & Data Editing (25)

No match: 25.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 126 | Markdown twin note | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 127 | Change hunk review | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 128 | Find and replace | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 129 | Foldable code blocks | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 130 | CSV field mapper | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 131 | Companion entries | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 132 | Condition branch builder | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 133 | Two-way unit converter | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 134 | Weighted bill split | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 135 | Recipe scaler | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 136 | Envelope address layout | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 137 | Card number formatter | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 138 | Document redaction | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 139 | Margin notes | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 140 | Selection formatting | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 141 | Shortcut recorder | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 142 | Translation phrase pairing | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 143 | Calculating cells | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 144 | Column order editor | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 145 | Word-level transcript fix | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 146 | JSON value tree | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 147 | Regex playground | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 148 | Citation formatter | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 149 | Conflict sentence merge | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |
| 150 | Line tidier | No match | — | Data/document tools (spreadsheet, diff, regex...): not in StoryNest; the chapter editor is Tiptap |

### Analytics & Data (25)

No match: 24, Candidate (needs decision): 1.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 151 | Weekly contribution grid | Candidate (needs decision) | SCR-STAT-01 / author | Contribution heatmap of reads or writing days is a new view |
| 152 | Drill-down treemap | No match | — | Analytics chart types beyond the single daily-reads chart |
| 153 | Visit-to-purchase flow | No match | — | Analytics chart types beyond the single daily-reads chart |
| 154 | Overlapping skill radar | No match | — | Analytics chart types beyond the single daily-reads chart |
| 155 | Scatter plot picker | No match | — | Analytics chart types beyond the single daily-reads chart |
| 156 | Box plot outliers | No match | — | Analytics chart types beyond the single daily-reads chart |
| 157 | Stacked usage areas | No match | — | Analytics chart types beyond the single daily-reads chart |
| 158 | Profit waterfall bridge | No match | — | Analytics chart types beyond the single daily-reads chart |
| 159 | Daily candlesticks | No match | — | Analytics chart types beyond the single daily-reads chart |
| 160 | Conversion funnel | No match | — | Analytics chart types beyond the single daily-reads chart |
| 161 | Weekly retention cohorts | No match | — | Analytics chart types beyond the single daily-reads chart |
| 162 | Correlation matrix | No match | — | Analytics chart types beyond the single daily-reads chart |
| 163 | Bullet chart target | No match | — | Analytics chart types beyond the single daily-reads chart |
| 164 | Rebinning histogram | No match | — | Analytics chart types beyond the single daily-reads chart |
| 165 | Forecast confidence band | No match | — | Analytics chart types beyond the single daily-reads chart |
| 166 | Log error filter | No match | — | Analytics chart types beyond the single daily-reads chart |
| 167 | Trace span breakdown | No match | — | Analytics chart types beyond the single daily-reads chart |
| 168 | Request timing waterfall | No match | — | Analytics chart types beyond the single daily-reads chart |
| 169 | Table relation map | No match | — | Analytics chart types beyond the single daily-reads chart |
| 170 | Timeline that zooms into an incident | No match | — | Analytics chart types beyond the single daily-reads chart |
| 171 | Capacity budget split | No match | — | Analytics chart types beyond the single daily-reads chart |
| 172 | Order book depth | No match | — | Analytics chart types beyond the single daily-reads chart |
| 173 | Compass calibration | No match | — | Analytics chart types beyond the single daily-reads chart |
| 174 | Wind rose | No match | — | Analytics chart types beyond the single daily-reads chart |
| 175 | Normalized comparison rails | No match | — | Analytics chart types beyond the single daily-reads chart |

### Workflow & Systems (25)

No match: 20, Candidate (needs decision): 5.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 176 | Version filmstrip | Candidate (needs decision) | SCR-HIST-01 version history | Filmstrip navigation of versions is a new layout |
| 177 | Branching edit history | Candidate (needs decision) | SCR-HIST-01 version history | History is linear (snapshots); branching does not apply as is |
| 178 | Bulk selection dock | Candidate (needs decision) | Moderation / chapter manager | Bulk selection dock; no bulk actions today |
| 179 | Clipboard shelf | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 180 | Approval sign-off line | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 181 | Workload dispatcher | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 182 | Queue caller | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 183 | Ranked ballot | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 184 | Role permission matrix | Candidate (needs decision) | SCR-TEAM-01 | Role/permission matrix; roles are fixed today |
| 185 | Key rotation vault | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 186 | Device pairing radar | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 187 | Ticket check-in | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 188 | Canary rollout | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 189 | Release promotion gate | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 190 | Scheduled outbox | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 191 | Event replay tape | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 192 | Three-channel mixer | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 193 | Breathing pacer | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 194 | Audio loop region | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 195 | Video chapter rail | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 196 | Shared control handoff | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 197 | Guided spotlight tour | Candidate (needs decision) | Onboarding | No guided tour exists |
| 198 | Network path diagnosis | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 199 | Checksum verifier | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |
| 200 | Folding receipt | No match | — | Ops/workflow tools (deploys, queues, devices): not in StoryNest |

### Sections & Content (21)

No match: 19, Candidate (needs decision): 2.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 201 | Step-by-step automation flow | No match | — | Landing/marketing section |
| 213 | Auto-advancing feature tabs | No match | — | Landing/marketing section |
| 214 | Living bento feature grid | No match | — | Landing/marketing section |
| 248 | Feature request board that reorders on votes | No match | — | Landing/marketing section |
| 258 | Blur-up photo loading | Candidate (needs decision) | `StoryCover` | Blur-up needs a low-res placeholder (no thumbnails in Storage) and SSR-safe load detection |
| 262 | Store locator map synced with a list | No match | — | Landing/marketing section |
| 271 | Filterable changelog | No match | — | Landing/marketing section |
| 292 | Filter-and-reflow gallery | No match | — | Landing/marketing section |
| 306 | Orbiting integrations | No match | — | Landing/marketing section |
| 308 | Grid-to-list morph | No match | — | Landing/marketing section |
| 317 | Sort list with flying rows | No match | — | Landing/marketing section |
| 328 | Card that expands into detail | No match | — | Landing/marketing section |
| 339 | Drag-and-snap card carousel | No match | — | Landing/marketing section |
| 349 | Pixel-dissolve photo transition | No match | — | Landing/marketing section |
| 361 | Venetian-blind slide flip | No match | — | Landing/marketing section |
| 369 | Photo stack that fans out | No match | — | Landing/marketing section |
| 376 | Tap-through stories | Candidate (needs decision) | Discover | Tap-through stories format does not exist |
| 383 | Liquid-wave onboarding | No match | — | Landing/marketing section |
| 389 | Side-expanding photo panels | No match | — | Landing/marketing section |
| 393 | Platform-aware download section | No match | — | Landing/marketing section |
| 397 | Wave-flipping tile picture | No match | — | Landing/marketing section |

### Data Motion (18)

No match: 16, Candidate (needs decision): 2.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 202 | Rising isometric data blocks | No match | — | Animated data visualisation: no such data view |
| 204 | Regrouping budget bubbles | No match | — | Animated data visualisation: no such data view |
| 206 | Springy relationship network | No match | — | Animated data visualisation: no such data view |
| 227 | Live table with incoming orders | No match | — | Animated data visualisation: no such data view |
| 246 | Rank-swapping bar race | Candidate (needs decision) | SCR-RANK-01 | Bar race over time needs historical ranking data |
| 277 | Jittery-needle speed test | No match | — | Animated data visualisation: no such data view |
| 326 | Flipping-cell waffle chart | No match | — | Animated data visualisation: no such data view |
| 337 | Northbound cherry-blossom hex map | No match | — | Animated data visualisation: no such data view |
| 359 | Score-or-rank slope chart | Candidate (needs decision) | SCR-RANK-01 | Rank-change slope chart needs previous-period ranks |
| 367 | Year-by-year population pyramid | No match | — | Animated data visualisation: no such data view |
| 374 | Quarter-by-quarter app growth bubbles | No match | — | Animated data visualisation: no such data view |
| 381 | Splitting map clusters | No match | — | Animated data visualisation: no such data view |
| 387 | Brushable parallel coordinates | No match | — | Animated data visualisation: no such data view |
| 391 | Month-switching chord diagram | No match | — | Animated data visualisation: no such data view |
| 395 | Year-shifting temperature ridgeline | No match | — | Animated data visualisation: no such data view |
| 398 | Drag-to-refit regression line | No match | — | Animated data visualisation: no such data view |
| 399 | Month-reshuffling review word cloud | No match | — | Animated data visualisation: no such data view |
| 400 | Synced-cursor small multiples | No match | — | Animated data visualisation: no such data view |

### Commerce & Pricing (18)

No match: 15, Candidate (needs decision): 3.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 203 | Leader-lined product hotspots | No match | — | Commerce/pricing: StoryNest has no payments |
| 217 | Plan comparison with differences only | No match | — | Commerce/pricing: StoryNest has no payments |
| 221 | Sticky buy bar with option sheet | No match | — | Commerce/pricing: StoryNest has no payments |
| 230 | Order summary that recalculates with a promo code | No match | — | Commerce/pricing: StoryNest has no payments |
| 240 | Cart drawer with free-shipping bar | No match | — | Commerce/pricing: StoryNest has no payments |
| 259 | Mid-article membership paywall | No match | — | Commerce/pricing: StoryNest has no payments |
| 265 | Delivery promise with order cutoff | No match | — | Commerce/pricing: StoryNest has no payments |
| 278 | Seat-based price calculator | No match | — | Commerce/pricing: StoryNest has no payments |
| 283 | Save offer before canceling | No match | — | Commerce/pricing: StoryNest has no payments |
| 288 | Expandable product details | Candidate (needs decision) | SCR-STORY-01 description | Description is shown in full; a read-more clamp is a UX decision |
| 293 | Product compare tray | No match | — | Commerce/pricing: StoryNest has no payments |
| 298 | Tear-off discount coupon | No match | — | Commerce/pricing: StoryNest has no payments |
| 305 | Filter drawer with live result count | Candidate (needs decision) | Discover / search filters | Filter drawer with live result count needs a count query |
| 313 | Coffee cup that fits its size | No match | — | Commerce/pricing: StoryNest has no payments |
| 322 | Rolling trending searches | Candidate (needs decision) | Search | Trending searches need search analytics |
| 334 | Laptop that wakes when opened | No match | — | Commerce/pricing: StoryNest has no payments |
| 345 | Spin-and-open soda can | No match | — | Commerce/pricing: StoryNest has no payments |
| 356 | Watch under the loupe | No match | — | Commerce/pricing: StoryNest has no payments |

### Text Motion (17)

No match: 13, Candidate (needs decision): 4.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 205 | Rippling letter logo | No match | — | Decorative headline/text effect: not used for reading text |
| 220 | Selection quote-share tooltip | Candidate (needs decision) | Reader | Quote-share on selection needs sharing + paragraph links (paragraph comments exist) |
| 237 | Line-by-line mask reveal headline | No match | — | Decorative headline/text effect: not used for reading text |
| 245 | Scramble-decoding headline | No match | — | Decorative headline/text effect: not used for reading text |
| 263 | Flowing gradient headline and thinking text | No match | — | Decorative headline/text effect: not used for reading text |
| 281 | Sweeping highlighter | Candidate (needs decision) | Reader | Highlighting needs a highlight/annotation model |
| 307 | Typewriter rotating keyword | No match | — | Decorative headline/text effect: not used for reading text |
| 327 | Glitching signal title | No match | — | Decorative headline/text effect: not used for reading text |
| 338 | Rolling word cube | No match | — | Decorative headline/text effect: not used for reading text |
| 348 | Spinning circular text badge | No match | — | Decorative headline/text effect: not used for reading text |
| 360 | Scatter and reassemble letters | No match | — | Decorative headline/text effect: not used for reading text |
| 368 | Sentence-following reading focus | Candidate (needs decision) | SCR-READ-01 reader | Sentence focus mode is a new reader feature; hover-driven, needs a touch design |
| 375 | Word-by-word kinetic captions | No match | — | Decorative headline/text effect: not used for reading text |
| 382 | Text flowing along a wave | No match | — | Decorative headline/text effect: not used for reading text |
| 388 | Word-by-word focus quote | No match | — | Decorative headline/text effect: not used for reading text |
| 392 | Hand-drawn annotations | No match | — | Decorative headline/text effect: not used for reading text |
| 396 | Tap-to-reveal spoiler cover | Candidate (needs decision) | Reader / comments | Spoiler covers need a spoiler mark in the content model |

### Social Proof (7)

No match: 7.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 207 | Two-column testimonial wall | No match | — | Marketing social proof: no landing page or reviews |
| 210 | Webinar sign-up card with a growing crowd | No match | — | Marketing social proof: no landing page or reviews |
| 222 | Open-source star button with star history | No match | — | Marketing social proof: no landing page or reviews |
| 234 | Cycling customer logo wall | No match | — | Marketing social proof: no landing page or reviews |
| 243 | Tap-to-verify security badges | No match | — | Marketing social proof: no landing page or reviews |
| 253 | Recent purchase notification | No match | — | Marketing social proof: no landing page or reviews |
| 261 | Review filter by star bars | No match | — | Marketing social proof: no landing page or reviews |

### Navigation (16)

No match: 8, Candidate (needs decision): 7, Already covered: 1.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 208 | Cursor-magnified app dock | No match | — | Navigation pattern StoryNest does not use (app shell + bottom nav) |
| 212 | Hide-on-scroll header | Candidate (needs decision) | SCR-READ-01 sticky toolbar | Hide-on-scroll changes reader navigation |
| 219 | Circular-reveal dark mode | Candidate (needs decision) | Site theme | Same as #021 |
| 236 | Curtain-reveal footer | No match | — | Navigation pattern StoryNest does not use (app shell + bottom nav) |
| 242 | Category chip bar that follows scroll | Candidate (needs decision) | Discover category chips | Scroll-following chip bar would need sections on one page |
| 267 | Language switch with text swap | Candidate (needs decision) | Header `LanguageSwitcher` | Text-swap animation only; low value |
| 275 | Scroll-following table of contents | Candidate (needs decision) | Reader TOC sheet | Ours lists chapters, not headings in the page |
| 286 | Step-in mobile submenu | No match | — | Navigation pattern StoryNest does not use (app shell + bottom nav) |
| 289 | Live display settings panel | Already covered | Reader settings sheet (WP 2.7) | Font size, spacing, font and theme are already live settings |
| 296 | Scrubbable contact index | No match | — | Navigation pattern StoryNest does not use (app shell + bottom nav) |
| 312 | Split-curtain menu | No match | — | Navigation pattern StoryNest does not use (app shell + bottom nav) |
| 321 | Curtain page transition | No match | — | Navigation pattern StoryNest does not use (app shell + bottom nav) |
| 332 | Collapsing large title | Candidate (needs decision) | `PageHeader` on mobile | Collapsing large title is a navigation design change |
| 343 | Rocket back-to-top button | Candidate (needs decision) | Reader / long lists | Back-to-top does not exist yet |
| 354 | Morphing mega menu | No match | — | Navigation pattern StoryNest does not use (app shell + bottom nav) |
| 373 | Five underline hovers | No match | — | Navigation pattern StoryNest does not use (app shell + bottom nav) |

### Forms & Input (15)

No match: 12, Candidate (needs decision): 2, Applied: 1.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 209 | Country-aware phone number input | No match | — | Form pattern without a matching StoryNest form |
| 225 | Cookie consent with a bite | No match | — | Form pattern without a matching StoryNest form |
| 232 | One-touch passkey sign-in | No match | — | Form pattern without a matching StoryNest form |
| 244 | Form validation that takes you to errors | Candidate (needs decision) | Long forms | Error summary that jumps to fields (story form) |
| 264 | Email input that catches typos | Candidate (needs decision) | Sign-up email | Typo suggestions for email domains |
| 274 | Button that morphs into a form | No match | — | Form pattern without a matching StoryNest form |
| 279 | Booking slot that splits to confirm | No match | — | Form pattern without a matching StoryNest form |
| 295 | Contact form that adapts to the request | No match | — | Form pattern without a matching StoryNest form |
| 304 | Search-to-fill shipping address | No match | — | Form pattern without a matching StoryNest form |
| 333 | Slide-to-cancel voice recorder | No match | — | Form pattern without a matching StoryNest form |
| 344 | Bouncing map pin drop | No match | — | Form pattern without a matching StoryNest form |
| 350 | Padlock toggle with lifting shackle | No match | — | Form pattern without a matching StoryNest form |
| 355 | Cloud autosave indicator | Applied | SCR-EDT-01 editor footer | `AutosaveIcon`: bobbing dots, drawn check, slash on failure; relative times and offline toggle not ported (no offline mode) |
| 365 | Waitlist position that moves up with referrals | No match | — | Form pattern without a matching StoryNest form |
| 380 | Face-changing satisfaction slider | No match | — | Form pattern without a matching StoryNest form |

### Hero & Backgrounds (18)

No match: 18.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 211 | Glow-border sign-up CTA | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 216 | Staggered hero entrance | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 226 | Grid-beam hero background | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 231 | Tilt-to-flat product screen | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 233 | Rotating-example AI prompt box | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 247 | Scroll-to-fill intro video | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 252 | Shining expandable announcement pill | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 256 | Count-up site preloader | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 270 | Cursor-parallax floating UI hero | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 310 | Video-through-text headline | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 319 | Cursor-following aurora background | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 330 | Hold-to-warp starfield | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 341 | Cursor-linked constellation mesh | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 352 | Swirling flow field | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 363 | Dot grid waves from the cursor | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 371 | Rising contour map | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 378 | Particles that form words | No match | — | Marketing hero/background effect: StoryNest has no landing page |
| 385 | Live dotted globe | No match | — | Marketing hero/background effect: StoryNest has no landing page |

### App Screens (20)

No match: 11, Candidate (needs decision): 8, Already covered: 1.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 215 | Support chat from a launcher bubble | No match | — | SaaS/app screen without a matching StoryNest surface |
| 218 | Mini player that docks on scroll | No match | — | SaaS/app screen without a matching StoryNest surface |
| 224 | AI answer with traceable sources | No match | — | SaaS/app screen without a matching StoryNest surface |
| 235 | AI TL;DR that folds long text | No match | — | SaaS/app screen without a matching StoryNest surface |
| 238 | Status page with uptime bars | No match | — | SaaS/app screen without a matching StoryNest surface |
| 250 | Unsaved changes bar | Candidate (needs decision) | Story form / settings | Sticky unsaved-changes bar; editor already warns on leave |
| 254 | Share dialog with link access | Candidate (needs decision) | Story / reading list | No share dialog exists |
| 255 | Drag-to-move kanban cards | No match | — | SaaS/app screen without a matching StoryNest surface |
| 268 | Mention list that follows @ | Candidate (needs decision) | Comments | No @mentions in comments |
| 269 | Type-the-name delete confirmation | Candidate (needs decision) | Story delete confirm | Type-the-name confirmation is a policy decision |
| 273 | Detail side panel from a list row | Candidate (needs decision) | Moderation console | Detail side panel from a report row |
| 280 | AI image generation from noise | No match | — | SaaS/app screen without a matching StoryNest surface |
| 285 | Team invites through to acceptance | Candidate (needs decision) | SCR-TEAM-01 invites | Invite-to-acceptance flow animation; invites already exist |
| 290 | Ask-first notification permission | Candidate (needs decision) | Notifications | No web push yet |
| 299 | Usage meter that warns near the limit | No match | — | SaaS/app screen without a matching StoryNest surface |
| 315 | Drag-to-trash bin | No match | — | SaaS/app screen without a matching StoryNest surface |
| 324 | Push navigation stack | Candidate (needs decision) | Mobile navigation | iOS push stack transitions in the Capacitor shell |
| 336 | Bottom sheet with three detents | Already covered | shadcn `Sheet` | Bottom sheet exists; detents would need a gesture library |
| 347 | Picture-in-picture corner throw | No match | — | SaaS/app screen without a matching StoryNest surface |
| 358 | Long-press message peek | No match | — | SaaS/app screen without a matching StoryNest surface |

### Scroll Motion (17)

No match: 13, Candidate (needs decision): 3, Already covered: 1.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 223 | Shrinking sticky card stack | No match | — | Scroll-driven marketing section: no landing page |
| 241 | Vertical scroll, horizontal track | No match | — | Scroll-driven marketing section: no landing page |
| 251 | Staggered scroll-in feature cards | No match | — | Scroll-driven marketing section: no landing page |
| 260 | Scroll-filled sentence | Candidate (needs decision) | Story landing | Scroll-filled sentence for long synopsis; decorative |
| 282 | Widening photo reveal | No match | — | Scroll-driven marketing section: no landing page |
| 294 | Device that assembles on scroll | No match | — | Scroll-driven marketing section: no landing page |
| 309 | Layered mountain parallax | No match | — | Scroll-driven marketing section: no landing page |
| 318 | Scroll-drawn travel route | No match | — | Scroll-driven marketing section: no landing page |
| 329 | Background that shifts per section | No match | — | Scroll-driven marketing section: no landing page |
| 340 | Zoom through the keyhole | No match | — | Scroll-driven marketing section: no landing page |
| 351 | List that leans with velocity | No match | — | Scroll-driven marketing section: no landing page |
| 362 | Rolling drum time picker | Candidate (needs decision) | Publish panel schedule | Uses a native datetime input; a drum picker is a design change |
| 370 | Timeline that lights up | No match | — | Scroll-driven marketing section: no landing page |
| 377 | Phone screens that follow the text | No match | — | Scroll-driven marketing section: no landing page |
| 384 | Endlessly appending feed | Already covered | `InfiniteList` widget | Appending feed with sentinel loader already used by lists |
| 390 | Rolling chapter numbers | Candidate (needs decision) | SCR-READ-01 chapter header | Rolling chapter numbers while scrolling across chapters (reader shows one chapter) |
| 394 | Scroll-driven marquee rows | No match | — | Scroll-driven marketing section: no landing page |

### Cursor & Hover (8)

No match: 8.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 228 | Cursor-lit glowing card borders | No match | — | Cursor/hover effect: desktop-only decoration, no touch equivalent |
| 276 | Photo-following work list | No match | — | Cursor/hover effect: desktop-only decoration, no touch equivalent |
| 314 | Target-shaped morphing cursor | No match | — | Cursor/hover effect: desktop-only decoration, no touch equivalent |
| 323 | Cursor-dropped photo trail | No match | — | Cursor/hover effect: desktop-only decoration, no touch equivalent |
| 335 | Enter-side overlay tiles | No match | — | Cursor/hover effect: desktop-only decoration, no touch equivalent |
| 346 | Hidden line inside the cursor | No match | — | Cursor/hover effect: desktop-only decoration, no touch equivalent |
| 357 | Proximity-weighted letters | No match | — | Cursor/hover effect: desktop-only decoration, no touch equivalent |
| 366 | Hover-scrub video previews | No match | — | Cursor/hover effect: desktop-only decoration, no touch equivalent |

### Site Builder Tools (16)

No match: 16.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 229 | Self-typing terminal demo | No match | — | Site-builder/developer tooling: not in the product |
| 239 | Try-it API example | No match | — | Site-builder/developer tooling: not in the product |
| 249 | Live search result preview | No match | — | Site-builder/developer tooling: not in the product |
| 257 | Drag-to-resize responsive preview | No match | — | Site-builder/developer tooling: not in the product |
| 266 | Shuffle-to-generate color palette | No match | — | Site-builder/developer tooling: not in the product |
| 272 | Install command tabs by package manager | No match | — | Site-builder/developer tooling: not in the product |
| 284 | Step-by-step domain connection | No match | — | Site-builder/developer tooling: not in the product |
| 287 | Filmstrip page speed audit | No match | — | Site-builder/developer tooling: not in the product |
| 291 | Link shortener that folds long URLs | No match | — | Site-builder/developer tooling: not in the product |
| 297 | Stack-the-blocks page builder | No match | — | Site-builder/developer tooling: not in the product |
| 300 | Domain search with live availability | No match | — | Site-builder/developer tooling: not in the product |
| 301 | Image optimizer with shrinking size | No match | — | Site-builder/developer tooling: not in the product |
| 302 | Feedback pins on the page | No match | — | Site-builder/developer tooling: not in the product |
| 303 | Font pairing and type scale | No match | — | Site-builder/developer tooling: not in the product |
| 316 | Spring tuning bench | No match | — | Site-builder/developer tooling: not in the product |
| 325 | Code-revealing x-ray lens | No match | — | Site-builder/developer tooling: not in the product |

### Promos & Rewards (9)

No match: 6, Candidate (needs decision): 3.

| # | Element | Verdict | StoryNest surface | Note |
| --- | --- | --- | --- | --- |
| 311 | Don’t-show-today event popup | No match | — | Promotions/rewards: no gamification or offers |
| 320 | Coin-scratch instant ticket | No match | — | Promotions/rewards: no gamification or offers |
| 331 | Flick-to-spin prize wheel | No match | — | Promotions/rewards: no gamification or offers |
| 342 | Unribbon-and-open gift box | No match | — | Promotions/rewards: no gamification or offers |
| 353 | Stamp-collecting coffee card | No match | — | Promotions/rewards: no gamification or offers |
| 364 | One-door-a-day advent calendar | No match | — | Promotions/rewards: no gamification or offers |
| 372 | Fill-to-level-up XP bar | Candidate (needs decision) | Reader levels | No gamification |
| 379 | Growing streak flame | Candidate (needs decision) | Reading streaks | No streak feature |
| 386 | Glowing unlockable badges | Candidate (needs decision) | Badges | No achievements |

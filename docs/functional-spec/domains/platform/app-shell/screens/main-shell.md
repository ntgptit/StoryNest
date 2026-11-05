# SCR-SHELL-01 — Main shell

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-SHELL-01` |
| Business domain | [D-PLATFORM Platform](../../overview.md) |
| Business object | [OBJ-SHELL](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Route | Frame of every route in `app/(main)/**` (`/`, `/story/**`, `/author/**`, `/search`, `/ranking`, `/following`, `/library`, `/lists/**`, `/notifications`, `/settings`, `/me/**`, `/studio/**`, `/moderation`) |
| Route file | `apps/web/src/app/(main)/layout.tsx`, `apps/web/src/app/(main)/loading.tsx`, root `apps/web/src/app/layout.tsx` + `providers.tsx` |
| Screen component | `packages/features/src/shell/components/main-shell.tsx` (`MainShell`) with `site-header.tsx`, `desktop-nav.tsx`, `user-menu.tsx`, `language-switcher.tsx`, `route-loading.tsx`; nav list `shell/model/nav-items.ts`; widgets `packages/ui/src/widgets/{app-shell,bottom-nav,mega-nav,page-skeleton}.tsx`, hook `packages/ui/src/lib/use-hide-on-scroll.ts` |
| Roles | Guest, Member, Moderator |
| Workflows | WF-SHELL-01..04, WF-AUTH-03 (entry), WF-AUTH-06, WF-I18N-01 |

## B. Components
| ID | Component | Notes / text (en; vi key `shell.*`) |
| --- | --- | --- |
| SCR-SHELL-01-C01 | Sticky header (`<header>`, safe-area top, blurred) | `app-shell.tsx`. Publishes the space it covers as `--app-header-offset` (sticky page bars use `top-below-header`). Hide-on-scroll on request, see C14 |
| SCR-SHELL-01-C02 | Brand link "StoryNest" → `/` | `site-header.tsx:13-15` |
| SCR-SHELL-01-C03 | Search slot (OBJ-SRCH) | < sm: icon link "open search" → `/search`; ≥ sm: combobox with suggestions |
| SCR-SHELL-01-C04 | Adult-content button slot (OBJ-MAT) | `aria-pressed`, opens dialog |
| SCR-SHELL-01-C05 | Language switcher | Shows current code "VI"/"EN"; `aria-label` "Switch to English" / "Switch to Tiếng Việt"; `size="sm"` (32 px high) |
| SCR-SHELL-01-C06 | Notification bell slot (OBJ-NOTI) | Members only; badge with unread count, live |
| SCR-SHELL-01-C07 | User menu | Skeleton / "Sign in" / avatar "Account menu" + dropdown (BR-SHELL-003) |
| SCR-SHELL-01-C08 | Main content column `<main>` | max-w-5xl, mobile bottom padding |
| SCR-SHELL-01-C09 | Bottom nav (mobile only) | "Home", "Library", "Write", "Me"; `aria-label` "Main navigation" |
| SCR-SHELL-01-C10 | Route loading skeleton | sr-only "Loading page…" |
| SCR-SHELL-01-C11 | Toaster | sonner, global |
| SCR-SHELL-01-C12 | AdultContentSync (invisible) | BR-SHELL-012 |
| SCR-SHELL-01-C13 | Desktop navigation row (≥ md only, second header row; Lucian #354 morphing menu) | `aria-label` "Main navigation" (same landmark name as C09; only one is displayed at a time). Items: "Home", "Browse" ▾, "Rankings" ▾, "Following" (members), "Library", "Write", "Me". Home/Library/Write/Me come from the same `navItems()` as C09; the current page link is `aria-current="page"`, the Rankings trigger is highlighted on `/ranking`. Browse panel: "Categories" ("All stories" + root categories → `/?category=<slug>`) and "Popular tags" (8, `#name` → `/?tag=<slug>`; column left out when there are none or they fail). Rankings panel: "Time period" → Today / This week / This month / All time (`rankingHref`) |
| SCR-SHELL-01-C14 | Hide-on-scroll header (Lucian #212) | Off by default; a page turns it on with `useAutoHideHeader()` (only the chapter reader does). Scroll down > 8 px → header slides up (0.38 s, `ease-soft`), keeping the safe-area strip; scroll up > 8 px → back; always shown within 60 px of the top and when focus moves into it. Reduced motion: same behaviour without the slide |
| SCR-SHELL-01-C15 | Mobile menu (< md, Lucian 045) | Header button "Open menu" (last in the row) → full-screen dialog "Menu" that spreads as a circle from the button: numbered "Rankings", "Following" (members) (`aria-label` "Main navigation", current page `aria-current`), "Categories" ("All stories" + root categories as chips, same data as C13 Browse), footer day/night switch "Dark theme" (BR-SET-010). Focus trapped, Escape or "Close menu" (×, over the button) closes and returns focus; a link or any navigation closes it. Answers Q-SHELL-01 for phones |
| SCR-SHELL-01-C16 | Offline strip (Lucian 091) | Under the header row(s): "You are offline" / "New content will load again once you are back online." while `navigator.onLine` is false; on reconnect "Back online" / "Reloading what failed." for 3 s, and the active queries that failed are refetched. Announced via a status region. Unfolds only on a change seen while the page is open. No write queue: React Query already holds offline mutations and refetches stale queries; the editor autosave retries on `online` |
| SCR-SHELL-01-C17 | Pull to refresh (Lucian 085) | Only when `isNative` (Capacitor) or display-mode standalone / iOS standalone, on a coarse pointer, on `/`, `/notifications`, `/library/**`, `/following`: pull down at the top → arrow circle under the header; past 70 px "Release to refresh" → refetches the active queries, spinner until done. Off in a normal browser tab (the browser has its own) |

### Navigation discoverability matrix
Legend: ✓ reachable, — not reachable. "Other" = only from content inside some page.

| Route | Header | Bottom nav (mobile) | User menu | Other entry points | Assessment |
| --- | --- | --- | --- | --- | --- |
| `/` Home | Brand | Home | — | — | OK |
| `/library` | — | Library | Library | — | OK |
| `/studio` | — | Write | Studio | — | OK (labels differ: "Write" vs "Studio") |
| `/me` | — | Me | Profile | — | OK (labels differ: "Me" vs "Profile") |
| `/me/edit` | — | — | — | `/me` "Edit profile" | OK |
| `/settings` | — | — | Settings | — | Menu only; not on `/me` (U-PRF-01) |
| `/notifications` | Bell (members) | — | — | — | OK for members |
| `/search` | Search box / icon | — | — | — | OK |
| `/ranking` | Desktop nav "Rankings" ▾ (≥ md); mobile menu (C15) | — | — | Home "see ranking" link (`discover-screen.tsx:60`), sitemap | OK |
| `/following` | Desktop nav "Following" (≥ md, members); mobile menu (C15, members) | — | — | Home "see following" link for members (`discover-screen.tsx:55-58`) | OK |
| `/author/<me>` (own public page) | — | — | — | Own story pages only | Missing from `/me` and menu (U-PRF-01) |
| `/lists/<id>` | — | — | — | Library "my lists" (`lists/components/my-lists.tsx:64`) | OK |
| `/moderation` | — | — | Moderation (moderators) | — | OK |
| `/login` | Sign in (guests, no `next`) | via protected items | — | redirects | Loses current page (U-SHELL-04) |
| `/dev/gallery` | — | — | — | — | Intended (dev only) |
| Desktop ≥ md | Brand + menu + nav row (C13) | hidden | — | — | Addressed (U-SHELL-01) |

## C. User actions & system responses

| Field | SCR-SHELL-01-A01 Tap a bottom-nav item |
| --- | --- |
| Trigger | Tap/click C09 item |
| Preconditions | Viewport < md |
| Expected behavior | Client navigation; C10 skeleton; item becomes `aria-current="page"` |
| State change | Route |
| Validation | — |
| Error behavior | Protected targets redirect guests to sign-in (BR-AUTH-008) |
| Navigation | `/`, `/library`, `/studio`, `/me` |
| Evidence | `main-shell.tsx:13-18`, `bottom-nav.tsx:22-74` |

| Field | SCR-SHELL-01-A02 Open account menu and choose an item |
| --- | --- |
| Trigger | Click avatar C07 |
| Preconditions | Member |
| Expected behavior | Dropdown (keyboard accessible, Radix) with name and items |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | `/library`, `/studio`, `/me`, `/moderation` (mods), `/settings` |
| Evidence | `user-menu.tsx:50-80`, `shell.test.tsx` |

| Field | SCR-SHELL-01-A03 Sign out |
| --- | --- |
| Trigger | Menu "Sign out" |
| Preconditions | Member |
| Expected behavior | WF-AUTH-06 |
| State change | Session ended |
| Validation | — |
| Error behavior | Toast "Could not sign out. Please try again." |
| Navigation | `/` |
| Evidence | `user-menu.tsx:40-48,77` |

| Field | SCR-SHELL-01-A04 Sign in |
| --- | --- |
| Trigger | Header "Sign in" (guest) |
| Preconditions | Guest |
| Expected behavior | Navigate to `/login` (no `next`) |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | SCR-AUTH-01 |
| Evidence | `user-menu.tsx:30-36` |

| Field | SCR-SHELL-01-A05 Switch language |
| --- | --- |
| Trigger | C05 |
| Preconditions | — |
| Expected behavior | Next language (`vi` ↔ `en`), page re-mounted, stored on device, account sync for members |
| State change | BR-I18N-003/005, BR-SET-004 |
| Validation | — |
| Error behavior | — |
| Navigation | Stays |
| Evidence | `language-switcher.tsx:8-23` |

| Field | SCR-SHELL-01-A06 Open a desktop navigation panel |
| --- | --- |
| Trigger | Mouse hover on "Browse"/"Rankings", or click / Enter / Space on it |
| Preconditions | Viewport ≥ md |
| Expected behavior | Panel opens under the item (`aria-expanded="true"`, content right after the trigger in tab order). Moving the mouse to the other item moves the same panel under it (size and position glide, content slides in from that side). A click pins it; a hover-opened panel closes 220 ms after the pointer leaves. Escape closes and returns focus to the trigger; tabbing out, a press outside or following a link closes it. Touch never opens on hover |
| State change | — |
| Validation | — |
| Error behavior | Categories still loading → skeleton rows; tags failing → tags column left out |
| Navigation | `/?category=…`, `/?tag=…`, `/ranking[?period=…]` |
| Evidence | `mega-nav.tsx`, `desktop-nav.tsx`, `shell.test.tsx` (DesktopNav) |

Search, 18+ button and bell actions are specified by OBJ-SRCH, OBJ-MAT and OBJ-NOTI.

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial | Implemented | |
| Loading (auth) | Implemented | Round skeleton for C07 (`user-menu.tsx:28`) |
| Loading (route) | Implemented | C10 (generic shape, U-SHELL-03) |
| Empty | Not applicable | |
| Populated | Implemented | |
| Validation error | Not applicable | |
| Request error | Missing (shell level) | No error boundary / `error.tsx` (F-SHELL-01) |
| Not found | Missing (branded) | No `not-found.tsx` (F-SHELL-01) |
| Success | Not applicable | |
| Disabled | Not applicable | |
| Unauthorized | Implemented | Guest variant of C07; protected targets redirect |
| Offline | Implemented | Offline strip C16; query errors still surface per screen |
| Unsaved changes | Missing | Language switch and navigation discard page state without a prompt (U-I18N-02) |

## E. Acceptance criteria
- SCR-SHELL-01-AC01 Given a guest, then the header shows "Sign in" and no bell; given a member, the avatar menu and bell are shown.
- SCR-SHELL-01-AC02 Given a moderator, when opening the menu, then "Moderation" is listed; for other members it is not.
- SCR-SHELL-01-AC03 Given a viewport < md on `/library/...`, then "Library" is `aria-current="page"`; on `/` only "Home" is current.
- SCR-SHELL-01-AC04 Given a viewport ≥ md, then the bottom nav is hidden.
- SCR-SHELL-01-AC05 Given a click on any (main) link, then the loading skeleton appears immediately with the label "Loading page…".
- SCR-SHELL-01-AC06 Given sign-out fails, then the toast "Could not sign out. Please try again." shows and the user stays signed in.
- SCR-SHELL-01-AC07 Given the language is switched, then header and bottom-nav labels change without reload.
- SCR-SHELL-01-AC08 [Proposed] Given an unknown URL or a deleted story, then a translated 404 page inside the shell offers "Home" (F-SHELL-01).
- SCR-SHELL-01-AC09 [Proposed] Given a render error in a page, then the shell stays and an error panel with "Try again" replaces only the page content (F-SHELL-01).
- SCR-SHELL-01-AC10 [Proposed] Given a guest reading `/story/x/y`, when clicking "Sign in" and signing in, then they return to `/story/x/y` (U-SHELL-04).
- SCR-SHELL-01-AC11 Given a viewport ≥ md, then Home, Browse, Rankings, Library, Write and Me (plus Following for members) are visible as primary navigation and the current page is `aria-current="page"` (U-SHELL-01, addressed).
- SCR-SHELL-01-AC12 [Proposed] Given a phone, then every header control has a ≥ 44 px touch target (U-SHELL-02).
- SCR-SHELL-01-AC13 Given the chapter reader, when scrolling down, then the header slides away and the reader toolbar moves to the top; when scrolling up, the header returns and the toolbar sits right below it, never covered (C14).

## F. Findings referenced
F-SHELL-01, F-SHELL-02, U-SHELL-01, U-SHELL-02, U-SHELL-03, U-SHELL-04, U-I18N-02.

## G. Open questions
Q-SHELL-01 — Answered (2026-11-05). Desktop: a header navigation row with Browse and Rankings panels and Following for members, not a sidebar. Mobile: the bottom nav keeps its four items; Rankings, Following and the categories are in the full-screen menu behind the header's menu button (C15).

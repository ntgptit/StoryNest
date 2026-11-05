# SCR-SHELL-01 — Main shell

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-SHELL-01` |
| Business domain | [D-PLATFORM Platform](../../overview.md) |
| Business object | [OBJ-SHELL](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Route | Frame of every route in `app/(main)/**` (`/`, `/story/**`, `/author/**`, `/search`, `/ranking`, `/following`, `/library`, `/lists/**`, `/notifications`, `/settings`, `/me/**`, `/studio/**`, `/moderation`) |
| Route file | `apps/web/src/app/(main)/layout.tsx`, `apps/web/src/app/(main)/loading.tsx`, root `apps/web/src/app/layout.tsx` + `providers.tsx` |
| Screen component | `packages/features/src/shell/components/main-shell.tsx` (`MainShell`) with `site-header.tsx`, `user-menu.tsx`, `language-switcher.tsx`, `route-loading.tsx`; widgets `packages/ui/src/widgets/{app-shell,bottom-nav,page-skeleton}.tsx` |
| Roles | Guest, Member, Moderator |
| Workflows | WF-SHELL-01..04, WF-AUTH-03 (entry), WF-AUTH-06, WF-I18N-01 |

## B. Components
| ID | Component | Notes / text (en; vi key `shell.*`) |
| --- | --- | --- |
| SCR-SHELL-01-C01 | Sticky header (`<header>`, safe-area top, blurred) | `app-shell.tsx:23-27` |
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
| `/ranking` | — | — | — | Home "see ranking" link (`discover-screen.tsx:60`), sitemap | Weak: home page only (U-SHELL-01) |
| `/following` | — | — | — | Home "see following" link for members (`discover-screen.tsx:55-58`) | Weak: home page only (U-SHELL-01) |
| `/author/<me>` (own public page) | — | — | — | Own story pages only | Missing from `/me` and menu (U-PRF-01) |
| `/lists/<id>` | — | — | — | Library "my lists" (`lists/components/my-lists.tsx:64`) | OK |
| `/moderation` | — | — | Moderation (moderators) | — | OK |
| `/login` | Sign in (guests, no `next`) | via protected items | — | redirects | Loses current page (U-SHELL-04) |
| `/dev/gallery` | — | — | — | — | Intended (dev only) |
| Desktop ≥ md | Brand + menu only | hidden | — | — | No visible primary nav (U-SHELL-01) |

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
| Offline | Missing | No offline indicator; query errors surface per screen (Recommended for mobile, WBS 7.4) |
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
- SCR-SHELL-01-AC11 [Proposed] Given a desktop viewport, then Home, Ranking, Library and Write are visible as primary navigation (U-SHELL-01).
- SCR-SHELL-01-AC12 [Proposed] Given a phone, then every header control has a ≥ 44 px touch target (U-SHELL-02).

## F. Findings referenced
F-SHELL-01, F-SHELL-02, U-SHELL-01, U-SHELL-02, U-SHELL-03, U-SHELL-04, U-I18N-02.

## G. Open questions
Q-SHELL-01 — Should Notifications, Following and Ranking get a permanent place (menu or nav) on desktop, given the WBS 0.5 desktop sidebar was deferred?

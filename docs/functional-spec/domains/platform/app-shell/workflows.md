# OBJ-SHELL — App shell & navigation: workflows

Rules: [business-rules.md](business-rules.md). Screen: [SCR-SHELL-01](screens/main-shell.md).

## WF-SHELL-01 — Move between primary sections
| Field | Value |
| --- | --- |
| User goal | Get to Home, Library, Write (Studio) or Me |
| Trigger | Bottom-nav tap (mobile) or account-menu item / brand link (desktop) |
| Preconditions | On a (main) page |
| Main flow | Mobile: 1. Tap item. 2. Route skeleton (BR-SHELL-005). 3. Page renders; item marked `aria-current`. Desktop (≥ md): 1. Click avatar → menu. 2. Pick Library / Studio / Profile / Settings (Home via brand) |
| Alternative flows | A1. Guest taps Library/Write/Me → WF-AUTH-05. A2. Moderator also sees "Moderation" in the menu |
| Exception flows | E1. Target throws or 404s → framework default page without shell (F-SHELL-01) |
| Success criteria | Target page shown inside the shell |
| Postconditions | — |
| Affected objects | OBJ-SHELL |
| Related screens | SCR-SHELL-01 |
| Status | Verified (`packages/features/src/shell/shell.test.tsx`) |

## WF-SHELL-02 — Use a header control
| Field | Value |
| --- | --- |
| User goal | Search, switch language, toggle 18+, open notifications, open account menu |
| Trigger | Header control |
| Preconditions | — |
| Main flow | Search → OBJ-SRCH; 18+ button → dialog (OBJ-MAT); VI/EN → WF-I18N-01; bell → `/notifications` (OBJ-NOTI); avatar → BR-SHELL-003 |
| Alternative flows | A1. Guest: "Sign in" instead of avatar; no bell |
| Exception flows | E1. Sign-out failure toast (BR-AUTH-017) |
| Success criteria | Control acts without leaving the shell (except navigation targets) |
| Postconditions | — |
| Affected objects | OBJ-SHELL, OBJ-SRCH, OBJ-MAT, OBJ-I18N, OBJ-NOTI, OBJ-AUTH |
| Related screens | SCR-SHELL-01 |
| Status | Verified |

## WF-SHELL-03 — Route transition
| Field | Value |
| --- | --- |
| User goal | Immediate feedback after clicking a link |
| Trigger | Client navigation to a dynamic (main) route |
| Preconditions | — |
| Main flow | 1. Next prefetches layout + `loading.tsx`. 2. Skeleton replaces content at once. 3. Server render streams in; server-prefetched queries hydrate (`HydrationBoundary`) |
| Alternative flows | — |
| Exception flows | E1. Server error → framework error page (F-SHELL-01) |
| Success criteria | No blank wait |
| Postconditions | — |
| Affected objects | OBJ-SHELL |
| Related screens | SCR-SHELL-01 |
| Status | Verified (code) |

## WF-SHELL-04 — Error and not-found handling (current behaviour)
| Field | Value |
| --- | --- |
| User goal | Understand what went wrong and continue |
| Trigger | Query error, render error, `notFound()`, unknown URL |
| Preconditions | — |
| Main flow | Query errors: the screen shows `ErrorState` with a translated message and "Try again". Render errors / 404: no app boundary → Next default page |
| Alternative flows | — |
| Exception flows | — |
| Success criteria | [Proposed] Branded, translated 404/error page inside the shell with links home and back |
| Postconditions | — |
| Affected objects | OBJ-SHELL |
| Related screens | all |
| Status | Verified (absence) — F-SHELL-01 |

# SCR-DEV-01 — Dev gallery

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-DEV-01` |
| Route | `/dev/gallery` (development only; 404 in production) |
| Route file | `apps/web/src/app/dev/gallery/page.tsx` |
| Screen component | `apps/web/src/app/dev/gallery/gallery.tsx` (`Gallery`) |
| Roles | Developer (no auth check; public route in dev) |
| Workflows | WF-DEV-01 |
| Page title | "Component gallery · StoryNest", `noindex,nofollow` |

## B. Components
| ID | Component | Notes |
| --- | --- | --- |
| SCR-DEV-01-C01 | Own `AppShell` header "StoryNest · gallery" + `BottomNav` (Home, Gallery, Library, Me) | English literals |
| SCR-DEV-01-C02 | `PageHeader` "Component gallery" | |
| SCR-DEV-01-C03 | Sections: Buttons, Form controls, Display, Navigation and overlays, States, Infinite list | `gallery.tsx:167-311` |
| SCR-DEV-01-C04 | Demo form with zod validation | `gallery.tsx:75-115` |
| SCR-DEV-01-C05 | ConfirmDialog demo "Unpublish this chapter?" and toast buttons | |

## C. User actions & system responses
| Field | SCR-DEV-01-A01 Interact with a demo widget |
| --- | --- |
| Trigger | Click/submit/scroll in a section |
| Preconditions | Dev build |
| Expected behavior | Widget shows its state (validation messages, dialog, toast, next page of the infinite list) |
| State change | Local only |
| Validation | Demo zod schema |
| Error behavior | — |
| Navigation | Bottom-nav demo links go to real routes |
| Evidence | `gallery.tsx:75-311` |

## D. UI states
| State | Status | Note |
| --- | --- | --- |
| Initial / Populated | Implemented | |
| Loading, Empty, Request error states | Implemented (as demos) | EmptyState, ErrorState, Skeleton, InfiniteList loading |
| Validation error | Implemented (demo form) | |
| Unauthorized | Not applicable | |
| Production | Implemented | 404 |
| Dark mode | Partial | Only via OS setting (U-DEV-01) |
| Offline / Unsaved changes | Not applicable | |

## E. Acceptance criteria
- SCR-DEV-01-AC01 Given `NODE_ENV=production`, when requesting `/dev/gallery`, then the response is 404.
- SCR-DEV-01-AC02 Given a dev build, then every section in C03 renders and the demo form shows validation messages.
- SCR-DEV-01-AC03 Given any build, then the page is `noindex,nofollow` and `/dev` is disallowed in robots.txt.
- SCR-DEV-01-AC04 [Proposed] Given the gallery, then a light/dark toggle and the StoryCard, StoryCover, ReadingProgress and PageSkeleton widgets are shown (U-DEV-01).

## F. Findings referenced
U-DEV-01.

## G. Open questions
—

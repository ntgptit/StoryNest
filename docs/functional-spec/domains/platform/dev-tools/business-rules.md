# OBJ-DEV — Developer tools: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-DEV` |
| Name | Developer tools (component gallery; repo scripts that guard UI conventions) |
| Business purpose | Let developers review every shared primitive and widget in all states before they are used in screens |
| User goals | See each widget/state in one place; check light/dark and mobile/desktop |
| Actors / roles | Developer (local `next dev`) |
| Related entities | None |
| Code | `apps/web/src/app/dev/gallery/{page,gallery}.tsx`; scripts `scripts/{check-hardcode,check-tokens,gen-feature}.mjs` |
| Dependencies | OBJ-SHELL widgets, `packages/ui` primitives |
| WBS | 0.5 ✅ (gallery "chỉ dev", 404 in production) (`docs/WBS.md:125`) |

Screen: [SCR-DEV-01 Dev gallery](screens/dev-gallery.md).

## 2. Rules

### BR-DEV-001 — Gallery is development-only
| Field | Value |
| --- | --- |
| Description | `/dev/gallery` calls `notFound()` when `NODE_ENV === 'production'` |
| Preconditions | Request to `/dev/gallery` |
| Conditions | Production build (includes Vercel previews, which also run `NODE_ENV=production` — Inferred) |
| Expected behavior | 404 in production; renders in `next dev` |
| Exceptions | The route still exists in the build output; it is not behind auth (`route-guard.test.ts` lists it as public) |
| Related screens | SCR-DEV-01 |
| Evidence | `apps/web/src/app/dev/gallery/page.tsx:7-11`, `apps/web/src/lib/auth/route-guard.test.ts:17` |
| Status | Verified |

### BR-DEV-002 — Never indexed
| Field | Value |
| --- | --- |
| Description | `robots: { index: false, follow: false }` and `/dev` disallowed in robots.txt |
| Preconditions | — |
| Conditions | — |
| Expected behavior | — |
| Exceptions | — |
| Related screens | SCR-DEV-01 |
| Evidence | `apps/web/src/app/dev/gallery/page.tsx:5`, `apps/web/src/app/robots.ts:24` |
| Status | Verified |

### BR-DEV-003 — Demo text exempt from i18n guards
| Field | Value |
| --- | --- |
| Description | Gallery text is English demo copy, excluded from `check:hardcode` |
| Preconditions | — |
| Conditions | `SKIP_PATH = /apps\/web\/src\/app\/dev\//` |
| Expected behavior | — |
| Exceptions | — |
| Related screens | SCR-DEV-01 |
| Evidence | `scripts/check-hardcode.mjs:17-18` |
| Status | Verified |

### BR-DEV-004 — Gallery coverage
| Field | Value |
| --- | --- |
| Description | Sections: Buttons, Form controls (incl. a zod-validated form), Display, Navigation and overlays (incl. ConfirmDialog, toasts), States (EmptyState, ErrorState), Infinite list; framed in its own `AppShell` + `BottomNav` |
| Preconditions | — |
| Conditions | Theme follows the OS (no in-page light/dark switch) |
| Expected behavior | — |
| Exceptions | `StoryCard`, `StoryCover`, `ReadingProgress`, `PageSkeleton` widgets are not shown (U-DEV-01) |
| Related screens | SCR-DEV-01 |
| Evidence | `apps/web/src/app/dev/gallery/gallery.tsx:54-60,2328-2499`, `packages/ui/src/widgets/` listing, `packages/design-tokens/src/tokens.css:6-7` |
| Status | Verified |

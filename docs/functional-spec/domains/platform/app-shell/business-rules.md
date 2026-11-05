# OBJ-SHELL — App shell & navigation: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-SHELL` |
| Name | App shell, global navigation and cross-cutting client infrastructure (providers, errors, toasts, loading, platform adapter, shared widgets) |
| Business purpose | One consistent frame for every regular page, reachable sections, predictable loading/error behaviour, and a platform seam so web and mobile share screens (WBS Q1) |
| User goals | Know where they are; reach Home, Library, Write, Profile, Settings, Notifications, Search; recover from errors |
| Actors / roles | Guest, Member, Moderator (extra menu item) |
| Related entities | No tables. Reads auth state (OBJ-AUTH), unread count (OBJ-NOTI), moderator flag (OBJ-MOD) |
| Code | `packages/features/src/shell/**`, `packages/ui/src/widgets/{app-shell,bottom-nav,page-header,page-skeleton,error-state,empty-state,confirm-dialog,infinite-list}.tsx`, `packages/features/src/_shared/{error-boundary,toast,errors,query,query-provider,platform,data}.ts(x)`, `apps/web/src/app/{layout,providers}.tsx`, `apps/web/src/app/(main)/{layout,loading}.tsx`, `apps/web/src/lib/{platform/next-adapter.tsx,toast.ts,env.ts}`, `apps/web/next.config.ts` |
| Dependencies | OBJ-AUTH, OBJ-I18N, OBJ-SRCH (SearchBox), OBJ-NOTI (NotificationBell), OBJ-MAT (AdultContentButton, AdultContentSync), OBJ-MOD (`useIsModerator`) |
| WBS | 0.3 ✅, 0.5 ✅ (desktop sidebar not done), 1.3 ✅, 7.x ⬜, 8.2/8.3 (monitoring, CSP) not started (`docs/WBS.md:123,125,139,238-252`) |

Screen: [SCR-SHELL-01 Main shell](screens/main-shell.md).

## 2. Rules

### BR-SHELL-001 — Every regular page uses the main shell
| Field | Value |
| --- | --- |
| Description | All routes under `app/(main)` render inside `MainShell`: sticky header (below the safe area), centred content column (max-width 5xl), mobile bottom navigation |
| Preconditions | Route in `(main)` group |
| Conditions | — |
| Expected behavior | `(auth)` pages use a separate centred layout (brand link only, no header controls); `/dev/gallery` builds its own `AppShell` |
| Exceptions | Content gets bottom padding `pb-24` on mobile so the fixed nav never covers it |
| Related screens | SCR-SHELL-01 and every (main) screen |
| Evidence | `apps/web/src/app/(main)/layout.tsx:4-7`, `packages/features/src/shell/components/main-shell.tsx:24-56`, `packages/ui/src/widgets/app-shell.tsx:43-110`, `apps/web/src/app/(auth)/layout.tsx:4-14` |
| Status | Verified |

### BR-SHELL-002 — Header composition
| Field | Value |
| --- | --- |
| Description | Left: brand "StoryNest" → `/`. Right, in order: SearchBox, AdultContentButton, LanguageSwitcher, NotificationBell, UserMenu |
| Preconditions | — |
| Conditions | SearchBox: icon link to `/search` below `sm`, inline combobox from `sm` (OBJ-SRCH). NotificationBell only when authenticated (OBJ-NOTI). AdultContentButton and LanguageSwitcher for everyone |
| Expected behavior | Same header on all (main) pages, including studio editor and reader |
| Exceptions | No primary section links in the header on desktop (U-SHELL-01) |
| Related screens | SCR-SHELL-01 |
| Evidence | `packages/features/src/shell/components/site-header.tsx:10-24`, `packages/features/src/search/components/search-box.tsx:13-17,67-72`, `packages/features/src/notifications/components/notification-bell.tsx:13-17` |
| Status | Verified |

### BR-SHELL-003 — Account control (user menu)
| Field | Value |
| --- | --- |
| Description | Auth `loading` → round skeleton; guest → "Sign in" button to `/login`; member → avatar button "Account menu" opening a dropdown |
| Preconditions | — |
| Conditions | Dropdown: label = display name (or email); items "Library" `/library`, "Studio" `/studio`, "Profile" `/me`, "Moderation" `/moderation` (moderators only), "Settings" `/settings`, "Sign out" |
| Expected behavior | Sign-out per BR-AUTH-017 |
| Exceptions | The "Sign in" link carries no `next`, so the user returns to `/` after signing in (U-SHELL-04). No "Notifications", "Following", "Ranking" or "My public page" items |
| Related screens | SCR-SHELL-01 |
| Evidence | `packages/features/src/shell/components/user-menu.tsx:24-84`, `packages/features/src/shell/strings.en.ts:3-13` |
| Status | Verified |

### BR-SHELL-004 — Bottom navigation (mobile)
| Field | Value |
| --- | --- |
| Description | Four items: "Home" `/`, "Library" `/library`, "Write" `/studio`, "Me" `/me` (lucide icons) |
| Preconditions | Viewport < `md` (hidden from `md` up) |
| Conditions | Active item: exact match for `/`; for others path equals href or is below it by segment. Active link gets `aria-current="page"` |
| Expected behavior | Landmark `<nav aria-label="Main navigation">`; items use the `touch-target` utility (≥ 44 px); respects bottom safe area |
| Exceptions | Library/Write/Me are protected → guests are sent to sign-in (BR-AUTH-008) |
| Related screens | SCR-SHELL-01 |
| Evidence | `packages/features/src/shell/components/main-shell.tsx:12-18,27`, `packages/ui/src/widgets/bottom-nav.tsx:22-74`, `packages/design-tokens/src/tokens.css:1130` |
| Status | Verified |

### BR-SHELL-005 — Route loading placeholder
| Field | Value |
| --- | --- |
| Description | Every (main) navigation immediately shows one generic skeleton (title line + 8 cover-shaped cards) while the server renders |
| Preconditions | Navigation to a (main) route |
| Conditions | `app/(main)/loading.tsx` |
| Expected behavior | `role="status"`, `aria-busy`, screen-reader label "Loading page…" in the current language |
| Exceptions | Same shape for forms, reader and editor (U-SHELL-03) |
| Related screens | SCR-SHELL-01 |
| Evidence | `apps/web/src/app/(main)/loading.tsx:1-10`, `packages/features/src/shell/components/route-loading.tsx:10-12`, `packages/ui/src/widgets/page-skeleton.tsx:10-25` |
| Status | Verified |

### BR-SHELL-006 — Provider stack
| Field | Value |
| --- | --- |
| Description | Order: QueryProvider → DataProvider (Supabase browser client or `null`) → PlatformProvider (Next adapter) → ToastProvider (sonner) → TooltipProvider → AuthProvider → LanguageSync + LanguageProvider → page; `<Toaster />` mounted once |
| Preconditions | Root layout |
| Conditions | — |
| Expected behavior | One QueryClient per provider instance (never a module singleton) |
| Exceptions | — |
| Related screens | All |
| Evidence | `apps/web/src/app/providers.tsx:23-54`, `packages/features/src/_shared/query-provider.tsx:7-22` |
| Status | Verified |

### BR-SHELL-007 — Error model and retry policy
| Field | Value |
| --- | --- |
| Description | Everything thrown/returned is normalised to `AppError.kind` ∈ {unauthenticated, forbidden, notFound, conflict, rateLimited, invalid, network, unknown}; UI branches on `kind`, never on raw codes |
| Preconditions | Any data call |
| Conditions | RPC contract codes (`42501`, `PT404`, `PT409`, `22023`, `PT429`) via `classifyRpcError`; Postgres codes table; auth errors by name/status; `TypeError` = network |
| Expected behavior | Queries retry up to 2 times only for `network`/`unknown`; mutations never retry; `staleTime` 30 s, `gcTime` 5 min, refetch on window focus |
| Exceptions | — |
| Related screens | All |
| Evidence | `packages/features/src/_shared/errors.ts:8-128`, `packages/features/src/_shared/query.ts:4-33`, `packages/features/src/_shared/errors.test.ts`, `packages/features/src/_shared/query.test.ts` |
| Status | Verified |

### BR-SHELL-008 — Toasts
| Field | Value |
| --- | --- |
| Description | Shared screens toast through a port (`success`/`error`/`info`, already-translated text); the web app renders them with sonner |
| Preconditions | `ToastProvider` |
| Conditions | — |
| Expected behavior | `useAppToast` without provider throws (fail loudly) |
| Exceptions | — |
| Related screens | All |
| Evidence | `packages/features/src/_shared/toast.tsx:17-48`, `apps/web/src/lib/toast.ts:5-11` |
| Status | Verified |

### BR-SHELL-009 — Error boundaries and 404 pages
| Field | Value |
| --- | --- |
| Description | A reusable `ErrorBoundary` (fallback, `resetKeys`, `onError` hook) exists, but **no screen or layout mounts it**, and the app has no `error.tsx`, `global-error.tsx` or `not-found.tsx` |
| Preconditions | Render error, or `notFound()` (missing story/chapter, non-moderator on `/moderation`, gallery in production), or unknown URL |
| Conditions | — |
| Expected behavior | Next.js built-in fallback pages are shown (English, unbranded, without the app header or bottom nav) — Inferred from framework defaults |
| Exceptions | Screens handle query errors themselves with `ErrorState` |
| Related screens | All |
| Evidence | `packages/features/src/_shared/error-boundary.tsx:20-45` (only export in `packages/features/src/_shared/index.ts:26`); file listing of `apps/web/src/app/**` (no error/not-found files); `apps/web/src/app/(main)/story/[id]/[slug]/page.tsx:48`, `apps/web/src/app/(main)/moderation/page.tsx:17` |
| Status | Verified (absence); rendered result Inferred — F-SHELL-01 |

### BR-SHELL-010 — Shared widget contracts
| Field | Value |
| --- | --- |
| Description | Behaviour every screen inherits from `packages/ui/src/widgets` |
| Preconditions | — |
| Conditions | `ConfirmDialog`: buttons disabled while `onConfirm` runs; stays open if it throws; cannot be dismissed while pending. `InfiniteList`: loads next page via IntersectionObserver (240 px margin), never while loading or when nothing left; optional visible "load more" button for keyboard. `ErrorState`: `role="alert"`, optional retry/extra action. `EmptyState`: icon, title, description, action. `PageHeader`: h1, description, actions, optional back button. `PageSkeleton`: BR-SHELL-005 |
| Expected behavior | Text always supplied by callers (translated) |
| Exceptions | English fallbacks `"Retry"` / `"Back"` when a caller omits the label (all current callers pass one) |
| Related screens | All |
| Evidence | `packages/ui/src/widgets/confirm-dialog.tsx:15-70`, `packages/ui/src/widgets/infinite-list.tsx:8-79`, `packages/ui/src/widgets/error-state.tsx:7-44`, `packages/ui/src/widgets/empty-state.tsx:6-32`, `packages/ui/src/widgets/page-header.tsx:7-43`, `packages/ui/src/widgets/widgets.test.tsx` |
| Status | Verified |

### BR-SHELL-011 — Platform adapter (no `next/*` in shared screens)
| Field | Value |
| --- | --- |
| Description | Screens get `Link`, navigation (`push/replace/back/refresh/pathname`), `appOrigin()`, `openExternal()`, `platform`, `isNative` from `PlatformProvider` |
| Preconditions | — |
| Conditions | Web adapter: `next/link`, `useRouter`, `window.location.origin`, `window.open(url, '_blank', 'noopener,noreferrer')`; `platform: 'web'`, `isNative: false` |
| Expected behavior | A Capacitor adapter will supply the same contract (WBS 7.1) |
| Exceptions | `apps/mobile` is empty (`.gitkeep` only) — Phase 7 all ⬜ |
| Related screens | All |
| Evidence | `packages/features/src/_shared/platform.tsx:5-62`, `apps/web/src/lib/platform/next-adapter.tsx:32-43`, `apps/mobile/.gitkeep`, `docs/WBS.md:43-50,238-242` |
| Status | Verified |

### BR-SHELL-012 — Adult-content sync lives in the shell
| Field | Value |
| --- | --- |
| Description | `AdultContentSync` is rendered by `MainShell`, so the account/device 18+ reconciliation runs on every (main) page (rules BR-MAT-*) |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Not run on `(auth)` pages |
| Exceptions | — |
| Related screens | SCR-SHELL-01 |
| Evidence | `packages/features/src/shell/components/main-shell.tsx:9,45` |
| Status | Verified |

### BR-SHELL-013 — Environment configuration
| Field | Value |
| --- | --- |
| Description | Required public env: `NEXT_PUBLIC_SUPABASE_URL` (URL) and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (non-empty), validated with zod; optional `NEXT_PUBLIC_SITE_URL` (BR-SEO-001). The service-role key must never be in the web app |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Missing Supabase env → BR-AUTH-011 |
| Exceptions | — |
| Related screens | — |
| Evidence | `apps/web/src/lib/env.ts:3-32`, `apps/web/.env.example`, `apps/web/src/lib/env.test.ts` |
| Status | Verified |

### BR-SHELL-014 — HTTP security headers
| Field | Value |
| --- | --- |
| Description | Only `poweredByHeader: false` and `reactStrictMode` are configured; no CSP, HSTS, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy` or `Permissions-Policy` in the app |
| Preconditions | — |
| Conditions | Root layout injects an inline bootstrap `<script>` (reader preferences) and pages inject JSON-LD scripts, which a future CSP must allow (nonce/hash) |
| Expected behavior | Hosting defaults only (Unknown) |
| Exceptions | — |
| Related screens | All |
| Evidence | `apps/web/next.config.ts:4-7`, `apps/web/src/app/layout.tsx:39-41`, `docs/WBS.md:252` (WP 8.3 "header bảo mật/CSP") |
| Status | Verified (absence) — F-SHELL-02 |

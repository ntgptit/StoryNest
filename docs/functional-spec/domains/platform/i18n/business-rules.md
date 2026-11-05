# OBJ-I18N — Language: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-I18N` |
| Name | Interface language (vi default, en), text catalogs, language store and switching |
| Business purpose | Serve Vietnamese readers by default and English readers fully, without a reload, on web and (later) mobile |
| User goals | Read the interface in their language; keep that choice on this device and across devices |
| Actors / roles | Guest (device choice), Member (device + account, OBJ-SET), Developer (catalog completeness, hardcode guard) |
| Related entities | Device storage key `storynest.language`; `user_settings.language_code` (OBJ-SET) |
| Code | `packages/features/src/_shared/{i18n.ts,language.tsx}`, `packages/features/src/shell/components/language-switcher.tsx`, `packages/features/src/settings/{api/language.api.ts,hooks/use-language-sync.ts}`, every `packages/features/src/*/strings.ts` + `strings.en.ts`, `apps/web/src/lib/strings.ts`, `scripts/check-hardcode.mjs`, `packages/features/src/_shared/{i18n.test.tsx,catalogs.test.ts}` |
| Dependencies | OBJ-SET (account persistence, BR-SET-004), OBJ-SHELL (header switcher), OBJ-SEO (server texts) |
| WBS | 0.4 ✅ (decision Q4: no library), 6.10 ✅ (all 22 feature modules translated) (`docs/WBS.md:124,228,284`) |

No own screen: controls live in SCR-SHELL-01 (header) and SCR-SET-01.

## 2. Rules

### BR-I18N-001 — Supported languages
| Field | Value |
| --- | --- |
| Description | `vi` (default and source language) and `en` |
| Preconditions | — |
| Conditions | `isLanguage` accepts only these codes |
| Expected behavior | Intl locale = the language code; plurals via `Intl.PluralRules` (`plural(n, { one, other })`) |
| Exceptions | User/DB content (titles, chapters, names) is never translated |
| Related screens | All |
| Evidence | `packages/features/src/_shared/i18n.ts:20-26,76-79,152-159` |
| Status | Verified |

### BR-I18N-002 — Text catalogs
| Field | Value |
| --- | --- |
| Description | Each feature defines its texts with `defineText(id, vi, en)`; reads are resolved in the **current** language at read time (Proxy), so module-level references like `const t = x.item` stay correct after a switch |
| Preconditions | — |
| Conditions | A missing English key falls back to Vietnamese. Type `Messages<T>` forces the same keys/function signatures. `catalogs.test.ts` fails if any registered module lacks a complete, non-empty, Vietnamese-free English catalog |
| Expected behavior | A *string* captured into a module-level constant would not follow — texts must be read inside functions/components |
| Exceptions | `apps/web/src/lib/strings.ts` `appText` (server metadata) is a plain object, not a catalog (BR-I18N-007); `packages/ui` widgets have no catalog (texts passed by callers) |
| Related screens | All |
| Evidence | `packages/features/src/_shared/i18n.ts:1-19,81-150`, `packages/features/src/_shared/catalogs.test.ts`, `packages/features/src/_shared/i18n.test.tsx`, `docs/WBS.md:228` |
| Status | Verified |

### BR-I18N-003 — Device language store
| Field | Value |
| --- | --- |
| Description | The choice is stored under `localStorage['storynest.language']` |
| Preconditions | — |
| Conditions | `setLanguage(lang)` = reader's choice (stored, counted); `{ persist: false }` = apply a stored value; `{ fromAccount: true }` = stored but not counted as a choice |
| Expected behavior | Blocked storage → the choice lasts for the page only (no error) |
| Exceptions | — |
| Related screens | SCR-SHELL-01, SCR-SET-01 |
| Evidence | `packages/features/src/_shared/i18n.ts:23,35-74` |
| Status | Verified |

### BR-I18N-004 — Server renders Vietnamese; client applies the choice after hydration
| Field | Value |
| --- | --- |
| Description | The server always renders Vietnamese with `<html lang="vi">`; `LanguageProvider` applies the stored language after hydration and keeps `document.documentElement.lang` in sync |
| Preconditions | Page load |
| Conditions | Stored language ≠ `vi` |
| Expected behavior | No hydration mismatch; an English reader briefly sees Vietnamese on every full page load; the HTML that crawlers and no-JS clients get is always `lang="vi"` |
| Exceptions | — |
| Related screens | All |
| Evidence | `apps/web/src/app/layout.tsx:34`, `packages/features/src/_shared/language.tsx:13-36`, `docs/WBS.md:124` (documented limitation) |
| Status | Verified — U-I18N-01 |

### BR-I18N-005 — Switching re-mounts the page
| Field | Value |
| --- | --- |
| Description | A language change re-mounts everything below `LanguageProvider` (`<Fragment key={language}>`) so every text is read again, without a reload |
| Preconditions | `setLanguage` with a different language |
| Conditions | — |
| Expected behavior | Auth state, query cache and LanguageSync (mounted above the provider) are kept; **component state of the current page (form input, dialogs, scroll) is lost** |
| Exceptions | — |
| Related screens | All |
| Evidence | `packages/features/src/_shared/language.tsx:18-35`, `apps/web/src/app/providers.tsx:36-39`, `docs/WBS.md:124` |
| Status | Verified — U-I18N-02 |

### BR-I18N-006 — Header language switcher
| Field | Value |
| --- | --- |
| Description | A compact button in the main header shows the current code ("VI"/"EN") and switches to the next language; available to guests and members |
| Preconditions | (main) page |
| Conditions | `aria-label` = "Switch to English" / "Switch to Tiếng Việt" (target language name in its own language) |
| Expected behavior | BR-I18N-003 + BR-I18N-005; members also get BR-SET-004 |
| Exceptions | Not present on the `(auth)` layout or the dev gallery (U-AUTH-01) |
| Related screens | SCR-SHELL-01 |
| Evidence | `packages/features/src/shell/components/language-switcher.tsx:7-23`, `packages/features/src/shell/strings.en.ts:15-19`, `apps/web/src/app/(auth)/layout.tsx:5-13` |
| Status | Verified |

### BR-I18N-007 — Server-written texts stay Vietnamese
| Field | Value |
| --- | --- |
| Description | Page titles (`"%s · StoryNest"`), site description, chapter title format and OG card brand come from `appText`, written on the server, always Vietnamese; no `hreflang`, no per-language URLs |
| Preconditions | — |
| Conditions | — |
| Expected behavior | The browser tab title stays Vietnamese after switching to English |
| Exceptions | `homeText` in the same file is a catalog (client) |
| Related screens | All |
| Evidence | `apps/web/src/lib/strings.ts:1-51`, `apps/web/src/app/layout.tsx:13-18`, `docs/WBS.md:124,228` |
| Status | Verified — U-I18N-01 |

### BR-I18N-008 — Validation messages are codes
| Field | Value |
| --- | --- |
| Description | Zod schemas in `@storynest/validation` return stable codes (`password_too_short`, `username_invalid`…); each feature translates them via `translateErrors(resolver, translate)` |
| Preconditions | Form validation |
| Conditions | Unknown code → feature's generic text, never raw English |
| Expected behavior | Same schema serves server, tests and every language |
| Exceptions | — |
| Related screens | Every form |
| Evidence | `packages/features/src/_shared/form-resolver.ts:15-29`, `packages/validation/src/auth.ts:9-20`, `packages/features/src/auth/model/messages.ts:16-20` |
| Status | Verified |

### BR-I18N-009 — Hardcode guard
| Field | Value |
| --- | --- |
| Description | `pnpm check:hardcode` (part of `pnpm gate`) fails on: Vietnamese diacritics in non-`strings*.ts` code, literal `aria-label`/`placeholder`/`alt`/`title` text, and string literals as query filter values |
| Preconditions | CI / local gate |
| Conditions | Skips tests, `strings.ts`/`strings.en.ts`, generated files and `apps/web/src/app/dev/**`; per-line escape `hardcode-check-ignore: <reason>` |
| Expected behavior | — |
| Exceptions | English literals without diacritics and attribute values set via expressions are not detected (e.g. `"Back"`/`"Retry"` fallbacks in `packages/ui`) — F-I18N-01 |
| Related screens | — |
| Evidence | `scripts/check-hardcode.mjs:1-90`, `package.json:9,20`, `packages/ui/src/widgets/page-header.tsx:30`, `packages/ui/src/widgets/error-state.tsx:37` |
| Status | Verified |

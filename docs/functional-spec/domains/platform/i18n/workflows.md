# OBJ-I18N — Language: workflows

Rules: [business-rules.md](business-rules.md).

## WF-I18N-01 — Switch language from the header
| Field | Value |
| --- | --- |
| User goal | Read the interface in the other language |
| Trigger | VI/EN button in SCR-SHELL-01 |
| Preconditions | On a (main) page |
| Main flow | 1. `setLanguage(next)` stores the choice. 2. Listeners fire; `LanguageProvider` re-keys its subtree. 3. All texts re-read; `<html lang>` updated. 4. Member: LanguageSync saves to the account after 500 ms |
| Alternative flows | A1. From Settings select (WF-SET-01) |
| Exception flows | E1. Storage blocked → applies for this page only. E2. Unsaved input on the page is lost (U-I18N-02) |
| Success criteria | Interface in the new language without reload |
| Postconditions | Choice kept on reload (device) and across devices (member) |
| Affected objects | OBJ-I18N, OBJ-SET |
| Related screens | SCR-SHELL-01, SCR-SET-01 |
| Status | Verified (`packages/features/src/shell/shell.test.tsx`, runtime check `docs/WBS.md:124`) |

## WF-I18N-02 — Load a page with a stored language
| Field | Value |
| --- | --- |
| User goal | See their language when opening any URL |
| Trigger | Full page load / new tab |
| Preconditions | `storynest.language` stored |
| Main flow | 1. Server HTML in Vietnamese, `lang="vi"`, Vietnamese `<title>`. 2. Hydration with Vietnamese. 3. Effect reads storage → `setLanguage(stored, { persist: false })` → re-mount in English |
| Alternative flows | A1. Member with account language → WF-SET-04 may override |
| Exception flows | — |
| Success criteria | Page in stored language after a brief Vietnamese flash; tab title remains Vietnamese |
| Postconditions | — |
| Affected objects | OBJ-I18N |
| Related screens | All |
| Status | Verified — U-I18N-01 |

## WF-I18N-03 — Add or change a UI text (developer)
| Field | Value |
| --- | --- |
| User goal | Keep both languages complete |
| Trigger | Code change with user-visible text |
| Preconditions | — |
| Main flow | 1. Add key to the feature's `strings.ts` (vi) and `strings.en.ts` (en). 2. `pnpm test` (`catalogs.test.ts`) checks keys, value kinds, function arity, non-empty, no Vietnamese in en. 3. `pnpm check:hardcode` rejects Vietnamese literals elsewhere |
| Alternative flows | — |
| Exception flows | E1. English literal in code passes the guard (F-I18N-01) |
| Success criteria | Gate green |
| Postconditions | — |
| Affected objects | OBJ-I18N |
| Related screens | — |
| Status | Verified |

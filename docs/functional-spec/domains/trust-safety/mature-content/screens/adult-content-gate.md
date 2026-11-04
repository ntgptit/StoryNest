# SCR-MAT-01 — Adult content gate (embedded) and header 18+ toggle

## A. Identification

| Field | Value |
| --- | --- |
| Screen ID | SCR-MAT-01 |
| Name | Adult content gate; component of the app header: "Mature content (18+)" toggle + dialog |
| Route | Embedded on `/story/[id]/[slug]` and `/story/[id]/[slug]/[chapterSlug]` (gate); header on every `(main)` page (toggle) |
| Route file | `apps/web/src/app/(main)/story/[id]/[slug]/page.tsx`, `apps/web/src/app/(main)/story/[id]/[slug]/[chapterSlug]/page.tsx` (hosts) |
| Screen component | Gate `packages/features/src/adult-content/components/adult-gate.tsx` (used by `story/screens/story-screen.tsx:66`, `reader/screens/reader-screen.tsx:71`); toggle `adult-content/components/adult-content-button.tsx` (mounted in `shell/components/site-header.tsx:18`); sync `adult-content/components/adult-content-sync.tsx` (`shell/components/main-shell.tsx:30`) |
| Roles | Guest, Member, Moderator (no difference) |
| Workflows | WF-MAT-01, WF-MAT-02, WF-MAT-03 |
| Rules | BR-MAT-001…005, BR-MAT-009, BR-MAT-010 |

## B. Components

| ID | Component | Content / behaviour | Evidence |
| --- | --- | --- | --- |
| SCR-MAT-01-C01 | Gate panel | `EmptyState` with ShieldAlert icon; title "Mature story" (`gate.title`); text "The author has marked this story as 18+. Confirm that you are 18 or older to view it." (`gate.description`) | `adult-gate.tsx:20-22`, `strings.en.ts:15-17` |
| SCR-MAT-01-C02 | "Go back" | Outline button → `navigation.back()` (`gate.back`) | `adult-gate.tsx:24-26` |
| SCR-MAT-01-C03 | "I'm 18 or older, continue" | Primary button → `enable()` (`gate.confirm`) | `adult-gate.tsx:27-29` |
| SCR-MAT-01-C04 | Header toggle | Ghost icon button, `aria-label="Mature content (18+)"` (`button`), `aria-pressed = show`; icon ShieldAlert (hidden) / ShieldCheck (shown); no visible text | `adult-content-button.tsx:29-38` |
| SCR-MAT-01-C05 | Toggle dialog | Title "Mature content"; description by state (`dialog.hiddenDescription` / `dialog.shownDescription`); note "This choice is saved on this device; when you sign in, it is also saved to your account so it applies on all your devices." | `adult-content-button.tsx:39-46`, `strings.en.ts:3-8` |
| SCR-MAT-01-C06 | Dialog actions | Hidden: "Keep hidden" (outline) + "I'm 18 or older, show 18+ stories". Shown: "Hide 18+ stories again" | `adult-content-button.tsx:47-73`, `strings.en.ts:9-11` |
| SCR-MAT-01-C07 | "18+" badge | Destructive badge on the story page header and on story cards (`discoveryText.mature`) | `story/screens/story-screen.tsx:90`, `discovery/model/story-card.ts:75` |

## C. User actions & system responses

| Field | SCR-MAT-01-A01 — Confirm age at the gate |
| --- | --- |
| Trigger | "I'm 18 or older, continue" |
| Preconditions | Gate visible (`isMature && !show`) |
| Expected behavior | Gate replaced in place by the story page / chapter; header icon turns to ShieldCheck; lists include 18+ |
| State change | Device `{ageConfirmed:true, show:true}`; account upsert if signed in |
| Validation | — |
| Error behavior | Storage blocked → works for this page only |
| Navigation | Stays on the URL |
| Evidence | `adult-gate.tsx:27-29`, `use-adult-content.ts:10-11`, `adult-content.test.tsx:227` |

| Field | SCR-MAT-01-A02 — "Go back" |
| --- | --- |
| Trigger | "Go back" |
| Preconditions | Gate visible |
| Expected behavior | Browser history back |
| State change | None |
| Validation | — |
| Error behavior | No history (new tab / direct link) → nothing visible happens or the user leaves the site (U-MAT-01) |
| Navigation | Previous page |
| Evidence | `adult-gate.tsx:24-26`, `adult-content.test.tsx:232` |

| Field | SCR-MAT-01-A03 — Open the header toggle |
| --- | --- |
| Trigger | Click C04 |
| Preconditions | — |
| Expected behavior | Dialog C05 with state-dependent text and actions |
| State change | Local `open` |
| Validation | — |
| Error behavior | — |
| Navigation | Modal |
| Evidence | `adult-content-button.tsx:35,39` |

| Field | SCR-MAT-01-A04 — Show 18+ stories (header) |
| --- | --- |
| Trigger | "I'm 18 or older, show 18+ stories" |
| Preconditions | Dialog open, state hidden |
| Expected behavior | Dialog closes; lists refetch with 18+; any open gate on the page disappears |
| State change | `{ageConfirmed:true, show:true}` |
| Validation | — |
| Error behavior | — |
| Navigation | — |
| Evidence | `adult-content-button.tsx:62-70`, `adult-content.test.tsx:200` |

| Field | SCR-MAT-01-A05 — Keep hidden |
| --- | --- |
| Trigger | "Keep hidden" / Esc / overlay |
| Preconditions | Dialog open |
| Expected behavior | Dialog closes, nothing changes |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | — |
| Evidence | `adult-content-button.tsx:59-61`, `adult-content.test.tsx:194` |

| Field | SCR-MAT-01-A06 — Hide 18+ stories again |
| --- | --- |
| Trigger | "Hide 18+ stories again" |
| Preconditions | Dialog open, state shown |
| Expected behavior | Dialog closes; lists refetch without 18+; on an 18+ story page the gate reappears immediately |
| State change | `show:false`, `ageConfirmed` kept |
| Validation | — |
| Error behavior | — |
| Navigation | Stays on the page (gate shown) |
| Evidence | `adult-content-button.tsx:48-57`, `use-adult-content.ts:12-13`, `adult-content.test.tsx:213,246` |

## D. UI states

| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | Server and first client render use the safe default (hidden) → gate rendered on the server for 18+ stories, then switches after hydration if the device says "shown" (`store.ts:52-55`) |
| Loading | Implemented | Reader shows its skeleton until both chapter and story are loaded, so no chapter block flashes (`reader-screen.tsx:45-46`) |
| Empty | Not applicable | — |
| Populated | Implemented | Gate panel / dialog |
| Validation error | Not applicable | — |
| Request error | Not applicable (gate) / Implemented silently (sync failures ignored) | `use-adult-content-sync.ts:30-34` |
| Success | Implemented | Content revealed in place; no toast |
| Disabled | Not applicable | — |
| Unauthorized | Not applicable | Gate is not a permission check (self-declaration) |
| Offline | Implemented | Works offline (device store) |
| Unsaved changes | Not applicable | — |
| Flash on hydration (device = shown) | Implemented (accepted) | A reader who opted in briefly sees the server-rendered gate before the content (safe default) — Inferred |

## E. Acceptance criteria

- **SCR-MAT-01-AC01** Given a guest with no stored choice, when they open an 18+ story by link, then they see only the gate (no title, cover, synopsis, read button, report button or comments). *(Verified)*
- **SCR-MAT-01-AC02** Given the gate, when the reader clicks "I'm 18 or older, continue", then the story renders and the header toggle reports pressed. *(Verified)*
- **SCR-MAT-01-AC03** Given an 18+ chapter whose story loads after the chapter, then nothing of the chapter is shown before the story is known. *(Verified, `packages/features/src/reader/reader.test.tsx:279-281`)*
- **SCR-MAT-01-AC04** Given the header dialog in hidden state, when "Keep hidden" is clicked, then no list changes. *(Verified)*
- **SCR-MAT-01-AC05** Given 18+ shown, when "Hide 18+ stories again" is clicked on an 18+ story page, then the gate appears again and lists drop 18+ stories. *(Verified)*
- **SCR-MAT-01-AC06** Given a stored value `{"ageConfirmed":false,"show":true}`, then 18+ content stays hidden. *(Verified)*
- **SCR-MAT-01-AC07** Given a choice changed in another tab, then this tab follows without reload. *(Verified)*
- **SCR-MAT-01-AC08** Given a signed-in account that confirmed its age on another device, when it opens the app on a new device, then the account's choice applies without asking. *(Verified)*
- **SCR-MAT-01-AC09** `[Proposed]` Given an 18+ story and a hidden choice, then the HTML response contains no story title, synopsis, cover URL or chapter text (generic title/OG, no dehydrated content) (F-MAT-01).
- **SCR-MAT-01-AC10** `[Proposed]` Given the gate opened without browser history, when "Go back" is clicked, then the reader lands on the home page (U-MAT-01).
- **SCR-MAT-01-AC11** `[Proposed]` Given a member who signs out on a shared device, then the device returns to "hidden" (F-MAT-03).
- **SCR-MAT-01-AC12** `[Proposed]` Given the header toggle, then its accessible name states the current state (e.g. "Mature content (18+): hidden") and it is not announced as a toggle button while it opens a dialog (U-MAT-02).

## F. Findings referenced
F-MAT-01, F-MAT-03, U-MAT-01, U-MAT-02.

## G. Open questions
Q-MAT-01 (re-asking after hiding), Q-MAT-03 (sign-out reset).

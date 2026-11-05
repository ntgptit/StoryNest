# SCR-HIST-01 — Version history

Rules: [../business-rules.md](../business-rules.md) · Workflows: [../workflows.md](../workflows.md)

## A. Identification

| Field | Value |
| --- | --- |
| Screen ID | `SCR-HIST-01` |
| Business domain | [D-STUDIO Authoring (Studio)](../../overview.md) |
| Business object | [OBJ-HIST](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Version history (browser title `appText.pageTitle.history` "Lịch sử phiên bản", always Vietnamese — `OBJ-I18N`) |
| Route | `/studio/story/{id}/chapter/{chapterId}/history` (protected, `robots: noindex`) |
| Route file | `apps/web/src/app/(main)/studio/story/[id]/chapter/[chapterId]/history/page.tsx` → `history-view.tsx` (passes `getImageUrlResolver()`) |
| Screen component | `packages/features/src/history/screens/history-screen.tsx` (`HistoryScreen` → `HistoryContent` → `VersionViewer` / `DiffView`) |
| Roles | owner, co_author, editor (`BR-TEAM-*`) |
| Entry points | Editor "Version history" button (`packages/features/src/editor/screens/chapter-editor-screen.tsx:434-436`); no link from the chapter manager |
| Workflows | WF-HIST-01, WF-HIST-02, WF-HIST-03 |

## B. Components

| ID | Component | Description | Evidence |
| --- | --- | --- | --- |
| SCR-HIST-01-C01 | Page header | "Version history" + description with chapter title | `history-screen.tsx:108` |
| SCR-HIST-01-C02 | Back link | "Back to editor" | `history-screen.tsx:109-114` |
| SCR-HIST-01-C03 | Version list | `<ol aria-label="Versions">` of toggle buttons (`aria-pressed`): "Version n", live badge, title, words · published · author | `history-screen.tsx:120-142` |
| SCR-HIST-01-C04 | Empty state | "This chapter hasn't been published yet" | `history-screen.tsx:116-117` |
| SCR-HIST-01-C05 | Viewer section | `<section aria-label="Content of version n">` | `history-screen.tsx:205` |
| SCR-HIST-01-C06 | Mode toggle | `role="group"` buttons "Content" / "Compare" (`aria-pressed`) | `history-screen.tsx:207-220` |
| SCR-HIST-01-C07 | Restore button | "Restore to draft" | `history-screen.tsx:221-223` |
| SCR-HIST-01-C08 | Restored status | `role="status"` "Restored to draft." + "Open editor" link | `history-screen.tsx:226-236` |
| SCR-HIST-01-C09 | Content view | `<article class="reader-text">` H2 title + `BlockView`s; empty note | `history-screen.tsx:269-278` |
| SCR-HIST-01-C10 | Compare base select | Label "Compare with": "Current draft" + other versions | `history-screen.tsx:240-257` |
| SCR-HIST-01-C11 | Diff view | Caption, summary (`aria-live`), list with Added/Removed/Changed badges, "Before:" text | `history-screen.tsx:300-338` |
| SCR-HIST-01-C13 | Differences only and change steps (Lucian #217 / #127) | Switch "Only show changes" folds each run of unchanged paragraphs into one "N unchanged paragraphs" row (opens on its own; folded rows are `inert`); "Previous change" / "Next change" with "Change i of n" (`aria-live`) scroll to and focus each change (consecutive changed blocks count as one). No restore per change: restore still takes the whole version (`BR-HIST-006`) | `history-screen.tsx` (`DiffView`), `model/history.ts` (`groupDiff`), `packages/ui/src/widgets/diff-folds.tsx` |
| SCR-HIST-01-C12 | Restore confirm dialog | "Restore this version to the draft?" Restore / Cancel | `history-screen.tsx:280-297` |

## C. User actions & system responses

| Field | SCR-HIST-01-A01 Open history |
| --- | --- |
| Trigger | Navigate to route |
| Preconditions | Signed in |
| Expected behavior | Skeleton → list + newest version content |
| State change | — |
| Validation | `draft.storyId = {id}` |
| Error behavior | "Chapter not found" / "Couldn't load the history" + Try again (refetches both) |
| Navigation | Anonymous → login |
| Evidence | `history-screen.tsx:52-83` |

| Field | SCR-HIST-01-A02 Select a version |
| --- | --- |
| Trigger | Click a list entry |
| Preconditions | ≥ 1 version |
| Expected behavior | Viewer remounts for that version (mode resets to Content, base resets to draft) |
| State change | Local selection |
| Validation | — |
| Error behavior | Blocks error → ErrorState + retry |
| Navigation | — |
| Evidence | `history-screen.tsx:103-104,125-126,144-153,188-198` |

| Field | SCR-HIST-01-A03 Compare |
| --- | --- |
| Trigger | "Compare" + choose base |
| Preconditions | Version blocks loaded |
| Expected behavior | Diff (`BR-HIST-005`) |
| State change | Local mode/base |
| Validation | — |
| Error behavior | Base blocks still loading → skeleton (no explicit error state for base load failure: skeleton stays) |
| Navigation | — |
| Evidence | `history-screen.tsx:180-202,237-260` |

| Field | SCR-HIST-01-A04 Restore to draft |
| --- | --- |
| Trigger | C07 → C12 "Restore" |
| Preconditions | Version blocks loaded |
| Expected behavior | Draft replaced (`BR-HIST-006`); toast + C08 |
| State change | `chapter_drafts` revision +1; local backup removed |
| Validation | `chapterBodySchema` on the restored body |
| Error behavior | Toast by kind (`BR-HIST-009`); dialog stays open |
| Navigation | "Open editor" → SCR-EDT-01 |
| Evidence | `history-screen.tsx:221-236,280-297`, `hooks/use-history.ts:36-62` |

| Field | SCR-HIST-01-A05 Back to editor |
| --- | --- |
| Trigger | C02 |
| Preconditions | — |
| Expected behavior | Navigate to SCR-EDT-01 |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | `/studio/story/{id}/chapter/{chapterId}` |
| Evidence | `history-screen.tsx:109-114` |

## D. UI states

| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial / Loading | Implemented | Page skeleton (`:51`), viewer skeleton (`:184`), diff skeleton (`:254-255`) |
| Empty | Implemented | No versions → empty state; empty version → "This version has no content." |
| Populated | Implemented | List + viewer |
| Validation error | Not applicable | No inputs; invalid restore body → toast |
| Request error | Implemented (partial) | Page and viewer ErrorState with retry; restore toast. **Missing**: base-version load failure in Compare shows an endless skeleton (`:197-198,254`) |
| Success | Implemented | Toast + inline "Restored to draft." |
| Disabled | Implemented | Dialog buttons disabled while restoring (`confirm-dialog.tsx:60-63`) |
| Unauthorized | Implemented | Login redirect; "Chapter not found" without role |
| Offline | Implemented (generic) | Load error state; restore "No connection…" toast |
| Unsaved changes | Not applicable | Read-only except restore (confirmed) |

## E. Acceptance criteria

| ID | Given / When / Then | Type |
| --- | --- | --- |
| SCR-HIST-01-AC01 | Given a chapter published 3 times, when the history opens, then versions 3, 2, 1 are listed and the live one is badged "Currently visible to readers". | Happy |
| SCR-HIST-01-AC02 | Given a never-published chapter, when the history opens, then "This chapter hasn't been published yet" is shown. | Empty |
| SCR-HIST-01-AC03 | Given a user without a role, when they open the URL, then "Chapter not found" is shown. | Permission |
| SCR-HIST-01-AC04 | Given version 2 selected, when "Compare" with "Current draft" is chosen, then edited paragraphs are "Changed" (with the previous text), new ones "Added", deleted ones "Removed" at their old position. | Happy |
| SCR-HIST-01-AC05 | Given two identical block lists, when compared, then "The two versions are identical." is shown. | Edge |
| SCR-HIST-01-AC06 | Given version 1, when the author confirms "Restore", then the draft equals version 1 with the same block ids, the version count and live version are unchanged, and "Restored to draft." is shown. | Happy / State |
| SCR-HIST-01-AC07 | Given the draft is saved elsewhere between re-read and write, when restoring, then "The draft was just edited elsewhere…" is shown and nothing is reported as restored. | Error |
| SCR-HIST-01-AC08 | Given a local unsaved backup exists, when a restore succeeds, then the backup is removed. | State |
| SCR-HIST-01-AC09 | Given the restore dialog, when "Cancel" is pressed, then the draft is unchanged. | Navigation |
| SCR-HIST-01-AC10 `[Proposed]` | Given a version whose title differs from the base, when compared, then the title change is shown. | Edge (U-HIST-01) |
| SCR-HIST-01-AC11 `[Proposed]` | Given a restore replaced an unpublished draft, when the author regrets it, then the previous draft can be recovered (undo or automatic snapshot). | Edge (F-HIST-01) |
| SCR-HIST-01-AC13 | Given a comparison with unchanged paragraphs, when "Only show changes" is on, then each unchanged run is one "N unchanged paragraphs" row that opens on click, and turning it off shows everything again. | Happy |
| SCR-HIST-01-AC14 | Given two changes, when "Next change" is pressed twice, then focus moves to the first and then the second change, "Change 2 of 2" is announced and "Next change" is disabled. | Happy |
| SCR-HIST-01-AC12 `[Proposed]` | Given the base version cannot be loaded in Compare, when the request fails, then an error with retry is shown instead of a permanent skeleton. | Error |

## F. Findings referenced

F-HIST-01, F-HIST-02, U-HIST-01, F-EDT-02 (details: [functional gap analysis](../../../../audits/functional-gap-analysis.md) / [UX gap analysis](../../../../audits/ux-ui-gap-analysis.md)).

## G. Open questions

Q-HIST-01 (should restore snapshot the replaced draft?), Q-HIST-02 (should moderators get read-only history?).

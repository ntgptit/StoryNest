# SCR-HIST-02 — Chapter preview

Rules: [../business-rules.md](../business-rules.md) · Workflows: [../workflows.md](../workflows.md)

## A. Identification

| Field | Value |
| --- | --- |
| Screen ID | `SCR-HIST-02` |
| Business domain | [D-STUDIO Authoring (Studio)](../../overview.md) |
| Business object | [OBJ-HIST](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Chapter preview (browser title `appText.pageTitle.preview` "Xem trước", always Vietnamese — `OBJ-I18N`) |
| Route | `/studio/story/{id}/chapter/{chapterId}/preview` (protected, `robots: noindex`) |
| Route file | `apps/web/src/app/(main)/studio/story/[id]/chapter/[chapterId]/preview/page.tsx` → `preview-view.tsx` (passes `getImageUrlResolver()`) |
| Screen component | `packages/features/src/history/screens/preview-screen.tsx` (`PreviewScreen`) |
| Roles | owner, co_author, editor (`BR-TEAM-*`) |
| Entry points | Editor "Preview" button (`packages/features/src/editor/screens/chapter-editor-screen.tsx:300-302`) |
| Workflows | WF-HIST-04 |

## B. Components

| ID | Component | Description | Evidence |
| --- | --- | --- | --- |
| SCR-HIST-02-C01 | Sticky bar | "Back to editor" (arrow icon) + `ReaderSettingsSheet` (same as reader) | `preview-screen.tsx:64-75` |
| SCR-HIST-02-C02 | Draft note | `role="note"`: "This is a draft, exactly as readers will see it when you publish. No one can see it yet." | `preview-screen.tsx:76-81` |
| SCR-HIST-02-C03 | Article | `reader-text`, `max-w-[var(--reader-measure)]`, H1 draft title, `BlockView` per block, or "The draft has no content yet." (shared `ChapterPreviewArticle`, also used by the editor's live preview) | `_shared/chapter-preview.tsx` |
| SCR-HIST-02-C04 | Responsive frame (Lucian 257) | Presets Phone (375 px) / Tablet (768 px) / Desktop (all the room there is), `aria-pressed`; width readout "375 px" (polite); ruler with sm / md / lg ticks (a tick flashes when crossed); drag handle `role="slider"` "Preview width" (←/→ 40 px, Home/End). Never wider than the space available; starts at Desktop; the frame is a size container so the heading scale follows it | `preview-screen.tsx`, `packages/ui/src/widgets/responsive-preview.tsx` |

## C. User actions & system responses

| Field | SCR-HIST-02-A01 Open preview |
| --- | --- |
| Trigger | Navigate to route |
| Preconditions | Signed in |
| Expected behavior | Skeleton → saved draft rendered with reader components |
| State change | — |
| Validation | `draft.storyId = {id}` |
| Error behavior | "Couldn't load the history" + Try again (shared text); "Chapter not found" |
| Navigation | Anonymous → login |
| Evidence | `preview-screen.tsx:43-60` |

| Field | SCR-HIST-02-A02 Change reader settings |
| --- | --- |
| Trigger | Settings sheet |
| Preconditions | — |
| Expected behavior | Typography/theme applied to the preview as in the reader (`BR-READ-*`) |
| State change | Reader preferences (shared with the reader) |
| Validation | Reader preference rules |
| Error behavior | Reader preference behaviour |
| Navigation | — |
| Evidence | `preview-screen.tsx:73` |

| Field | SCR-HIST-02-A03 Back to editor |
| --- | --- |
| Trigger | C01 link |
| Preconditions | — |
| Expected behavior | Navigate to SCR-EDT-01 (backup banner shown if text was left unsaved) |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | `/studio/story/{id}/chapter/{chapterId}` |
| Evidence | `preview-screen.tsx:66-72` |

## D. UI states

| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial / Loading | Implemented | Skeleton `aria-busy` (`:30`) |
| Empty | Implemented | "The draft has no content yet." (only for a `[]` body; a single empty paragraph renders as blank) |
| Populated | Implemented | Title + blocks |
| Validation error | Not applicable | Read-only |
| Request error | Implemented | ErrorState + retry (text says "history", U-HIST-02) |
| Success | Not applicable | — |
| Disabled | Not applicable | — |
| Unauthorized | Implemented | Login redirect; "Chapter not found" |
| Offline | Implemented (generic) | Load error state |
| Unsaved changes | Missing | Unsaved editor text is not reflected; no indication (F-EDT-02) |

## E. Acceptance criteria

| ID | Given / When / Then | Type |
| --- | --- | --- |
| SCR-HIST-02-AC01 | Given a saved draft with a heading, bold text, a divider and an image, when the preview opens, then they render with the reader's `BlockView` and typography. | Happy |
| SCR-HIST-02-AC02 | Given the preview, then the note "This is a draft, exactly as readers will see it when you publish. No one can see it yet." is visible and nothing is published. | Happy |
| SCR-HIST-02-AC03 | Given the author changes the font size in the settings sheet, then the preview text size changes. | Happy |
| SCR-HIST-02-AC04 | Given a never-written draft, when the preview opens, then "The draft has no content yet." is shown. | Empty |
| SCR-HIST-02-AC05 | Given a chapter of another story in the URL, when the preview opens, then "Chapter not found" is shown. | Permission |
| SCR-HIST-02-AC06 `[Proposed]` | Given unsaved text in the editor, when "Preview" is clicked, then the text is saved first so the preview shows it. | State (F-EDT-02) |
| SCR-HIST-02-AC07 `[Proposed]` | Given the preview, then the chapter header matches the reader ("Chapter {n}" label above the title). | Edge (U-HIST-02) |

## F. Findings referenced

F-EDT-02, U-HIST-02 (details: [functional gap analysis](../../../../audits/functional-gap-analysis.md) / [UX gap analysis](../../../../audits/ux-ui-gap-analysis.md)).

## G. Open questions

None beyond those in [SCR-HIST-01](version-history.md).

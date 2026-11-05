# SCR-MOD-02 — Report dialog (embedded)

File name note: this spec is named `flag-content-dialog.md` (the tooling used to write the spec refuses file names
containing "report"); the screen is the "Report" button and "Report content" dialog.

## A. Identification

| Field | Value |
| --- | --- |
| Screen ID | SCR-MOD-02 |
| Business domain | [D-TRUST Trust & Safety](../../overview.md) |
| Business object | [OBJ-MOD](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Report button + "Report content" dialog |
| Route | None (embedded component) |
| Route file | — (hosted by the routes below) |
| Screen component | `packages/features/src/moderation/components/report-button.tsx` |
| Roles | Guest (sees the button; redirected to sign in), Member (active), Moderator |
| Workflows | WF-MOD-01 |
| Rules | BR-MOD-002…008, BR-MOD-021 |

### Mount points (every place `ReportButton` is rendered)

| Host screen | Route | Kind | Owner hidden? | Placement | Evidence |
| --- | --- | --- | --- | --- | --- |
| Story page (SCR-STORY-*) | `/story/[id]/[slug]` | `story` | **No** (`ownerId` not passed) | Under the story actions in the header, inside the 18+ gate | `packages/features/src/story/screens/story-screen.tsx:111-114` |
| Chapter reader (SCR-READ-*) | `/story/[id]/[slug]/[chapterSlug]` | `chapter` | **No** | Centered after "— End of chapter —" and the vote button, before comments | `packages/features/src/reader/screens/reader-screen.tsx:113-116` |
| Comment item (OBJ-CMT thread inside the reader) | same as reader | `comment` | Yes (`!own`) and only for `visible` comments; top-level comments and replies; visible label "Report" | Comment action row | `packages/features/src/comments/components/comment-item.tsx:182-184` |
| Author page (SCR-AUTHOR-01) | `/author/[username]` | `user` | Yes (`ownerId = profile.userId`) | Under "Follow" in the profile header | `packages/features/src/author/screens/author-screen.tsx:87-90` |

Not mounted on: story cards in lists, reading list pages (`/lists/[id]`, OBJ-LIST), the member's own profile `/me`,
Studio, notifications. A reading list itself cannot be reported (not a target kind, BR-MOD-002).

## B. Components

| ID | Component | Content / behaviour | Evidence |
| --- | --- | --- | --- |
| SCR-MOD-02-C01 | Report button | Ghost/outline small button, Flag icon (`aria-hidden`), visible text "Report" (or caller's `label`), accessible name "Report story/chapter/comment/user" (`report.button` + `report.kinds.*`). Not rendered while auth is loading | `report-button.tsx:54-92` |
| SCR-MOD-02-C02 | Dialog header | Title "Report content: <kind>"; description "Tell us why this content isn't appropriate. A moderator will review it." | `report-button.tsx:95-98`, `strings.en.ts:4-5` |
| SCR-MOD-02-C03 | Reason select | Label "Reason"; placeholder "Choose a reason"; 7 options (BR-MOD-003) | `report-button.tsx:100-114` |
| SCR-MOD-02-C04 | Details textarea | Label "Details (optional)"; placeholder "Briefly describe what you saw…"; `maxLength=2000`, no counter | `report-button.tsx:115-124` |
| SCR-MOD-02-C05 | Error message | `role="alert"`, text by error kind | `report-button.tsx:125-129`, `model/report.ts:164-183` |
| SCR-MOD-02-C06 | Footer | "Cancel" (outline), "Submit report" / "Sending…" (disabled until a reason is chosen and while sending) | `report-button.tsx:131-138` |

## C. User actions & system responses

| Field | SCR-MOD-02-A01 — Click "Report" as a guest |
| --- | --- |
| Trigger | Click C01 without a session |
| Preconditions | `auth.status = unauthenticated` |
| Expected behavior | Navigates to `/login?next=<encoded current pathname>` |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | Login; after sign-in, back to the same path (query string and `#comments` anchor are not preserved); dialog does not reopen |
| Evidence | `report-button.tsx:86-88`, `moderation.test.tsx:264` |

| Field | SCR-MOD-02-A02 — Click "Report" as a member |
| --- | --- |
| Trigger | Click C01 |
| Preconditions | Signed in; not the known owner |
| Expected behavior | Dialog opens with an empty form |
| State change | `open = true` |
| Validation | — |
| Error behavior | — |
| Navigation | Modal (focus handled by the shared Radix dialog) |
| Evidence | `report-button.tsx:86-93` |

| Field | SCR-MOD-02-A03 — Choose a reason |
| --- | --- |
| Trigger | Select an option |
| Preconditions | Dialog open |
| Expected behavior | "Submit report" becomes enabled |
| State change | `reason` |
| Validation | `isReportReason` guard |
| Error behavior | — |
| Navigation | — |
| Evidence | `report-button.tsx:102,135` |

| Field | SCR-MOD-02-A04 — Type details |
| --- | --- |
| Trigger | Typing |
| Preconditions | Dialog open |
| Expected behavior | Text kept; hard stop at 2000 characters |
| State change | `details` |
| Validation | `maxLength`; server ≤ 2000 after trim |
| Error behavior | — |
| Navigation | — |
| Evidence | `report-button.tsx:117-123` |

| Field | SCR-MOD-02-A05 — Submit |
| --- | --- |
| Trigger | "Submit report" |
| Preconditions | Reason chosen |
| Expected behavior | `submit_report(kind, targetId, reason[, details])`; "Sending…"; success → toast "Report sent. Thank you.", dialog closes, form cleared. Duplicate open report → same success (BR-MOD-007) |
| State change | `content_reports` row `pending` |
| Validation | Server BR-MOD-003…008 |
| Error behavior | Dialog stays open with inputs kept; message: forbidden/unauthenticated "You can't submit a report right now.", notFound "This content no longer exists or you can't view it.", conflict "This content can't be reported.", invalid "You can't report your own content, or the information isn't valid.", rateLimited "You've sent too many reports today. Please try again later.", network "No connection. Check your network and try again.", other "Something went wrong. Please try again." |
| Navigation | — |
| Evidence | `report-button.tsx:66-77`, `api/moderation.api.ts:16-31`, `strings.en.ts:13,29-37`, `moderation.test.tsx:278,301` |

| Field | SCR-MOD-02-A06 — Cancel / close |
| --- | --- |
| Trigger | "Cancel", Esc, overlay |
| Preconditions | — |
| Expected behavior | Dialog closes; reason, details and error cleared (next open starts clean) |
| State change | Mutation reset |
| Validation | — |
| Error behavior | — |
| Navigation | — |
| Evidence | `report-button.tsx:59-64,93`, `moderation.test.tsx:311` |

## D. UI states

| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | Closed; button only. Hidden while auth loads (`report-button.tsx:54`) |
| Loading | Implemented | "Sending…" + disabled submit |
| Empty | Not applicable | — |
| Populated | Implemented | Form with reason/details |
| Validation error | Implemented (by prevention) | Submit disabled without a reason; no inline message. Details length enforced by `maxLength`, no counter |
| Request error | Implemented | In-dialog alert by kind (A05) |
| Success | Implemented | Toast + close |
| Disabled | Implemented | Submit disabled (no reason / sending) |
| Unauthorized | Implemented | Guest → login; suspended → "You can't submit a report right now."; own story/chapter → error only after submit (F-MOD-01) |
| Offline | Implemented | "No connection…" |
| Unsaved changes | Not applicable | Cancel discards silently (short form) |
| Already reported | Missing | Button does not reflect an open report; resubmitting just shows success again (U-MOD-03) |

## E. Acceptance criteria

- **SCR-MOD-02-AC01** Given a guest on a chapter, when they click "Report", then they land on `/login?next=<chapter path>`. *(Verified)*
- **SCR-MOD-02-AC02** Given a member, when they open the dialog without choosing a reason, then "Submit report" is disabled. *(Verified)*
- **SCR-MOD-02-AC03** Given a member who chose "Spam or advertising", when they submit, then a pending report is created, the toast "Report sent. Thank you." appears and the dialog closes. *(Verified)*
- **SCR-MOD-02-AC04** Given an open report by the same member on the same comment, when they report it again, then no second report is created and the same success toast appears. *(Verified, `supabase/tests/260_moderation.test.sql:94`)*
- **SCR-MOD-02-AC05** Given a member who sent 20 reports in the last 24 h, when they submit another (new target), then the dialog shows "You've sent too many reports today. Please try again later." and stays open. *(Verified)*
- **SCR-MOD-02-AC06** Given the comment author viewing their own comment, then no "Report" button is shown on it. *(Verified)*
- **SCR-MOD-02-AC07** Given an author on their own author page, then no "Report user" button is shown. *(Verified)*
- **SCR-MOD-02-AC08** Given a hidden comment, then no "Report" button is shown on it, and a direct `submit_report` returns PT404. *(Verified)*
- **SCR-MOD-02-AC09** Given a cancelled dialog, when it is reopened, then reason and details are empty. *(Verified)*
- **SCR-MOD-02-AC10** `[Proposed]` Given the owner of a story viewing their story page or chapter, then no "Report" button is shown (F-MOD-01).
- **SCR-MOD-02-AC11** `[Proposed]` Given a member with an open report on this target, then the button reads "Reported" (or the dialog says the report is already with the moderators) (U-MOD-03).

## F. Findings referenced
F-MOD-01, F-MOD-06, U-MOD-03.

## G. Open questions
None specific (see business rules §3).

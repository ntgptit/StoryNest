# SCR-STM-02 — Create story

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-STM-02` |
| Name | Create story ("New story") |
| Route | `/studio/new` |
| Route file | `apps/web/src/app/(main)/studio/new/page.tsx` (view `apps/web/src/app/(main)/studio/story-form-view.tsx`) |
| Screen component | `packages/features/src/studio/screens/story-form-screen.tsx` (`StoryFormScreen` without `storyId` → `CreateStory` → `StoryFields mode="create"`); `components/tag-editor.tsx` |
| Roles | Any signed-in member with an active account |
| Entry points | SCR-STM-01 "Write a new story" |
| Workflows | WF-STM-02 |
| Rules | BR-STM-005..009, BR-STM-013, BR-STM-014 (hint only), BR-STM-019..021, BR-STM-023 |

## B. Components
| ID | Component | Notes / evidence |
| --- | --- | --- |
| SCR-STM-02-C01 | Header "New story" / "Fill in the basics. You can change them any time, then add chapters later." | `story-form-screen.tsx:66-67`, `strings.en.ts:166-167` |
| SCR-STM-02-C02 | Error banner (`role="alert"`) for non-field save errors | `story-form-screen.tsx:197-204` |
| SCR-STM-02-C03 | Cover hint "Save the story first, then you can add a cover." | `story-form-screen.tsx:208-210` |
| SCR-STM-02-C04 | "Story title" input | `story-form-screen.tsx:212-233` |
| SCR-STM-02-C05 | "URL slug" input + hint "Lowercase letters, numbers and hyphens. Generated from the story title; you can edit it." | `story-form-screen.tsx:235-256` |
| SCR-STM-02-C06 | "Synopsis" textarea (6 rows) + hint "Up to 5000 characters." | `story-form-screen.tsx:258-271` |
| SCR-STM-02-C07 | "Category" select ("Not selected" + roots and "Parent › Child") | `story-form-screen.tsx:273-300`, `model/story-form.ts:69-81` |
| SCR-STM-02-C08 | Tag editor: label "Tags", counter "n/10 tags", chips with remove buttons, input (placeholder "E.g. Romance, Adventure"), hint, alert, popular suggestions | `components/tag-editor.tsx:28-152` |
| SCR-STM-02-C09 | "Language" select (Tiếng Việt / English) and "Status" select | `story-form-screen.tsx:304-353` |
| SCR-STM-02-C10 | "Visibility" select + per-value hint | `story-form-screen.tsx:355-379` |
| SCR-STM-02-C11 | "Mature content (18+)" switch + hint | `story-form-screen.tsx:381-395` |
| SCR-STM-02-C12 | "Create story" submit ("Saving…" while busy), "Cancel" link → `/studio` | `story-form-screen.tsx:397-403` |

## C. User actions & system responses

| Field | SCR-STM-02-A01 Type the title |
| --- | --- |
| Trigger | Typing in "Story title" |
| Preconditions | — |
| Expected behavior | Slug field is filled with `slugFromTitle(title)` until the slug was edited by hand |
| State change | Form state |
| Validation | Re-validated live only after the first submit |
| Error behavior | — |
| Navigation | — |
| Evidence | `story-form-screen.tsx:221-226`, `story-editing.test.tsx:298` |

| Field | SCR-STM-02-A02 Edit the slug |
| --- | --- |
| Trigger | Typing in "URL slug" |
| Expected behavior | Auto-fill stops for the rest of this form |
| Evidence | `story-form-screen.tsx:246-248` |

| Field | SCR-STM-02-A03 Add / remove tags |
| --- | --- |
| Trigger | Enter, comma, semicolon, paste, blur, suggestion click; × on a chip; Backspace in empty field |
| Preconditions | < 10 tags to add |
| Expected behavior | Chips added (duplicates by slug ignored) or removed; nothing is saved yet |
| State change | Local tag list |
| Validation | Invalid name → "Each tag needs at least 2 letters or numbers and at most 40 characters."; more than 10 → "A story can have at most 10 tags." (valid ones still added); input disabled at 10 |
| Error behavior | — |
| Navigation | — |
| Evidence | `components/tag-editor.tsx:46-62,66-72`, `model/tags.ts:49-66`, `story-tags.test.tsx:274-351` |

| Field | SCR-STM-02-A04 Create story |
| --- | --- |
| Trigger | "Create story" (or Enter in a single-line input) |
| Preconditions | Not busy |
| Expected behavior | Validate → insert with client id → save tags (if any) → toast "Story created." → navigate to `/studio/story/{id}` |
| State change | New `stories` row (+ `story_tags`) |
| Validation | BR-STM-007 field messages; nothing sent when invalid |
| Error behavior | Slug taken → slug field "You already have a story with this URL slug. Choose a different one."; forbidden/notFound/network/other → banner; tags refused → toast "Story saved, but the tags couldn't be saved. <reason>" then navigation |
| Navigation | SCR-STM-03 |
| Evidence | `story-form-screen.tsx:142-172,189-190`, `story-editing.test.tsx:309,328,335,344`, `story-tags.test.tsx:365,390` |

| Field | SCR-STM-02-A05 Cancel |
| --- | --- |
| Trigger | "Cancel" |
| Expected behavior | Navigate to `/studio`; entered data discarded without confirmation |
| Evidence | `story-form-screen.tsx:401-403` |

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial | Implemented | Defaults BR-STM-006 |
| Loading | Partial | Category list loads asynchronously; the select shows only "Not selected" until it arrives (no indicator) — Inferred from `story-form-screen.tsx:122,191` |
| Empty | Not applicable | — |
| Populated | Not applicable | — |
| Validation error | Implemented | Field messages (`FormMessage`), tag alerts |
| Request error | Implemented | Banner `role="alert"`; slug conflict on field |
| Success | Implemented | Toast + redirect |
| Disabled | Implemented | Submit disabled and labelled "Saving…" while busy; `aria-busy` on form |
| Unauthorized | Implemented | Guest redirect (BR-STM-023); suspended account: insert refused → banner "You don't have permission to do this." (Inferred from RLS 403 → `forbidden`) |
| Offline | Partial | Network error banner "No connection…"; retry is safe except F-STM-04 |
| Unsaved changes | Missing | No leave/cancel guard (U-STM-03) |

## E. Acceptance criteria
- SCR-STM-02-AC01 Given the empty form, When I type "Đừng Bỏ Cuộc!", Then the slug shows `dung-bo-cuoc`.
- SCR-STM-02-AC02 Given I edited the slug, When I change the title, Then the slug does not change.
- SCR-STM-02-AC03 Given the title is empty, When I submit, Then "Please enter a story title." is shown And no request is sent.
- SCR-STM-02-AC04 Given I already own a story with slug `abc`, When I create another with slug `abc`, Then the slug field shows "You already have a story with this URL slug…" And no banner is shown.
- SCR-STM-02-AC05 Given valid input with two tags, When I submit, Then the story is created with my user as owner, the tags are saved, "Story created." is shown, And I land on `/studio/story/{id}`.
- SCR-STM-02-AC06 Given the tag quota is exhausted, When I create the story with a new tag, Then the story is created And the toast says the tags couldn't be saved And I still land on the edit page.
- SCR-STM-02-AC07 Given the first submit failed with a network error, When I submit again, Then the same story id is sent (no duplicate story).
- SCR-STM-02-AC08 Given the first insert succeeded but its response was lost, When I submit again, Then I am taken to the existing story instead of seeing "slug taken" `[Proposed]` (F-STM-04).
- SCR-STM-02-AC09 Given I typed data, When I press Cancel or navigate away, Then I am asked to confirm discarding `[Proposed]` (U-STM-03).
- SCR-STM-02-AC10 Given visibility "Public" and status "Draft", Then the hint explains readers will see the story only after a chapter is published `[Proposed]` (U-STM-01).

## F. Findings referenced
F-STM-04, U-STM-01, U-STM-03, U-STM-05, U-STM-06.

## G. Open questions
None.

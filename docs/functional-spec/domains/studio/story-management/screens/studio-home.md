# SCR-STM-01 — Studio home

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-STM-01` |
| Business domain | [D-STUDIO Authoring (Studio)](../../overview.md) |
| Business object | [OBJ-STM](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Studio home ("Studio") |
| Route | `/studio` |
| Route file | `apps/web/src/app/(main)/studio/page.tsx` (view `apps/web/src/app/(main)/studio/studio-view.tsx`) |
| Screen component | `packages/features/src/studio/screens/studio-screen.tsx` (`StudioScreen`; embeds `components/my-invitations.tsx`) |
| Roles | Any signed-in member; rows differ by role (owner / co-author / editor) |
| Entry points | User menu "Studio" (`packages/features/src/shell/components/user-menu.tsx:64`), bottom nav "Write" (`packages/features/src/shell/components/main-shell.tsx:16`), notification "collaboration_invited" (`packages/features/src/notifications/model/notification.ts:102-103`), Cancel on SCR-STM-02/03, "Back to Studio" on SCR-STAT-01 |
| Workflows | WF-STM-01, WF-STM-06, WF-TEAM-02; launches WF-STM-02/03, WF-CHM-*, WF-TEAM-01, WF-STAT-01 |
| Rules | BR-STM-001..004, BR-STM-017, BR-STM-023, BR-TEAM-011 |

## B. Components
| ID | Component | Notes / evidence |
| --- | --- | --- |
| SCR-STM-01-C01 | Page header: title "Studio", description "Stories you're writing and stories you've been invited to collaborate on." | `studio-screen.tsx:116-126`, `strings.en.ts:2-3` |
| SCR-STM-01-C02 | Primary button "Write a new story" (`studioText.create`) → `/studio/new` | `studio-screen.tsx:119-124` |
| SCR-STM-01-C03 | Invitation inbox "Collaboration invitations" (MyInvitations), only when ≥ 1 pending | `studio-screen.tsx:127`, `components/my-invitations.tsx:13-75` |
| SCR-STM-01-C04 | Story list (`ul` "My stories") of rows | `studio-screen.tsx:144-149` |
| SCR-STM-01-C05 | Row: cover, title (truncated), badges (status, visibility+icon, 18+, role), "n chapters · Updated …" | `studio-screen.tsx:31-59` |
| SCR-STM-01-C06 | Row actions: Edit, Manage chapters, Collaborators, Stats, View story page | `studio-screen.tsx:60-97` |
| SCR-STM-01-C07 | Skeleton (3 cards) | `studio-screen.tsx:135-141` |
| SCR-STM-01-C08 | Empty state "You don't have any stories yet" | `studio-screen.tsx:142` |
| SCR-STM-01-C09 | Error state "Couldn't load your stories" + "Try again" | `studio-screen.tsx:128-134` |
| SCR-STM-01-C10 | Deleted stories: toggle "Show deleted stories (n)" / "Hide deleted stories", list with "Deleted …" and "Restore" | `studio-screen.tsx:155-209`, `strings.en.ts:157-164` |

## C. User actions & system responses

| Field | SCR-STM-01-A01 Create story |
| --- | --- |
| Trigger | Click "Write a new story" |
| Preconditions | — |
| Expected behavior | Navigate to `/studio/new` |
| State change | None |
| Validation | — |
| Error behavior | — |
| Navigation | SCR-STM-02 |
| Evidence | `studio-screen.tsx:119-124` |

| Field | SCR-STM-01-A02 Open a story tool |
| --- | --- |
| Trigger | Click a row action |
| Preconditions | Action visible for the role (BR-STM-004) |
| Expected behavior | Edit → `/studio/story/{id}`; Manage chapters → `/chapters`; Collaborators → `/team`; Stats → `/stats`; View story page → `/story/{id}/{slug}` |
| State change | None |
| Validation | — |
| Error behavior | Destination screens handle not-found/forbidden |
| Navigation | SCR-STM-03, SCR-CHM-01, SCR-TEAM-01, SCR-STAT-01, public story page |
| Evidence | `studio-screen.tsx:61-97` |

| Field | SCR-STM-01-A03 Accept invitation |
| --- | --- |
| Trigger | "Accept" on an invitation |
| Preconditions | Invitation pending |
| Expected behavior | `respond_invitation(id, true)`; toast "Invitation accepted. The story has been added to your Studio."; Studio list reloads and shows the story with its role badge |
| State change | Collaborator row created; invitation `accepted`; inviter notified |
| Validation | — |
| Error behavior | PT404 → "The invitation or collaborator no longer exists."; PT409 → "The invitation was already handled or cancelled. The list has been reloaded."; list reloads in every case (`onSettled`) |
| Navigation | Stays |
| Evidence | `components/my-invitations.tsx:36-52`, `hooks/use-collaboration.ts:49-66`, `strings.en.ts:100-108,151-152` |

| Field | SCR-STM-01-A04 Decline invitation |
| --- | --- |
| Trigger | "Decline" |
| Preconditions | Invitation pending |
| Expected behavior | `respond_invitation(id, false)`; toast "Invitation declined."; item disappears |
| State change | Invitation `declined`; inviter notified |
| Validation | — |
| Error behavior | Same as A03 |
| Navigation | Stays |
| Evidence | `components/my-invitations.tsx:53-69` |

| Field | SCR-STM-01-A05 Toggle deleted stories |
| --- | --- |
| Trigger | "Show deleted stories (n)" / "Hide deleted stories" |
| Preconditions | Owner has ≥ 1 deleted story |
| Expected behavior | Expands/collapses the list; `aria-expanded` reflects state |
| State change | Local only (not remembered) |
| Validation | — |
| Error behavior | — |
| Navigation | — |
| Evidence | `studio-screen.tsx:166-175` |

| Field | SCR-STM-01-A06 Restore story |
| --- | --- |
| Trigger | "Restore" on a deleted story |
| Preconditions | Owner; not moderator-removed (else fails) |
| Expected behavior | `deleted_at = null`; toast "Story restored."; story moves back to the list |
| State change | Story live again |
| Validation | — |
| Error behavior | Toast from `storyErrorMessage` ("You don't have permission to do this." for a moderator-removed story — F-STM-02) |
| Navigation | Stays |
| Evidence | `studio-screen.tsx:186-203` |

| Field | SCR-STM-01-A07 Retry loading |
| --- | --- |
| Trigger | "Try again" in the error state |
| Expected behavior | Refetch the list |
| Evidence | `studio-screen.tsx:128-134` |

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial | Implemented | Header + create button render immediately |
| Loading | Implemented | 3 skeleton cards, `aria-busy` (`studio-screen.tsx:135-141`) |
| Empty | Implemented | Empty state C08 |
| Populated | Implemented | C04/C05 |
| Validation error | Not applicable | No inputs |
| Request error | Implemented (list) / Missing (inbox, deleted list) | List shows retryable error; inbox and deleted list render nothing on error (`my-invitations.tsx:17-18`, `studio-screen.tsx:161-162`) — U-STM-04 |
| Success | Implemented | Toasts on accept/decline/restore |
| Disabled | Implemented | Invitation and restore buttons disabled while a request runs |
| Unauthorized | Implemented | Guest redirected to `/login?next=/studio` (BR-STM-023); no request is made for a guest (`studio.test.tsx:204`) |
| Offline | Partial | Network failure → error state; no offline indicator |
| Unsaved changes | Not applicable | — |
| Pagination | Missing (deferred) | All stories loaded at once; WBS 3.1 defers — Q-STM-02 |

## E. Acceptance criteria
- SCR-STM-01-AC01 Given I own story A and co-author story B, and story C is someone else's public story, When I open `/studio`, Then I see A and B (B with badge "Co-author") and not C.
- SCR-STM-01-AC02 Given I own a soft-deleted story, When I open `/studio`, Then it is not in the list And "Show deleted stories (1)" is shown.
- SCR-STM-01-AC03 Given a row where my role is editor, Then the row shows "Manage chapters" and "View story page" only.
- SCR-STM-01-AC04 Given a row where my role is co-author, Then the row shows "Edit", "Manage chapters", "Stats", "View story page" and not "Collaborators".
- SCR-STM-01-AC05 Given loading fails, Then "Couldn't load your stories" with "Try again" is shown And clicking it refetches.
- SCR-STM-01-AC06 Given I have no stories, Then "You don't have any stories yet" is shown.
- SCR-STM-01-AC07 Given a pending invitation, When I click "Accept", Then a success toast is shown And the story appears in my list with the invited role.
- SCR-STM-01-AC08 Given the invitation was cancelled meanwhile, When I click "Accept", Then "The invitation was already handled or cancelled…" is shown And the inbox reloads.
- SCR-STM-01-AC09 Given I am a guest, When I open `/studio`, Then I am redirected to `/login?next=%2Fstudio`.
- SCR-STM-01-AC10 Given my story was removed by a moderator, When I click "Restore", Then the button is not offered and an explanation is shown `[Proposed]` (F-STM-02).
- SCR-STM-01-AC11 Given the invitations request fails, Then a retryable error is shown in the inbox area `[Proposed]` (U-STM-04).

## F. Findings referenced
F-STM-02, U-STM-04, U-STM-05 (details: [functional gap analysis](../../../../audits/functional-gap-analysis.md) / [UX gap analysis](../../../../audits/ux-ui-gap-analysis.md); F-STM-02 is an alias of F-MOD-02).

## G. Open questions
Q-STM-02 (pagination threshold).

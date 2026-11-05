# SCR-TEAM-01 — Team (Collaborators)

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-TEAM-01` |
| Business domain | [D-STUDIO Authoring (Studio)](../../overview.md) |
| Business object | [OBJ-TEAM](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Team ("Collaborators") |
| Route | `/studio/story/[id]/team` |
| Route file | `apps/web/src/app/(main)/studio/story/[id]/team/page.tsx` (view `team-view.tsx`) |
| Screen component | `packages/features/src/studio/screens/team-screen.tsx` (`TeamScreen` → `Team`, `InviteForm`) |
| Roles | Owner (full); co-author/editor see "Only the owner can manage this"; non-member sees "Story not found" |
| Entry points | SCR-STM-01 row "Collaborators" (owner only); notifications `collaboration_accepted` / `collaboration_declined` |
| Workflows | WF-TEAM-01, WF-TEAM-03, WF-TEAM-04 |
| Rules | BR-TEAM-002, -004, -006..010, -012 |

Note: `MyInvitations` (invitee side) is **not** on this screen; it is mounted on SCR-STM-01 (BR-TEAM-011).

## B. Components
| ID | Component | Notes / evidence |
| --- | --- | --- |
| SCR-TEAM-01-C01 | Header "Collaborators" / "Invite others to write "<story>" with you. They only join after accepting the invitation." | `team-screen.tsx:95`, `strings.en.ts:110-112` |
| SCR-TEAM-01-C02 | Breadcrumb Studio › story › Collaborators (Lucian 103), as on SCR-CHM-01-C02; the story switcher (Lucian 037) lists only stories the author owns (only the owner manages a team) and opens their team page | `components/studio-crumbs.tsx`, `packages/ui/src/widgets/breadcrumbs.tsx` |
| SCR-TEAM-01-C03 | Section "Current collaborators": rows name, @username, role badge, "Remove"; empty "No collaborators yet." | `team-screen.tsx:103-134` |
| SCR-TEAM-01-C04 | Section "Invitations": rows invitee name, @username · role, status badge (Pending/Accepted/Declined/Cancelled), "Cancel invitation" on pending; empty "No invitations sent." | `team-screen.tsx:136-176` |
| SCR-TEAM-01-C05 | Form "Invite a collaborator": "Username" input + hint/error (same element), "Role" select + role hint, "Send invitation" | `team-screen.tsx:231-278` |
| SCR-TEAM-01-C06 | Confirm dialog "Remove this collaborator?" | `team-screen.tsx:180-200` |
| SCR-TEAM-01-C07 | Skeletons, error state with retry, "Story not found", "Only the owner can manage this" | `team-screen.tsx:42-64,76-91` |
| SCR-TEAM-01-C08 | Username combobox (Lucian 034) | From 3 characters (a leading @ ignored, 250 ms pause) up to 5 authors from the existing author search (`search_authors`: people with a public story) with avatar, name and @username, typed part marked. Arrow keys move, Enter/press picks, Tab accepts the faint completion, Escape closes; "Searching…" / "No author matches. You can still invite by the exact username." Enter without a highlighted row submits what was typed, so any exact username still works | `team-screen.tsx` (`useAuthorSuggestions`), `packages/ui/src/widgets/autocomplete-input.tsx` |
| SCR-TEAM-01-C09 | Role permission matrix (Lucian 184, read-only, batch 4 · platform4) | Below the invite form: "What each role can do" / "Taken from the database's permission rules. These rights are fixed and cannot be changed per story." Table Right × Owner / Co-author / Editor from `story_role_rights()`; skeleton while loading, "Could not load the rights table." + "Try again" (BR-TEAM-014) | `team-screen.tsx` (`RoleRightsSection`), `packages/ui/src/widgets/role-matrix.tsx` |

## C. User actions & system responses

| Field | SCR-TEAM-01-A01 Send invitation |
| --- | --- |
| Trigger | "Send invitation" |
| Preconditions | Owner; not sending |
| Expected behavior | `invite_collaborator(story, username.trim(), role)`; toast "Invitation sent."; username cleared; both lists reloaded |
| State change | Pending invitation; invitee notification |
| Validation | Empty → "Please enter a username." locally |
| Error behavior | Message replaces the hint under Username (red), field `aria-invalid`; text kept (BR-TEAM-012) |
| Navigation | — |
| Evidence | `team-screen.tsx:221-238`; `collaboration.test.tsx:289,354,363` |

| Field | SCR-TEAM-01-A02 Choose role |
| --- | --- |
| Trigger | Role select |
| Expected behavior | Hint switches: co-author "Edit the story, write and publish chapters, manage chapters."; editor "Write and edit chapters, but not publish or delete them." (inaccurate, F-TEAM-01) |
| Evidence | `team-screen.tsx:271-286`; `strings.en.ts:136-139` |

| Field | SCR-TEAM-01-A03 Cancel invitation |
| --- | --- |
| Trigger | "Cancel invitation" (pending row) |
| Expected behavior | `cancel_invitation`; toast "Invitation cancelled."; badge "Cancelled" |
| Error behavior | Toast (conflict/notFound/forbidden/network) |
| Evidence | `team-screen.tsx:163-178`; `collaboration.test.tsx:377` |

| Field | SCR-TEAM-01-A04 Remove collaborator |
| --- | --- |
| Trigger | "Remove" → confirm "Remove" |
| Expected behavior | Row deleted; toast "Collaborator removed." |
| Error behavior | Toast; dialog stays open |
| Evidence | `team-screen.tsx:128-136,188-208`; `collaboration.test.tsx:387` |

| Field | SCR-TEAM-01-A05 Back / Retry |
| --- | --- |
| Trigger | Breadcrumb (story / Studio); "Try again" |
| Expected behavior | SCR-STM-03; refetch collaborators and invitations |
| Evidence | `team-screen.tsx:87-99,104-109` |

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial | Implemented | Skeleton while the story/role loads |
| Loading | Implemented | Second skeleton while the two lists load |
| Empty | Implemented | "No collaborators yet." / "No invitations sent." |
| Populated | Implemented | C03, C04 |
| Validation error | Implemented | Username required |
| Request error | Implemented | Error state for loading; field message / toasts for actions |
| Success | Implemented | Toasts |
| Disabled | Implemented | Send while sending; cancel buttons while cancelling |
| Unauthorized | Implemented | Non-owner → "Only the owner can manage this"; non-member → "Story not found"; guest → login |
| Offline | Partial | Network messages only |
| Unsaved changes | Not applicable | Single field |
| Collaborator self-service | Missing | No "Leave story" for co-author/editor (F-TEAM-02) |
| Role change | Missing | No control (F-TEAM-03) |

## E. Acceptance criteria
- SCR-TEAM-01-AC01 Given I own the story, When I invite `alice` as Co-author, Then "Invitation sent." is shown And a "Pending" invitation for alice appears And alice gets a notification.
- SCR-TEAM-01-AC02 Given the username field is empty, When I send, Then "Please enter a username." is shown and nothing is sent.
- SCR-TEAM-01-AC03 Given `alice` already has a pending invitation, When I invite her again, Then the conflict message is shown under the field And the text stays.
- SCR-TEAM-01-AC04 Given I invite myself, Then "You can't invite this person (for example, yourself)." is shown.
- SCR-TEAM-01-AC05 Given a pending invitation, When I click "Cancel invitation", Then its badge becomes "Cancelled" And alice's Studio inbox no longer shows it.
- SCR-TEAM-01-AC06 Given a collaborator, When I confirm "Remove", Then they disappear from the list And the story disappears from their Studio.
- SCR-TEAM-01-AC07 Given I am a co-author or editor, When I open the Team URL, Then "Only the owner can manage this" is shown and no list or form.
- SCR-TEAM-01-AC08 Given I am a co-author or editor, Then I can leave the story from this page after confirming `[Proposed]` (F-TEAM-02).
- SCR-TEAM-01-AC09 Given a collaborator, When I change their role, Then the new role applies immediately `[Proposed]` (F-TEAM-03).
- SCR-TEAM-01-AC10 Given I select "Editor", Then the hint states that editors can publish and schedule but not unpublish, archive or delete `[Proposed]` (F-TEAM-01, pending Q-TEAM-01).

## F. Findings referenced
F-TEAM-01, F-TEAM-02, F-TEAM-03, U-TEAM-01, U-STM-05.

## G. Open questions
Q-TEAM-01, Q-TEAM-03.

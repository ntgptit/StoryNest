# OBJ-TEAM — Collaboration: workflows

| ID | Name | Status |
| --- | --- | --- |
| WF-TEAM-01 | Invite a collaborator | Verified |
| WF-TEAM-02 | Answer an invitation (cross-screen: notification → Studio inbox → story list) | Verified |
| WF-TEAM-03 | Cancel a pending invitation | Verified |
| WF-TEAM-04 | Remove a collaborator | Verified |

Not implemented in the UI (allowed by the database): a collaborator leaving a story (F-TEAM-02), changing a
collaborator's role (F-TEAM-03).

### WF-TEAM-01 — Invite a collaborator
| Field | Value |
| --- | --- |
| User goal | Bring someone onto my story with a specific role |
| Trigger | Row "Collaborators" on SCR-STM-01 → `/studio/story/{id}/team` → "Invite a collaborator" form |
| Preconditions | Owner; active account; story not deleted |
| Main flow | 1. Enter "Username" (hint "Enter the exact username (without @)."). 2. Pick "Role" (default Editor; hint per role). 3. "Send invitation" ("Sending…"). 4. `invite_collaborator`. 5. Toast "Invitation sent."; field cleared; "Invitations" list shows the new "Pending" row. 6. Invitee receives notification `collaboration_invited` → WF-TEAM-02 |
| Alternative flows | A1 Re-invite after declined/cancelled → new pending row |
| Exception flows | E1 Empty username → "Please enter a username." (no request). E2 Unknown/inactive user → "No user found with this username.". E3 Self → "You can't invite this person…". E4 Already collaborator / pending / 20 pending → combined conflict message. Text stays in the field |
| Success criteria | One pending invitation for that person |
| Postconditions | Invitee is **not** a collaborator until they accept |
| Affected objects | OBJ-TEAM, OBJ-NOTI |
| Related screens | SCR-TEAM-01 |
| Status | Verified — `team-screen.tsx:205-279`, `20261104000500_collaboration_invitations.sql:54-103` |

### WF-TEAM-02 — Answer an invitation
| Field | Value |
| --- | --- |
| User goal | Join (or refuse) a story I was invited to |
| Trigger | Notification "collaboration_invited" (→ `/studio`) or opening the Studio |
| Preconditions | Pending invitation addressed to me; story not deleted |
| Main flow | 1. "Collaboration invitations" box lists "<story title>" / "<inviter> invited you to be <role>". 2. "Accept" → `respond_invitation(true)`. 3. Toast "Invitation accepted. The story has been added to your Studio.". 4. Studio list reloads; the story appears with its role badge and role-dependent actions (BR-STM-004). 5. Owner is notified (`collaboration_accepted` → owner's Team page) |
| Alternative flows | A1 "Decline" → toast "Invitation declined."; owner notified (`collaboration_declined`) |
| Exception flows | E1 Cancelled/answered meanwhile → "The invitation was already handled or cancelled. The list has been reloaded.". E2 Gone → "The invitation or collaborator no longer exists.". E3 Inbox load failure → box not shown (U-STM-04) |
| Success criteria | Accept: `story_collaborators` row with the invited role; invitation `accepted` |
| Postconditions | New collaborator may read the (even private) story and act per BR-TEAM-010 |
| Affected objects | OBJ-TEAM, OBJ-STM, OBJ-NOTI |
| Related screens | Notifications → SCR-STM-01; owner: notification → SCR-TEAM-01 |
| Status | Verified — `my-invitations.tsx:13-75`, `notification.ts:102-112` |

### WF-TEAM-03 — Cancel a pending invitation
| Field | Value |
| --- | --- |
| User goal | Withdraw an invitation |
| Trigger | "Cancel invitation" on a Pending row (no confirmation) |
| Preconditions | Owner; pending |
| Main flow | 1. Click. 2. `cancel_invitation`. 3. Toast "Invitation cancelled."; status badge "Cancelled" |
| Alternative flows | — |
| Exception flows | E1 Answered meanwhile → "The invitation was already handled or cancelled…"; lists reloaded |
| Success criteria | Invitation cancelled; invitee's inbox no longer shows it |
| Postconditions | Can be re-sent |
| Affected objects | OBJ-TEAM |
| Related screens | SCR-TEAM-01 |
| Status | Verified |

### WF-TEAM-04 — Remove a collaborator
| Field | Value |
| --- | --- |
| User goal | Take away someone's access |
| Trigger | "Remove" on a collaborator row |
| Preconditions | Owner |
| Main flow | 1. Confirm "Remove this collaborator?". 2. Delete the row. 3. Toast "Collaborator removed."; list reloads |
| Alternative flows | — |
| Exception flows | E1 Already gone → toast "The invitation or collaborator no longer exists."; dialog stays open |
| Success criteria | Removed user has no role: the story disappears from their Studio; private story no longer readable |
| Postconditions | They can be invited again; they are not notified |
| Affected objects | OBJ-TEAM |
| Related screens | SCR-TEAM-01 |
| Status | Verified — `team-screen.tsx:188-208` |

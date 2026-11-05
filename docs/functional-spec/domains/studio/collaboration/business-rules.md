# OBJ-TEAM — Collaboration: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-TEAM` |
| Name | Collaboration (invitations, collaborators, studio role-permission matrix) |
| Business purpose | Let an owner bring co-authors and editors onto a story **only with their consent** (decision D9), and define what each role may do across the Studio |
| User goals | Owner: invite by username, see who is on the team and what happened to invitations, cancel, remove. Invitee: accept or decline. Collaborator: work on the story within the role |
| Actors / roles | Owner, invitee, co-author, editor |
| Related entities | Tables `story_collaborators` (PK story+user, role CHECK co_author/editor), `story_invitations` (status pending/accepted/declined/cancelled, unique pending per story+invitee); RPCs `invite_collaborator`, `respond_invitation`, `cancel_invitation`, `list_my_invitations`, `list_story_invitations`; helper `story_role`; notifications `collaboration_invited/accepted/declined` |
| Code | `packages/features/src/studio/{screens/team-screen.tsx,components/my-invitations.tsx,api/collaboration.api.ts,hooks/use-collaboration.ts,model/collaboration.ts}`; `supabase/migrations/20261104000500_collaboration_invitations.sql` |
| Dependencies | OBJ-STM (story must exist, not deleted), OBJ-NOTI (notification delivery, settings `notify_collaboration_answers`), OBJ-AUTH (active account) |

| Rule | Name | Status |
| --- | --- | --- |
| BR-TEAM-001 | Collaboration only through an accepted invitation | Verified |
| BR-TEAM-002 | Sending an invitation | Verified |
| BR-TEAM-003 | Answering an invitation | Verified |
| BR-TEAM-004 | Cancelling an invitation | Verified |
| BR-TEAM-005 | My pending invitations (inbox) | Verified |
| BR-TEAM-006 | A story's invitation history | Verified |
| BR-TEAM-007 | Removing a collaborator / leaving a story | Verified (leave not in UI) |
| BR-TEAM-008 | Changing a collaborator's role | Verified (no UI) |
| BR-TEAM-009 | Team screen is owner-only | Verified |
| BR-TEAM-010 | Studio role-permission matrix | Verified |
| BR-TEAM-011 | Where invitations are surfaced | Verified |
| BR-TEAM-012 | Error mapping | Verified |
| BR-TEAM-013 | `story_role` is the single source of the role | Verified |
| BR-TEAM-014 | Read-only role matrix from `story_role_rights()` | Verified (SQL test) |

## 2. Rules

### BR-TEAM-001 — Collaboration only through an accepted invitation
| Field | Value |
| --- | --- |
| Description | Nobody can add a collaborator directly; a `story_collaborators` row is created only by `respond_invitation(…, accept = true)` |
| Preconditions | — |
| Conditions | INSERT policy dropped and INSERT privilege revoked on `story_collaborators`; `story_invitations` has no client write privilege at all |
| Expected behavior | Direct inserts are refused (403) |
| Exceptions | — |
| Related screens | SCR-TEAM-01, SCR-STM-01 |
| Evidence | `supabase/migrations/20261104000500_collaboration_invitations.sql:26-28,46-51`; `supabase/tests/110_collaboration.test.sql:36-37`; `supabase/tests/10_rls.test.sql:96,136` |
| Status | Verified |

### BR-TEAM-002 — Sending an invitation
| Field | Value |
| --- | --- |
| Description | The owner invites an existing user by exact username (case-insensitive, trimmed) as `co_author` or `editor` |
| Preconditions | Caller is the owner; active account; story not deleted |
| Conditions | Order of checks: not signed in/inactive → 42501; role not co_author/editor → 22023; story missing/deleted/not owner → PT404; username not found or account not active → PT404; self → 22023; already collaborator → PT409; pending invitation for that person → PT409; ≥ 20 pending invitations on the story → PT409 |
| Expected behavior | Invitation `pending`; invitee notified (`collaboration_invited`, payload story title + role); UI toast "Invitation sent.", username cleared, lists reloaded. Default role in the form: Editor |
| Exceptions | A declined or cancelled invitation can be re-sent (new row). Story locked `FOR UPDATE` while inviting |
| Related screens | SCR-TEAM-01 |
| Evidence | `supabase/migrations/20261104000500_collaboration_invitations.sql:54-103`; `packages/features/src/studio/api/collaboration.api.ts:42-52`; `packages/features/src/studio/screens/team-screen.tsx:205-229`; `supabase/tests/110_collaboration.test.sql:28-41,73,99-102`; `packages/features/src/studio/collaboration.test.tsx:188,289,354,363` |
| Status | Verified |

### BR-TEAM-003 — Answering an invitation
| Field | Value |
| --- | --- |
| Description | Only the invitee accepts or declines, only while pending |
| Preconditions | Invitee; active account |
| Conditions | Not the invitee / unknown → PT404; not pending → PT409; accepting for a deleted story → PT409 |
| Expected behavior | Accept: collaborator row with the invited role (upsert), invitation `accepted`; decline: `declined`. `responded_at` set; inviter notified (`collaboration_accepted`/`declined`, subject to the inviter's setting) |
| Exceptions | — |
| Related screens | SCR-STM-01 (inbox) |
| Evidence | `supabase/migrations/20261104000500_collaboration_invitations.sql:105-148`; `packages/features/src/studio/components/my-invitations.tsx:36-69`; `supabase/tests/110_collaboration.test.sql:67,70`; `packages/features/src/studio/collaboration.test.tsx:410,426` |
| Status | Verified |

### BR-TEAM-004 — Cancelling an invitation
| Field | Value |
| --- | --- |
| Description | The owner cancels a pending invitation |
| Preconditions | Owner; invitation pending |
| Conditions | Not owner/unknown → PT404; not pending → PT409 |
| Expected behavior | Status `cancelled`; toast "Invitation cancelled."; no notification to the invitee (Verified: no INSERT into notifications) |
| Exceptions | — |
| Related screens | SCR-TEAM-01 |
| Evidence | `supabase/migrations/20261104000500_collaboration_invitations.sql:150-168`; `packages/features/src/studio/screens/team-screen.tsx:163-178`; `packages/features/src/studio/collaboration.test.tsx:377` |
| Status | Verified |

### BR-TEAM-005 — My pending invitations (inbox)
| Field | Value |
| --- | --- |
| Description | The invitee sees pending invitations with story title, role and inviter name even when the story is private (via a SECURITY DEFINER function) |
| Preconditions | Signed in |
| Conditions | Only `pending`; stories not deleted; newest first; rows with unknown roles dropped; blank display name falls back to username |
| Expected behavior | Inbox lines "<inviter> invited you to be <role>" with "Accept" / "Decline" |
| Exceptions | No created date shown; invitations of a deleted story stay pending (and count toward the 20 cap) but are hidden — Inferred from `:90,178` |
| Related screens | SCR-STM-01 |
| Evidence | `supabase/migrations/20261104000500_collaboration_invitations.sql:170-182`; `packages/features/src/studio/model/collaboration.ts:64-86`; `packages/features/src/studio/strings.en.ts:146-154` |
| Status | Verified |

### BR-TEAM-006 — A story's invitation history
| Field | Value |
| --- | --- |
| Description | The owner sees every invitation of the story (all statuses) with invitee name, role and status badge |
| Preconditions | Owner (others get an empty list) |
| Conditions | Newest first, at most 100 rows |
| Expected behavior | "Cancel invitation" only on pending ones |
| Exceptions | Older invitations beyond 100 are not reachable |
| Related screens | SCR-TEAM-01 |
| Evidence | `supabase/migrations/20261104000500_collaboration_invitations.sql:184-195`; `packages/features/src/studio/screens/team-screen.tsx:144-184` |
| Status | Verified |

### BR-TEAM-007 — Removing a collaborator / leaving a story
| Field | Value |
| --- | --- |
| Description | The owner may remove any collaborator; a collaborator may remove themselves (leave) |
| Preconditions | — |
| Conditions | RLS `story_collaborators_delete`: `story_role = 'owner' OR user_id = auth.uid()`. UI: owner-only "Remove" with confirm "Remove this collaborator?" / "They will no longer be able to access this story. You can invite them again later." |
| Expected behavior | Row deleted; toast "Collaborator removed."; lists reloaded. Removed user loses access at once (role gone) |
| Exceptions | Zero rows → "The invitation or collaborator no longer exists.". **Leaving has no UI** — a collaborator opening the Team page sees "Only the owner can manage this" (F-TEAM-02). No notification to the removed person |
| Related screens | SCR-TEAM-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:216,221-222`; `supabase/migrations/20261104000500_collaboration_invitations.sql:12-13`; `packages/features/src/studio/api/collaboration.api.ts:62-68`; `packages/features/src/studio/screens/team-screen.tsx:128-136,188-208`; `supabase/tests/110_collaboration.test.sql:77`; `supabase/tests/10_rls.test.sql:144` |
| Status | Verified (leave not in UI) |

### BR-TEAM-008 — Changing a collaborator's role
| Field | Value |
| --- | --- |
| Description | Only the owner may update `collaborator_role` (to co_author or editor) |
| Preconditions | Owner |
| Conditions | Column grant UPDATE(collaborator_role); policy `story_collaborators_update` owner-only; CHECK on values |
| Expected behavior | — |
| Exceptions | No UI; workaround remove + re-invite (WBS 3.8 "Còn thiếu: đổi vai trò…") — F-TEAM-03 |
| Related screens | SCR-TEAM-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:216,219-220`; `supabase/migrations/20261103000000_init_schema.sql:82-83`; `docs/WBS.md` WP 3.8 |
| Status | Verified (no UI) |

### BR-TEAM-009 — Team screen is owner-only
| Field | Value |
| --- | --- |
| Description | `/studio/story/{id}/team` shows the team only to the owner; co-authors and editors see "Only the owner can manage this" / "You don't have permission to invite or remove collaborators on this story."; non-members see "Story not found" |
| Preconditions | Signed in |
| Conditions | Role from `getStoryForEdit` (BR-STM-022) |
| Expected behavior | Collaborator and invitation queries run only for the owner |
| Exceptions | — |
| Related screens | SCR-TEAM-01 |
| Evidence | `packages/features/src/studio/screens/team-screen.tsx:47-74,78-79`; `packages/features/src/studio/strings.en.ts:160-163`; `packages/features/src/studio/collaboration.test.tsx:281` |
| Status | Verified |

### BR-TEAM-010 — Studio role-permission matrix
Owned here; other objects link to it. "UI" = where the action is offered; "DB" = what RLS/RPC actually allow.
O = owner, CA = co-author, E = editor. ✓ allowed, ✗ refused, — not offered.

| Capability | DB: O | DB: CA | DB: E | UI offers to | DB evidence | UI evidence | Consistent? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| See story in Studio, open its studio pages | ✓ | ✓ | ✓ | O, CA, E | `20261103000100_auth_and_rls.sql:198-202` | `studio/api/studio.api.ts:18-39` | Yes |
| Edit story settings (title, slug, synopsis, category, language, status, visibility, 18+) | ✓ | ✓ | ✗ | O, CA ("Edit"; E sees read-only notice) | `…auth_and_rls.sql:205-211`; `supabase/tests/10_rls.test.sql:143` | `studio-screen.tsx:61-69`; `story-form-screen.tsx:109-113` | Yes |
| Cover upload / change / remove | ✓ | ✓ | ✗ | O, CA | `20261104002400_story_image_buckets.sql:49-52`; key via `stories_update` | `story-form-screen.tsx:234-235` | Yes |
| Story tags | ✓ | ✓ | ✗ | O, CA | `20261104001400_tags.sql:48-51` | `story-form-screen.tsx:332` | Yes |
| Soft-delete story | ✓ | ✓ | ✗ | O | `…auth_and_rls.sql:205-211` (deleted_at in grant, CA in policy) | `story-form-screen.tsx:433` | **No — CA allowed by DB, documented owner-only (F-STM-01)** |
| Restore story | ✓* | ✓* | ✗ | O (*not after moderator removal) | same + `20261104002000_moderation.sql:103-116` | `story-write.api.ts:116-127`; `story-form-screen.tsx:433-451` | **No — CA allowed by DB; UI offers restore of moderator-removed story (F-STM-02)** |
| Create chapter | ✓ | ✓ | ✓ | O, CA, E | `20261104000400_chapter_management.sql:49-52` | `chapter-manager-screen.tsx:307` | Yes |
| Reorder chapters | ✓ | ✓ | ✓ | O, CA, E | `…chapter_management.sql:72-75` | `components/chapter-row.tsx:160-179` | Yes |
| Rename chapter slug | ✓ | ✓ | ✓ | O, CA, E | `…auth_and_rls.sql:236-240` | `components/chapter-row.tsx:183-185` | Yes |
| Archive / unarchive chapter | ✓ | ✓ | ✗ (42501) | O, CA | `…chapter_management.sql:115-117,140-142`; `supabase/tests/100_chapter_management.test.sql:103,121` | `components/chapter-row.tsx:186-202` | Yes |
| Soft-delete / restore chapter | ✓ | ✓ | ✓ | O, CA | `…auth_and_rls.sql:236-240` | `components/chapter-row.tsx:146-157,186-202` | **No — E allowed by DB, documented not allowed (F-CHM-01)** |
| Write / autosave chapter draft, insert chapter images | ✓ | ✓ | ✓ | O, CA, E | `…auth_and_rls.sql:114-120,247-252`; `…story_image_buckets.sql:51` | OBJ-EDT | Yes (OBJ-EDT) |
| Publish now / schedule chapter | ✓ | ✓ | ✓ | O, CA, E | `20261103000200_publish_chapter_rpc.sql:11,217-232,235-251`; `supabase/tests/20_publish.test.sql:84-96` | `editor/model/publishing.ts:11-13` | DB = editor UI; **invitation copy says editors cannot publish (F-TEAM-01)** |
| Unpublish / cancel schedule | ✓ | ✓ | ✗ (42501) | O, CA | `…publish_chapter_rpc.sql:278-297`; `supabase/tests/20_publish.test.sql:151` | `editor/model/publishing.ts:7-9,15-19` | Yes |
| View version history, preview, restore a version into the draft | ✓ | ✓ | ✓ | O, CA, E | `…auth_and_rls.sql:254-258` (read), `:247-252` (draft write) | OBJ-HIST | Inferred (OBJ-HIST) |
| Invite, cancel invitation, see story invitations | ✓ | ✗ (PT404) | ✗ (PT404) | O | `20261104000500_collaboration_invitations.sql:70-73,160-163,192` | `team-screen.tsx:70-72`; `studio-screen.tsx:75-82` | Yes |
| Remove another collaborator | ✓ | ✗ | ✗ | O | `…auth_and_rls.sql:221-222`; `supabase/tests/10_rls.test.sql:144` | `team-screen.tsx:128-136` | Yes |
| Leave the story (remove self) | — | ✓ | ✓ | nobody | `…auth_and_rls.sql:221-222` | — | **No — allowed action hidden (F-TEAM-02)** |
| Change a collaborator's role | ✓ | ✗ | ✗ | nobody | `…auth_and_rls.sql:219-220` | — | No UI (F-TEAM-03) |
| View story statistics | ✓ | ✓ | ✗ (42501) | O, CA ("Stats"; E gets "You can't view these statistics" on direct URL) | `20261104002100_author_stats.sql:43-48,83-88` | `studio-screen.tsx:83-91`; `analytics/screens/story-stats-screen.tsx:66-68` | Yes |
| Hide / show readers' comments on the story | ✓ | ✓ | ✗ | O, CA (comment item) | `20261104001800_comment_moderation_by_author.sql:58-62,133-135` | `comments/components/comment-item.tsx:56,66-67` | Yes (OBJ-CMT) |
| Accept / decline an invitation | invitee only | | | invitee (Studio inbox) | `…collaboration_invitations.sql:120-123` | `my-invitations.tsx` | Yes |

Account status: every RPC above requires an active account; direct-table writes (story settings, story delete/restore,
chapter slug, chapter delete/restore, draft writes) do not (F-STM-05, BR-STM-025).

| Field | Value |
| --- | --- |
| Description | Matrix above |
| Preconditions | A role on the story (`story_role`) |
| Conditions | Roles are exclusive per story (owner via `stories.owner_id`; collaborator row otherwise) |
| Expected behavior | UI offers exactly what the DB allows, and the DB enforces the documented rules (WBS 3.2 "chỉ chủ sở hữu mới xóa"; WBS 3.4 "biên tập viên chỉ thêm/sắp xếp/đổi đường dẫn, không lưu trữ hay xóa"; WBS 3.7 editors publish and schedule, not unpublish) |
| Exceptions | Four inconsistencies marked **No** above |
| Related screens | All D-STUDIO screens |
| Evidence | Per row |
| Status | Verified |

Role hints shown when inviting (`strings.en.ts:136-139`): co-author "Edit the story, write and publish chapters, manage
chapters."; editor "Write and edit chapters, but not publish or delete them." — the editor hint contradicts the
publish row above.

### BR-TEAM-011 — Where invitations are surfaced
| Field | Value |
| --- | --- |
| Description | `MyInvitations` is mounted only on the Studio home, between the header and the story list; it renders nothing when there are no pending invitations (or the request fails) |
| Preconditions | Signed in |
| Conditions | Notification `collaboration_invited` links to `/studio`; `collaboration_accepted` / `collaboration_declined` link to `/studio/story/{id}/team` |
| Expected behavior | Accepting reloads the whole Studio (and story caches) so the story appears in the list |
| Exceptions | Not shown in the notification page itself (no inline accept) |
| Related screens | SCR-STM-01, SCR-TEAM-01 |
| Evidence | `packages/features/src/studio/screens/studio-screen.tsx:127`; `packages/features/src/studio/components/my-invitations.tsx:13-18`; `packages/features/src/notifications/model/notification.ts:102-112`; `packages/features/src/studio/hooks/use-collaboration.ts:49-66` |
| Status | Verified |

### BR-TEAM-012 — Error mapping
| Field | Value |
| --- | --- |
| Description | Invite errors are shown under the username field; answer/cancel/remove errors as toasts |
| Preconditions | — |
| Conditions | Invite: notFound → "No user found with this username."; invalid → "You can't invite this person (for example, yourself)."; conflict → "This person is already a collaborator or has a pending invitation, or the story already has 20 pending invitations."; forbidden → "You don't have permission to do this.". Others: notFound → "The invitation or collaborator no longer exists."; conflict → "The invitation was already handled or cancelled. The list has been reloaded." |
| Expected behavior | Typed username kept after an invite error |
| Exceptions | The three PT409 causes share one message (U-TEAM-01). Owner-only story-not-found (PT404) on invite would read as "No user found…" — Inferred |
| Related screens | SCR-TEAM-01, SCR-STM-01 |
| Evidence | `packages/features/src/studio/model/collaboration.ts:127-159`; `packages/features/src/studio/strings.en.ts:195-203`; `packages/features/src/studio/collaboration.test.tsx:176` |
| Status | Verified |

### BR-TEAM-013 — `story_role` is the single source of the role
| Field | Value |
| --- | --- |
| Description | `story_role(story)` returns `owner` / `co_author` / `editor` / NULL for `auth.uid()`; every policy and RPC above uses it, and the editor's publish panel asks the database for it |
| Preconditions | — |
| Conditions | SECURITY DEFINER, never takes a user id from the caller |
| Expected behavior | — |
| Exceptions | The Studio screens derive the role client-side from `owner_id` + `story_collaborators` (same data, separate code) |
| Related screens | All |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:65-91`; `packages/features/src/editor/api/publishing.api.ts:32-37`; `packages/features/src/studio/api/story-write.api.ts:59-82` |
| Status | Verified |

### BR-TEAM-014 — Read-only role permission matrix from `story_role_rights()` (Lucian 184, batch 4 · platform4)
| Field | Value |
| --- | --- |
| Description | The team screen shows "What each role can do": one row per right, one column per role (Owner, Co-author, Editor), a check or a dash with "Allowed"/"Not allowed" for screen readers. Rights are fixed; there are no toggles |
| Preconditions | Owner on the team screen (the matrix itself is readable by anyone: it is documentation) |
| Conditions | Source of truth: `public.story_role_rights()` (IMMUTABLE, granted to anon/authenticated) lists 13 capabilities: view_drafts, edit_story, set_tags, change_cover, create_chapters, edit_drafts, reorder_chapters, publish_chapters (all three roles), unpublish_chapters, archive_chapters, moderate_comments, view_stats (owner + co-author), manage_team (owner). The SQL test runs each capability as owner, co-author, editor and a stranger against the real policies/RPCs and fails on any difference or on a capability without a check |
| Expected behavior | The matrix is generated from the RPC; a capability the app has no label for yet shows under its key. The invite form's role hints were corrected: editors CAN publish and schedule (publish_chapter only needs a role) but cannot unpublish or archive |
| Exceptions | Not listed: moving a chapter to the trash (`chapters.deleted_at`): the `chapters_update` policy lets every role write it while the app offers it to owners and co-authors only — reported as a finding, not changed |
| Related screens | SCR-TEAM-01 (C09) |
| Evidence | `supabase/migrations/20261106050200_story_role_rights.sql` (Rollback: `DROP FUNCTION public.story_role_rights();`), `supabase/tests/552_story_role_rights.test.sql`, `packages/features/src/studio/{api/role-rights.api.ts,hooks/use-role-rights.ts,model/role-rights.ts,screens/team-screen.tsx}`, `packages/ui/src/widgets/role-matrix.tsx`, `studio/collaboration.test.tsx` |
| Status | Verified (SQL test, unit); not run against a real Supabase project |

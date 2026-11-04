import type { DataClient } from "../../_shared/client.ts";
import { AppError, unwrap } from "../../_shared/errors.ts";
import {
  toCollaborators,
  toMyInvitations,
  toStoryInvitations,
  type CollaboratorRole,
  type Collaborator,
  type CollaboratorRow,
  type MyInvitation,
  type MyInvitationRow,
  type StoryInvitation,
  type StoryInvitationRow,
} from "../model/collaboration.ts";

/** Invitations waiting for the signed-in user (the story may be private, so this goes through a function). */
export async function listMyInvitations(client: DataClient): Promise<MyInvitation[]> {
  return toMyInvitations(unwrap(await client.rpc("list_my_invitations")) ?? ([] as MyInvitationRow[]));
}

/** Every invitation of the story (owner only; anyone else gets an empty list). */
export async function listStoryInvitations(client: DataClient, storyId: string): Promise<StoryInvitation[]> {
  return toStoryInvitations(
    unwrap(await client.rpc("list_story_invitations", { p_story_id: storyId })) ?? ([] as StoryInvitationRow[]),
  );
}

export async function listCollaborators(client: DataClient, storyId: string): Promise<Collaborator[]> {
  const rows =
    unwrap(
      await client
        .from("story_collaborators")
        .select(
          "collaborator_role, added_at, user:app_users!story_collaborators_user_id_fkey(id, username, display_name)",
        )
        .eq("story_id", storyId)
        .returns<CollaboratorRow[]>(),
    ) ?? [];
  return toCollaborators(rows);
}

export async function inviteCollaborator(
  client: DataClient,
  storyId: string,
  username: string,
  role: CollaboratorRole,
): Promise<string> {
  const id = unwrap(
    await client.rpc("invite_collaborator", { p_story_id: storyId, p_username: username.trim(), p_role: role }),
  );
  return id ?? "";
}

export async function respondToInvitation(client: DataClient, invitationId: string, accept: boolean): Promise<void> {
  unwrap(await client.rpc("respond_invitation", { p_invitation_id: invitationId, p_accept: accept }));
}

export async function cancelInvitation(client: DataClient, invitationId: string): Promise<void> {
  unwrap(await client.rpc("cancel_invitation", { p_invitation_id: invitationId }));
}

/** The owner removes a collaborator (or a collaborator leaves). Zero matched rows means it was not allowed or already gone. */
export async function removeCollaborator(client: DataClient, storyId: string, userId: string): Promise<void> {
  const rows = unwrap(
    await client.from("story_collaborators").delete().eq("story_id", storyId).eq("user_id", userId).select("user_id"),
  );
  if (!rows || rows.length === 0) throw new AppError("notFound", "Collaborator not found or not removable");
}

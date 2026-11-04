import {
  COLLABORATOR_ROLES,
  INVITATION_STATUS,
  INVITATION_STATUSES,
  type CollaboratorRole,
  type InvitationStatus,
} from "@storynest/validation";
import type { AppError } from "../../_shared/errors.ts";
import { studioText } from "../strings.ts";

export { INVITATION_STATUS, type CollaboratorRole, type InvitationStatus };

export interface MyInvitationRow {
  id: string;
  story_id: string;
  story_title: string;
  collaborator_role: string;
  inviter_username: string;
  inviter_display_name: string;
  created_at: string;
}
export interface MyInvitation {
  id: string;
  storyId: string;
  storyTitle: string;
  role: CollaboratorRole;
  inviterName: string;
  createdAt: string;
}

export interface StoryInvitationRow {
  id: string;
  invitee_username: string;
  invitee_display_name: string;
  collaborator_role: string;
  status: string;
  created_at: string;
}
export interface StoryInvitation {
  id: string;
  inviteeUsername: string;
  inviteeName: string;
  role: CollaboratorRole;
  status: InvitationStatus;
  createdAt: string;
}

export interface CollaboratorRow {
  collaborator_role: string;
  added_at: string;
  user:
    | { id: string; username: string; display_name: string }
    | { id: string; username: string; display_name: string }[]
    | null;
}
export interface Collaborator {
  userId: string;
  username: string;
  name: string;
  role: CollaboratorRole;
  addedAt: string;
}

export function asCollaboratorRole(value: string): CollaboratorRole | null {
  return COLLABORATOR_ROLES.find((role) => role === value) ?? null;
}

const displayName = (name: string, username: string) => (name.trim() === "" ? username : name);

/** Rows with a role this app does not know are dropped rather than shown with a wrong label. */
export function toMyInvitations(rows: readonly MyInvitationRow[]): MyInvitation[] {
  return rows.flatMap((row) => {
    const role = asCollaboratorRole(row.collaborator_role);
    if (!role) return [];
    return [
      {
        id: row.id,
        storyId: row.story_id,
        storyTitle: row.story_title,
        role,
        inviterName: displayName(row.inviter_display_name, row.inviter_username),
        createdAt: row.created_at,
      },
    ];
  });
}

export function toStoryInvitations(rows: readonly StoryInvitationRow[]): StoryInvitation[] {
  return rows.flatMap((row) => {
    const role = asCollaboratorRole(row.collaborator_role);
    const status = INVITATION_STATUSES.find((value) => value === row.status);
    if (!role || !status) return [];
    return [
      {
        id: row.id,
        inviteeUsername: row.invitee_username,
        inviteeName: displayName(row.invitee_display_name, row.invitee_username),
        role,
        status,
        createdAt: row.created_at,
      },
    ];
  });
}

export function toCollaborators(rows: readonly CollaboratorRow[]): Collaborator[] {
  return rows
    .flatMap((row) => {
      const user = Array.isArray(row.user) ? row.user[0] : row.user;
      const role = asCollaboratorRole(row.collaborator_role);
      if (!user || !role) return [];
      return [
        {
          userId: user.id,
          username: user.username,
          name: displayName(user.display_name, user.username),
          role,
          addedAt: row.added_at,
        },
      ];
    })
    .sort((a, b) => (a.addedAt < b.addedAt ? -1 : a.addedAt > b.addedAt ? 1 : a.userId < b.userId ? -1 : 1));
}

const t = studioText.team;

/** Text for a failed invite: the kind tells what to fix (name, yourself, or the state of the story's invitations). */
export function inviteErrorMessage(error: AppError): string {
  switch (error.kind) {
    case "notFound":
      return t.errors.inviteNotFound;
    case "invalid":
      return t.errors.inviteInvalid;
    case "conflict":
      return t.errors.inviteConflict;
    case "forbidden":
      return t.errors.forbidden;
    case "network":
      return studioText.errors.network;
    default:
      return studioText.errors.generic;
  }
}

/** Text for a failed answer/cancel/remove of an existing invitation or collaborator. */
export function invitationErrorMessage(error: AppError): string {
  switch (error.kind) {
    case "notFound":
      return t.errors.gone;
    case "conflict":
      return t.errors.settled;
    case "forbidden":
      return t.errors.forbidden;
    case "network":
      return studioText.errors.network;
    default:
      return studioText.errors.generic;
  }
}

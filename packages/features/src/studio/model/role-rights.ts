import type { StudioRole } from "./studio-story.ts";

/**
 * One right of the story roles as public.story_role_rights() documents it (the database's own list; a SQL test checks
 * it against the policies and functions that enforce each right). The app never decides a right itself: it only shows
 * this list.
 */
export interface RoleRight {
  capability: string;
  allowed: Record<StudioRole, boolean>;
}

export interface RoleRightRow {
  capability: string;
  owner: boolean;
  co_author: boolean;
  editor: boolean;
}

/** The roles in the order of the matrix columns. */
export const MATRIX_ROLES: readonly StudioRole[] = ["owner", "co_author", "editor"];

export function toRoleRights(rows: readonly RoleRightRow[]): RoleRight[] {
  return rows.map((row) => ({
    capability: row.capability,
    allowed: { owner: row.owner === true, co_author: row.co_author === true, editor: row.editor === true },
  }));
}

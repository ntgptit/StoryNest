import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import { toRoleRights, type RoleRight, type RoleRightRow } from "../model/role-rights.ts";

/** What each story role may do, in the database's order (public.story_role_rights, readable by anyone). */
export async function getRoleRights(client: DataClient): Promise<RoleRight[]> {
  return toRoleRights((unwrap(await client.rpc("story_role_rights")) ?? []) as RoleRightRow[]);
}

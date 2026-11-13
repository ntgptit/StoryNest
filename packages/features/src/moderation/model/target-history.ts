import { MODERATION_ACTIONS, type ModerationAction } from "@storynest/validation";

/** One row of the audit log about a target (the log is closed to everyone but moderators). */
export interface TargetActionRow {
  id: string;
  action: string;
  reason: string;
  created_at: string;
}

export interface TargetAction {
  id: string;
  action: ModerationAction;
  reason: string;
  createdAt: string;
}

export const TARGET_HISTORY_LIMIT = 20;

/** Maps audit rows to actions; a row with an action this version does not know is left out. */
export function toTargetActions(rows: readonly TargetActionRow[]): TargetAction[] {
  return rows.flatMap((row) => {
    const action = MODERATION_ACTIONS.find((known) => known === row.action);
    return action ? [{ id: row.id, action, reason: row.reason, createdAt: row.created_at }] : [];
  });
}

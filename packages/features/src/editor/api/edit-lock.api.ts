import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import { toEditLock, type EditLock, type EditLockRow } from "../model/edit-lock.ts";

const LOCK_COLUMNS = [
  "chapter_id, holder_id, acquired_at, expires_at, requested_by, requested_at",
  "holder:app_users!chapter_edit_locks_holder_id_fkey(username, display_name)",
  "requester:app_users!chapter_edit_locks_requested_by_fkey(username, display_name)",
].join(", ");

/** The chapter's edit lock with the names of the holder and of whoever asked; null when nobody holds it. */
export async function getEditLock(client: DataClient, chapterId: string): Promise<EditLock | null> {
  const row = unwrap(
    await client
      .from("chapter_edit_locks")
      .select(LOCK_COLUMNS)
      .eq("chapter_id", chapterId)
      .returns<EditLockRow[]>()
      .maybeSingle(),
  );
  return row ? toEditLock(row) : null;
}

type LockRpc = "claim_edit_lock" | "request_edit_lock" | "hand_over_edit_lock" | "decline_edit_request";

/**
 * One of the lock RPCs. claim = take a free/expired lock or renew mine (the heartbeat), request = ask the holder,
 * hand over / decline = the holder answers. They all leave chapter_drafts alone: saving keeps its revision check.
 */
export async function callEditLock(client: DataClient, name: LockRpc, chapterId: string): Promise<void> {
  unwrap(await client.rpc(name, { p_chapter_id: chapterId }));
}

/** Lets go of my lock (no-op when it is not mine). */
export async function releaseEditLock(client: DataClient, chapterId: string): Promise<void> {
  unwrap(await client.rpc("release_edit_lock", { p_chapter_id: chapterId }));
}

import { editorText } from "../strings.ts";

type Person = { username: string; display_name: string } | { username: string; display_name: string }[] | null;

export interface EditLockRow {
  chapter_id: string;
  holder_id: string;
  acquired_at: string;
  expires_at: string;
  requested_by: string | null;
  requested_at: string | null;
  holder?: Person;
  requester?: Person;
}

export interface EditLock {
  holderId: string;
  holderName: string;
  expiresAt: string;
  requestedBy: string | null;
  requesterName: string | null;
}

const nameOf = (person: Person | undefined): string | null => {
  const p = Array.isArray(person) ? person[0] : person;
  if (!p) return null;
  return p.display_name.trim() === "" ? p.username : p.display_name;
};

/** A lock row, or null for anything that is not one (defensive: the lock is advisory, never worth an error). */
export function toEditLock(row: EditLockRow): EditLock | null {
  if (typeof row.holder_id !== "string" || typeof row.expires_at !== "string") return null;
  return {
    holderId: row.holder_id,
    holderName: nameOf(row.holder) ?? editorText.lock.someone,
    expiresAt: row.expires_at,
    requestedBy: row.requested_by,
    requesterName: row.requested_by === null ? null : (nameOf(row.requester) ?? editorText.lock.someone),
  };
}

export type LockState =
  /** Nobody holds it, or the holder's time ran out. */
  | { kind: "free" }
  | { kind: "mine"; askedBy: { id: string; name: string } | null }
  | { kind: "other"; holder: { id: string; name: string }; askedByMe: boolean };

/** How the lock looks to `userId` at `now`. An expired lock is free (the server treats it the same way). */
export function lockState(lock: EditLock | null, userId: string | null, now: number): LockState {
  if (lock === null || new Date(lock.expiresAt).getTime() <= now) return { kind: "free" };
  const askedBy =
    lock.requestedBy === null ? null : { id: lock.requestedBy, name: lock.requesterName ?? editorText.lock.someone };
  if (lock.holderId === userId) return { kind: "mine", askedBy };
  return {
    kind: "other",
    holder: { id: lock.holderId, name: lock.holderName },
    askedByMe: userId !== null && lock.requestedBy === userId,
  };
}

/** How often the open editor renews (or tries to take) the lock; the lock itself lasts 90 seconds. */
export const EDIT_LOCK_HEARTBEAT_MS = 30_000;

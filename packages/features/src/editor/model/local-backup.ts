import { chapterBodySchema, type ChapterBody } from "@storynest/validation";

/** What the author has typed but the server does not have yet, kept on this device so a lost connection loses nothing. */
export interface DraftBackup {
  /** The server revision this text was written on top of. */
  baseRevision: number;
  title: string;
  body: ChapterBody;
  savedAt: string;
}

const PREFIX = "storynest.draftBackup.";
const keyOf = (chapterId: string) => `${PREFIX}${chapterId}`;

/** Best effort: private mode, a full quota or blocked storage must never break writing. */
export function writeBackup(chapterId: string, backup: DraftBackup): void {
  try {
    window.localStorage.setItem(keyOf(chapterId), JSON.stringify(backup));
  } catch {
    // nothing to do: the draft is still in the editor and is autosaved to the server
  }
}

export function clearBackup(chapterId: string): void {
  try {
    window.localStorage.removeItem(keyOf(chapterId));
  } catch {
    // ignore
  }
}

/** The stored backup, or null when there is none or it is not something this version can trust. */
export function readBackup(chapterId: string): DraftBackup | null {
  try {
    const raw = window.localStorage.getItem(keyOf(chapterId));
    if (raw === null) return null;
    const value = JSON.parse(raw) as Partial<DraftBackup> | null;
    if (!value || typeof value !== "object") return null;
    const body = chapterBodySchema.safeParse(value.body);
    if (!body.success) return null;
    if (typeof value.title !== "string" || !Number.isInteger(value.baseRevision) || typeof value.savedAt !== "string")
      return null;
    return { baseRevision: value.baseRevision as number, title: value.title, body: body.data, savedAt: value.savedAt };
  } catch {
    return null;
  }
}

/** True when restoring `backup` would change what the server has (otherwise the backup is just noise). */
export function differsFromServer(backup: DraftBackup, server: { title: string; body: ChapterBody | [] }): boolean {
  return backup.title !== server.title || JSON.stringify(backup.body) !== JSON.stringify(server.body);
}

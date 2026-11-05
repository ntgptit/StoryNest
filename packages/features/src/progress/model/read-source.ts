import { readSourceSchema, type ReadSource } from "@storynest/validation";

// Which StoryNest screen the reader opened a story from (Lucian 153, read sources). Coarse and in-app only: a screen
// marks itself when the reader follows one of its links, the next read reported in this tab carries that word, and
// nothing about other sites (referrer, campaign, URL) is ever looked at. The mark lives in sessionStorage (this tab
// only) and expires, so an old visit to the search page does not label a read an hour later.

const STORAGE_KEY = "storynest.readSource";
/** How long a mark counts: long enough to open the story page and then a chapter. */
export const READ_SOURCE_TTL_MS = 30 * 60_000;

let memory: { source: ReadSource; at: number } | null = null;

/** Called by a screen when the reader opens a story from it (e.g. `onClickCapture` around its result list). */
export function markReadSource(source: ReadSource, now: number = Date.now()): void {
  memory = { source, at: now };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Storage blocked: the in-memory mark still serves this page.
  }
}

/** The source to send with the next read, or undefined when there is no fresh mark. */
export function currentReadSource(now: number = Date.now()): ReadSource | undefined {
  let mark: unknown = memory;
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) mark = JSON.parse(stored);
  } catch {
    // Unreadable storage or a malformed value: fall back to the in-memory mark.
  }
  if (!mark || typeof mark !== "object") return undefined;
  const { source, at } = mark as { source?: unknown; at?: unknown };
  const parsed = readSourceSchema.safeParse(source);
  if (!parsed.success || typeof at !== "number" || now - at > READ_SOURCE_TTL_MS || at > now) return undefined;
  return parsed.data;
}

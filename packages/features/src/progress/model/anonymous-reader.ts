const STORAGE_KEY = "storynest.anonymousReaderId";

let memoryId: string | null = null;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Random id that lets the server count a guest once per chapter per day. It identifies a browser, not a person, and is
 * never sent for a signed-in reader. Kept in localStorage; where storage is blocked (private mode) it lives for the page
 * only, which at worst counts that guest again on the next visit.
 */
export function getAnonymousReaderId(): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isUuid(stored)) return stored;
    const created = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    memoryId ??= crypto.randomUUID();
    return memoryId;
  }
}

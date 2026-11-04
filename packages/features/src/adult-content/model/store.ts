/**
 * The reader's choice about adult (18+) content, kept on this device: localStorage plus in-page listeners, read with
 * useSyncExternalStore. Nothing is shown by default. `show` is only ever true after the reader confirmed they are 18 or
 * older (`ageConfirmed`), and the confirmation is remembered, so turning the filter off and on again does not ask twice.
 * Where storage is blocked the choice lives for the page only. (Syncing it to the account is WP 6.3.)
 */
export const ADULT_CONTENT_STORAGE_KEY = "storynest.adult-content";

export interface AdultContentChoice {
  ageConfirmed: boolean;
  show: boolean;
}

export const NO_ADULT_CONTENT: AdultContentChoice = { ageConfirmed: false, show: false };

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: AdultContentChoice = NO_ADULT_CONTENT;
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(ADULT_CONTENT_STORAGE_KEY);
  } catch {
    return memoryRaw;
  }
}

/** Anything that is not a clear "yes" is "no": a damaged value never shows adult content. */
export function parseAdultContent(raw: string | null): AdultContentChoice {
  if (raw === null) return NO_ADULT_CONTENT;
  try {
    // A value that is not an object makes the destructuring throw or find nothing: either way it ends as "no".
    const { ageConfirmed, show } = JSON.parse(raw) as Record<string, unknown>;
    const confirmed = ageConfirmed === true;
    return { ageConfirmed: confirmed, show: confirmed && show === true };
  } catch {
    return NO_ADULT_CONTENT;
  }
}

/** Stable between calls while the stored value is unchanged (useSyncExternalStore requires that). */
export function getStoredAdultContent(): AdultContentChoice {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseAdultContent(raw);
  }
  return cachedValue;
}

/** The server renders the safe default; the client switches after hydration if the reader chose otherwise. */
export function getServerAdultContent(): AdultContentChoice {
  return NO_ADULT_CONTENT;
}

export function setStoredAdultContent(next: AdultContentChoice): void {
  // parseAdultContent is the one place that enforces "show only after the confirmation", on every read.
  const raw = JSON.stringify(next);
  memoryRaw = raw;
  try {
    window.localStorage.setItem(ADULT_CONTENT_STORAGE_KEY, raw);
  } catch {
    // blocked storage: the in-memory copy above keeps the choice for this page
  }
  listeners.forEach((listener) => listener());
}

export function subscribeAdultContent(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changed the choice.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === ADULT_CONTENT_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

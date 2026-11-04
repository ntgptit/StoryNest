import { DEFAULT_READER_PREFERENCES, parseReaderPreferences, type ReaderPreferences } from "@storynest/validation";
import { READER_PREFERENCES_STORAGE_KEY } from "./preferences.ts";

/**
 * This device's reader preferences as a tiny external store (localStorage + in-page listeners), consumed with
 * useSyncExternalStore. Writing is instant and works for guests; where storage is blocked the choice lives for the
 * page only.
 */
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: ReaderPreferences = { ...DEFAULT_READER_PREFERENCES };
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(READER_PREFERENCES_STORAGE_KEY);
  } catch {
    return memoryRaw;
  }
}

function parseRaw(raw: string | null): ReaderPreferences {
  if (raw === null) return { ...DEFAULT_READER_PREFERENCES };
  try {
    return parseReaderPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_READER_PREFERENCES };
  }
}

/** Stable between calls while the stored value is unchanged (useSyncExternalStore requires that). */
export function getStoredReaderPreferences(): ReaderPreferences {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseRaw(raw);
  }
  return cachedValue;
}

export function getServerReaderPreferences(): ReaderPreferences {
  return DEFAULT_READER_PREFERENCES;
}

export function setStoredReaderPreferences(next: ReaderPreferences): void {
  const raw = JSON.stringify(next);
  memoryRaw = raw;
  try {
    window.localStorage.setItem(READER_PREFERENCES_STORAGE_KEY, raw);
  } catch {
    // blocked storage: the in-memory copy above keeps the choice for this page
  }
  listeners.forEach((listener) => listener());
}

export function subscribeReaderPreferences(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changed the setting.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === READER_PREFERENCES_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

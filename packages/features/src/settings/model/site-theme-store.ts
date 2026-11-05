import {
  applySiteTheme,
  DEFAULT_SITE_THEME,
  parseSiteTheme,
  SITE_THEME_STORAGE_KEY,
  type SiteTheme,
} from "./site-theme.ts";

/**
 * This device's site theme as a tiny external store (localStorage + in-page listeners), consumed with
 * useSyncExternalStore, like the reader preferences. Writing applies the theme to <html> at once and works for
 * guests; where storage is blocked the choice lives for the page only.
 */
const listeners = new Set<() => void>();
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(SITE_THEME_STORAGE_KEY);
  } catch {
    return memoryRaw;
  }
}

export function getStoredSiteTheme(): SiteTheme {
  return parseSiteTheme(readRaw());
}

export function getServerSiteTheme(): SiteTheme {
  return DEFAULT_SITE_THEME;
}

export function setStoredSiteTheme(theme: SiteTheme): void {
  memoryRaw = theme;
  try {
    if (theme === DEFAULT_SITE_THEME) window.localStorage.removeItem(SITE_THEME_STORAGE_KEY);
    else window.localStorage.setItem(SITE_THEME_STORAGE_KEY, theme);
  } catch {
    // blocked storage: the in-memory copy above keeps the choice for this page
  }
  applySiteTheme(theme, document.documentElement);
  listeners.forEach((listener) => listener());
}

export function subscribeSiteTheme(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changed it: follow along on this page too.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== SITE_THEME_STORAGE_KEY) return;
    applySiteTheme(getStoredSiteTheme(), document.documentElement);
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

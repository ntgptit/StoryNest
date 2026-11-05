// Site theme (light / dark / follow the device), kept per device. Not an account setting: user_settings has no
// theme column, and a phone and a laptop often want different themes anyway. The design tokens already honour a
// "light" or "dark" class on <html> (see design-tokens/tokens.css); "system" means neither class.
// While a chapter is open the reader's own theme (data-reader-theme) wins over this one.

export const SITE_THEMES = ["system", "light", "dark"] as const;
export type SiteTheme = (typeof SITE_THEMES)[number];
export type ColorScheme = "light" | "dark";

export const DEFAULT_SITE_THEME: SiteTheme = "system";

/** localStorage key of this device's choice. The same key is read by the inline bootstrap script. */
export const SITE_THEME_STORAGE_KEY = "storynest.siteTheme";

export function isSiteTheme(value: unknown): value is SiteTheme {
  return typeof value === "string" && (SITE_THEMES as readonly string[]).includes(value);
}

export function parseSiteTheme(raw: string | null): SiteTheme {
  return isSiteTheme(raw) ? raw : DEFAULT_SITE_THEME;
}

/** Puts the choice on <html>: class "light" or "dark", or neither to follow the device. */
export function applySiteTheme(theme: SiteTheme, root: HTMLElement): void {
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
}

/** The scheme actually shown: the forced one, or the device's when following it. */
export function resolveScheme(theme: SiteTheme, deviceIsDark: boolean): ColorScheme {
  if (theme === "system") return deviceIsDark ? "dark" : "light";
  return theme;
}

/** The theme a day/night switch sets: the opposite of what is shown now, chosen explicitly (Settings can go back to "system"). */
export function toggledTheme(shown: ColorScheme): SiteTheme {
  return shown === "dark" ? "light" : "dark";
}

/**
 * Source of a tiny script for the root layout's <head>: applies the stored choice while the page is parsed, before
 * the first paint, so a reader who chose dark never sees the light page flash. Anything but "light"/"dark" is ignored.
 */
export const SITE_THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  SITE_THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.classList.add(t);}catch(e){}})();`;

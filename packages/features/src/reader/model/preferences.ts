import {
  DEFAULT_READER_PREFERENCES,
  READER_FONT_SIZES,
  READER_FONTS,
  READER_LINE_HEIGHTS,
  READER_THEMES,
  type ReaderFontSize,
  type ReaderPreferences,
} from "@storynest/validation";

/** localStorage key of this device's copy. The same key is read by the inline bootstrap script. */
export const READER_PREFERENCES_STORAGE_KEY = "storynest.readerPreferences";

/** data-reader-* attributes on <html> (dataset names); design-tokens/tokens.css styles them. */
export const READER_DATASET = {
  fontSize: "readerSize",
  lineHeight: "readerLeading",
  font: "readerFont",
  theme: "readerTheme",
} as const satisfies Record<keyof ReaderPreferences, string>;

export function applyReaderPreferences(preferences: ReaderPreferences, root: HTMLElement): void {
  for (const key of Object.keys(READER_DATASET) as (keyof ReaderPreferences)[]) {
    root.dataset[READER_DATASET[key]] = preferences[key];
  }
}

/** Leaves no trace on <html>: the site look is back as soon as the reader closes. */
export function clearReaderPreferences(root: HTMLElement): void {
  for (const name of Object.values(READER_DATASET)) delete root.dataset[name];
}

/** One step larger (+1) or smaller (-1), stopping at the ends. */
export function stepFontSize(current: ReaderFontSize, direction: 1 | -1): ReaderFontSize {
  const index = READER_FONT_SIZES.indexOf(current) + direction;
  return READER_FONT_SIZES[Math.min(READER_FONT_SIZES.length - 1, Math.max(0, index))] ?? current;
}

export function canStepFontSize(current: ReaderFontSize, direction: 1 | -1): boolean {
  return stepFontSize(current, direction) !== current;
}

export function samePreferences(a: ReaderPreferences, b: ReaderPreferences): boolean {
  return a.fontSize === b.fontSize && a.lineHeight === b.lineHeight && a.font === b.font && a.theme === b.theme;
}

export function isDefaultPreferences(preferences: ReaderPreferences): boolean {
  return samePreferences(preferences, DEFAULT_READER_PREFERENCES);
}

/**
 * Core of the bootstrap script. Source of a tiny script that applies the stored preferences to <html> while the page is being parsed, before the
 * first paint, so a reader who chose a dark background never sees the light page flash. Server-rendered pages put it
 * in the HTML (see apps/web); client-side navigation does not need it because the hook applies them in a layout
 * effect. Values are validated against the same lists as the schema; anything else is ignored.
 */
export const READER_PREFERENCES_BOOTSTRAP_SCRIPT = `(function(){try{var d=document.documentElement;var p=JSON.parse(localStorage.getItem(${JSON.stringify(
  READER_PREFERENCES_STORAGE_KEY,
)})||"{}");var m=${JSON.stringify([
  [READER_DATASET.fontSize, "fontSize", READER_FONT_SIZES],
  [READER_DATASET.lineHeight, "lineHeight", READER_LINE_HEIGHTS],
  [READER_DATASET.font, "font", READER_FONTS],
  [READER_DATASET.theme, "theme", READER_THEMES],
])};for(var i=0;i<m.length;i++){var v=p&&p[m[i][1]];if(m[i][2].indexOf(v)>-1)d.dataset[m[i][0]]=v;}}catch(e){}})();`;

/**
 * The bootstrap script limited to the pages whose path matches `pathPattern` (the chapter route), so every other page
 * keeps the site look. Put it in the root layout's <head>: rendered once by the server on a full page load, so React
 * never has to render a <script> on the client (which it warns about and cannot execute).
 */
export function buildReaderBootstrapScript(pathPattern: RegExp): string {
  return `if(${pathPattern.toString()}.test(location.pathname)){${READER_PREFERENCES_BOOTSTRAP_SCRIPT}}`;
}

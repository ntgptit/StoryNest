// Reader preferences: one definition shared by the device copy (localStorage) and the account copy
// (user_reader_preferences.preferences). Anything unknown or malformed falls back to the default for that field, so
// a value written by a newer app version, or edited by hand, can never break the reader.
import { z } from "zod";

export const READER_FONT_SIZES = ["s", "m", "l", "xl"] as const;
export const READER_LINE_HEIGHTS = ["compact", "normal", "relaxed"] as const;
export const READER_FONTS = ["sans", "serif"] as const;
/** `site` follows the app theme (light/dark by the OS); the others force the reading background. */
export const READER_THEMES = ["site", "light", "sepia", "dark"] as const;

export type ReaderFontSize = (typeof READER_FONT_SIZES)[number];
export type ReaderLineHeight = (typeof READER_LINE_HEIGHTS)[number];
export type ReaderFont = (typeof READER_FONTS)[number];
export type ReaderTheme = (typeof READER_THEMES)[number];

export const READER_FONT_SIZE = { SMALL: "s", MEDIUM: "m", LARGE: "l", EXTRA_LARGE: "xl" } as const satisfies Record<
  string,
  ReaderFontSize
>;
export const READER_LINE_HEIGHT = {
  COMPACT: "compact",
  NORMAL: "normal",
  RELAXED: "relaxed",
} as const satisfies Record<string, ReaderLineHeight>;
export const READER_FONT = { SANS: "sans", SERIF: "serif" } as const satisfies Record<string, ReaderFont>;
export const READER_THEME = { SITE: "site", LIGHT: "light", SEPIA: "sepia", DARK: "dark" } as const satisfies Record<
  string,
  ReaderTheme
>;

export const DEFAULT_READER_PREFERENCES = {
  fontSize: READER_FONT_SIZE.MEDIUM,
  lineHeight: READER_LINE_HEIGHT.NORMAL,
  font: READER_FONT.SANS,
  theme: READER_THEME.SITE,
} as const satisfies { fontSize: ReaderFontSize; lineHeight: ReaderLineHeight; font: ReaderFont; theme: ReaderTheme };

export const readerPreferencesSchema = z.object({
  fontSize: z.enum(READER_FONT_SIZES).catch(DEFAULT_READER_PREFERENCES.fontSize),
  lineHeight: z.enum(READER_LINE_HEIGHTS).catch(DEFAULT_READER_PREFERENCES.lineHeight),
  font: z.enum(READER_FONTS).catch(DEFAULT_READER_PREFERENCES.font),
  theme: z.enum(READER_THEMES).catch(DEFAULT_READER_PREFERENCES.theme),
});

export type ReaderPreferences = z.infer<typeof readerPreferencesSchema>;

/** Valid preferences from any input; every missing or invalid field takes its default. Unknown keys are dropped. */
export function parseReaderPreferences(raw: unknown): ReaderPreferences {
  const parsed = readerPreferencesSchema.safeParse(raw);
  return parsed.success ? parsed.data : { ...DEFAULT_READER_PREFERENCES };
}

/** True when `raw` carries at least one valid setting (an empty `{}` row means "nothing saved yet"). */
export function hasReaderPreferences(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return false;
  const record = raw as Record<string, unknown>;
  return (
    (READER_FONT_SIZES as readonly unknown[]).includes(record.fontSize) ||
    (READER_LINE_HEIGHTS as readonly unknown[]).includes(record.lineHeight) ||
    (READER_FONTS as readonly unknown[]).includes(record.font) ||
    (READER_THEMES as readonly unknown[]).includes(record.theme)
  );
}

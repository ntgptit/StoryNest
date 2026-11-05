// Weekly update schedule (stories.update_days, Lucian 109): day names come from the platform's Intl in the reader's
// language, so the studio form and the story page say the same thing without a second word list.
import { WEEKDAYS, updateDaysToList, type Weekday } from "@storynest/validation";

// 2024-01-01 was a Monday: day i of the week is that date plus i days (UTC, so no time zone shifts the day).
const MONDAY = Date.UTC(2024, 0, 1, 12);

/** The seven day names, Monday first, e.g. ["Mon", ...] or ["Thứ Hai", ...]. */
export function weekdayNames(locale: string, style: "short" | "long"): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" });
  return WEEKDAYS.map((_, i) => format.format(new Date(MONDAY + i * 86_400_000)));
}

/** "Mon and Thu" / "T2 và T5"; "" when no day is set. */
export function updateDaysText(mask: number, locale: string, style: "short" | "long" = "long"): string {
  const names = weekdayNames(locale, style);
  const days = updateDaysToList(mask).map((day: Weekday) => names[WEEKDAYS.indexOf(day)] as string);
  if (days.length === 0) return "";
  return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(days);
}

/** The mask as seven flags (the painter's value) and back. */
export function maskToFlags(mask: number): boolean[] {
  return WEEKDAYS.map((_, i) => (mask & (1 << i)) !== 0);
}

export function flagsToMask(flags: readonly boolean[]): number {
  return flags.reduce((mask, on, i) => (on ? mask | (1 << i) : mask), 0);
}

const UNITS = [
  { value: 1_000_000_000, suffix: "B" },
  { value: 1_000_000, suffix: "M" },
  { value: 1_000, suffix: "K" },
] as const;

/** 950 -> "950", 1234 -> "1,2K" (vi) / "1.2K" (en), 1_000_000 -> "1M". Negative and non-finite values -> "0". */
export function formatCount(value: number, locale = "vi"): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const n = Math.floor(value);
  const decimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  for (const { value: unit, suffix } of UNITS) {
    if (n >= unit) {
      // Truncate (never round up across a unit boundary): 999_999 -> "999,9K", not "1000K".
      const scaled = Math.floor((n / unit) * 10) / 10;
      return `${decimal.format(scaled)}${suffix}`;
    }
  }
  return String(n);
}

/** First `maxLength` characters on a word boundary, whitespace collapsed, with an ellipsis when cut. */
export function excerpt(text: string, maxLength = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength + 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : clean.slice(0, maxLength);
  return `${base.replace(/[\s.,;:!?-]+$/u, "")}…`;
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 giờ trước" / "in 2 days". `now` is injectable so callers and tests control the clock. */
export function formatRelativeTime(
  date: Date | string | number,
  locale = "vi",
  now: Date | number = new Date(),
): string {
  const seconds = Math.round((new Date(date).getTime() - new Date(now).getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.trunc(seconds / size), unit);
  }
  return formatter.format(0, "second"); // "bây giờ" / "now"
}

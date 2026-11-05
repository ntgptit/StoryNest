import type { AnnouncementKind } from "@storynest/validation";

/** One announcement as the app uses it (public.announcements / active_announcements). */
export interface Announcement {
  id: string;
  kind: AnnouncementKind;
  title: string;
  body: string | null;
  href: string | null;
  /** null = every interface language. */
  locale: string | null;
  startsAt: string;
  endsAt: string;
}

export interface AnnouncementRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link_url: string | null;
  locale: string | null;
  starts_at: string;
  ends_at: string;
}

export const ANNOUNCEMENT_COLUMNS = "id, kind, title, body, link_url, locale, starts_at, ends_at";

/** Rows of an unknown kind (a newer server) are dropped rather than shown in the wrong place. */
export function toAnnouncements(rows: readonly AnnouncementRow[]): Announcement[] {
  return rows.flatMap((row) =>
    row.kind === "banner" || row.kind === "popup"
      ? [
          {
            id: row.id,
            kind: row.kind,
            title: row.title,
            body: row.body,
            href: row.link_url,
            locale: row.locale,
            startsAt: row.starts_at,
            endsAt: row.ends_at,
          },
        ]
      : [],
  );
}

export type AnnouncementState = "scheduled" | "active" | "ended";

export function announcementState(
  announcement: Pick<Announcement, "startsAt" | "endsAt">,
  now: Date,
): AnnouncementState {
  if (Date.parse(announcement.startsAt) > now.getTime()) return "scheduled";
  if (Date.parse(announcement.endsAt) <= now.getTime()) return "ended";
  return "active";
}

/** An internal path opens in the app; anything else (only https:// gets past the database) opens in a new tab. */
export const isInternalLink = (href: string): boolean => href.startsWith("/") && !href.startsWith("//");

// --- device choices: which banners were closed, and "don't show today" for the popup ---------------------------------
// Kept in this browser only (they say nothing about the account). Blocked storage simply means "nothing chosen".

export const BANNER_DISMISSED_KEY = "storynest.announcements.bannerClosed";
export const POPUP_SNOOZE_KEY = "storynest.announcements.popupSnoozed";

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // blocked storage: the choice lasts for this page only
  }
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** Banner ids the reader closed on this device. */
export function readClosedBanners(): string[] {
  const value = read(BANNER_DISMISSED_KEY);
  return isStringArray(value) ? value : [];
}

/** Remembers the closed ids, keeping only those still showing (so the list never grows without end). */
export function writeClosedBanners(closed: readonly string[], showing: readonly string[]): void {
  write(
    BANNER_DISMISSED_KEY,
    closed.filter((id) => showing.includes(id)),
  );
}

/** The local calendar day, e.g. "2026-11-05": "today" is the reader's own day, not the server's. */
export function localDay(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Whether "don't show today" covers these popups: it was chosen today, and every popup showing now was among those
 * the reader saw then (a new announcement later the same day still appears).
 */
export function isPopupSnoozed(ids: readonly string[], now: Date): boolean {
  const value = read(POPUP_SNOOZE_KEY);
  if (typeof value !== "object" || value === null) return false;
  const { day, ids: seen } = value as { day?: unknown; ids?: unknown };
  return day === localDay(now) && isStringArray(seen) && ids.every((id) => seen.includes(id));
}

export function snoozePopupToday(ids: readonly string[], now: Date): void {
  write(POPUP_SNOOZE_KEY, { day: localDay(now), ids });
}

/** datetime-local value (local time, minutes) for a Date, as the moderator's form shows it. */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${localDay(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Announcement form of the moderation console (banner line or home popup). Messages are stable codes translated by
// the UI. The rules mirror the CHECK constraints of public.announcements (20261106050000_announcements.sql).
import { z } from "zod";
import { announcementKindSchema } from "./enums.ts";
import { DB_LIMITS } from "./limits.ts";
import { STORY_LANGUAGES } from "./story.ts";

export const ANNOUNCEMENT_ERROR = {
  titleRequired: "title_required",
  titleTooLong: "title_too_long",
  bodyTooLong: "body_too_long",
  linkTooLong: "link_too_long",
  linkInvalid: "link_invalid",
  startInvalid: "start_invalid",
  endInvalid: "end_invalid",
  endBeforeStart: "end_before_start",
} as const;

/** Same rule as the database: an internal path ("/..." but not "//..." or "/\...") or an https:// address. */
export function isAllowedAnnouncementLink(link: string): boolean {
  return /^\/(?:[^/\\]|$)/.test(link) || /^https:\/\/\S+$/.test(link);
}

const instant = (code: string) =>
  z
    .string()
    .trim()
    .refine((value) => value !== "" && !Number.isNaN(Date.parse(value)), { message: code });

export const announcementFormSchema = z
  .strictObject({
    kind: announcementKindSchema,
    title: z
      .string()
      .trim()
      .min(1, { message: ANNOUNCEMENT_ERROR.titleRequired })
      .max(DB_LIMITS.announcementTitle, { message: ANNOUNCEMENT_ERROR.titleTooLong }),
    body: z.string().trim().max(DB_LIMITS.announcementBody, { message: ANNOUNCEMENT_ERROR.bodyTooLong }),
    link: z
      .string()
      .trim()
      .max(DB_LIMITS.announcementLink, { message: ANNOUNCEMENT_ERROR.linkTooLong })
      .refine((value) => value === "" || isAllowedAnnouncementLink(value), { message: ANNOUNCEMENT_ERROR.linkInvalid }),
    /** "" = every interface language. */
    locale: z.enum(["", ...STORY_LANGUAGES]),
    startsAt: instant(ANNOUNCEMENT_ERROR.startInvalid),
    endsAt: instant(ANNOUNCEMENT_ERROR.endInvalid),
  })
  .superRefine((form, ctx) => {
    const start = Date.parse(form.startsAt);
    const end = Date.parse(form.endsAt);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: ANNOUNCEMENT_ERROR.endBeforeStart });
    }
  });

export type AnnouncementForm = z.input<typeof announcementFormSchema>;

/** The row payload (`announcements` insert): empty optional fields become NULL, instants become ISO strings. */
export function toAnnouncementPayload(form: z.output<typeof announcementFormSchema>) {
  return {
    kind: form.kind,
    title: form.title,
    body: form.body === "" ? null : form.body,
    link_url: form.link === "" ? null : form.link,
    locale: form.locale === "" ? null : form.locale,
    starts_at: new Date(form.startsAt).toISOString(),
    ends_at: new Date(form.endsAt).toISOString(),
  };
}

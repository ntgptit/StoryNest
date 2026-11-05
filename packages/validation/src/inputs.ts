// Write payloads for the editor and social features, shaped like the DB columns (snake_case) so they can be
// sent to Supabase as-is. Identity columns (owner_id, author_id, reporter_id, user_id, ...) are NOT part of
// these schemas: the caller adds auth.uid(), and RLS rejects any other value.
import { z } from "zod";
import { chapterBodySchema } from "./chapter-body.ts";
import { visibilitySchema, storyStatusSchema } from "./enums.ts";
import { APP_LIMITS, DB_LIMITS } from "./limits.ts";
import { blurhashSchema, updateDaysSchema } from "./authoring.ts";

const uuid = z.uuid();
const nonBlank = (max: number) => z.string().trim().min(1).max(max);

/** Message code "username_invalid" for every rule, so one UI string covers them. */
export const usernameSchema = z
  .string()
  .min(DB_LIMITS.username.min, { message: "username_invalid" })
  .max(DB_LIMITS.username.max, { message: "username_invalid" })
  .regex(/^[A-Za-z0-9_]+$/, { message: "username_invalid" });

/** URL slug. Stricter than the DB (which only forbids blank): lowercase words joined by single hyphens. */
export const slugSchema = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase letters, digits and hyphens");

export const languageCodeSchema = z
  .string()
  .max(DB_LIMITS.languageCode)
  .regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/, "BCP 47 style, e.g. vi or en-US");

export const profileUpdateSchema = z.strictObject({
  username: usernameSchema.optional(),
  display_name: nonBlank(DB_LIMITS.displayName).optional(),
  bio: z.string().trim().max(APP_LIMITS.bio).nullable().optional(),
  avatar_storage_key: z.string().trim().min(1).max(APP_LIMITS.storageKey).nullable().optional(),
});

export const storyCreateSchema = z.strictObject({
  id: uuid.optional(), // client-generated for offline sync
  title: nonBlank(DB_LIMITS.storyTitle),
  slug: slugSchema(DB_LIMITS.storySlug),
  synopsis: z.string().trim().max(APP_LIMITS.synopsis).default(""),
  category_id: z.int().positive().nullable().optional(),
  language_code: languageCodeSchema.default("vi"),
  status: storyStatusSchema.default("draft"),
  visibility: visibilitySchema.default("private"),
  is_mature: z.boolean().default(false),
  cover_storage_key: z.string().trim().min(1).max(APP_LIMITS.storageKey).nullable().optional(),
  /** Weekly update schedule, a bit mask of ISO weekdays (Monday = bit 0). */
  update_days: updateDaysSchema.optional(),
  /** BlurHash of the cover, written together with cover_storage_key. */
  cover_blurhash: blurhashSchema.nullable().optional(),
});
export const storyUpdateSchema = storyCreateSchema.omit({ id: true }).partial();

export const chapterCreateSchema = z.strictObject({
  id: uuid.optional(),
  story_id: uuid,
  slug: slugSchema(DB_LIMITS.chapterSlug),
  sort_order: z.int().positive(),
});

/** Autosave payload for chapter_drafts. `revision` is bumped by the client on each save. */
export const chapterDraftSaveSchema = z.strictObject({
  chapter_id: uuid,
  title: nonBlank(DB_LIMITS.chapterTitle),
  body: chapterBodySchema,
  revision: z.int().positive(),
});

export const commentCreateSchema = z.strictObject({
  id: uuid.optional(),
  chapter_id: uuid,
  block_id: uuid.nullable().optional(),
  parent_comment_id: uuid.nullable().optional(),
  body: nonBlank(DB_LIMITS.commentBody),
});

export const readingListCreateSchema = z.strictObject({
  id: uuid.optional(),
  title: nonBlank(DB_LIMITS.readingListTitle),
  description: z.string().trim().max(APP_LIMITS.readingListDescription).default(""),
  visibility: visibilitySchema.default("private"),
});

/** Exactly one target, mirroring the DB check num_nonnulls(story_id, chapter_id, comment_id, reported_user_id) = 1. */
export const reportCreateSchema = z
  .strictObject({
    story_id: uuid.optional(),
    chapter_id: uuid.optional(),
    comment_id: uuid.optional(),
    reported_user_id: uuid.optional(),
    reason: nonBlank(DB_LIMITS.reportReason),
    description: z.string().trim().max(APP_LIMITS.reportDescription).optional(),
  })
  .refine(
    (r) => [r.story_id, r.chapter_id, r.comment_id, r.reported_user_id].filter((v) => v !== undefined).length === 1,
    { message: "report exactly one target", path: ["story_id"] },
  );

/** Payload of notifications.payload for event_type = 'chapter_published' (written by the outbox worker). */
export const chapterPublishedPayloadSchema = z.object({
  story_title: z.string(),
  story_slug: z.string(),
  chapter_title: z.string(),
  chapter_slug: z.string(),
  chapter_sort_order: z.int(),
});

export type ProfileUpdate = z.input<typeof profileUpdateSchema>;
export type StoryCreate = z.output<typeof storyCreateSchema>;
export type StoryUpdate = z.output<typeof storyUpdateSchema>;
export type ChapterCreate = z.output<typeof chapterCreateSchema>;
export type ChapterDraftSave = z.output<typeof chapterDraftSaveSchema>;
export type CommentCreate = z.output<typeof commentCreateSchema>;
export type ReadingListCreate = z.output<typeof readingListCreateSchema>;
export type ReportCreate = z.output<typeof reportCreateSchema>;
export type ChapterPublishedPayload = z.infer<typeof chapterPublishedPayloadSchema>;

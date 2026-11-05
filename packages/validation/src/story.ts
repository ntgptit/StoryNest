// Story create/edit form. Messages are stable codes (translated by the UI), like the other form schemas. The form
// holds plain strings (what inputs produce); `toStoryPayload` in features turns them into a storyCreateSchema payload,
// which is the contract actually sent to the database.
import { z } from "zod";
import { storyStatusSchema, visibilitySchema } from "./enums.ts";
import { APP_LIMITS, DB_LIMITS } from "./limits.ts";
import { updateDaysSchema } from "./authoring.ts";

export const STORY_ERROR = {
  titleRequired: "title_required",
  titleTooLong: "title_too_long",
  slugRequired: "slug_required",
  slugTooLong: "slug_too_long",
  slugInvalid: "slug_invalid",
  synopsisTooLong: "synopsis_too_long",
  languageInvalid: "language_invalid",
} as const;

/** Languages offered in the story form. The schema accepts any BCP 47 style code; this is just the choice list. */
export const STORY_LANGUAGES = ["vi", "en"] as const;
export type StoryLanguage = (typeof STORY_LANGUAGES)[number];
export const DEFAULT_STORY_LANGUAGE: StoryLanguage = "vi";

export const storyFormSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(1, { message: STORY_ERROR.titleRequired })
    .max(DB_LIMITS.storyTitle, { message: STORY_ERROR.titleTooLong }),
  slug: z
    .string()
    .trim()
    .min(1, { message: STORY_ERROR.slugRequired })
    .max(DB_LIMITS.storySlug, { message: STORY_ERROR.slugTooLong })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: STORY_ERROR.slugInvalid }),
  synopsis: z.string().trim().max(APP_LIMITS.synopsis, { message: STORY_ERROR.synopsisTooLong }),
  /** Category id as the select produces it: "" = none. */
  categoryId: z.string().regex(/^\d*$/),
  languageCode: z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/, { message: STORY_ERROR.languageInvalid }),
  status: storyStatusSchema,
  visibility: visibilitySchema,
  isMature: z.boolean(),
  /** Weekly update schedule (bit mask, Monday = bit 0). Left out = unchanged on update. */
  updateDays: updateDaysSchema.optional(),
});

export type StoryFormInput = z.input<typeof storyFormSchema>;
export type StoryForm = z.output<typeof storyFormSchema>;

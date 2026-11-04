// Chapter create/rename forms. Messages are stable codes (translated by the UI), like the other form schemas.
import { z } from "zod";
import { DB_LIMITS } from "./limits.ts";

export const CHAPTER_ERROR = {
  titleRequired: "chapter_title_required",
  titleTooLong: "chapter_title_too_long",
  slugRequired: "chapter_slug_required",
  slugTooLong: "chapter_slug_too_long",
  slugInvalid: "chapter_slug_invalid",
} as const;

const slugField = z
  .string()
  .trim()
  .min(1, { message: CHAPTER_ERROR.slugRequired })
  .max(DB_LIMITS.chapterSlug, { message: CHAPTER_ERROR.slugTooLong })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: CHAPTER_ERROR.slugInvalid });

export const chapterFormSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(1, { message: CHAPTER_ERROR.titleRequired })
    .max(DB_LIMITS.chapterTitle, { message: CHAPTER_ERROR.titleTooLong }),
  slug: slugField,
});

export const chapterSlugFormSchema = z.strictObject({ slug: slugField });

export type ChapterForm = z.output<typeof chapterFormSchema>;
export type ChapterSlugForm = z.output<typeof chapterSlugFormSchema>;

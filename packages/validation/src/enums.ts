// Values mirror the CHECK constraints in supabase/migrations. enums.test.ts compares them with the
// snapshot generated from the real schema (db-contract.generated.json), so a migration that changes
// an enum fails the tests until this file is updated.
import { z } from "zod";

export const ACCOUNT_STATUSES = ["active", "suspended", "deactivated"] as const;
export const STORY_STATUSES = ["draft", "ongoing", "completed", "hiatus"] as const;
export const VISIBILITIES = ["private", "unlisted", "public"] as const;
export const CHAPTER_STATUSES = ["draft", "scheduled", "published", "archived"] as const;
export const BLOCK_TYPES = ["paragraph", "heading", "image", "divider"] as const;
export const COLLABORATOR_ROLES = ["co_author", "editor"] as const;
export const COMMENT_STATUSES = ["visible", "hidden", "deleted"] as const;
export const REPORT_STATUSES = ["pending", "reviewing", "resolved", "dismissed"] as const;

export const accountStatusSchema = z.enum(ACCOUNT_STATUSES);
export const storyStatusSchema = z.enum(STORY_STATUSES);
export const visibilitySchema = z.enum(VISIBILITIES);
export const chapterStatusSchema = z.enum(CHAPTER_STATUSES);
export const blockTypeSchema = z.enum(BLOCK_TYPES);
export const collaboratorRoleSchema = z.enum(COLLABORATOR_ROLES);
export const commentStatusSchema = z.enum(COMMENT_STATUSES);
export const reportStatusSchema = z.enum(REPORT_STATUSES);

export type StoryStatus = z.infer<typeof storyStatusSchema>;
export type Visibility = z.infer<typeof visibilitySchema>;
export type ChapterStatus = z.infer<typeof chapterStatusSchema>;
export type BlockType = z.infer<typeof blockTypeSchema>;

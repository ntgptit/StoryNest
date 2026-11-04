// Zod schemas of the enums. The values, constants and types are in enum-values.ts (zod-free) and re-exported here.
import { z } from "zod";

import {
  ACCOUNT_STATUSES,
  STORY_STATUSES,
  VISIBILITIES,
  CHAPTER_STATUSES,
  BLOCK_TYPES,
  COLLABORATOR_ROLES,
  INVITATION_STATUSES,
  COMMENT_STATUSES,
  REPORT_REASONS,
  MODERATION_ACTIONS,
  MODERATION_TARGET_KINDS,
  HIDE_SOURCES,
  REPORT_STATUSES,
} from "./enum-values.ts";

export * from "./enum-values.ts";

export const accountStatusSchema = z.enum(ACCOUNT_STATUSES);
export const storyStatusSchema = z.enum(STORY_STATUSES);
export const visibilitySchema = z.enum(VISIBILITIES);
export const chapterStatusSchema = z.enum(CHAPTER_STATUSES);
export const blockTypeSchema = z.enum(BLOCK_TYPES);
export const collaboratorRoleSchema = z.enum(COLLABORATOR_ROLES);
export const invitationStatusSchema = z.enum(INVITATION_STATUSES);
export const commentStatusSchema = z.enum(COMMENT_STATUSES);
export const hideSourceSchema = z.enum(HIDE_SOURCES);
export const reportReasonSchema = z.enum(REPORT_REASONS);
export const moderationActionSchema = z.enum(MODERATION_ACTIONS);
export const moderationTargetKindSchema = z.enum(MODERATION_TARGET_KINDS);
export const reportStatusSchema = z.enum(REPORT_STATUSES);

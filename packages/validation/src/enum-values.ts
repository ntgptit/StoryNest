// Values mirror the CHECK constraints in supabase/migrations. enums.test.ts compares them with the
// snapshot generated from the real schema (db-contract.generated.json), so a migration that changes
// an enum fails the tests until this file is updated.
// No zod here on purpose: these values and constants are imported by code that runs on every page (queries, error
// mapping), and importing zod there would put it in every route's bundle. The schemas live in enums.ts.

export const ACCOUNT_STATUSES = ["active", "suspended", "deactivated"] as const;
export const STORY_STATUSES = ["draft", "ongoing", "completed", "hiatus"] as const;
export const VISIBILITIES = ["private", "unlisted", "public"] as const;
export const CHAPTER_STATUSES = ["draft", "scheduled", "published", "archived"] as const;
export const BLOCK_TYPES = ["paragraph", "heading", "image", "divider"] as const;
export const COLLABORATOR_ROLES = ["co_author", "editor"] as const;
export const INVITATION_STATUSES = ["pending", "accepted", "declined", "cancelled"] as const;
export const COMMENT_STATUSES = ["visible", "hidden", "deleted"] as const;
export const REPORT_REASONS = ["spam", "harassment", "hate", "sexual", "violence", "copyright", "other"] as const;
export const MODERATION_ACTIONS = [
  "hide_comment",
  "restore_comment",
  "remove_story",
  "restore_story",
  "suspend_user",
  "reinstate_user",
  "review_report",
  "resolve_report",
  "dismiss_report",
] as const;
export const MODERATION_TARGET_KINDS = ["comment", "story", "user", "report"] as const;
export const HIDE_SOURCES = ["author", "moderator"] as const;
export const REPORT_STATUSES = ["pending", "reviewing", "resolved", "dismissed"] as const;

export type StoryStatus = (typeof STORY_STATUSES)[number];
export type Visibility = (typeof VISIBILITIES)[number];
export type ChapterStatus = (typeof CHAPTER_STATUSES)[number];
export type BlockType = (typeof BLOCK_TYPES)[number];
export type CollaboratorRole = (typeof COLLABORATOR_ROLES)[number];
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];
export type CommentStatus = (typeof COMMENT_STATUSES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];
export type ModerationTargetKind = (typeof MODERATION_TARGET_KINDS)[number];
export type HideSource = (typeof HIDE_SOURCES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// Named constants for the values code compares or filters on, so no query or condition spells a literal like
// "published". `satisfies` makes the compiler reject a value that is not in the enum; validation.test.ts checks
// that every enum value has a constant. Add one here when code needs a new value.
export const STORY_STATUS = {
  DRAFT: "draft",
  ONGOING: "ongoing",
  COMPLETED: "completed",
  HIATUS: "hiatus",
} as const satisfies Record<string, StoryStatus>;
export const VISIBILITY = { PRIVATE: "private", UNLISTED: "unlisted", PUBLIC: "public" } as const satisfies Record<
  string,
  Visibility
>;
export const CHAPTER_STATUS = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const satisfies Record<string, ChapterStatus>;
export const BLOCK_TYPE = {
  PARAGRAPH: "paragraph",
  HEADING: "heading",
  IMAGE: "image",
  DIVIDER: "divider",
} as const satisfies Record<string, BlockType>;

export const INVITATION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  CANCELLED: "cancelled",
} as const satisfies Record<string, InvitationStatus>;

export const COMMENT_STATUS = { VISIBLE: "visible", HIDDEN: "hidden", DELETED: "deleted" } as const satisfies Record<
  string,
  CommentStatus
>;

export const REPORT_STATUS = {
  PENDING: "pending",
  REVIEWING: "reviewing",
  RESOLVED: "resolved",
  DISMISSED: "dismissed",
} as const satisfies Record<string, ReportStatus>;
export const REPORT_REASON = {
  SPAM: "spam",
  HARASSMENT: "harassment",
  HATE: "hate",
  SEXUAL: "sexual",
  VIOLENCE: "violence",
  COPYRIGHT: "copyright",
  OTHER: "other",
} as const satisfies Record<string, ReportReason>;
export const MODERATION_ACTION = {
  HIDE_COMMENT: "hide_comment",
  RESTORE_COMMENT: "restore_comment",
  REMOVE_STORY: "remove_story",
  RESTORE_STORY: "restore_story",
  SUSPEND_USER: "suspend_user",
  REINSTATE_USER: "reinstate_user",
  REVIEW_REPORT: "review_report",
  RESOLVE_REPORT: "resolve_report",
  DISMISS_REPORT: "dismiss_report",
} as const satisfies Record<string, ModerationAction>;
export const MODERATION_TARGET_KIND = {
  COMMENT: "comment",
  STORY: "story",
  USER: "user",
  REPORT: "report",
} as const satisfies Record<string, ModerationTargetKind>;

/** Who hid a comment: the story's author (can show it again) or a moderator (cannot be undone by the author). */
export const HIDE_SOURCE = { AUTHOR: "author", MODERATOR: "moderator" } as const satisfies Record<string, HideSource>;

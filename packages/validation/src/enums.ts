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
/** announcements.kind: a line in the rolling banner of every page, or a card in the home page popup. */
export const ANNOUNCEMENT_KINDS = ["banner", "popup"] as const;
/**
 * notification_preferences.event_type: the notification types a reader may switch off one by one (in-app only).
 * collaboration_invited is deliberately absent: an invitation addressed to the reader is always delivered.
 */
export const NOTIFICATION_PREFERENCE_TYPES = [
  "chapter_published",
  "comment_replied",
  "collaboration_accepted",
  "collaboration_declined",
] as const;
/** Emoji reactions on a comment (comment_reactions.reaction). The like is separate (comment_likes) and not one of them. */
export const COMMENT_REACTIONS = ["thumbs_up", "laugh", "wow", "sad", "fire", "clap"] as const;
/** Pen styles of a personal highlight (chapter_highlights.style). */
export const HIGHLIGHT_STYLES = ["underline", "circle", "box", "strike"] as const;
export const REVIEW_STATUSES = ["pending", "approved", "changes_requested"] as const;

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
export const announcementKindSchema = z.enum(ANNOUNCEMENT_KINDS);
export const notificationPreferenceTypeSchema = z.enum(NOTIFICATION_PREFERENCE_TYPES);
export const commentReactionSchema = z.enum(COMMENT_REACTIONS);
export const highlightStyleSchema = z.enum(HIGHLIGHT_STYLES);
export const reviewStatusSchema = z.enum(REVIEW_STATUSES);

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

export type ReportReason = z.infer<typeof reportReasonSchema>;
export type ModerationAction = z.infer<typeof moderationActionSchema>;
export type ModerationTargetKind = z.infer<typeof moderationTargetKindSchema>;
/** Who hid a comment: the story's author (can show it again) or a moderator (cannot be undone by the author). */
export const HIDE_SOURCE = { AUTHOR: "author", MODERATOR: "moderator" } as const satisfies Record<string, HideSource>;

export type HideSource = z.infer<typeof hideSourceSchema>;
export type AnnouncementKind = z.infer<typeof announcementKindSchema>;
export type NotificationPreferenceType = z.infer<typeof notificationPreferenceTypeSchema>;
export const ANNOUNCEMENT_KIND = { BANNER: "banner", POPUP: "popup" } as const satisfies Record<
  string,
  AnnouncementKind
>;
export const COMMENT_REACTION = {
  THUMBS_UP: "thumbs_up",
  LAUGH: "laugh",
  WOW: "wow",
  SAD: "sad",
  FIRE: "fire",
  CLAP: "clap",
} as const satisfies Record<string, CommentReaction>;
export const HIGHLIGHT_STYLE = {
  UNDERLINE: "underline",
  CIRCLE: "circle",
  BOX: "box",
  STRIKE: "strike",
} as const satisfies Record<string, HighlightStyle>;
export type CommentReaction = z.infer<typeof commentReactionSchema>;
export type HighlightStyle = z.infer<typeof highlightStyleSchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
/** State of a chapter review sign-off (chapter_reviews.status). */
export const REVIEW_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  CHANGES_REQUESTED: "changes_requested",
} as const satisfies Record<string, ReviewStatus>;
export type CommentStatus = z.infer<typeof commentStatusSchema>;
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
export type CollaboratorRole = z.infer<typeof collaboratorRoleSchema>;
export type StoryStatus = z.infer<typeof storyStatusSchema>;
export type Visibility = z.infer<typeof visibilitySchema>;
export type ChapterStatus = z.infer<typeof chapterStatusSchema>;
export type BlockType = z.infer<typeof blockTypeSchema>;

/** Periods of the rankings and of their daily snapshots (ranking_snapshots.period, top_stories, ranking_history). */
export const RANKING_PERIODS = ["day", "week", "month", "all"] as const;
export const rankingPeriodSchema = z.enum(RANKING_PERIODS);
export type RankingPeriod = z.infer<typeof rankingPeriodSchema>;

/**
 * The in-app surface a read came from (chapter_read_events.source, record_chapter_read's p_source). Coarse on purpose:
 * which StoryNest screen the reader opened the story from, never a referrer or another site.
 */
export const READ_SOURCES = [
  "story_page",
  "next_chapter",
  "library",
  "search",
  "discover",
  "ranking",
  "notification",
  "profile",
  "other",
] as const;
export const readSourceSchema = z.enum(READ_SOURCES);
export type ReadSource = z.infer<typeof readSourceSchema>;

import type { AppError } from "../../_shared/errors.ts";
import { blockAnchor, COMMENTS_ANCHOR } from "../../reader/index.ts";
import { notificationText } from "../strings.ts";

/** The event types the server writes today (outbox worker and the collaboration functions). */
export const NOTIFICATION_TYPE = {
  CHAPTER_PUBLISHED: "chapter_published",
  COMMENT_REPLIED: "comment_replied",
  COMMENT_MENTIONED: "comment_mentioned",
  COLLABORATION_INVITED: "collaboration_invited",
  COLLABORATION_ACCEPTED: "collaboration_accepted",
  COLLABORATION_DECLINED: "collaboration_declined",
  CHAPTER_REVIEW_REQUESTED: "chapter_review_requested",
  CHAPTER_REVIEW_APPROVED: "chapter_review_approved",
  CHAPTER_REVIEW_CHANGES_REQUESTED: "chapter_review_changes_requested",
} as const;

export interface NotificationRow {
  id: string;
  event_type: string;
  story_id: string | null;
  chapter_id: string | null;
  payload: unknown;
  read_at: string | null;
  created_at: string;
  actor: { username: string; display_name: string } | { username: string; display_name: string }[] | null;
}

export interface AppNotification {
  id: string;
  type: string;
  storyId: string | null;
  chapterId: string | null;
  read: boolean;
  /** The server's timestamp text: it is also the paging cursor, so it keeps its microseconds. */
  createdAt: string;
  actorName: string | null;
  payload: Record<string, unknown>;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export function toNotification(row: NotificationRow): AppNotification {
  const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
  const name = actor ? (actor.display_name.trim() === "" ? actor.username : actor.display_name) : null;
  return {
    id: row.id,
    type: row.event_type,
    storyId: row.story_id,
    chapterId: row.chapter_id,
    read: row.read_at !== null,
    createdAt: row.created_at,
    actorName: name,
    payload: asRecord(row.payload),
  };
}

const text = (payload: Record<string, unknown>, key: string): string | null => {
  const value = payload[key];
  return typeof value === "string" && value !== "" ? value : null;
};
const number = (payload: Record<string, unknown>, key: string): number | null => {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

export interface NotificationView {
  text: string;
  /** Where a click goes; null when the type is unknown or the data to build the link is missing. */
  href: string | null;
}

/**
 * What a notification says and where it leads. A type this version does not know (a later one will add more) still
 * shows a neutral line instead of breaking the list; one missing the fields a link needs has text but no link.
 */
export function describeNotification(n: AppNotification): NotificationView {
  const t = notificationText.text;
  const storyTitle = text(n.payload, "story_title") ?? "";
  const actor = n.actorName ?? notificationText.someone;

  switch (n.type) {
    case NOTIFICATION_TYPE.CHAPTER_PUBLISHED: {
      const storySlug = text(n.payload, "story_slug");
      const chapterSlug = text(n.payload, "chapter_slug");
      return {
        text: t.chapterPublished(
          storyTitle,
          number(n.payload, "chapter_sort_order") ?? 0,
          text(n.payload, "chapter_title") ?? "",
        ),
        href: n.storyId && storySlug && chapterSlug ? `/story/${n.storyId}/${storySlug}/${chapterSlug}` : null,
      };
    }
    case NOTIFICATION_TYPE.COMMENT_REPLIED:
    case NOTIFICATION_TYPE.COMMENT_MENTIONED: {
      const storySlug = text(n.payload, "story_slug");
      const chapterSlug = text(n.payload, "chapter_slug");
      const blockId = text(n.payload, "block_id");
      // A paragraph's thread opens from the paragraph; a chapter's comments are at the end of the chapter.
      const target = blockId ? blockAnchor(blockId) : COMMENTS_ANCHOR;
      return {
        text: (n.type === NOTIFICATION_TYPE.COMMENT_MENTIONED ? t.commentMentioned : t.commentReplied)(
          actor,
          text(n.payload, "excerpt") ?? "",
        ),
        href:
          n.storyId && storySlug && chapterSlug ? `/story/${n.storyId}/${storySlug}/${chapterSlug}#${target}` : null,
      };
    }
    case NOTIFICATION_TYPE.COLLABORATION_INVITED:
      return { text: t.collaborationInvited(actor, storyTitle), href: "/studio" };
    case NOTIFICATION_TYPE.COLLABORATION_ACCEPTED:
      return {
        text: t.collaborationAccepted(actor, storyTitle),
        href: n.storyId ? `/studio/story/${n.storyId}/team` : null,
      };
    case NOTIFICATION_TYPE.COLLABORATION_DECLINED:
      return {
        text: t.collaborationDeclined(actor, storyTitle),
        href: n.storyId ? `/studio/story/${n.storyId}/team` : null,
      };
    case NOTIFICATION_TYPE.CHAPTER_REVIEW_REQUESTED:
    case NOTIFICATION_TYPE.CHAPTER_REVIEW_APPROVED:
    case NOTIFICATION_TYPE.CHAPTER_REVIEW_CHANGES_REQUESTED: {
      // The sign-off lives in the chapter editor (Lucian 180); the link opens it.
      const chapterTitle = text(n.payload, "chapter_title") ?? "";
      const href = n.storyId && n.chapterId ? `/studio/story/${n.storyId}/chapter/${n.chapterId}` : null;
      if (n.type === NOTIFICATION_TYPE.CHAPTER_REVIEW_REQUESTED)
        return { text: t.reviewRequested(actor, chapterTitle, storyTitle), href };
      if (n.type === NOTIFICATION_TYPE.CHAPTER_REVIEW_APPROVED)
        return { text: t.reviewApproved(actor, chapterTitle), href };
      return { text: t.reviewChangesRequested(actor, chapterTitle), href };
    }
    default:
      return { text: notificationText.generic, href: null };
  }
}

/** The kinds the notifications page can be narrowed to; "all" keeps every row, unknown types included. */
export const NOTIFICATION_FILTER = { ALL: "all", CHAPTERS: "chapters", REPLIES: "replies", TEAM: "team" } as const;
export type NotificationFilter = (typeof NOTIFICATION_FILTER)[keyof typeof NOTIFICATION_FILTER];
export const NOTIFICATION_FILTERS: readonly NotificationFilter[] = Object.values(NOTIFICATION_FILTER);

/** Which filter chip a type belongs to; null for a type this version does not know (it shows under "all" only). */
export function notificationGroup(type: string): Exclude<NotificationFilter, "all"> | null {
  switch (type) {
    case NOTIFICATION_TYPE.CHAPTER_PUBLISHED:
      return NOTIFICATION_FILTER.CHAPTERS;
    case NOTIFICATION_TYPE.COMMENT_REPLIED:
    case NOTIFICATION_TYPE.COMMENT_MENTIONED:
      return NOTIFICATION_FILTER.REPLIES;
    case NOTIFICATION_TYPE.COLLABORATION_INVITED:
    case NOTIFICATION_TYPE.COLLABORATION_ACCEPTED:
    case NOTIFICATION_TYPE.COLLABORATION_DECLINED:
      return NOTIFICATION_FILTER.TEAM;
    default:
      return null;
  }
}

const matches = (n: AppNotification, filter: NotificationFilter, unreadOnly: boolean) =>
  (!unreadOnly || !n.read) && (filter === NOTIFICATION_FILTER.ALL || notificationGroup(n.type) === filter);

/**
 * The loaded notifications narrowed to one kind and, if asked, to the unread ones. It works on the pages already
 * loaded (newest first, order kept): "load more" still pages through every notification.
 */
export function filterNotifications(
  items: readonly AppNotification[],
  filter: NotificationFilter,
  unreadOnly: boolean,
): AppNotification[] {
  return items.filter((n) => matches(n, filter, unreadOnly));
}

/** How many loaded notifications each chip would keep, with the unread toggle as it stands. */
export function countByFilter(
  items: readonly AppNotification[],
  unreadOnly: boolean,
): Record<NotificationFilter, number> {
  const counts = { all: 0, chapters: 0, replies: 0, team: 0 } satisfies Record<NotificationFilter, number>;
  for (const n of items) {
    if (unreadOnly && n.read) continue;
    counts.all += 1;
    const group = notificationGroup(n.type);
    if (group !== null) counts[group] += 1;
  }
  return counts;
}

export const NOTIFICATIONS_PAGE_SIZE = 20;

export interface NotificationPage {
  items: AppNotification[];
  hasMore: boolean;
}

export interface NotificationCursor {
  createdAt: string;
  id: string;
}

/** The server was asked for one row more than a page: that extra row only says that another page exists. */
export function toPage(rows: readonly NotificationRow[], pageSize = NOTIFICATIONS_PAGE_SIZE): NotificationPage {
  return { items: rows.slice(0, pageSize).map(toNotification), hasMore: rows.length > pageSize };
}

export function cursorAfter(page: NotificationPage): NotificationCursor | undefined {
  const last = page.items.at(-1);
  return page.hasMore && last ? { createdAt: last.createdAt, id: last.id } : undefined;
}

/** "9+" past nine, so the badge stays small. */
export function badgeText(count: number): string {
  return count > 9 ? "9+" : String(count);
}

export function notificationErrorMessage(error: AppError): string {
  return error.kind === "network" ? notificationText.errors.network : notificationText.errors.generic;
}

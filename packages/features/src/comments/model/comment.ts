import { COMMENT_STATUS, DB_LIMITS, HIDE_SOURCE, type CommentStatus, type HideSource } from "@storynest/validation";
import type { AppError } from "../../_shared/errors.ts";
import { commentText } from "../strings.ts";

/** One row of the comment RPCs (every field is nullable in the generated type). */
export interface CommentCardRow {
  id: string | null;
  chapter_id: string | null;
  block_id: string | null;
  parent_comment_id: string | null;
  author_id: string | null;
  author_username: string | null;
  author_display_name: string | null;
  author_avatar_key: string | null;
  body: string | null;
  status: string | null;
  created_at: string | null;
  edited: boolean | null;
  like_count: number | null;
  liked_by_me: boolean | null;
  reply_count: number | null;
}

export interface Comment {
  id: string;
  chapterId: string;
  blockId: string | null;
  parentId: string | null;
  authorId: string | null;
  authorName: string | null;
  authorUsername: string | null;
  body: string | null;
  /** `deleted` also stands for a placeholder: the thread keeps its place, the text and the person are gone. */
  status: CommentStatus;
  /** Who hid a `hidden` comment: the story's author (can show it again) or a moderator (cannot be undone here). */
  hiddenBy: HideSource | null;
  /** Kept as the server's text: it is the paging cursor and must not lose its microseconds. */
  createdAt: string;
  edited: boolean;
  likes: number;
  likedByMe: boolean;
  replyCount: number;
}

/** The card status for a comment the story's author hid. The table only knows `hidden`; the card says who did it. */
export const AUTHOR_HIDDEN_CARD_STATUS = "author_hidden";

const STATUSES: readonly string[] = Object.values(COMMENT_STATUS);
const isStatus = (value: string): value is CommentStatus => STATUSES.includes(value);

function readStatus(value: string): { status: CommentStatus; hiddenBy: HideSource | null } | null {
  if (value === AUTHOR_HIDDEN_CARD_STATUS) return { status: COMMENT_STATUS.HIDDEN, hiddenBy: HIDE_SOURCE.AUTHOR };
  if (!isStatus(value)) return null;
  return { status: value, hiddenBy: value === COMMENT_STATUS.HIDDEN ? HIDE_SOURCE.MODERATOR : null };
}

/** A row without the fields a card needs is dropped rather than drawn half-empty. */
export function toComment(row: CommentCardRow): Comment | null {
  if (!row.id || !row.chapter_id || !row.created_at || !row.status) return null;
  const state = readStatus(row.status);
  if (!state) return null;
  const username = row.author_username;
  const display = row.author_display_name?.trim();
  return {
    id: row.id,
    chapterId: row.chapter_id,
    blockId: row.block_id,
    parentId: row.parent_comment_id,
    authorId: row.author_id,
    authorName: display ? display : username,
    authorUsername: username,
    body: row.body,
    status: state.status,
    hiddenBy: state.hiddenBy,
    createdAt: row.created_at,
    edited: row.edited === true,
    likes: Number(row.like_count ?? 0),
    likedByMe: row.liked_by_me === true,
    replyCount: Number(row.reply_count ?? 0),
  };
}

export const COMMENTS_PAGE_SIZE = 20;

export interface CommentPage {
  items: Comment[];
  hasMore: boolean;
}

/** The server was asked for one row more than a page: that extra row only says that another page exists. */
export function toPage(rows: readonly CommentCardRow[], pageSize = COMMENTS_PAGE_SIZE): CommentPage {
  const items = rows.slice(0, pageSize).flatMap((row) => toComment(row) ?? []);
  return { items, hasMore: rows.length > pageSize };
}

export interface CommentCursor {
  createdAt: string;
  id: string;
}

export function cursorAfter(page: CommentPage): CommentCursor | undefined {
  const last = page.items.at(-1);
  return page.hasMore && last ? { createdAt: last.createdAt, id: last.id } : undefined;
}

/** The like shown at once while the server is still answering (never below zero, unchanged if already so). */
export function withLike(comment: Comment, liked: boolean): Comment {
  if (comment.likedByMe === liked) return comment;
  return { ...comment, likedByMe: liked, likes: Math.max(0, comment.likes + (liked ? 1 : -1)) };
}

export function isPlaceholder(comment: Comment): boolean {
  return comment.status === COMMENT_STATUS.DELETED;
}

export type BodyProblem = "empty" | "tooLong";

export function checkBody(text: string): BodyProblem | null {
  const trimmed = text.trim();
  if (trimmed === "") return "empty";
  return trimmed.length > DB_LIMITS.commentBody ? "tooLong" : null;
}

export function bodyProblemMessage(problem: BodyProblem): string {
  return problem === "empty" ? commentText.validation.empty : commentText.validation.tooLong;
}

/** What the server says (as the hint of a refused write) when it turns a comment away as spam. */
export const SPAM_HINT = "spam";

export function commentErrorMessage(error: AppError): string {
  if (error.kind === "invalid" && error.details === SPAM_HINT) return commentText.errors.spam;
  switch (error.kind) {
    case "rateLimited":
      return commentText.errors.rateLimited;
    case "forbidden":
      return commentText.errors.forbidden;
    case "notFound":
      return commentText.errors.notFound;
    case "conflict":
      return commentText.errors.conflict;
    case "invalid":
      return commentText.errors.invalid;
    case "network":
      return commentText.errors.network;
    default:
      return commentText.errors.generic;
  }
}

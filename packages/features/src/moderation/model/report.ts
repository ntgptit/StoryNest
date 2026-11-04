import {
  MODERATION_ACTION,
  REPORT_REASONS,
  REPORT_STATUS,
  REPORT_STATUSES,
  type ModerationAction,
  type ReportReason,
  type ReportStatus,
} from "@storynest/validation";
import type { AppError } from "../../_shared/errors.ts";
import { authorHref } from "../../author/index.ts";
import { chapterHref, storyHref } from "../../story/index.ts";
import { moderationText } from "../strings.ts";

/** What can be reported. The same words are the first argument of the `submit_report` function. */
export const REPORT_TARGET = { STORY: "story", CHAPTER: "chapter", COMMENT: "comment", USER: "user" } as const;
export type ReportTarget = (typeof REPORT_TARGET)[keyof typeof REPORT_TARGET];

/** The states a target can be in, as the queue reports them. */
export const TARGET_STATE = {
  VISIBLE: "visible",
  HIDDEN: "hidden",
  REMOVED: "removed",
  ACTIVE: "active",
  SUSPENDED: "suspended",
} as const;

export const QUEUE_FILTER = { OPEN: "open", CLOSED: "closed" } as const;
export type QueueFilter = (typeof QUEUE_FILTER)[keyof typeof QUEUE_FILTER];

export const REASON_MIN_LENGTH = 3;
export const REASON_MAX_LENGTH = 1000;
export const REPORT_DETAILS_MAX_LENGTH = 2000;
export const QUEUE_PAGE_SIZE = 20;

/** One row of `list_reports` (every field is nullable in the generated type). */
export interface ReportRow {
  id: string | null;
  status: string | null;
  reason: string | null;
  description: string | null;
  created_at: string | null;
  reporter_name: string | null;
  target_kind: string | null;
  target_id: string | null;
  target_title: string | null;
  target_state: string | null;
  story_id: string | null;
  story_slug: string | null;
  chapter_slug: string | null;
  username: string | null;
  open_reports: number | null;
  reviewed_at: string | null;
}

export interface ModerationReport {
  id: string;
  status: ReportStatus;
  reason: string;
  description: string | null;
  /** The server's timestamp text: it is also the paging cursor, so it keeps its microseconds. */
  createdAt: string;
  reporterName: string;
  target: ReportTarget;
  targetId: string;
  title: string;
  state: string;
  storyId: string | null;
  storySlug: string | null;
  chapterSlug: string | null;
  username: string | null;
  openReports: number;
}

const TARGETS: readonly string[] = Object.values(REPORT_TARGET);
const isTarget = (value: string): value is ReportTarget => TARGETS.includes(value);
const isStatus = (value: string): value is ReportStatus => (REPORT_STATUSES as readonly string[]).includes(value);

/** A row without what a card needs is dropped rather than drawn half-empty. */
export function toReport(row: ReportRow): ModerationReport | null {
  if (!row.id || !row.created_at || !row.target_id || !row.target_kind || !row.status || !row.target_state) return null;
  if (!isTarget(row.target_kind) || !isStatus(row.status)) return null;
  return {
    id: row.id,
    status: row.status,
    reason: row.reason ?? "",
    description: row.description,
    createdAt: row.created_at,
    reporterName: row.reporter_name ?? "",
    target: row.target_kind,
    targetId: row.target_id,
    title: row.target_title ?? "",
    state: row.target_state,
    storyId: row.story_id,
    storySlug: row.story_slug,
    chapterSlug: row.chapter_slug,
    username: row.username,
    openReports: Number(row.open_reports ?? 0),
  };
}

export interface ReportPage {
  items: ModerationReport[];
  hasMore: boolean;
}

/** The server was asked for one row more than a page: that extra row only says that another page exists. */
export function toReportPage(rows: readonly ReportRow[], pageSize = QUEUE_PAGE_SIZE): ReportPage {
  return { items: rows.slice(0, pageSize).flatMap((row) => toReport(row) ?? []), hasMore: rows.length > pageSize };
}

export function reportCursorAfter(page: ReportPage): { createdAt: string; id: string } | undefined {
  const last = page.items.at(-1);
  return page.hasMore && last ? { createdAt: last.createdAt, id: last.id } : undefined;
}

export const isOpen = (report: ModerationReport) =>
  report.status === REPORT_STATUS.PENDING || report.status === REPORT_STATUS.REVIEWING;

/** Where a moderator can look at the reported thing, or null when there is nowhere to go. */
export function reportTargetHref(report: ModerationReport): string | null {
  if (report.target === REPORT_TARGET.USER) return report.username ? authorHref(report.username) : null;
  if (!report.storyId || !report.storySlug) return null;
  const story = { id: report.storyId, slug: report.storySlug };
  if (report.target === REPORT_TARGET.STORY || !report.chapterSlug) return storyHref(story);
  return chapterHref(story, { slug: report.chapterSlug });
}

/** What the moderator can do to the reported thing from where it stands now. A chapter is acted on through its story. */
export function contentActions(report: ModerationReport): ModerationAction[] {
  const { state } = report;
  switch (report.target) {
    case REPORT_TARGET.COMMENT:
      if (state === TARGET_STATE.VISIBLE) return [MODERATION_ACTION.HIDE_COMMENT];
      if (state === TARGET_STATE.HIDDEN) return [MODERATION_ACTION.RESTORE_COMMENT];
      return [];
    case REPORT_TARGET.USER:
      if (state === TARGET_STATE.ACTIVE) return [MODERATION_ACTION.SUSPEND_USER];
      if (state === TARGET_STATE.SUSPENDED) return [MODERATION_ACTION.REINSTATE_USER];
      return [];
    default:
      if (state === TARGET_STATE.VISIBLE) return [MODERATION_ACTION.REMOVE_STORY];
      if (state === TARGET_STATE.REMOVED) return [MODERATION_ACTION.RESTORE_STORY];
      return [];
  }
}

/** The id an action is sent for: a reported chapter is removed or restored as its story. */
export function actionTargetId(report: ModerationReport): string {
  return report.target === REPORT_TARGET.CHAPTER && report.storyId ? report.storyId : report.targetId;
}

export type ReasonProblem = "tooShort" | "tooLong";

export function checkReason(text: string): ReasonProblem | null {
  const length = text.trim().length;
  if (length < REASON_MIN_LENGTH) return "tooShort";
  return length > REASON_MAX_LENGTH ? "tooLong" : null;
}

const REASONS: readonly string[] = REPORT_REASONS;
export const isReportReason = (value: string): value is ReportReason => REASONS.includes(value);

export function reportErrorMessage(error: AppError): string {
  const t = moderationText.report.errors;
  switch (error.kind) {
    case "forbidden":
    case "unauthenticated":
      return t.forbidden;
    case "notFound":
      return t.notFound;
    case "conflict":
      return t.conflict;
    case "invalid":
      return t.invalid;
    case "rateLimited":
      return t.rateLimited;
    case "network":
      return t.network;
    default:
      return t.generic;
  }
}

export function actionErrorMessage(error: AppError): string {
  const t = moderationText.console.errors;
  switch (error.kind) {
    case "forbidden":
    case "unauthenticated":
      return t.forbidden;
    case "notFound":
      return t.notFound;
    case "conflict":
      return t.conflict;
    case "invalid":
      return t.invalid;
    case "network":
      return t.network;
    default:
      return t.generic;
  }
}

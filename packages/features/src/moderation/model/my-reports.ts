import { REPORT_STATUS, type ReportReason, type ReportStatus } from "@storynest/validation";
import { REPORT_TARGET, type ReportTarget } from "./report.ts";

/** One row of the reporter's own reports (the reporter may read these; moderators' names are never selected). */
export interface MyReportRow {
  id: string;
  status: string;
  reason: string;
  created_at: string;
  story_id: string | null;
  chapter_id: string | null;
  comment_id: string | null;
  reported_user_id: string | null;
}

export interface MyReport {
  id: string;
  kind: ReportTarget;
  targetId: string;
  reason: ReportReason | string;
  status: ReportStatus;
  createdAt: string;
}

export const MY_REPORTS_LIMIT = 100;
export const MY_REPORTS_HREF = "/me/reports";

/** Maps a row to a report. A row with no target (cannot happen: the table requires exactly one) is dropped. */
export function toMyReport(row: MyReportRow): MyReport | null {
  const target: [ReportTarget, string | null][] = [
    [REPORT_TARGET.STORY, row.story_id],
    [REPORT_TARGET.CHAPTER, row.chapter_id],
    [REPORT_TARGET.COMMENT, row.comment_id],
    [REPORT_TARGET.USER, row.reported_user_id],
  ];
  const found = target.find(([, id]) => id !== null);
  if (!found || found[1] === null) return null;
  const status =
    row.status === REPORT_STATUS.REVIEWING ||
    row.status === REPORT_STATUS.RESOLVED ||
    row.status === REPORT_STATUS.DISMISSED
      ? row.status
      : REPORT_STATUS.PENDING;
  return { id: row.id, kind: found[0], targetId: found[1], reason: row.reason, status, createdAt: row.created_at };
}

/** Still waiting for a moderator: a new report of the same thing would be merged into it. */
export const isOpenReport = (report: MyReport): boolean =>
  report.status === REPORT_STATUS.PENDING || report.status === REPORT_STATUS.REVIEWING;

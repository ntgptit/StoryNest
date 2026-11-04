import type { ModerationAction, ReportReason, ReportStatus } from "@storynest/validation";
import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import {
  QUEUE_FILTER,
  QUEUE_PAGE_SIZE,
  toReportPage,
  type QueueFilter,
  type ReportPage,
  type ReportRow,
  type ReportTarget,
} from "../model/report.ts";

/** Sends a report. Reporting the same open thing again returns the first report, so a retry cannot double up. */
export async function submitReport(
  client: DataClient,
  input: { kind: ReportTarget; targetId: string; reason: ReportReason; description: string },
): Promise<string> {
  const description = input.description.trim();
  const id = unwrap(
    await client.rpc("submit_report", {
      p_kind: input.kind,
      p_target_id: input.targetId,
      p_reason: input.reason,
      ...(description === "" ? {} : { p_description: description }),
    }),
  );
  return id ?? "";
}

/** One page of the queue: open ones oldest first (the longest wait on top), closed ones newest first. */
export async function listReports(
  client: DataClient,
  input: { filter: QueueFilter; cursor?: { createdAt: string; id: string } | undefined },
): Promise<ReportPage> {
  const rows = unwrap(
    await client.rpc("list_reports", {
      p_status: input.filter,
      p_newest_first: input.filter === QUEUE_FILTER.CLOSED,
      ...(input.cursor ? { p_cursor_at: input.cursor.createdAt, p_cursor_id: input.cursor.id } : {}),
      p_limit: QUEUE_PAGE_SIZE + 1,
    }),
  );
  return toReportPage((rows ?? []) as ReportRow[]);
}

/** Takes one action on a thing. Returns its new state. Every call is recorded with the reason. */
export async function moderate(
  client: DataClient,
  input: { action: ModerationAction; targetId: string; reason: string; reportId: string },
): Promise<string> {
  const state = unwrap(
    await client.rpc("moderate", {
      p_action: input.action,
      p_target_id: input.targetId,
      p_reason: input.reason.trim(),
      p_report_id: input.reportId,
    }),
  );
  return state ?? "";
}

export async function resolveReport(
  client: DataClient,
  input: { reportId: string; status: Extract<ReportStatus, "reviewing" | "resolved" | "dismissed">; reason: string },
): Promise<void> {
  unwrap(
    await client.rpc("resolve_report", {
      p_report_id: input.reportId,
      p_status: input.status,
      p_reason: input.reason.trim(),
    }),
  );
}

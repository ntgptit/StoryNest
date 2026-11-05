import { REVIEW_STATUS, REVIEW_STATUSES, type ReviewStatus } from "@storynest/validation";
import type { AppError } from "../../_shared/errors.ts";
import type { PublishRole } from "../api/publishing.api.ts";
import { editorText } from "../strings.ts";

type Person = { username: string; display_name: string } | { username: string; display_name: string }[] | null;

export interface ReviewRow {
  status: string;
  requested_by: string;
  requested_at: string;
  requested_revision: number;
  request_note: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string;
  requester: Person;
  decider: Person;
}

export interface ChapterReview {
  status: ReviewStatus;
  requestedBy: string;
  requesterName: string;
  requestedAt: string;
  /** The saved draft revision the sign-off is about. */
  revision: number;
  requestNote: string;
  decidedBy: string | null;
  deciderName: string | null;
  decisionNote: string;
}

const nameOf = (person: Person): string | null => {
  const p = Array.isArray(person) ? person[0] : person;
  if (!p) return null;
  return p.display_name.trim() === "" ? p.username : p.display_name;
};

export function toChapterReview(row: ReviewRow): ChapterReview {
  return {
    // An unknown status reads as pending: the least final reading of it.
    status: REVIEW_STATUSES.find((s) => s === row.status) ?? REVIEW_STATUS.PENDING,
    requestedBy: row.requested_by,
    requesterName: nameOf(row.requester) ?? editorText.lock.someone,
    requestedAt: row.requested_at,
    revision: Number(row.requested_revision),
    requestNote: row.request_note,
    decidedBy: row.decided_by,
    deciderName: nameOf(row.decider),
    decisionNote: row.decision_note,
  };
}

/** What the signed-in team member may do with the sign-off now. Mirrors the RPC checks (the server decides). */
export function reviewActions(
  review: ChapterReview | null,
  role: PublishRole | null,
  userId: string | null,
  currentRevision: number,
): { canRequest: boolean; canDecide: boolean; stale: boolean; ownRequest: boolean } {
  const pending = review?.status === REVIEW_STATUS.PENDING;
  const ownRequest = review !== null && review.requestedBy === userId;
  const signer = role === "owner" || role === "co_author";
  return {
    // Anyone on the team may ask; asking again refreshes the request for the current save.
    canRequest: role !== null && !(pending && review.revision === currentRevision && ownRequest),
    canDecide: pending && signer && !ownRequest,
    stale: review !== null && currentRevision > review.revision,
    ownRequest: pending && ownRequest && signer,
  };
}

/** Text for a refused review call. */
export function reviewErrorMessage(error: AppError): string {
  if (error.kind === "conflict" || error.kind === "notFound") return editorText.review.errors.conflict;
  if (error.kind === "forbidden") return editorText.review.errors.forbidden;
  return editorText.review.errors.generic;
}

import { formatRelativeTime } from "@storynest/utils";
import { CHAPTER_STATUS } from "@storynest/validation";
import type { AppError } from "../../_shared/errors.ts";
import type { ChapterPublishState, PublishRole } from "../api/publishing.api.ts";
import { editorText } from "../strings.ts";

/** Editors may publish and schedule; only owners and co-authors may take a chapter back (the RPC enforces it too). */
export function canUnpublish(role: PublishRole | null): boolean {
  return role === "owner" || role === "co_author";
}

export function canPublish(state: ChapterPublishState): boolean {
  return state.role !== null && state.status !== CHAPTER_STATUS.ARCHIVED;
}

export function canUnpublishChapter(state: ChapterPublishState): boolean {
  return (
    canUnpublish(state.role) && (state.status === CHAPTER_STATUS.PUBLISHED || state.status === CHAPTER_STATUS.SCHEDULED)
  );
}

/** Text for a failed publish/schedule/unpublish, chosen by the RPC contract (42501, PT404, PT409, 22023). */
export function publishErrorMessage(error: AppError): string {
  const t = editorText.publish.errors;
  switch (error.kind) {
    case "forbidden":
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

const MINIMUM_LEAD_MS = 60_000;

export type ScheduleInput = { ok: true; iso: string } | { ok: false; message: string };

/**
 * A `datetime-local` value (wall-clock time in the reader's own timezone, no offset) -> the ISO instant the server
 * expects. Refuses empty or past times (and anything less than a minute ahead, which would already be past by the
 * time the request arrives) before bothering the server.
 */
export function scheduleInstant(localValue: string, now: Date = new Date()): ScheduleInput {
  const t = editorText.publish.scheduleDialog;
  if (localValue.trim() === "") return { ok: false, message: t.required };
  const date = new Date(localValue); // no offset in the string: interpreted in the local timezone
  if (Number.isNaN(date.getTime())) return { ok: false, message: t.required };
  if (date.getTime() - now.getTime() < MINIMUM_LEAD_MS) return { ok: false, message: t.past };
  return { ok: true, iso: date.toISOString() };
}

export function localZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * How long until a scheduled chapter goes live, for the line under its state ("Goes live in 3 hours"). Under a minute
 * left, or already past (the server publishes it on its next run), it says it is about to go live instead.
 */
export function scheduleCountdown(iso: string, locale: string, now: number = Date.now()): string {
  const t = editorText.publish;
  const left = new Date(iso).getTime() - now;
  if (Number.isNaN(left) || left < MINIMUM_LEAD_MS) return t.dueNow;
  return t.countdown(formatRelativeTime(iso, locale, now));
}

export function formatLocalDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/** Smallest value the picker should allow, in the picker's own format ("YYYY-MM-DDTHH:mm", local time). */
export function minLocalDateTime(now: Date = new Date()): string {
  return localDateTimeValue(new Date(now.getTime() + MINIMUM_LEAD_MS));
}

/** An instant in the picker's own format ("YYYY-MM-DDTHH:mm", local time), e.g. to start from the current schedule. */
export function localDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type ReadinessId = "title" | "body" | "notArchived";

export interface ReadinessCheck {
  id: ReadinessId;
  done: boolean;
  /** What is wrong, while not done: the same message the save or the panel already gives. */
  hint?: string | undefined;
}

/**
 * What must hold before this chapter can be published or scheduled, as a checklist. Only rules that already exist:
 * the draft rules the save applies (checkTitle, checkBody: the server refuses a draft that breaks them, and publishing
 * saves first) and canPublish's "not archived". The publish buttons stay locked until every item is done.
 */
export function publishReadiness(
  draft: { title: { ok: boolean; message?: string }; body: { ok: boolean; message?: string } },
  state: ChapterPublishState,
): ReadinessCheck[] {
  const archived = state.status === CHAPTER_STATUS.ARCHIVED;
  return [
    { id: "title", done: draft.title.ok, hint: draft.title.ok ? undefined : draft.title.message },
    { id: "body", done: draft.body.ok, hint: draft.body.ok ? undefined : draft.body.message },
    { id: "notArchived", done: !archived, hint: archived ? editorText.publish.archivedHint : undefined },
  ];
}

export function isReady(checks: readonly ReadinessCheck[]): boolean {
  return checks.every((check) => check.done);
}

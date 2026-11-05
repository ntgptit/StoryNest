import { chapterBodySchema, countWords, type ChapterBody } from "@storynest/validation";
import type { AppError } from "../../_shared/errors.ts";
import { docToBody, UnsupportedContentError, type EditorNode } from "./body-converter.ts";
import { editorText } from "../strings.ts";

const MAX_TITLE = 200;

export type DraftCheck =
  { ok: true; title: string; body: ChapterBody } | { ok: false; message: string; field: "title" | "body" };

export type TitleCheck = { ok: true; title: string } | { ok: false; message: string };
export type BodyCheck = { ok: true; body: ChapterBody } | { ok: false; message: string };

/** The chapter title rule: required (after trimming) and at most 200 characters. */
export function checkTitle(title: string): TitleCheck {
  const trimmed = title.trim();
  if (trimmed === "") return { ok: false, message: editorText.validation.titleRequired };
  if (trimmed.length > MAX_TITLE) return { ok: false, message: editorText.validation.titleTooLong };
  return { ok: true, title: trimmed };
}

/** The body rule: only what a chapter can hold, as the shared schema (at least one block, known block types). */
export function checkBody(doc: EditorNode): BodyCheck {
  try {
    const parsed = chapterBodySchema.safeParse(docToBody(doc));
    if (!parsed.success) return { ok: false, message: editorText.validation.unsupported };
    return { ok: true, body: parsed.data };
  } catch (error) {
    if (error instanceof UnsupportedContentError) return { ok: false, message: editorText.validation.unsupported };
    throw error;
  }
}

/** Title and editor document -> something safe to save, or the message to show. Nothing invalid reaches the server. */
export function checkDraft(title: string, doc: EditorNode): DraftCheck {
  const titleCheck = checkTitle(title);
  if (!titleCheck.ok) return { ok: false, field: "title", message: titleCheck.message };
  const bodyCheck = checkBody(doc);
  if (!bodyCheck.ok) return { ok: false, field: "body", message: bodyCheck.message };
  return { ok: true, title: titleCheck.title, body: bodyCheck.body };
}

export function wordCountOf(doc: EditorNode): number {
  try {
    return countWords(docToBody(doc));
  } catch {
    return 0;
  }
}

export function isDraftConflict(error: AppError): boolean {
  return error.kind === "conflict";
}

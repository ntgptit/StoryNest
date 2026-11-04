import { chapterBodySchema, countWords, type ChapterBody } from "@storynest/validation";
import type { AppError } from "../../_shared/errors.ts";
import { docToBody, UnsupportedContentError, type EditorNode } from "./body-converter.ts";
import { editorText } from "../strings.ts";

const MAX_TITLE = 200;

export type DraftCheck =
  { ok: true; title: string; body: ChapterBody } | { ok: false; message: string; field: "title" | "body" };

/** Title and editor document -> something safe to save, or the message to show. Nothing invalid reaches the server. */
export function checkDraft(title: string, doc: EditorNode): DraftCheck {
  const trimmed = title.trim();
  if (trimmed === "") return { ok: false, field: "title", message: editorText.validation.titleRequired };
  if (trimmed.length > MAX_TITLE) return { ok: false, field: "title", message: editorText.validation.titleTooLong };
  try {
    const body = docToBody(doc);
    const parsed = chapterBodySchema.safeParse(body);
    if (!parsed.success) return { ok: false, field: "body", message: editorText.validation.unsupported };
    return { ok: true, title: trimmed, body: parsed.data };
  } catch (error) {
    if (error instanceof UnsupportedContentError)
      return { ok: false, field: "body", message: editorText.validation.unsupported };
    throw error;
  }
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

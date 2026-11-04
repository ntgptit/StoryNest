import { AppError } from "../../_shared/errors.ts";
import { ImageError } from "../../_shared/image-prepare.ts";
import { editorText } from "../strings.ts";

/** Text for a picture that could not be inserted: a file the browser could not use, or the server's answer. */
export function imageErrorMessage(error: Error): string {
  const t = editorText.toolbar.imageErrors;
  if (error instanceof ImageError) return t[error.problem];
  if (error instanceof AppError) {
    if (error.kind === "invalid") return t.rejected;
    if (error.kind === "forbidden" || error.kind === "unauthenticated") return t.forbidden;
    if (error.kind === "network") return t.network;
  }
  return t.generic;
}

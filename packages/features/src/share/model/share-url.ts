/** The absolute address of an app path (e.g. `/story/1/a`) on `origin` (an origin, or a URL whose origin is used). */
export function shareUrl(origin: string, path: string): string {
  return new URL(path, new URL(origin).origin).toString();
}

/** True where the browser (or the native shell's web view) can open the system share sheet. */
export function canShareNatively(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * Opens the system share sheet. Closing it without choosing an app rejects with AbortError: that is not a failure.
 * Resolves to false only when sharing really did not work, so the caller can say so.
 */
export async function shareNatively(data: { title: string; url: string }): Promise<boolean> {
  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    return error instanceof Error && error.name === "AbortError";
  }
}

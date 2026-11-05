/**
 * The picture a paste carries, when the paste is a picture: a screenshot, or "copy image" in a browser. A paste that
 * also carries text (Word, a web page selection) is left to the editor, even when a rendered image comes with it,
 * so pasting formatted text keeps working. Only the first file is used, like the toolbar button.
 */
export function pastedImage(event: Pick<ClipboardEvent, "clipboardData">): File | undefined {
  const data = event.clipboardData;
  if (!data || data.files.length === 0) return undefined;
  if (data.getData("text/plain").trim() !== "") return undefined;
  return Array.from(data.files).find((file) => file.type.startsWith("image/"));
}

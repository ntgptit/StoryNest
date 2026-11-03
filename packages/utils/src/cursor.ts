// Opaque pagination cursors: the client treats them as strings, the server decodes them to a keyset position
// ((updated_at, id) etc.), which stays stable when rows are inserted while paging (unlike offsets).

export function encodeCursor(position: Record<string, string | number>): string {
  return toBase64Url(JSON.stringify(position));
}

/** Returns null for anything that is not a cursor we produced, never throws. */
export function decodeCursor(cursor: string): Record<string, string | number> | null {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(cursor));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    for (const value of Object.values(parsed)) {
      if (typeof value !== "string" && typeof value !== "number") return null;
    }
    return parsed as Record<string, string | number>;
  } catch {
    return null;
  }
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(encoded: string): string {
  const padded = encoded
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

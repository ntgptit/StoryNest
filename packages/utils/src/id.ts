const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Client-side UUID v4 (the schema allows client-generated ids so drafts can be created offline). */
export function newId(): string {
  return crypto.randomUUID();
}

import { hasReaderPreferences, parseReaderPreferences, type ReaderPreferences } from "@storynest/validation";
import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";

/** The account's saved preferences, or null when nothing was saved yet (RLS returns only the caller's own row). */
export async function getRemoteReaderPreferences(client: DataClient): Promise<ReaderPreferences | null> {
  const row = unwrap(await client.from("user_reader_preferences").select("preferences").maybeSingle());
  return row && hasReaderPreferences(row.preferences) ? parseReaderPreferences(row.preferences) : null;
}

export async function saveRemoteReaderPreferences(
  client: DataClient,
  userId: string,
  preferences: ReaderPreferences,
): Promise<void> {
  unwrap(
    await client.from("user_reader_preferences").upsert({ user_id: userId, preferences }, { onConflict: "user_id" }),
  );
}

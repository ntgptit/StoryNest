import type { DataClient } from "../../_shared/client.ts";
import { isLanguage, type Language } from "../../_shared/i18n.ts";
import { unwrap } from "../../_shared/errors.ts";

/** The language saved in the account, or null when the account has no settings row yet (RLS: only the caller's own row). */
export async function getRemoteLanguage(client: DataClient): Promise<Language | null> {
  const row = unwrap(await client.from("user_settings").select("language_code").maybeSingle());
  return row && isLanguage(row.language_code) ? row.language_code : null;
}

/** Saves only the language column; the rest of the settings row is left alone. */
export async function saveRemoteLanguage(client: DataClient, userId: string, language: Language): Promise<void> {
  unwrap(
    await client.from("user_settings").upsert({ user_id: userId, language_code: language }, { onConflict: "user_id" }),
  );
}

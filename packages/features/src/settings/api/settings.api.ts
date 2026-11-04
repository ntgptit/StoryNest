import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import { SETTINGS_COLUMNS, toRow, toSettings, type AccountSettings } from "../model/settings.ts";

/** The account's settings (defaults when nothing was saved yet; RLS returns only the caller's own row). */
export async function getSettings(client: DataClient): Promise<AccountSettings> {
  return toSettings(unwrap(await client.from("user_settings").select(SETTINGS_COLUMNS).maybeSingle()));
}

/** Saves language and notification switches; the adult-content columns of the same row are not part of the payload. */
export async function saveSettings(client: DataClient, userId: string, settings: AccountSettings): Promise<void> {
  unwrap(await client.from("user_settings").upsert({ user_id: userId, ...toRow(settings) }, { onConflict: "user_id" }));
}

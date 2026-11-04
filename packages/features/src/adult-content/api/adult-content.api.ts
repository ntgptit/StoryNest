import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import type { AdultContentChoice } from "../model/store.ts";

/** The account's saved choice, or null when the account has no settings row yet (RLS returns only the caller's own). */
export async function getRemoteAdultContent(client: DataClient): Promise<AdultContentChoice | null> {
  const row = unwrap(await client.from("user_settings").select("age_confirmed, show_mature").maybeSingle());
  return row ? { ageConfirmed: row.age_confirmed, show: row.show_mature } : null;
}

/** Saves only the two adult-content columns: the rest of the settings row (language, notifications) is left alone. */
export async function saveRemoteAdultContent(
  client: DataClient,
  userId: string,
  choice: AdultContentChoice,
): Promise<void> {
  unwrap(
    await client
      .from("user_settings")
      .upsert(
        { user_id: userId, age_confirmed: choice.ageConfirmed, show_mature: choice.show },
        { onConflict: "user_id" },
      ),
  );
}

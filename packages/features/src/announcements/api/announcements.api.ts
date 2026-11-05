import type { AnnouncementKind } from "@storynest/validation";
import type { toAnnouncementPayload } from "@storynest/validation";
import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import {
  ANNOUNCEMENT_COLUMNS,
  toAnnouncements,
  type Announcement,
  type AnnouncementRow,
} from "../model/announcement.ts";

/**
 * What is showing right now for this interface language (the server's clock decides; announcements for every
 * language are included). Guests can call it: RLS lets anyone read an active announcement.
 */
export async function listActiveAnnouncements(
  client: DataClient,
  input: { kind: AnnouncementKind; locale: string },
): Promise<Announcement[]> {
  const rows = unwrap(await client.rpc("active_announcements", { p_kind: input.kind, p_locale: input.locale }));
  return toAnnouncements((rows ?? []) as AnnouncementRow[]);
}

/** Every announcement, newest start first. Only moderators get scheduled and ended ones (RLS). */
export async function listAllAnnouncements(client: DataClient): Promise<Announcement[]> {
  const rows = unwrap(
    await client
      .from("announcements")
      .select(ANNOUNCEMENT_COLUMNS)
      .order("starts_at", { ascending: false })
      .order("id")
      .limit(100),
  );
  return toAnnouncements(rows ?? []);
}

/** Moderators only (RLS refuses everyone else with 42501). */
export async function createAnnouncement(
  client: DataClient,
  payload: ReturnType<typeof toAnnouncementPayload>,
): Promise<void> {
  unwrap(await client.from("announcements").insert(payload));
}

/** Ends an active announcement now. A scheduled one cannot end before it starts: delete it instead. */
export async function endAnnouncement(client: DataClient, id: string): Promise<void> {
  unwrap(await client.from("announcements").update({ ends_at: new Date().toISOString() }).eq("id", id));
}

export async function deleteAnnouncement(client: DataClient, id: string): Promise<void> {
  unwrap(await client.from("announcements").delete().eq("id", id));
}

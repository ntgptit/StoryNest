import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import {
  NOTIFICATIONS_PAGE_SIZE,
  toPage,
  type NotificationCursor,
  type NotificationPage,
  type NotificationRow,
} from "../model/notification.ts";

const COLUMNS =
  "id, event_type, story_id, chapter_id, payload, read_at, created_at, " +
  "actor:app_users!notifications_actor_id_fkey(username, display_name)";

/**
 * One page of the reader's notifications, newest first. RLS already limits the rows to the reader; the explicit filter
 * on their id is a second fence and also keeps the query plan on the recipient index.
 */
export async function listNotifications(
  client: DataClient,
  userId: string,
  cursor?: NotificationCursor | undefined,
): Promise<NotificationPage> {
  let query = client.from("notifications").select(COLUMNS).eq("recipient_id", userId);
  if (cursor) {
    query = query.or(`created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.lt.${cursor.id})`);
  }
  const rows =
    unwrap(
      await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(NOTIFICATIONS_PAGE_SIZE + 1)
        .returns<NotificationRow[]>(),
    ) ?? [];
  return toPage(rows);
}

/** How many are unread (a count only, no rows). */
export async function countUnread(client: DataClient, userId: string): Promise<number> {
  const result = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);
  unwrap(result);
  return result.count ?? 0;
}

/** Marks the given notifications read. Already read ones keep their first read time. */
export async function markRead(client: DataClient, userId: string, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  unwrap(
    await client
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .is("read_at", null)
      .in("id", [...ids]),
  );
}

export async function markAllRead(client: DataClient, userId: string): Promise<void> {
  unwrap(
    await client
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .is("read_at", null),
  );
}

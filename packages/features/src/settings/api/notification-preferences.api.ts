import type { NotificationPreferenceType } from "@storynest/validation";
import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import {
  NOTIFICATION_PREFERENCE_COLUMNS,
  toNotificationTypes,
  type NotificationPreferenceRow,
  type NotificationTypeSettings,
} from "../model/settings.ts";

/** The reader's per-type switches (RLS returns only their own rows; no row means on). */
export async function getNotificationTypes(client: DataClient): Promise<NotificationTypeSettings> {
  const rows = unwrap(await client.from("notification_preferences").select(NOTIFICATION_PREFERENCE_COLUMNS));
  return toNotificationTypes((rows ?? []) as NotificationPreferenceRow[]);
}

/** Saves one type's in-app switch. */
export async function saveNotificationType(
  client: DataClient,
  userId: string,
  type: NotificationPreferenceType,
  inApp: boolean,
): Promise<void> {
  unwrap(
    await client
      .from("notification_preferences")
      .upsert({ user_id: userId, event_type: type, in_app: inApp }, { onConflict: "user_id,event_type" }),
  );
}

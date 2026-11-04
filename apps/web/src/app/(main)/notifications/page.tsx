import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";
import { appText } from "@/lib/strings";

import { NotificationsView } from "./notifications-view";

export const metadata: Metadata = { title: appText.pageTitle.notifications, robots: { index: false } };

/** The reader's notifications. Protected twice: the proxy redirects guests, requireUser re-checks here; RLS decides the data. */
export default async function NotificationsPage() {
  await requireUser("/notifications");
  return <NotificationsView />;
}

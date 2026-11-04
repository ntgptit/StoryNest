import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";
import { appText } from "@/lib/strings";

import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: appText.pageTitle.settings, robots: { index: false } };

/** Account settings. Protected twice: the proxy redirects guests, requireUser re-checks here; RLS decides the data. */
export default async function SettingsPage() {
  await requireUser("/settings");
  return <SettingsView />;
}

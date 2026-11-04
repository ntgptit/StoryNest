import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { appText } from "@/lib/strings";

import { ModerationView } from "./moderation-view";

export const metadata: Metadata = { title: appText.pageTitle.moderation, robots: { index: false } };

/**
 * The moderation console. Guests are redirected by the proxy and by requireUser; anyone who is not a moderator gets a
 * plain 404 (the page does not exist for them). The database enforces the same rule on every call.
 */
export default async function ModerationPage() {
  const user = await requireUser("/moderation");
  if (!user.isModerator) notFound();
  return <ModerationView />;
}

import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";
import { appText } from "@/lib/strings";

import { FollowingView } from "./following-view";

export const metadata: Metadata = { title: appText.pageTitle.following, robots: { index: false } };

/** Stories of the authors the reader follows. Protected twice: the proxy redirects guests, requireUser re-checks here. */
export default async function FollowingPage() {
  await requireUser("/following");
  return <FollowingView />;
}

import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";
import { appText } from "@/lib/strings";

import { StudioView } from "./studio-view";

export const metadata: Metadata = { title: appText.pageTitle.studio, robots: { index: false } };

/** Author workspace. Protected twice: the proxy redirects guests, requireUser re-checks here; RLS decides the data. */
export default async function StudioPage() {
  await requireUser("/studio");
  return <StudioView />;
}

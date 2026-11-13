import type { Metadata } from "next";
import { MyReportsScreen } from "@storynest/features";

import { requireUser } from "@/lib/auth/require-user";
import { appText } from "@/lib/strings";

export const metadata: Metadata = { title: appText.pageTitle.myReports, robots: { index: false } };

/** The reports the reader sent and their outcome. Protected by the `/me` prefix and re-checked here. */
export default async function MyReportsPage() {
  await requireUser("/me/reports");
  return <MyReportsScreen />;
}

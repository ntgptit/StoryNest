import type { Metadata } from "next";
import { MainShell, NotFoundScreen } from "@storynest/features";

import { appText } from "@/lib/strings";

export const metadata: Metadata = {
  title: appText.pageTitle.notFound,
  robots: { index: false },
};

/** Any address that leads nowhere (and every notFound()): the regular frame, with a suggested fix for typos. */
export default function NotFound() {
  return (
    <MainShell>
      <NotFoundScreen />
    </MainShell>
  );
}

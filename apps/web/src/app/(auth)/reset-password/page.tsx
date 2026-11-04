import type { Metadata } from "next";

import { ResetPasswordPage } from "../auth-pages";
import { appText } from "@/lib/strings";

export const metadata: Metadata = { title: appText.pageTitle.resetPassword, robots: { index: false } };

export default function Page() {
  return <ResetPasswordPage />;
}

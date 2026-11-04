import type { Metadata } from "next";

import { ForgotPasswordPage } from "../auth-pages";
import { appText } from "@/lib/strings";

export const metadata: Metadata = { title: appText.pageTitle.forgotPassword, robots: { index: false } };

export default function Page() {
  return <ForgotPasswordPage />;
}

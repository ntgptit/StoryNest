import type { Metadata } from "next";

import { ForgotPasswordPage } from "../auth-pages";

export const metadata: Metadata = { title: "Quên mật khẩu", robots: { index: false } };

export default function Page() {
  return <ForgotPasswordPage />;
}

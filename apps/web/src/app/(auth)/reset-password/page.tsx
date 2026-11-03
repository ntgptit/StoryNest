import type { Metadata } from "next";

import { ResetPasswordPage } from "../auth-pages";

export const metadata: Metadata = { title: "Đặt mật khẩu mới", robots: { index: false } };

export default function Page() {
  return <ResetPasswordPage />;
}

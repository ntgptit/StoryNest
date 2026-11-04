import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";

import { EditProfilePage } from "./edit-profile-page";

export const metadata: Metadata = { title: "Chỉnh sửa hồ sơ", robots: { index: false } };

export default async function Page() {
  await requireUser("/me/edit"); // second check; the proxy already redirects guests
  return <EditProfilePage />;
}

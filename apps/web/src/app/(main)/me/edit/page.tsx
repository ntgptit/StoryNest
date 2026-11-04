import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";

import { EditProfilePage } from "./edit-profile-page";
import { appText } from "@/lib/strings";

export const metadata: Metadata = { title: appText.pageTitle.editProfile, robots: { index: false } };

export default async function Page() {
  await requireUser("/me/edit"); // second check; the proxy already redirects guests
  return <EditProfilePage />;
}

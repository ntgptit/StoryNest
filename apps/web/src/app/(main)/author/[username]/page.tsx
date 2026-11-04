import type { Metadata } from "next";

import { appText } from "@/lib/strings";

import { AuthorView } from "./author-view";

// The author's page is public. Which accounts have one (active, not deleted) is decided by the database.
export const metadata: Metadata = { title: appText.pageTitle.author };

export default async function AuthorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <AuthorView username={decodeURIComponent(username)} />;
}

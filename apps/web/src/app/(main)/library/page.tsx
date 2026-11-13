import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";
import { appText } from "@/lib/strings";

import { LibraryView } from "./library-view";

export const metadata: Metadata = { title: appText.pageTitle.library, robots: { index: false } };

/** The reader's library. Protected twice: the proxy redirects guests, requireUser re-checks here; RLS decides the data. */
export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const { tab } = await searchParams;
  await requireUser("/library");
  return <LibraryView initialTab={Array.isArray(tab) ? tab[0] : tab} />;
}

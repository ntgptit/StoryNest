import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";
import { appText } from "@/lib/strings";

import { ChapterManagerView } from "./chapter-manager-view";

export const metadata: Metadata = { title: appText.pageTitle.chapters, robots: { index: false } };

/** Chapter list of one story. The id decides the story; RLS decides whether this user may open it. */
export default async function ChaptersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/studio/story/${id}/chapters`);
  return <ChapterManagerView storyId={id} />;
}

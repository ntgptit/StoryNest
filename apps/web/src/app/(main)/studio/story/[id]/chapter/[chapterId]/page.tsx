import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";
import { appText } from "@/lib/strings";

import { ChapterEditorView } from "./chapter-editor-view";

export const metadata: Metadata = { title: appText.pageTitle.editChapter, robots: { index: false } };

/** Chapter editor. The ids decide the chapter; RLS decides whether this user may open its draft. */
export default async function EditChapterPage({ params }: { params: Promise<{ id: string; chapterId: string }> }) {
  const { id, chapterId } = await params;
  await requireUser(`/studio/story/${id}/chapter/${chapterId}`);
  return <ChapterEditorView storyId={id} chapterId={chapterId} />;
}

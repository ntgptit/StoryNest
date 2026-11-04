import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";
import { appText } from "@/lib/strings";

import { PreviewView } from "./preview-view";

export const metadata: Metadata = { title: appText.pageTitle.preview, robots: { index: false } };

/** The ids decide the chapter; RLS decides whether this user may open its draft and versions. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string; chapterId: string }> }) {
  const { id, chapterId } = await params;
  await requireUser(`/studio/story/${id}/chapter/${chapterId}/preview`);
  return <PreviewView storyId={id} chapterId={chapterId} />;
}

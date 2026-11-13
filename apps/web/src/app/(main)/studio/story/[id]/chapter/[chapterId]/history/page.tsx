import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";
import { requireUuidParams } from "@/lib/route-params";
import { appText } from "@/lib/strings";

import { HistoryView } from "./history-view";

export const metadata: Metadata = { title: appText.pageTitle.history, robots: { index: false } };

/** The ids decide the chapter; RLS decides whether this user may open its draft and versions. */
export default async function HistoryPage({ params }: { params: Promise<{ id: string; chapterId: string }> }) {
  const { id, chapterId } = await params;
  requireUuidParams(id, chapterId);
  await requireUser(`/studio/story/${id}/chapter/${chapterId}/history`);
  return <HistoryView storyId={id} chapterId={chapterId} />;
}

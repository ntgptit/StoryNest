import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";
import { requireUuidParams } from "@/lib/route-params";
import { appText } from "@/lib/strings";

import { StoryFormView } from "../../../story-form-view";

export const metadata: Metadata = { title: appText.pageTitle.editStory, robots: { index: false } };

/** Edit one story's settings. The id decides the story; RLS decides whether this user may open it. */
export default async function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  requireUuidParams(id);
  await requireUser(`/studio/story/${id}`);
  return <StoryFormView storyId={id} />;
}

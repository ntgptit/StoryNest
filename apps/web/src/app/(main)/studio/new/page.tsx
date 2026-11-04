import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";
import { appText } from "@/lib/strings";

import { StoryFormView } from "../story-form-view";

export const metadata: Metadata = { title: appText.pageTitle.newStory, robots: { index: false } };

/** Create a story. Protected twice: the proxy redirects guests, requireUser re-checks here. */
export default async function NewStoryPage() {
  await requireUser("/studio/new");
  return <StoryFormView />;
}

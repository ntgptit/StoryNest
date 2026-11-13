"use client";

import { StoryWorkspaceNav } from "@storynest/features";
import { isUuid } from "@storynest/utils";

/** A malformed id has no story: the page below answers 404, so no bar is drawn for it. */
export function WorkspaceNav({ storyId }: { storyId: string }) {
  return isUuid(storyId) ? <StoryWorkspaceNav storyId={storyId} /> : null;
}

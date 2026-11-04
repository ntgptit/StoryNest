"use client";

import { StoryFormScreen } from "@storynest/features";

export function StoryFormView({ storyId }: { storyId?: string }) {
  return <StoryFormScreen storyId={storyId} />;
}

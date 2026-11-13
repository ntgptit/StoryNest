"use client";

import { useStudioChapters } from "./use-chapter-management.ts";
import { useStoryForEdit } from "./use-story-editing.ts";
import { countPublished, readerAccess, type ReaderAccess } from "../model/reader-access.ts";
import type { StudioRole } from "../model/studio-story.ts";

/**
 * Who can read a story once `extraPublished` more chapters are out (1 for "after this chapter is published"). Null
 * until the story and its chapters are known. Also gives the caller's role, which decides what they may change.
 */
export function useStoryReaderAccess(
  storyId: string,
  extraPublished = 0,
): { access: ReaderAccess; role: StudioRole } | null {
  const story = useStoryForEdit(storyId);
  const chapters = useStudioChapters(storyId);
  if (!story.data || !chapters.data) return null;
  const access = readerAccess(
    { ...story.data.form, deleted: story.data.deletedAt !== null },
    countPublished(chapters.data) + extraPublished,
  );
  return { access, role: story.data.role };
}

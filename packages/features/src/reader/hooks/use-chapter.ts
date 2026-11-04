"use client";

import { useQuery } from "@tanstack/react-query";
import { useDataClientGetter } from "../../_shared/data.tsx";
import type { AppError } from "../../_shared/errors.ts";
import type { ChapterContent } from "../model/chapter.ts";
import { chapterQueryOptions } from "../queries.ts";

export function useChapter(storyId: string, chapterSlug: string) {
  const getClient = useDataClientGetter();
  return useQuery<ChapterContent | null, AppError>(chapterQueryOptions(getClient, storyId, chapterSlug));
}

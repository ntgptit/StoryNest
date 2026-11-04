"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import type { AppError } from "../../_shared/errors.ts";
import type { StudioStory } from "../model/studio-story.ts";
import { myStoriesQueryOptions } from "../queries.ts";

/** The signed-in user's own and shared stories. Idle until the session is known. */
export function useMyStories() {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  return useQuery<StudioStory[], AppError>({
    ...myStoriesQueryOptions(getClient, userId ?? "none"),
    enabled: userId !== null,
    // The author just edited something in another screen: always show fresh data when the studio opens.
    staleTime: 0,
  });
}

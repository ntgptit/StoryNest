// No "use client": query options are plain data shared by hooks (and, later, by server prefetch if ever needed).
import type { DataClient } from "../_shared/client.ts";
import { toAppError } from "../_shared/errors.ts";
import { listMyStories } from "./api/studio.api.ts";
import { studioKeys } from "./keys.ts";

export function myStoriesQueryOptions(getClient: () => DataClient, userId: string) {
  return {
    queryKey: studioKeys.stories(userId),
    queryFn: () => listMyStories(getClient(), userId).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}

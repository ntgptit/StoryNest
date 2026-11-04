"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { useShowMature } from "../../adult-content/index.ts";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { discoveryKeys } from "../../discovery/index.ts";
import { getAuthorProfile, listFollowedStories, setUserFollow, type FollowedPage } from "../api/author.api.ts";
import { authorKeys } from "../keys.ts";
import { withFollowing, type AuthorProfile, type FollowedCursor } from "../model/author.ts";

function useViewerId(): string | null {
  const auth = useAuth();
  return auth.status === "authenticated" ? auth.user.id : null;
}

/** The author page's data. Waits for the session so a guest answer is never cached under a signed-in key. */
export function useAuthorProfile(username: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const viewerId = useViewerId();
  return useQuery<AuthorProfile | null, AppError>({
    queryKey: authorKeys.profile(username, viewerId),
    queryFn: () => getAuthorProfile(getClient(), username).catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: auth.status !== "loading",
  });
}

/** Follow or unfollow the author of this page; takes the follower count the database answers. */
export function useFollowAuthor(profile: AuthorProfile) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  const viewerId = useViewerId();
  return useMutation<number, AppError, boolean>({
    mutationFn: (followed) =>
      setUserFollow(getClient(), profile.userId, followed).catch((e: unknown) => Promise.reject(toAppError(e))),
    onSuccess: (followers, followed) => {
      queryClient.setQueryData<AuthorProfile | null>(authorKeys.profile(profile.username, viewerId), (current) =>
        current ? withFollowing(current, followed, followers) : current,
      );
      // the feed of followed authors changes with the follow
      if (viewerId) void queryClient.invalidateQueries({ queryKey: authorKeys.followedAll(viewerId) });
      void queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    },
  });
}

export function useFollowedStories() {
  const getClient = useDataClientGetter();
  const viewerId = useViewerId();
  const includeMature = useShowMature();
  return useInfiniteQuery<
    FollowedPage,
    AppError,
    { pages: FollowedPage[]; pageParams: (FollowedCursor | null)[] },
    readonly unknown[],
    FollowedCursor | null
  >({
    queryKey: authorKeys.followed(viewerId ?? "none", includeMature),
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      listFollowedStories(getClient(), { cursor: pageParam, includeMature }).catch((e: unknown) =>
        Promise.reject(toAppError(e)),
      ),
    getNextPageParam: (last) => last.nextCursor,
    enabled: viewerId !== null,
    staleTime: 0,
  });
}

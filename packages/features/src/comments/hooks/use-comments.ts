"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import {
  deleteComment,
  editComment,
  getBlockCommentCounts,
  listComments,
  listReplies,
  postComment,
  setCommentLike,
} from "../api/comments.api.ts";
import { commentKeys } from "../keys.ts";
import { cursorAfter, withLike, type Comment, type CommentCursor, type CommentPage } from "../model/comment.ts";

type Pages = InfiniteData<CommentPage, CommentCursor | undefined>;

function useViewer() {
  const auth = useAuth();
  return { userId: auth.status === "authenticated" ? auth.user.id : null, ready: auth.status !== "loading" };
}

/** Top-level comments of a chapter (`blockId` null) or of one paragraph, a page at a time. */
export function useCommentList(chapterId: string, blockId: string | null, newestFirst: boolean, enabled = true) {
  const getClient = useDataClientGetter();
  const { userId, ready } = useViewer();
  return useInfiniteQuery<CommentPage, AppError, Pages, readonly unknown[], CommentCursor | undefined>({
    queryKey: commentKeys.list(chapterId, blockId, newestFirst, userId),
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      listComments(getClient(), { chapterId, blockId, newestFirst, cursor: pageParam }).catch((e: unknown) =>
        Promise.reject(toAppError(e)),
      ),
    getNextPageParam: cursorAfter,
    enabled: enabled && ready,
  });
}

export function useReplyList(chapterId: string, parentId: string, enabled: boolean) {
  const getClient = useDataClientGetter();
  const { userId, ready } = useViewer();
  return useInfiniteQuery<CommentPage, AppError, Pages, readonly unknown[], CommentCursor | undefined>({
    queryKey: commentKeys.replies(chapterId, parentId, userId),
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      listReplies(getClient(), { parentId, cursor: pageParam }).catch((e: unknown) => Promise.reject(toAppError(e))),
    getNextPageParam: cursorAfter,
    enabled: enabled && ready,
  });
}

export function useBlockCommentCounts(chapterId: string) {
  const getClient = useDataClientGetter();
  const { ready } = useViewer();
  return useQuery<Record<string, number>, AppError>({
    queryKey: commentKeys.counts(chapterId),
    queryFn: () => getBlockCommentCounts(getClient(), chapterId).catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: ready,
  });
}

/** What changes with any comment write: the lists, the replies and the margin counts of that chapter. */
function useRefreshChapter(chapterId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: commentKeys.chapter(chapterId) });
}

export function usePostComment(chapterId: string) {
  const getClient = useDataClientGetter();
  const refresh = useRefreshChapter(chapterId);
  return useMutation<string, AppError, { id: string; blockId: string | null; parentId: string | null; body: string }>({
    mutationFn: async (input) => {
      try {
        return await postComment(getClient(), { ...input, chapterId });
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: refresh,
  });
}

export function useEditComment(chapterId: string) {
  const getClient = useDataClientGetter();
  const refresh = useRefreshChapter(chapterId);
  return useMutation<void, AppError, { commentId: string; body: string }>({
    mutationFn: async ({ commentId, body }) => {
      try {
        await editComment(getClient(), commentId, body);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: refresh,
  });
}

export function useDeleteComment(chapterId: string) {
  const getClient = useDataClientGetter();
  const refresh = useRefreshChapter(chapterId);
  return useMutation<void, AppError, string>({
    mutationFn: async (commentId) => {
      try {
        await deleteComment(getClient(), commentId);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: refresh,
  });
}

function mapComment(queryClient: QueryClient, chapterId: string, commentId: string, change: (c: Comment) => Comment) {
  queryClient.setQueriesData<Pages>({ queryKey: commentKeys.chapter(chapterId) }, (data) => {
    // The margin counts share the prefix but are a plain object, not pages.
    if (!data || !("pages" in data)) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((item) => (item.id === commentId ? change(item) : item)),
      })),
    };
  });
}

/**
 * Likes a comment (or takes the like back). The new state is shown at once in every list the comment appears in; the
 * server's count replaces the guess, and a refusal puts everything back.
 */
export function useToggleCommentLike(chapterId: string) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  return useMutation<
    number,
    AppError,
    { commentId: string; liked: boolean },
    { snapshots: [readonly unknown[], unknown][] }
  >({
    mutationFn: async ({ commentId, liked }) => {
      try {
        return await setCommentLike(getClient(), commentId, liked);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onMutate: async ({ commentId, liked }) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.chapter(chapterId) });
      const snapshots = queryClient.getQueriesData({ queryKey: commentKeys.chapter(chapterId) }) as [
        readonly unknown[],
        unknown,
      ][];
      mapComment(queryClient, chapterId, commentId, (comment) => withLike(comment, liked));
      return { snapshots };
    },
    onError: (_error, _input, context) => {
      for (const [key, data] of context?.snapshots ?? []) queryClient.setQueryData(key, data);
    },
    onSuccess: (likes, { commentId, liked }) =>
      mapComment(queryClient, chapterId, commentId, (comment) => ({ ...comment, likedByMe: liked, likes })),
  });
}

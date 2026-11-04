"use client";

import { Skeleton } from "@storynest/ui/components/skeleton";
import { Button } from "@storynest/ui/components/button";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { useAuth } from "../../_shared/auth.tsx";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useCommentList, usePostComment } from "../hooks/use-comments.ts";
import { commentErrorMessage } from "../model/comment.ts";
import { commentText } from "../strings.ts";
import { CommentComposer } from "./comment-composer.tsx";
import { CommentItem } from "./comment-item.tsx";
import { currentLocale } from "../../_shared/i18n.ts";

/**
 * The comments of a chapter (`blockId` omitted) or of one paragraph: a box to write in, the comments a page at a time,
 * replies under each. A guest can read but is sent to sign in to write, reply or like. The chapter's comments show the
 * newest first, a paragraph's the oldest first (a short conversation reads in order).
 */
export function CommentThread({
  chapterId,
  blockId = null,
  newestFirst = blockId === null,
  locale = currentLocale(),
}: {
  chapterId: string;
  blockId?: string | null;
  newestFirst?: boolean;
  locale?: string;
}) {
  const auth = useAuth();
  const navigation = useNavigation();
  const toast = useAppToast();
  const list = useCommentList(chapterId, blockId, newestFirst);
  const post = usePostComment(chapterId);

  const loginHref = `/login?next=${encodeURIComponent(navigation.pathname)}`;
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col gap-4">
      {auth.status === "authenticated" ? (
        <CommentComposer
          label={commentText.composer.label}
          onSubmit={async (body, id) => {
            try {
              await post.mutateAsync({ id, blockId, parentId: null, body });
            } catch (error) {
              throw new Error(commentErrorMessage(error as Parameters<typeof commentErrorMessage>[0]), {
                cause: error,
              });
            }
            toast.success(commentText.composer.posted);
          }}
        />
      ) : auth.status === "unauthenticated" ? (
        <Button asChild variant="outline" size="sm" className="w-fit">
          <AppLink href={loginHref}>{commentText.composer.guest}</AppLink>
        </Button>
      ) : null}

      {list.isError ? (
        <ErrorState
          title={commentText.error.title}
          description={commentText.error.description}
          retryLabel={commentText.error.retry}
          onRetry={() => void list.refetch()}
        />
      ) : list.isPending ? (
        <div className="flex flex-col gap-3" aria-busy>
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" aria-hidden />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{blockId === null ? commentText.empty : commentText.emptyBlock}</p>
      ) : (
        <ul aria-label={commentText.threadLabel} className="flex flex-col gap-5">
          {items.map((comment) => (
            <li key={comment.id}>
              <CommentItem comment={comment} chapterId={chapterId} locale={locale} />
            </li>
          ))}
        </ul>
      )}

      {list.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {list.isFetchingNextPage ? commentText.loadingMore : commentText.loadMore}
        </Button>
      ) : null}
    </div>
  );
}

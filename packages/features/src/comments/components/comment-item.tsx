"use client";

import { Heart, MoreHorizontal } from "lucide-react";
import { Fragment, useState } from "react";
import { formatCount, formatRelativeTime } from "@storynest/utils";
import { COMMENT_STATUS, HIDE_SOURCE } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@storynest/ui/components/dropdown-menu";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { SpoilerText } from "@storynest/ui/widgets/spoiler-text";
import { ReportButton } from "../../moderation/index.ts";
import { useAuth } from "../../_shared/auth.tsx";
import { useNavigation } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import {
  useCanModerateComments,
  useDeleteComment,
  useEditComment,
  usePostComment,
  useReplyList,
  useSetCommentHidden,
  useToggleCommentLike,
} from "../hooks/use-comments.ts";
import { commentErrorMessage, isPlaceholder, type Comment } from "../model/comment.ts";
import { splitSpoilers } from "../model/spoiler.ts";
import { commentText } from "../strings.ts";
import { CommentComposer } from "./comment-composer.tsx";

const t = commentText.item;

/** One comment with its actions. A top-level comment can be replied to and shows its replies below; a reply cannot. */
export function CommentItem({
  comment,
  chapterId,
  locale,
  isReply = false,
}: {
  comment: Comment;
  chapterId: string;
  locale: string;
  isReply?: boolean;
}) {
  const auth = useAuth();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  const navigation = useNavigation();
  const toast = useAppToast();
  const like = useToggleCommentLike(chapterId);
  const edit = useEditComment(chapterId);
  const remove = useDeleteComment(chapterId);
  const post = usePostComment(chapterId);
  const canModerate = useCanModerateComments(chapterId).data === true;
  const setHidden = useSetCommentHidden(chapterId);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const placeholder = isPlaceholder(comment);
  const own = userId !== null && comment.authorId === userId;
  const canChange = own && comment.status === COMMENT_STATUS.VISIBLE;
  const canHide = canModerate && comment.status === COMMENT_STATUS.VISIBLE;
  const canShow = canModerate && comment.hiddenBy === HIDE_SOURCE.AUTHOR;
  const hasMenu = canChange || canHide || canShow;
  const loginHref = `/login?next=${encodeURIComponent(navigation.pathname)}`;

  const toggleLike = () => {
    if (userId === null) {
      navigation.push(loginHref);
      return;
    }
    like.mutate(
      { commentId: comment.id, liked: !comment.likedByMe },
      { onError: (error) => toast.error(commentErrorMessage(error)) },
    );
  };

  const changeHidden = (hidden: boolean) =>
    setHidden.mutate(
      { commentId: comment.id, hidden },
      {
        onSuccess: () => toast.success(hidden ? t.hidden : t.shown),
        onError: (error) => toast.error(commentErrorMessage(error)),
      },
    );

  const hiddenNotice = (): string => {
    if (comment.hiddenBy === HIDE_SOURCE.AUTHOR)
      return canModerate ? t.hiddenByAuthorForAuthor : t.hiddenByAuthorNotice;
    return canModerate && !own ? t.hiddenByModeratorForAuthor : t.hiddenNotice;
  };

  const fail = (error: unknown): never => {
    throw new Error(commentErrorMessage(error as Parameters<typeof commentErrorMessage>[0]));
  };

  return (
    <article aria-label={comment.authorName ?? t.anonymous} className="flex flex-col gap-2">
      {placeholder ? (
        <p className="text-sm italic text-muted-foreground">{t.deletedPlaceholder}</p>
      ) : (
        <>
          <header className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className="font-medium">{comment.authorName ?? t.anonymous}</span>
            <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt, locale)}</span>
            {comment.edited ? <span className="text-xs text-muted-foreground">({t.edited})</span> : null}
            {hasMenu ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="icon" variant="ghost" className="ml-auto size-7" aria-label={t.menu}>
                    <MoreHorizontal aria-hidden className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canChange ? (
                    <>
                      <DropdownMenuItem onSelect={() => setEditing(true)}>{t.edit}</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onSelect={() => setConfirmingDelete(true)}>
                        {t.delete}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  {canHide ? <DropdownMenuItem onSelect={() => changeHidden(true)}>{t.hide}</DropdownMenuItem> : null}
                  {canShow ? <DropdownMenuItem onSelect={() => changeHidden(false)}>{t.show}</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </header>

          {comment.status === COMMENT_STATUS.HIDDEN ? (
            <p role="note" className="rounded-md border bg-muted p-2 text-xs text-muted-foreground">
              {hiddenNotice()}
            </p>
          ) : null}

          {editing ? (
            <CommentComposer
              label={commentText.composer.label}
              initial={comment.body ?? ""}
              submitLabel={t.saveEdit}
              submittingLabel={t.saving}
              autoFocus
              onCancel={() => setEditing(false)}
              onSubmit={async (body) => {
                await edit.mutateAsync({ commentId: comment.id, body }).catch(fail);
                setEditing(false);
                toast.success(t.saved);
              }}
            />
          ) : (
            <p className="whitespace-pre-line break-words text-sm">
              <CommentBody body={comment.body ?? ""} />
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2"
              aria-pressed={userId === null ? undefined : comment.likedByMe}
              aria-label={userId === null ? t.guestLike : comment.likedByMe ? t.unlike : t.like}
              disabled={like.isPending}
              onClick={toggleLike}
            >
              <Heart aria-hidden className={comment.likedByMe ? "size-3.5 fill-current" : "size-3.5"} />
              <span className="text-xs">{t.likes(formatCount(comment.likes, locale))}</span>
            </Button>
            {!isReply && userId !== null && comment.status === COMMENT_STATUS.VISIBLE ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                aria-expanded={replying}
                onClick={() => setReplying((open) => !open)}
              >
                {t.reply}
              </Button>
            ) : null}
            {!own && comment.status === COMMENT_STATUS.VISIBLE ? (
              <ReportButton kind="comment" targetId={comment.id} label={t.report} />
            ) : null}
          </div>
        </>
      )}

      {replying ? (
        <div className="ml-4 border-l pl-3">
          <CommentComposer
            label={commentText.composer.replyLabel}
            autoFocus
            onCancel={() => setReplying(false)}
            onSubmit={async (body, id) => {
              await post.mutateAsync({ id, blockId: comment.blockId, parentId: comment.id, body }).catch(fail);
              setReplying(false);
              setShowReplies(true);
            }}
          />
        </div>
      ) : null}

      {!isReply && comment.replyCount > 0 ? (
        <div className="ml-4 flex flex-col gap-2 border-l pl-3">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-fit px-2 text-xs"
            aria-expanded={showReplies}
            onClick={() => setShowReplies((open) => !open)}
          >
            {showReplies ? t.hideReplies : t.showReplies(comment.replyCount)}
          </Button>
          {showReplies ? <ReplyList chapterId={chapterId} parentId={comment.id} locale={locale} /> : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={t.confirmDeleteTitle}
        description={t.confirmDeleteDescription}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        destructive
        onConfirm={async () => {
          try {
            await remove.mutateAsync(comment.id);
            toast.success(t.deleted);
          } catch (error) {
            toast.error(commentErrorMessage(error as Parameters<typeof commentErrorMessage>[0]));
            throw error;
          }
        }}
      />
    </article>
  );
}

/** A comment's text as plain text nodes, with `||spoiler||` parts covered until pressed (render only). */
function CommentBody({ body }: { body: string }) {
  return (
    <>
      {splitSpoilers(body).map((segment, index) =>
        segment.spoiler ? (
          <SpoilerText key={index} coverLabel={t.spoiler}>
            {segment.text}
          </SpoilerText>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}

function ReplyList({ chapterId, parentId, locale }: { chapterId: string; parentId: string; locale: string }) {
  const replies = useReplyList(chapterId, parentId, true);
  if (replies.isPending) return <p className="text-xs text-muted-foreground">{commentText.loadingMore}</p>;
  if (replies.isError) return <p className="text-xs text-destructive">{commentText.error.title}</p>;
  const items = replies.data.pages.flatMap((page) => page.items);
  return (
    <>
      <ul aria-label={commentText.repliesLabel} className="flex flex-col gap-3">
        {items.map((reply) => (
          <li key={reply.id}>
            <CommentItem comment={reply} chapterId={chapterId} locale={locale} isReply />
          </li>
        ))}
      </ul>
      {replies.hasNextPage ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-fit px-2 text-xs"
          disabled={replies.isFetchingNextPage}
          onClick={() => void replies.fetchNextPage()}
        >
          {replies.isFetchingNextPage ? commentText.loadingMore : commentText.loadMoreReplies}
        </Button>
      ) : null}
    </>
  );
}

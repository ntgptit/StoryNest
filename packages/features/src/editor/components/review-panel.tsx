"use client";

import { useId, useState } from "react";
import { DB_LIMITS, REVIEW_STATUS } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import { Label } from "@storynest/ui/components/label";
import { Textarea } from "@storynest/ui/components/textarea";
import { ApprovalLine, type ApprovalStep } from "@storynest/ui/widgets/approval-line";
import { useAuth } from "../../_shared/auth.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useChapterPublishState } from "../hooks/use-publishing.ts";
import { useChapterReview, useDecideReview, useRequestReview } from "../hooks/use-team-tools.ts";
import { reviewActions, reviewErrorMessage, type ChapterReview } from "../model/review.ts";
import { editorText } from "../strings.ts";

const t = editorText.review;

function steps(review: ChapterReview | null): ApprovalStep[] {
  const decided = review !== null && review.status !== REVIEW_STATUS.PENDING;
  return [
    { key: "draft", label: t.steps.draft, name: review?.requesterName ?? t.nobody, state: review ? "done" : "empty" },
    {
      key: "review",
      label: t.steps.review,
      name: decided ? (review.deciderName ?? t.nobody) : "",
      state: !decided ? "empty" : review.status === REVIEW_STATUS.APPROVED ? "done" : "rejected",
    },
    {
      key: "approved",
      label: t.steps.approved,
      name: review?.status === REVIEW_STATUS.APPROVED ? (review.deciderName ?? t.nobody) : "",
      state: review?.status === REVIEW_STATUS.APPROVED ? "done" : "empty",
    },
  ];
}

function statusText(review: ChapterReview | null, stale: boolean): string {
  if (review === null) return t.status.none;
  const line =
    review.status === REVIEW_STATUS.PENDING
      ? t.status.pending(review.requesterName, review.revision)
      : review.status === REVIEW_STATUS.APPROVED
        ? t.status.approved(review.deciderName ?? t.nobody, review.revision)
        : t.status.changes(review.deciderName ?? t.nobody, review.revision);
  return stale ? `${line} ${t.status.stale}` : line;
}

/**
 * Draft sign-off (Lucian 180): anyone on the team asks for a review of the saved draft (it is saved first), the owner
 * or a co-author who did not ask approves it or sends it back, with an optional note; the others get a notification.
 * It does not change who may publish. The seals show who drafted, the review decision and the approval.
 */
export function ReviewPanel({
  chapterId,
  ensureSaved,
  currentRevision,
}: {
  chapterId: string;
  ensureSaved: () => Promise<number | null>;
  /** The revision of the draft as last saved here, to tell when a sign-off is out of date. */
  currentRevision: number;
}) {
  const toast = useAppToast();
  const auth = useAuth();
  const me = auth.status === "authenticated" ? auth.user.id : null;
  const publishState = useChapterPublishState(chapterId);
  const review = useChapterReview(chapterId);
  const request = useRequestReview(chapterId, ensureSaved);
  const decide = useDecideReview(chapterId);
  const [note, setNote] = useState("");
  const noteId = useId();
  if (review.isPending || review.isError || publishState.isPending || !publishState.data) return null;

  const current = review.data;
  const actions = reviewActions(current, publishState.data.role, me, currentRevision);
  const busy = request.isPending || decide.isPending;
  const onError = (error: Parameters<typeof reviewErrorMessage>[0]) => toast.error(reviewErrorMessage(error));
  const done = (message: string) => () => {
    setNote("");
    toast.success(message);
  };

  return (
    <ApprovalLine title={t.title} steps={steps(current)} status={statusText(current, actions.stale)}>
      <div className="flex w-full flex-col gap-2">
        {current?.requestNote ? <p className="text-sm">{t.requestNote(current.requestNote)}</p> : null}
        {current?.decisionNote ? <p className="text-sm">{t.decisionNote(current.decisionNote)}</p> : null}
        {actions.canRequest || actions.canDecide ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={noteId}>{t.note}</Label>
            <Textarea
              id={noteId}
              value={note}
              rows={2}
              maxLength={DB_LIMITS.reviewNote}
              placeholder={t.notePlaceholder}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        ) : null}
        {actions.ownRequest ? <p className="text-xs text-muted-foreground">{t.ownRequest}</p> : null}
        <div className="flex flex-wrap justify-center gap-2">
          {actions.canDecide ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => decide.mutate({ approve: true, note }, { onSuccess: done(t.approvedDone), onError })}
              >
                {t.approve}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => decide.mutate({ approve: false, note }, { onSuccess: done(t.sentBack), onError })}
              >
                {t.sendBack}
              </Button>
            </>
          ) : null}
          {actions.canRequest ? (
            <Button
              type="button"
              size="sm"
              variant={actions.canDecide ? "ghost" : "default"}
              disabled={busy}
              onClick={() => request.mutate(note, { onSuccess: done(t.requested), onError })}
            >
              {current === null ? t.request : t.requestAgain}
            </Button>
          ) : null}
        </div>
        <p className="text-center text-xs text-muted-foreground">{t.hint}</p>
      </div>
    </ApprovalLine>
  );
}

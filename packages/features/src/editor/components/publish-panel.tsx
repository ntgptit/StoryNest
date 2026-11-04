"use client";

import { useRef, useState } from "react";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@storynest/ui/components/dialog";
import { Input } from "@storynest/ui/components/input";
import { Label } from "@storynest/ui/components/label";
import { CHAPTER_STATUS } from "@storynest/validation";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { useAppToast } from "../../_shared/toast.tsx";
import { usePublishAction, useChapterPublishState } from "../hooks/use-publishing.ts";
import {
  canPublish,
  canUnpublishChapter,
  formatLocalDateTime,
  localZone,
  minLocalDateTime,
  publishErrorMessage,
  scheduleInstant,
} from "../model/publishing.ts";
import { editorText } from "../strings.ts";

const t = editorText.publish;

/**
 * Publish now, schedule, or take the chapter back. Everything is based on the saved draft: before any of them the
 * unsaved text is saved first (`ensureSaved` resolves to the revision to publish, or null when that failed), and the
 * revision is sent along, so a draft someone else changed meanwhile is refused instead of published over.
 * The buttons are locked from the first click until the answer is back, so a double click cannot publish twice.
 */
export function PublishPanel({
  chapterId,
  locale,
  ensureSaved,
}: {
  chapterId: string;
  locale: string;
  ensureSaved: () => Promise<number | null>;
}) {
  const toast = useAppToast();
  const state = useChapterPublishState(chapterId);
  const action = usePublishAction(chapterId);
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  if (!state.data) return null;
  const current = state.data;
  const zone = localZone();

  /** Runs one action under the lock; shows the contract-based message when the server refuses. */
  const run = async (task: (revision: number | null) => Promise<void>, needsSaved: boolean, success: string) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      let revision: number | null = null;
      if (needsSaved) {
        revision = await ensureSaved();
        if (revision === null) {
          setError(t.saveFirst);
          return false;
        }
      }
      await task(revision);
      toast.success(success);
      return true;
    } catch (failure) {
      setError(publishErrorMessage(failure as Parameters<typeof publishErrorMessage>[0]));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const publish = () =>
    run(
      (revision) => action.mutateAsync({ kind: "publish", expectedRevision: revision as number }),
      true,
      current.status === CHAPTER_STATUS.PUBLISHED ? t.republished : t.published,
    );

  const submitSchedule = async () => {
    const parsed = scheduleInstant(scheduleValue);
    if (!parsed.ok) {
      setScheduleError(parsed.message);
      return;
    }
    setScheduleError(null);
    const done = await run(
      (revision) =>
        action.mutateAsync({ kind: "schedule", expectedRevision: revision as number, scheduledFor: parsed.iso }),
      true,
      t.scheduled,
    );
    if (done) setScheduling(false);
  };

  const stateText =
    current.status === CHAPTER_STATUS.SCHEDULED && current.scheduledFor
      ? t.state.scheduled(formatLocalDateTime(current.scheduledFor, locale), zone)
      : current.status === CHAPTER_STATUS.SCHEDULED
        ? t.state.draft
        : t.state[current.status];
  const allowed = canPublish(current);

  return (
    <section aria-label={t.title} className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">{t.title}</h2>
        <Badge variant="outline">{stateText}</Badge>
      </div>
      {!allowed && current.status === CHAPTER_STATUS.ARCHIVED ? (
        <p className="text-sm text-muted-foreground">{t.archivedHint}</p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {allowed ? (
          <>
            <Button type="button" onClick={() => void publish()} disabled={busy}>
              {busy ? t.working : current.status === CHAPTER_STATUS.PUBLISHED ? t.republish : t.publish}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setScheduling(true)}>
              {t.schedule}
            </Button>
          </>
        ) : null}
        {canUnpublishChapter(current) ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            disabled={busy}
            onClick={() => setConfirmUnpublish(true)}
          >
            {current.status === CHAPTER_STATUS.SCHEDULED ? t.cancelSchedule : t.unpublish}
          </Button>
        ) : null}
      </div>

      <Dialog
        open={scheduling}
        onOpenChange={(open) => {
          setScheduling(open);
          if (!open) setScheduleError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.scheduleDialog.title}</DialogTitle>
            <DialogDescription>{t.scheduleDialog.description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-at">{t.scheduleDialog.label}</Label>
            <Input
              id="schedule-at"
              type="datetime-local"
              value={scheduleValue}
              min={minLocalDateTime()}
              onChange={(event) => setScheduleValue(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t.scheduleDialog.zone(zone)}</p>
            {scheduleError ? (
              <p role="alert" className="text-sm text-destructive">
                {scheduleError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setScheduling(false)}>
              {t.scheduleDialog.cancel}
            </Button>
            <Button type="button" onClick={() => void submitSchedule()} disabled={busy}>
              {t.scheduleDialog.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmUnpublish}
        onOpenChange={setConfirmUnpublish}
        title={t.unpublishDialog.title}
        description={t.unpublishDialog.description}
        confirmLabel={t.unpublishDialog.confirm}
        cancelLabel={t.scheduleDialog.cancel}
        destructive
        onConfirm={async () => {
          const done = await run(() => action.mutateAsync({ kind: "unpublish" }), false, t.unpublished);
          if (!done) throw new Error("unpublish failed"); // keeps the dialog open; the message is already shown
        }}
      />
    </section>
  );
}

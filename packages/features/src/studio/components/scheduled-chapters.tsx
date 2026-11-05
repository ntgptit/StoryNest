"use client";

import { ArrowUpRight } from "lucide-react";
import { useCallback, useState } from "react";
import { formatRelativeTime } from "@storynest/utils";
import { Button } from "@storynest/ui/components/button";
import { Input } from "@storynest/ui/components/input";
import { Label } from "@storynest/ui/components/label";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { ScheduledOutbox, ScheduledOutboxItem } from "@storynest/ui/widgets/scheduled-outbox";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { AppError } from "../../_shared/errors.ts";
import {
  canPublish,
  canUnpublishChapter,
  formatLocalDateTime,
  getChapterDraft,
  localDateTimeValue,
  localZone,
  minLocalDateTime,
  scheduleInstant,
  usePublishFlow,
  type ChapterPublishState,
} from "../../editor/index.ts";
import { scheduledChapters, type StudioChapter } from "../model/studio-chapter.ts";
import type { StudioRole } from "../model/studio-story.ts";
import { studioText } from "../strings.ts";

const t = studioText.chapters;

/**
 * The story's scheduled chapters as an outbox, soonest first: when each goes out (relative and exact, in the
 * author's time zone), change the time, publish now or cancel the schedule. The rules are the publish panel's own
 * (canPublish / canUnpublishChapter, usePublishFlow); nothing renders when no chapter is scheduled.
 */
export function ScheduledChapters({
  chapters,
  role,
  locale,
}: {
  chapters: readonly StudioChapter[];
  role: StudioRole;
  locale: string;
}) {
  const scheduled = scheduledChapters(chapters);
  if (scheduled.length === 0) return null;
  return (
    <ScheduledOutbox title={t.outbox.title} description={t.outbox.description(localZone())}>
      {scheduled.map((chapter) => (
        <ScheduledChapterRow key={chapter.id} chapter={chapter} role={role} locale={locale} />
      ))}
    </ScheduledOutbox>
  );
}

function ScheduledChapterRow({
  chapter,
  role,
  locale,
}: {
  chapter: StudioChapter & { scheduledFor: string };
  role: StudioRole;
  locale: string;
}) {
  const getClient = useDataClientGetter();
  // Nothing is typed here: what goes out is the draft as saved now, so its revision is read fresh at the click. A
  // draft saved elsewhere after that read is still refused by the RPC (PT409), exactly as in the editor.
  const savedRevision = useCallback(async () => {
    const draft = await getChapterDraft(getClient(), chapter.id);
    if (!draft) throw new AppError("notFound", "The chapter draft is gone");
    return draft.revision;
  }, [getClient, chapter.id]);
  const flow = usePublishFlow(chapter.id, savedRevision);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [valueError, setValueError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const state: ChapterPublishState = { status: chapter.status, scheduledFor: chapter.scheduledFor, role };
  const allowed = canPublish(state);
  const name = chapter.title || t.untitled;
  const zone = localZone();

  const startEditing = (open: boolean) => {
    setEditing(open);
    setValueError(null);
    if (open) setValue(localDateTimeValue(new Date(chapter.scheduledFor)));
  };

  const reschedule = async () => {
    const parsed = scheduleInstant(value);
    if (!parsed.ok) {
      setValueError(parsed.message);
      return;
    }
    setValueError(null);
    if (await flow.schedule(parsed.iso, t.outbox.rescheduled)) setEditing(false);
  };

  const inputId = `reschedule-${chapter.id}`;

  return (
    <ScheduledOutboxItem
      when={formatRelativeTime(chapter.scheduledFor, locale)}
      whenDetail={`${formatLocalDateTime(chapter.scheduledFor, locale)} (${zone})`}
      editLabel={t.outbox.changeTime(name)}
      editable={allowed}
      editing={editing}
      onEditingChange={startEditing}
      editor={
        <form
          noValidate
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void reschedule();
          }}
        >
          <div className="flex min-w-0 flex-col gap-1">
            <Label htmlFor={inputId} className="text-xs text-muted-foreground">
              {t.outbox.newTime}
            </Label>
            <Input
              id={inputId}
              type="datetime-local"
              value={value}
              min={minLocalDateTime()}
              aria-invalid={valueError !== null}
              className="w-auto"
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
          <Button type="submit" size="sm" disabled={flow.busy}>
            {t.outbox.save}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => startEditing(false)}>
            {t.outbox.cancelEdit}
          </Button>
          {valueError ? (
            <p role="alert" className="w-full text-sm text-destructive">
              {valueError}
            </p>
          ) : null}
        </form>
      }
      title={name}
      meta={`${t.position(chapter.position)} · /${chapter.slug}`}
      actions={
        <>
          {allowed ? (
            <Button type="button" size="sm" disabled={flow.busy} onClick={() => void flow.publish(t.outbox.published)}>
              <ArrowUpRight aria-hidden className="size-4" />
              {flow.busy ? t.outbox.working : t.outbox.publishNow}
            </Button>
          ) : null}
          {canUnpublishChapter(state) ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={flow.busy}
              onClick={() => setConfirmCancel(true)}
            >
              {t.outbox.cancelSchedule}
            </Button>
          ) : null}
          <ConfirmDialog
            open={confirmCancel}
            onOpenChange={setConfirmCancel}
            title={t.outbox.cancelDialog.title}
            description={t.outbox.cancelDialog.description}
            confirmLabel={t.outbox.cancelDialog.confirm}
            cancelLabel={t.outbox.cancelDialog.keep}
            destructive
            onConfirm={async () => {
              if (!(await flow.unpublish(t.outbox.cancelled))) throw new Error("cancel failed"); // dialog stays open
            }}
          />
        </>
      }
      notice={
        flow.error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {flow.error}
          </p>
        ) : null
      }
    />
  );
}

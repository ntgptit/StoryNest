"use client";

import { CalendarClock } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
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
import { InlineAlert } from "@storynest/ui/widgets/inline-alert";
import { ReadinessChecklist } from "@storynest/ui/widgets/readiness-checklist";
import { SplitButton } from "@storynest/ui/widgets/split-button";
import { AppLink } from "../../_shared/platform.tsx";
import { studioStrings, useStoryReaderAccess } from "../../studio/index.ts";
import { useChapterPublishState, usePublishFlow } from "../hooks/use-publishing.ts";
import {
  canPublish,
  canUnpublishChapter,
  formatLocalDateTime,
  isReady,
  localZone,
  minLocalDateTime,
  publishReadiness,
  scheduleCountdown,
  scheduleInstant,
} from "../model/publishing.ts";
import { editorText } from "../strings.ts";

const t = editorText.publish;

/** How often the "Goes live in …" line is refreshed: it never shows seconds, so twice a minute is enough. */
const COUNTDOWN_TICK_MS = 30_000;

/** The current time, refreshed every `everyMs` while `enabled` (the schedule countdown); frozen otherwise. */
function useNow(enabled: boolean, everyMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [enabled, everyMs]);
  return now;
}

/**
 * Publish now, schedule, or take the chapter back. Everything is based on the saved draft: before any of them the
 * unsaved text is saved first (`ensureSaved` resolves to the revision to publish, or null when that failed), and the
 * revision is sent along, so a draft someone else changed meanwhile is refused instead of published over.
 * The buttons are locked from the first click until the answer is back, so a double click cannot publish twice.
 * Publish and Schedule… are one split button (Lucian 010); the readiness checklist above it (Lucian 014) lists the
 * existing rules (publishReadiness) and keeps the split button locked, and says why, until they all hold.
 * While it runs, the split button's label follows the steps (saving the draft, then publishing; Lucian 081's steps); a
 * refusal shows as an inline alert that can be dismissed (Lucian 072); a scheduled chapter counts down to its time
 * (Lucian 100, as text: no flipping digits).
 */
export function PublishPanel({
  chapterId,
  storyId,
  locale,
  ensureSaved,
  draft,
}: {
  chapterId: string;
  storyId: string;
  locale: string;
  ensureSaved: () => Promise<number | null>;
  /** The draft rules on what is on screen now (checkTitle / checkBody), for the readiness checklist. */
  draft: Parameters<typeof publishReadiness>[0];
}) {
  const state = useChapterPublishState(chapterId);
  // Who can read the story once this chapter is out: a chapter is no use to readers in a private or draft story.
  const reach = useStoryReaderAccess(storyId, state.data?.status === CHAPTER_STATUS.PUBLISHED ? 0 : 1);
  const flow = usePublishFlow(chapterId, ensureSaved);
  const checklistId = useId();
  const [scheduling, setScheduling] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scheduledFor = state.data?.status === CHAPTER_STATUS.SCHEDULED ? state.data.scheduledFor : null;
  const now = useNow(scheduledFor !== null, COUNTDOWN_TICK_MS);

  if (!state.data) return null;
  const current = state.data;
  const zone = localZone();
  const { busy, error, phase } = flow;

  const publish = () => flow.publish(current.status === CHAPTER_STATUS.PUBLISHED ? t.republished : t.published);

  const submitSchedule = async () => {
    const parsed = scheduleInstant(scheduleValue);
    if (!parsed.ok) {
      setScheduleError(parsed.message);
      return;
    }
    setScheduleError(null);
    if (await flow.schedule(parsed.iso, t.scheduled)) setScheduling(false);
  };

  const stateText =
    current.status === CHAPTER_STATUS.SCHEDULED && current.scheduledFor
      ? t.state.scheduled(formatLocalDateTime(current.scheduledFor, locale), zone)
      : current.status === CHAPTER_STATUS.SCHEDULED
        ? t.state.draft
        : t.state[current.status];
  const allowed = canPublish(current);
  const checks = publishReadiness(draft, current);
  const ready = isReady(checks);
  const doneCount = checks.filter((check) => check.done).length;

  return (
    <section aria-label={t.title} className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">
          {t.title}
        </h2>
        <Badge variant="outline">{stateText}</Badge>
        {scheduledFor ? (
          <span className="text-xs text-muted-foreground">{scheduleCountdown(scheduledFor, locale, now)}</span>
        ) : null}
      </div>
      {error ? (
        <InlineAlert
          key={error}
          tone="danger"
          onDismiss={flow.dismissError}
          dismissLabel={t.dismissError}
          focusAfterDismiss={headingRef}
        >
          {error}
        </InlineAlert>
      ) : null}
      {reach ? (
        <p
          role="note"
          className={reach.access.state === "team_only" ? "text-sm font-medium" : "text-sm text-muted-foreground"}
        >
          {studioStrings.access.state[reach.access.state]}
          {reach.access.reasons.length > 0
            ? `: ${reach.access.reasons.map((reason) => studioStrings.access.reason[reason]).join(" · ")}`
            : ""}
          {reach.access.state === "team_only" && reach.role !== "editor" ? (
            <>
              {" "}
              <AppLink href={`/studio/story/${storyId}`} className="underline underline-offset-4">
                {t.changeVisibility}
              </AppLink>
            </>
          ) : null}
        </p>
      ) : null}
      {current.role === null ? null : (
        <ReadinessChecklist
          id={checklistId}
          title={t.readiness.title}
          summary={ready ? t.readiness.ready : t.readiness.summary(doneCount, checks.length)}
          stateLabels={{ done: t.readiness.done, todo: t.readiness.todo }}
          items={checks.map((check) => ({
            id: check.id,
            label: t.readiness.items[check.id],
            done: check.done,
            hint: check.hint,
          }))}
        />
      )}
      <div className="flex flex-wrap gap-2">
        {allowed ? (
          <SplitButton
            label={current.status === CHAPTER_STATUS.PUBLISHED ? t.republish : t.publish}
            busy={busy}
            busyLabel={phase && phase !== "unpublishing" ? t.phase[phase] : t.working}
            disabled={!ready}
            describedBy={checklistId}
            onClick={() => void publish()}
            menuLabel={t.more}
            options={[
              {
                id: "schedule",
                label: t.schedule,
                description: t.scheduleDescription,
                icon: <CalendarClock />,
                onSelect: () => setScheduling(true),
              },
            ]}
          />
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
            <Button type="button" onClick={() => void submitSchedule()} disabled={busy} aria-busy={busy || undefined}>
              {phase === "saving" || phase === "scheduling" ? t.phase[phase] : t.scheduleDialog.submit}
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
          const done = await flow.unpublish(t.unpublished);
          if (!done) throw new Error("unpublish failed"); // keeps the dialog open; the message is already shown
        }}
      />
    </section>
  );
}

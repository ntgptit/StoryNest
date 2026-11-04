"use client";

import { useState } from "react";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@storynest/ui/components/dialog";
import { Label } from "@storynest/ui/components/label";
import { Textarea } from "@storynest/ui/components/textarea";
import { MODERATION_ACTION, REPORT_STATUS, type ModerationAction } from "@storynest/validation";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useModerate, useResolveReport } from "../hooks/use-moderation.ts";
import {
  actionErrorMessage,
  actionTargetId,
  checkReason,
  contentActions,
  isOpen,
  REASON_MAX_LENGTH,
  reportTargetHref,
  type ModerationReport,
} from "../model/report.ts";
import { moderationText } from "../strings.ts";

const t = moderationText.console;

type Pending =
  | { kind: "content"; action: ModerationAction }
  | { kind: "report"; status: "reviewing" | "resolved" | "dismissed"; action: ModerationAction };

/** One report with its context and what the moderator can do. Every action asks for a written reason first. */
export function ReportCard({ report }: { report: ModerationReport }) {
  const toast = useAppToast();
  const moderate = useModerate();
  const resolve = useResolveReport();
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState("");
  const href = reportTargetHref(report);
  const open = isOpen(report);
  const busy = moderate.isPending || resolve.isPending;
  const problem = reason === "" ? null : checkReason(reason);

  const close = () => {
    setPending(null);
    setReason("");
    moderate.reset();
    resolve.reset();
  };

  const confirm = () => {
    if (!pending) return;
    const done = {
      onSuccess: () => {
        toast.success(t.done);
        close();
      },
    };
    if (pending.kind === "content") {
      moderate.mutate({ action: pending.action, targetId: actionTargetId(report), reason, reportId: report.id }, done);
    } else {
      resolve.mutate({ reportId: report.id, status: pending.status, reason }, done);
    }
  };

  const error = moderate.error ?? resolve.error;

  return (
    <article aria-label={report.title} className="flex flex-col gap-3 rounded-xl border p-4">
      <header className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{t.kinds[report.target]}</Badge>
        <Badge variant="outline">{t.statuses[report.status]}</Badge>
        <Badge variant="outline">
          {moderationText.report.reasons[report.reason as keyof typeof moderationText.report.reasons] ?? report.reason}
        </Badge>
        {report.openReports > 1 ? (
          <span className="text-xs text-muted-foreground">{t.openReports(report.openReports)}</span>
        ) : null}
      </header>

      <div className="flex flex-col gap-1">
        <p className="whitespace-pre-line break-words text-sm font-medium">{report.title}</p>
        <p className="text-xs text-muted-foreground">
          {t.stateLabel}: {t.states[report.state as keyof typeof t.states] ?? report.state}
          {href ? (
            <>
              {" · "}
              <AppLink href={href} className="underline-offset-4 hover:underline">
                {t.openTarget}
              </AppLink>
            </>
          ) : null}
        </p>
      </div>

      {report.description ? (
        <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{report.description}</p>
      ) : null}
      <p className="text-xs text-muted-foreground">{t.reportedBy(report.reporterName)}</p>

      <div className="flex flex-wrap gap-2">
        {contentActions(report).map((action) => (
          <Button
            key={action}
            type="button"
            size="sm"
            variant={
              action === MODERATION_ACTION.HIDE_COMMENT ||
              action === MODERATION_ACTION.REMOVE_STORY ||
              action === MODERATION_ACTION.SUSPEND_USER
                ? "destructive"
                : "outline"
            }
            disabled={busy}
            onClick={() => setPending({ kind: "content", action })}
          >
            {t.actions[action]}
          </Button>
        ))}
        {open && report.status === REPORT_STATUS.PENDING ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setPending({ kind: "report", status: "reviewing", action: MODERATION_ACTION.REVIEW_REPORT })}
          >
            {t.actions.review_report}
          </Button>
        ) : null}
        {open ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                setPending({ kind: "report", status: "resolved", action: MODERATION_ACTION.RESOLVE_REPORT })
              }
            >
              {t.actions.resolve_report}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                setPending({ kind: "report", status: "dismissed", action: MODERATION_ACTION.DISMISS_REPORT })
              }
            >
              {t.actions.dismiss_report}
            </Button>
          </>
        ) : null}
      </div>

      <Dialog open={pending !== null} onOpenChange={(next) => !next && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending ? t.actions[pending.action] : ""}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`reason-${report.id}`}>{t.dialog.reasonLabel}</Label>
            <Textarea
              id={`reason-${report.id}`}
              value={reason}
              maxLength={REASON_MAX_LENGTH}
              placeholder={t.dialog.reasonPlaceholder}
              onChange={(event) => setReason(event.target.value)}
            />
            {problem ? <p className="text-xs text-destructive">{t.dialog[problem]}</p> : null}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {actionErrorMessage(error)}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {t.dialog.cancel}
            </Button>
            <Button type="button" disabled={busy || checkReason(reason) !== null} onClick={confirm}>
              {busy ? t.dialog.confirming : t.dialog.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

"use client";

import { useState, type MouseEvent } from "react";
import { formatRelativeTime } from "@storynest/utils";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@storynest/ui/components/dialog";
import { Label } from "@storynest/ui/components/label";
import { Textarea } from "@storynest/ui/components/textarea";
import { MODERATION_ACTION, REPORT_STATUS, type ModerationAction } from "@storynest/validation";
import { cn } from "@storynest/ui/lib/utils";
import { currentLocale } from "../../_shared/i18n.ts";
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

/**
 * One report with its context and what the moderator can do. Every action asks for a written reason first.
 * - `card` (the queue): with `onOpen`, its title (or a click on the card outside its controls) opens the detail panel,
 *   and `selected` keeps it highlighted while the panel shows it;
 * - `panel` (inside the detail panel, which shows the title itself): the same content and actions, plus when it was
 *   reported, without the card frame.
 */
export function ReportCard({
  report,
  variant = "card",
  selected = false,
  onOpen,
}: {
  report: ModerationReport;
  variant?: "card" | "panel";
  selected?: boolean;
  onOpen?: () => void;
}) {
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
  const panel = variant === "panel";

  // A click on the card itself (not on one of its buttons or links, nor inside its dialog, which is portalled out of
  // the card's DOM but still bubbles through React) opens the detail; the title button is the keyboard route.
  const openFromCard = (event: MouseEvent<HTMLElement>) => {
    if (!onOpen || !(event.target instanceof Element) || !event.currentTarget.contains(event.target)) return;
    if (event.target.closest("button, a, input, textarea, [role=dialog]")) return;
    onOpen();
  };

  const Root = panel ? "div" : "article";

  return (
    <Root
      aria-label={panel ? undefined : report.title}
      aria-current={selected || undefined}
      onClick={panel ? undefined : openFromCard}
      className={cn(
        "flex flex-col gap-3",
        !panel && "rounded-xl border p-4 transition-colors",
        !panel && onOpen && "cursor-pointer hover:bg-accent/40",
        selected && "border-primary bg-accent/60 shadow-[inset_3px_0_0_var(--primary)]",
      )}
    >
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
        {panel ? null : onOpen ? (
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={onOpen}
            className="w-fit rounded-sm text-left text-sm font-medium break-words whitespace-pre-line underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {report.title}
          </button>
        ) : (
          <p className="whitespace-pre-line break-words text-sm font-medium">{report.title}</p>
        )}
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
      <p className="text-xs text-muted-foreground">
        {t.reportedBy(report.reporterName)}
        {panel ? ` · ${t.panel.reportedAt(formatRelativeTime(report.createdAt, currentLocale()))}` : null}
      </p>

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
    </Root>
  );
}

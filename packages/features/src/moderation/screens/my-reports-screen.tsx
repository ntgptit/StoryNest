"use client";

import { Flag } from "lucide-react";
import { formatRelativeTime } from "@storynest/utils";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { currentLocale } from "../../_shared/i18n.ts";
import { useAppToast } from "../../_shared/toast.tsx";
import { useMyReports, useWithdrawReport } from "../hooks/use-moderation.ts";
import { REPORT_REASONS } from "@storynest/validation";
import { moderationText } from "../strings.ts";

const t = moderationText.mine;

/** The reasons we have a label for; anything else (an older value) shows as it was stored. */
const reasonLabel = (reason: string): string =>
  (REPORT_REASONS as readonly string[]).includes(reason)
    ? moderationText.report.reasons[reason as (typeof REPORT_REASONS)[number]]
    : reason;

/** The reporter's side of moderation: every report they sent, its target kind, reason, date and outcome category. */
export function MyReportsScreen({ locale = currentLocale() }: { locale?: string }) {
  const reports = useMyReports();
  const withdraw = useWithdrawReport();
  const toast = useAppToast();
  return (
    <section aria-label={t.title} className="flex max-w-2xl flex-col gap-6">
      <PageHeader title={t.title} description={t.description} />
      {reports.isError ? (
        <ErrorState
          title={t.error.title}
          description={t.error.description}
          retryLabel={t.error.retry}
          onRetry={() => reports.refetch()}
        />
      ) : reports.isPending ? (
        <Skeleton className="h-32 w-full rounded-xl" aria-busy />
      ) : reports.data.length === 0 ? (
        <EmptyState icon={Flag} title={t.empty.title} description={t.empty.description} />
      ) : (
        <ul aria-label={t.listLabel} className="flex flex-col gap-3">
          {reports.data.map((report) => (
            <li key={report.id} className="flex flex-col gap-1 rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {moderationText.console.kinds[report.kind]}: {reasonLabel(report.reason)}
                </span>
                <Badge
                  variant={report.status === "dismissed" || report.status === "resolved" ? "secondary" : "outline"}
                >
                  {report.withdrawn ? t.status.withdrawn : t.status[report.status]}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {t.sentAt(formatRelativeTime(report.createdAt, locale))}
              </span>
              {report.status === "pending" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-1 w-fit"
                  disabled={withdraw.isPending}
                  onClick={() =>
                    withdraw.mutate(report.id, {
                      onSuccess: () => toast.success(t.withdrawn),
                      onError: (error) =>
                        toast.error(error.code === "PT409" ? t.withdrawErrors.started : t.withdrawErrors.generic),
                    })
                  }
                >
                  {withdraw.isPending ? t.withdrawing : t.withdraw}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

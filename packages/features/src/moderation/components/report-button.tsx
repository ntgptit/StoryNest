"use client";

import { Flag } from "lucide-react";
import { useState } from "react";
import { Button } from "@storynest/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@storynest/ui/components/dialog";
import { Label } from "@storynest/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@storynest/ui/components/select";
import { Textarea } from "@storynest/ui/components/textarea";
import { REPORT_REASONS, type ReportReason } from "@storynest/validation";
import { useAuth } from "../../_shared/auth.tsx";
import { useNavigation } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useSubmitReport } from "../hooks/use-moderation.ts";
import { isReportReason, REPORT_DETAILS_MAX_LENGTH, reportErrorMessage, type ReportTarget } from "../model/report.ts";
import { moderationText } from "../strings.ts";

const t = moderationText.report;

/**
 * "Report" for a story, chapter, comment or person. A guest is sent to sign in first. The dialog asks for a reason
 * (required) and details (optional); sending the same report twice is harmless.
 */
export function ReportButton({
  kind,
  targetId,
  ownerId,
  variant = "ghost",
  label,
}: {
  kind: ReportTarget;
  targetId: string;
  /** The account that owns the thing: they never see a button to report themselves. */
  ownerId?: string | undefined;
  variant?: "ghost" | "outline";
  /** Overrides the visible text; the accessible name always says what is being reported. */
  label?: string;
}) {
  const auth = useAuth();
  const navigation = useNavigation();
  const toast = useAppToast();
  const submit = useSubmitReport();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");

  if (auth.status === "loading") return null;
  const signedIn = auth.status === "authenticated";
  if (signedIn && ownerId !== undefined && auth.user.id === ownerId) return null;
  const name = `${t.button} ${t.kinds[kind]}`;

  const close = () => {
    setOpen(false);
    setReason("");
    setDetails("");
    submit.reset();
  };

  const send = () => {
    if (reason === "") return;
    submit.mutate(
      { kind, targetId, reason, description: details },
      {
        onSuccess: () => {
          toast.success(t.sent);
          close();
        },
      },
    );
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="sm"
        aria-label={name}
        onClick={() =>
          signedIn ? setOpen(true) : navigation.push(`/login?next=${encodeURIComponent(navigation.pathname)}`)
        }
      >
        <Flag aria-hidden className="size-4" />
        {label ?? t.button}
      </Button>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`${t.title}: ${t.kinds[kind]}`}</DialogTitle>
            <DialogDescription>{t.description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="report-reason">{t.reasonLabel}</Label>
              <Select value={reason} onValueChange={(value) => isReportReason(value) && setReason(value)}>
                <SelectTrigger id="report-reason">
                  <SelectValue placeholder={t.reasonPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t.reasons[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="report-details">{t.detailsLabel}</Label>
              <Textarea
                id="report-details"
                value={details}
                maxLength={REPORT_DETAILS_MAX_LENGTH}
                placeholder={t.detailsPlaceholder}
                onChange={(event) => setDetails(event.target.value)}
              />
            </div>
            {submit.error ? (
              <p role="alert" className="text-sm text-destructive">
                {reportErrorMessage(submit.error)}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {t.cancel}
            </Button>
            <Button type="button" disabled={reason === "" || submit.isPending} onClick={send}>
              {submit.isPending ? t.submitting : t.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

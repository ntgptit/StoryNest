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
import { Textarea } from "@storynest/ui/components/textarea";
import { CharacterRing } from "@storynest/ui/widgets/character-ring";
import { ChoicePills } from "@storynest/ui/widgets/choice-pills";
import { REPORT_REASONS, type ReportReason } from "@storynest/validation";
import { useAuth } from "../../_shared/auth.tsx";
import { useNavigation } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useSubmitReport } from "../hooks/use-moderation.ts";
import { REPORT_DETAILS_MAX_LENGTH, reportErrorMessage, type ReportTarget } from "../model/report.ts";
import { moderationText } from "../strings.ts";

const t = moderationText.report;
const REASON_OPTIONS = REPORT_REASONS.map((value) => ({ value, label: t.reasons[value] }));

/**
 * "Report" for a story, chapter, comment or person. A guest is sent to sign in first. The dialog asks for a reason
 * (required, one of the reason pills) and details (optional); the details hint and example change with the reason
 * (Lucian 295) and a ring fills towards the length limit. Sending the same report twice is harmless.
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
              <p id="report-reason-label" className="text-sm leading-none font-medium">
                {t.reasonLabel}
              </p>
              <ChoicePills
                aria-labelledby="report-reason-label"
                aria-required
                value={reason}
                onValueChange={setReason}
                options={REASON_OPTIONS}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="report-details">{t.detailsLabel}</Label>
              <div className="relative">
                <Textarea
                  id="report-details"
                  value={details}
                  maxLength={REPORT_DETAILS_MAX_LENGTH}
                  placeholder={reason === "" ? t.detailsPlaceholder : t.reasonHelp[reason].placeholder}
                  aria-describedby={reason === "" ? "report-details-count" : "report-details-hint report-details-count"}
                  className="pr-10"
                  onChange={(event) => setDetails(event.target.value)}
                />
                <CharacterRing
                  id="report-details-count"
                  length={details.length}
                  max={REPORT_DETAILS_MAX_LENGTH}
                  label={t.detailsCount(details.length, REPORT_DETAILS_MAX_LENGTH)}
                  className="pointer-events-none absolute right-2.5 bottom-2.5"
                />
              </div>
              {reason === "" ? null : (
                <p key={reason} id="report-details-hint" className="animate-hint-swap text-xs text-muted-foreground">
                  {t.reasonHelp[reason].hint}
                </p>
              )}
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

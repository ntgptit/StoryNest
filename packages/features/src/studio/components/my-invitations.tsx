"use client";

import { MailPlus } from "lucide-react";
import { Button } from "@storynest/ui/components/button";
import { useAppToast } from "../../_shared/toast.tsx";
import { useMyInvitations, useRespondToInvitation } from "../hooks/use-collaboration.ts";
import { invitationErrorMessage } from "../model/collaboration.ts";
import { studioText } from "../strings.ts";

const t = studioText.invitations;

/** Invitations waiting for an answer, shown above the story list. Renders nothing when there are none. */
export function MyInvitations() {
  const invitations = useMyInvitations();
  const respond = useRespondToInvitation();
  const toast = useAppToast();
  const items = invitations.data ?? [];
  if (items.length === 0) return null;

  return (
    <section aria-label={t.title} className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-card p-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <MailPlus aria-hidden className="size-4" />
        {t.title}
      </h2>
      <ul aria-label={t.listLabel} className="flex flex-col gap-2">
        {items.map((invitation) => (
          <li key={invitation.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">{invitation.storyTitle}</p>
              <p className="text-xs text-muted-foreground">
                {t.from(invitation.inviterName, studioText.role[invitation.role])}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={respond.isPending}
                onClick={() =>
                  respond.mutate(
                    { invitationId: invitation.id, accept: true },
                    {
                      onSuccess: () => toast.success(t.accepted),
                      onError: (error) => toast.error(invitationErrorMessage(error)),
                    },
                  )
                }
              >
                {t.accept}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={respond.isPending}
                onClick={() =>
                  respond.mutate(
                    { invitationId: invitation.id, accept: false },
                    {
                      onSuccess: () => toast.success(t.declined),
                      onError: (error) => toast.error(invitationErrorMessage(error)),
                    },
                  )
                }
              >
                {t.decline}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

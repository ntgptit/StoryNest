"use client";

import { FileQuestion, Lock, Users } from "lucide-react";
import { useState } from "react";
import { COLLABORATOR_ROLES } from "@storynest/validation";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import { Input } from "@storynest/ui/components/input";
import { Label } from "@storynest/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@storynest/ui/components/select";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import {
  useCancelInvitation,
  useCollaborators,
  useInviteCollaborator,
  useRemoveCollaborator,
  useStoryInvitations,
} from "../hooks/use-collaboration.ts";
import { useStoryForEdit } from "../hooks/use-story-editing.ts";
import {
  INVITATION_STATUS,
  asCollaboratorRole,
  invitationErrorMessage,
  inviteErrorMessage,
  type Collaborator,
  type CollaboratorRole,
} from "../model/collaboration.ts";
import { studioText } from "../strings.ts";

const t = studioText.team;

/** Team of one story: who works on it, pending invitations, and a form to invite. Owner only. */
export function TeamScreen({ storyId }: { storyId: string }) {
  const story = useStoryForEdit(storyId);

  if (story.isPending) return <Skeleton className="h-96 w-full max-w-2xl rounded-xl" aria-busy />;
  if (story.isError) {
    return (
      <ErrorState
        title={studioText.error.title}
        description={studioText.error.description}
        retryLabel={studioText.error.retry}
        onRetry={() => void story.refetch()}
      />
    );
  }
  if (!story.data) {
    return (
      <EmptyState
        icon={FileQuestion}
        title={studioText.form.notFound.title}
        description={studioText.form.notFound.description}
      />
    );
  }
  if (story.data.role !== "owner") {
    return <EmptyState icon={Lock} title={t.onlyOwner.title} description={t.onlyOwner.description} />;
  }
  return <Team storyId={storyId} storyTitle={story.data.form.title} />;
}

function Team({ storyId, storyTitle }: { storyId: string; storyTitle: string }) {
  const toast = useAppToast();
  const collaborators = useCollaborators(storyId, true);
  const invitations = useStoryInvitations(storyId, true);
  const cancel = useCancelInvitation(storyId);
  const remove = useRemoveCollaborator(storyId);
  const [removing, setRemoving] = useState<Collaborator | null>(null);

  if (collaborators.isPending || invitations.isPending) {
    return <Skeleton className="h-96 w-full max-w-2xl rounded-xl" aria-busy />;
  }
  if (collaborators.isError || invitations.isError) {
    return (
      <ErrorState
        title={studioText.error.title}
        description={studioText.error.description}
        retryLabel={studioText.error.retry}
        onRetry={() => {
          void collaborators.refetch();
          void invitations.refetch();
        }}
      />
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title={t.title} description={t.description(storyTitle)} />
      <AppLink
        href={`/studio/story/${storyId}`}
        className="w-fit text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {t.backToStory}
      </AppLink>

      <section aria-label={t.currentTitle} className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">{t.currentTitle}</h2>
        {collaborators.data.length === 0 ? (
          <EmptyState icon={Users} title={t.noCollaborators} />
        ) : (
          <ul aria-label={t.currentLabel} className="flex flex-col gap-2">
            {collaborators.data.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 text-card-foreground"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{member.username}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">{studioText.role[member.role]}</Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setRemoving(member)}
                  >
                    {t.remove}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={t.pendingTitle} className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">{t.pendingTitle}</h2>
        {invitations.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noInvitations}</p>
        ) : (
          <ul aria-label={t.pendingLabel} className="flex flex-col gap-2">
            {invitations.data.map((invitation) => (
              <li
                key={invitation.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 text-card-foreground"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invitation.inviteeName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{invitation.inviteeUsername} · {studioText.role[invitation.role]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">{t.status[invitation.status]}</Badge>
                  {invitation.status === INVITATION_STATUS.PENDING ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={cancel.isPending}
                      onClick={() =>
                        cancel.mutate(invitation.id, {
                          onSuccess: () => toast.success(t.invitationCancelled),
                          onError: (error) => toast.error(invitationErrorMessage(error)),
                        })
                      }
                    >
                      {t.cancelInvitation}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <InviteForm storyId={storyId} />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={t.removeTitle}
        description={t.removeDescription}
        confirmLabel={t.remove}
        cancelLabel={t.cancel}
        destructive
        onConfirm={async () => {
          if (!removing) return;
          try {
            await remove.mutateAsync(removing.userId);
            toast.success(t.removed);
          } catch (error) {
            toast.error(invitationErrorMessage(error as Parameters<typeof invitationErrorMessage>[0]));
            throw error;
          }
        }}
      />
    </div>
  );
}

function InviteForm({ storyId }: { storyId: string }) {
  const toast = useAppToast();
  const invite = useInviteCollaborator(storyId);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("editor");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (username.trim() === "") {
      setFieldError(t.invite.usernameRequired);
      return;
    }
    setFieldError(null);
    invite.mutate(
      { username, role },
      {
        onSuccess: () => {
          toast.success(t.invite.sent);
          setUsername("");
        },
        onError: (error) => setFieldError(inviteErrorMessage(error)),
      },
    );
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-3 rounded-xl border p-4"
      aria-busy={invite.isPending}
    >
      <h2 className="text-base font-semibold">{t.invite.title}</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-username">{t.invite.username}</Label>
        <Input
          id="invite-username"
          value={username}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={fieldError !== null}
          aria-describedby="invite-username-hint"
          onChange={(event) => setUsername(event.target.value)}
        />
        <p
          id="invite-username-hint"
          className={fieldError ? "text-sm text-destructive" : "text-xs text-muted-foreground"}
        >
          {fieldError ?? t.invite.usernameHint}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-role">{t.invite.role}</Label>
        <Select value={role} onValueChange={(value) => setRole(asCollaboratorRole(value) ?? "editor")}>
          <SelectTrigger id="invite-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLLABORATOR_ROLES.map((value) => (
              <SelectItem key={value} value={value}>
                {studioText.role[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t.roleHints[role]}</p>
      </div>
      <Button type="submit" className="w-fit" disabled={invite.isPending}>
        {invite.isPending ? t.invite.submitting : t.invite.submit}
      </Button>
    </form>
  );
}

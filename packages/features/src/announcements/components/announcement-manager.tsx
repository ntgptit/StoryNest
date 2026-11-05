"use client";

import { useState } from "react";
import {
  ANNOUNCEMENT_KINDS,
  STORY_LANGUAGES,
  announcementFormSchema,
  toAnnouncementPayload,
  type AnnouncementForm,
  type AnnouncementKind,
} from "@storynest/validation";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import { Input } from "@storynest/ui/components/input";
import { Label } from "@storynest/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@storynest/ui/components/select";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Textarea } from "@storynest/ui/components/textarea";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import type { AppError } from "../../_shared/errors.ts";
import { useLanguage } from "../../_shared/language.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import {
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useEndAnnouncement,
  useManagedAnnouncements,
} from "../hooks/use-announcements.ts";
import { announcementState, toLocalInput, type Announcement } from "../model/announcement.ts";
import { announcementsText } from "../strings.ts";

const t = announcementsText.manage;
/** Radix Select has no empty value: this stands for "every language" (locale NULL). */
const ALL = "all";
const DAY_MS = 24 * 60 * 60_000;

type ErrorCode = keyof typeof t.form.errors;
const isErrorCode = (code: string): code is ErrorCode => code in t.form.errors;

function failureText(error: AppError): string {
  if (error.kind === "forbidden" || error.kind === "unauthenticated") return t.failed.forbidden;
  if (error.kind === "invalid") return t.failed.invalid;
  return t.failed.generic;
}

function emptyForm(now: Date): AnnouncementForm {
  return {
    kind: "banner",
    title: "",
    body: "",
    link: "",
    locale: "",
    startsAt: toLocalInput(now),
    endsAt: toLocalInput(new Date(now.getTime() + 7 * DAY_MS)),
  };
}

/**
 * The announcements part of the moderation console (BR-MOD-022): write a banner line or a home popup with its time
 * window and language, see every announcement with its state, end one early or delete it. Only moderators reach this
 * screen, and the database refuses the writes of anyone else.
 */
export function AnnouncementManager() {
  const list = useManagedAnnouncements(true);
  const end = useEndAnnouncement();
  const remove = useDeleteAnnouncement();
  const toast = useAppToast();
  const language = useLanguage();
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const format = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" });
  const now = new Date();

  return (
    <section aria-labelledby="announcements-title" className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex flex-col gap-1">
        <h2 id="announcements-title" className="text-base font-semibold">
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>

      <AnnouncementFormCard />

      {list.isPending ? (
        <Skeleton className="h-24 w-full rounded-xl" aria-busy />
      ) : list.isError ? (
        <ErrorState
          title={t.error.title}
          description={t.error.description}
          retryLabel={t.error.retry}
          onRetry={() => list.refetch()}
        />
      ) : list.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul aria-label={t.listLabel} className="flex flex-col gap-2">
          {list.data.map((announcement) => {
            const state = announcementState(announcement, now);
            return (
              <li
                key={announcement.id}
                className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-card-foreground"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={state === "active" ? "default" : "outline"}>{t.states[state]}</Badge>
                  <Badge variant="secondary">{t.kinds[announcement.kind]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {announcement.locale === "vi" || announcement.locale === "en"
                      ? t.languages[announcement.locale]
                      : t.allLanguages}
                  </span>
                </div>
                <p className="text-sm font-medium break-words">{announcement.title}</p>
                {announcement.body ? (
                  <p className="text-xs break-words text-muted-foreground">{announcement.body}</p>
                ) : null}
                <p className="text-xs text-muted-foreground tabular-nums">
                  {t.window(
                    format.format(new Date(announcement.startsAt)),
                    format.format(new Date(announcement.endsAt)),
                  )}
                  {announcement.href ? ` · ${announcement.href}` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {state === "active" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={end.isPending}
                      onClick={() =>
                        end.mutate(announcement.id, {
                          onSuccess: () => toast.success(t.ended),
                          onError: (error) => toast.error(failureText(error)),
                        })
                      }
                    >
                      {t.end}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setDeleting(announcement)}
                  >
                    {t.delete}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t.deleteTitle}
        description={t.deleteDescription}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
            toast.success(t.deleted);
          } catch (error) {
            toast.error(failureText(error as AppError));
            throw error;
          }
        }}
      />
    </section>
  );
}

function AnnouncementFormCard() {
  const create = useCreateAnnouncement();
  const toast = useAppToast();
  const [form, setForm] = useState<AnnouncementForm>(() => emptyForm(new Date()));
  const [errors, setErrors] = useState<Partial<Record<keyof AnnouncementForm, ErrorCode>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const set = <K extends keyof AnnouncementForm>(key: K, value: AnnouncementForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = announcementFormSchema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<keyof AnnouncementForm, ErrorCode>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof AnnouncementForm | undefined;
        if (field && next[field] === undefined && isErrorCode(issue.message)) next[field] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setFailure(null);
    create.mutate(toAnnouncementPayload(parsed.data), {
      onSuccess: () => {
        toast.success(t.created);
        setForm(emptyForm(new Date()));
      },
      onError: (error) => setFailure(failureText(error)),
    });
  };

  const field = (key: keyof AnnouncementForm, hint?: string) => {
    const error = errors[key];
    return {
      "aria-invalid": error !== undefined,
      "aria-describedby": error || hint ? `announcement-${key}-hint` : undefined,
      hint:
        error || hint ? (
          <p
            id={`announcement-${key}-hint`}
            className={error ? "text-sm text-destructive" : "text-xs text-muted-foreground"}
          >
            {error ? t.form.errors[error] : hint}
          </p>
        ) : null,
    };
  };
  const title = field("title", t.form.headlineHint);
  const body = field("body", t.form.bodyHint);
  const link = field("link", t.form.linkHint);
  const startsAt = field("startsAt");
  const endsAt = field("endsAt");

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-busy={create.isPending}
      className="flex flex-col gap-3 rounded-xl bg-muted/50 p-3"
    >
      <h3 className="text-sm font-semibold">{t.form.title}</h3>
      {failure ? (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="announcement-kind">{t.form.kind}</Label>
          <Select
            value={form.kind}
            onValueChange={(value) => {
              const kind = ANNOUNCEMENT_KINDS.find((k) => k === value);
              if (kind) set("kind", kind satisfies AnnouncementKind);
            }}
          >
            <SelectTrigger id="announcement-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANNOUNCEMENT_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {t.kinds[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="announcement-locale">{t.form.locale}</Label>
          <Select
            value={form.locale === "" ? ALL : form.locale}
            onValueChange={(value) => {
              const locale = STORY_LANGUAGES.find((code) => code === value);
              set("locale", locale ?? "");
            }}
          >
            <SelectTrigger id="announcement-locale" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t.allLanguages}</SelectItem>
              {STORY_LANGUAGES.map((code) => (
                <SelectItem key={code} value={code}>
                  {t.languages[code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="announcement-title">{t.form.headline}</Label>
        <Input
          id="announcement-title"
          value={form.title}
          onChange={(event) => set("title", event.target.value)}
          aria-invalid={title["aria-invalid"]}
          aria-describedby={title["aria-describedby"]}
        />
        {title.hint}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="announcement-body">{t.form.body}</Label>
        <Textarea
          id="announcement-body"
          rows={2}
          value={form.body}
          onChange={(event) => set("body", event.target.value)}
          aria-invalid={body["aria-invalid"]}
          aria-describedby={body["aria-describedby"]}
        />
        {body.hint}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="announcement-link">{t.form.link}</Label>
        <Input
          id="announcement-link"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          value={form.link}
          onChange={(event) => set("link", event.target.value)}
          aria-invalid={link["aria-invalid"]}
          aria-describedby={link["aria-describedby"]}
        />
        {link.hint}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="announcement-starts">{t.form.startsAt}</Label>
          <Input
            id="announcement-starts"
            type="datetime-local"
            value={form.startsAt}
            onChange={(event) => set("startsAt", event.target.value)}
            aria-invalid={startsAt["aria-invalid"]}
            aria-describedby={startsAt["aria-describedby"]}
          />
          {startsAt.hint}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="announcement-ends">{t.form.endsAt}</Label>
          <Input
            id="announcement-ends"
            type="datetime-local"
            value={form.endsAt}
            onChange={(event) => set("endsAt", event.target.value)}
            aria-invalid={endsAt["aria-invalid"]}
            aria-describedby={endsAt["aria-describedby"]}
          />
          {endsAt.hint}
        </div>
      </div>
      <Button type="submit" className="w-fit" disabled={create.isPending}>
        {create.isPending ? t.form.submitting : t.form.submit}
      </Button>
    </form>
  );
}

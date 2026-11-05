"use client";

import { useState, type ReactNode } from "react";
import { Label } from "@storynest/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@storynest/ui/components/select";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Switch } from "@storynest/ui/components/switch";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { useAuth } from "../../_shared/auth.tsx";
import { isLanguage, LANGUAGES, setLanguage, useLanguage } from "../../_shared/index.ts";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useAdultContent } from "../../adult-content/index.ts";
import { ReaderSettingsSheet, useReaderPreferencesSync } from "../../reader/index.ts";
import { useAccountSettings, useSaveSettings } from "../hooks/use-settings.ts";
import { useSiteTheme } from "../hooks/use-site-theme.ts";
import { isSiteTheme, SITE_THEMES } from "../model/site-theme.ts";
import { withLanguage, withNotification, type AccountSettings, type NotificationKey } from "../model/settings.ts";
import { settingsText } from "../strings.ts";

const t = settingsText;

const NOTIFICATION_ROWS: readonly { key: NotificationKey; text: { label: string; description: string } }[] = [
  { key: "chapterPublished", text: t.notifications.chapterPublished },
  { key: "commentReplied", text: t.notifications.commentReplied },
  { key: "collaborationAnswers", text: t.notifications.collaborationAnswers },
];

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/** Site theme of this device (not saved in the account, so it is shown whatever the account settings query does). */
function ThemeSection() {
  const { theme, setTheme } = useSiteTheme();
  return (
    <Section title={t.theme.title} description={t.theme.description}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-theme">{t.theme.label}</Label>
        <Select value={theme} onValueChange={(value) => isSiteTheme(value) && setTheme(value)}>
          <SelectTrigger id="settings-theme" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SITE_THEMES.map((value) => (
              <SelectItem key={value} value={value}>
                {t.theme.options[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Section>
  );
}

/** Account settings: language, theme (this device), reading, adult content and which in-app notifications to receive. */
export function SettingsScreen() {
  const auth = useAuth();
  if (auth.status === "loading") return <Skeleton className="h-96 w-full max-w-xl rounded-xl" aria-busy />;
  if (auth.status === "unauthenticated") {
    return (
      <p className="text-sm text-muted-foreground">
        {t.signIn}{" "}
        <AppLink href="/login?next=%2Fsettings" className="font-medium text-primary underline-offset-4 hover:underline">
          {t.signInLink}
        </AppLink>
      </p>
    );
  }
  return <SettingsForm />;
}

function SettingsForm() {
  const settings = useAccountSettings();
  const save = useSaveSettings();
  const toast = useAppToast();
  const adult = useAdultContent();
  const language = useLanguage();
  const [confirmingAdult, setConfirmingAdult] = useState(false);
  useReaderPreferencesSync();

  // The language lives in its own store (and is saved to the account by LanguageSync); a save of the other settings
  // must carry the language in force, not the one that was cached when the page loaded.
  const change = (next: AccountSettings) =>
    save.mutate(withLanguage(next, language), { onError: () => toast.error(t.saveFailed) });

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <PageHeader title={t.title} description={t.description} />

      {settings.isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" aria-busy />
      ) : settings.isError ? (
        <ErrorState
          title={t.error.title}
          description={t.error.description}
          retryLabel={t.error.retry}
          onRetry={() => settings.refetch()}
        />
      ) : (
        <>
          <Section title={t.language.title} description={t.language.description}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-language">{t.language.label}</Label>
              <Select value={language} onValueChange={(value) => isLanguage(value) && setLanguage(value)}>
                <SelectTrigger id="settings-language" className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {t.language.options[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>

          <Section title={t.notifications.title} description={t.notifications.description}>
            {NOTIFICATION_ROWS.map(({ key, text }) => (
              <SwitchRow
                key={key}
                id={`settings-notify-${key}`}
                label={text.label}
                description={text.description}
                checked={settings.data.notifications[key]}
                onCheckedChange={(on) => change(withNotification(settings.data, key, on))}
              />
            ))}
          </Section>
        </>
      )}

      <ThemeSection />

      <Section title={t.reading.title} description={t.reading.description}>
        <div>
          <ReaderSettingsSheet />
        </div>
      </Section>

      <Section title={t.adult.title}>
        <SwitchRow
          id="settings-adult"
          label={t.adult.label}
          description={t.adult.description}
          checked={adult.show}
          onCheckedChange={(on) => (on ? setConfirmingAdult(true) : adult.disable())}
        />
      </Section>
      <ConfirmDialog
        open={confirmingAdult}
        onOpenChange={setConfirmingAdult}
        title={t.adult.confirmTitle}
        description={t.adult.confirmDescription}
        confirmLabel={t.adult.confirm}
        cancelLabel={t.adult.cancel}
        onConfirm={() => {
          adult.enable();
          setConfirmingAdult(false);
        }}
      />
    </div>
  );
}

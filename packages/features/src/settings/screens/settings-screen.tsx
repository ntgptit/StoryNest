"use client";

import { BookOpen, MessageCircle, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Label } from "@storynest/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@storynest/ui/components/select";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Switch } from "@storynest/ui/components/switch";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { ExpandingSettings } from "@storynest/ui/widgets/expanding-settings";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { useAuth } from "../../_shared/auth.tsx";
import { authText, ChangePasswordForm } from "../../auth/index.ts";
import { isLanguage, LANGUAGES, setLanguage, useLanguage } from "../../_shared/index.ts";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useAdultContent } from "../../adult-content/index.ts";
import { ReaderSettingsSheet, useReaderPreferencesSync } from "../../reader/index.ts";
import { DailyGoalSetting, readingHabitsText } from "../../reading-habits/index.ts";
import {
  useAccountSettings,
  useNotificationTypes,
  useSaveNotificationType,
  useSaveSettings,
} from "../hooks/use-settings.ts";
import { useSiteTheme } from "../hooks/use-site-theme.ts";
import { isSiteTheme, SITE_THEMES } from "../model/site-theme.ts";
import {
  DEFAULT_NOTIFICATION_TYPES,
  NOTIFICATION_GROUP_TYPES,
  hasTypeSwitches,
  withAllNotificationsOff,
  withLanguage,
  withNotification,
  type AccountSettings,
  type NotificationKey,
} from "../model/settings.ts";
import { settingsText } from "../strings.ts";

const t = settingsText;

const NOTIFICATION_ROWS: readonly {
  key: NotificationKey;
  icon: ReactNode;
  text: { label: string; description: string };
}[] = [
  { key: "chapterPublished", icon: <BookOpen />, text: t.notifications.chapterPublished },
  { key: "commentReplied", icon: <MessageCircle />, text: t.notifications.commentReplied },
  { key: "collaborationAnswers", icon: <Users />, text: t.notifications.collaborationAnswers },
];

/** What each channel does for a notification: in the app it follows the switches; email and push do not exist. */
function Channels() {
  const c = t.notifications.channels;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      <dt className="font-medium">{c.inApp}</dt>
      <dd className="text-muted-foreground">{c.inAppOn}</dd>
      <dt className="font-medium">{c.other}</dt>
      <dd className="text-muted-foreground">{c.unavailable}</dd>
    </dl>
  );
}

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

/**
 * The notification switches (Lucian 023, BR-SET-011, BR-SET-012): one group switch per kind of notification; a group that is on
 * unfolds its finer options, a switch per event type where the group has several, and what each channel does.
 */
function NotificationSettings({
  settings,
  onChange,
}: {
  settings: AccountSettings;
  onChange: (next: AccountSettings) => void;
}) {
  const types = useNotificationTypes();
  const saveType = useSaveNotificationType();
  const toast = useAppToast();
  const typeValues = types.data ?? DEFAULT_NOTIFICATION_TYPES;

  return (
    <ExpandingSettings
      summary={(on) => t.notifications.summary(on, NOTIFICATION_ROWS.length)}
      turnAllOff={{
        label: t.notifications.turnAllOff,
        onTurnAllOff: () => onChange(withAllNotificationsOff(settings)),
      }}
      items={NOTIFICATION_ROWS.map(({ key, icon, text }) => ({
        id: key,
        icon,
        label: text.label,
        description: text.description,
        checked: settings.notifications[key],
        onCheckedChange: (on: boolean) => onChange(withNotification(settings, key, on)),
        details: (
          <div className="flex flex-col gap-3">
            {hasTypeSwitches(key)
              ? NOTIFICATION_GROUP_TYPES[key].map((type) => {
                  const typeText = t.notifications.types[type as keyof typeof t.notifications.types];
                  return typeText ? (
                    <SwitchRow
                      key={type}
                      id={`settings-notify-type-${type}`}
                      label={typeText.label}
                      description={typeText.description}
                      checked={typeValues[type]}
                      disabled={types.isPending || types.isError}
                      onCheckedChange={(on) =>
                        saveType.mutate({ type, on }, { onError: () => toast.error(t.saveFailed) })
                      }
                    />
                  ) : null;
                })
              : null}
            {key === "collaborationAnswers" ? (
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{t.notifications.invitedAlwaysOn.label}</span>
                  <p className="text-xs text-muted-foreground">{t.notifications.invitedAlwaysOn.description}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">{t.notifications.alwaysOn}</span>
              </div>
            ) : null}
            <Channels />
          </div>
        ),
      }))}
    />
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
  const auth = useAuth();
  // Only an account that signs in with a password has one to change.
  const canChangePassword = auth.status === "authenticated" && auth.user.app_metadata?.provider === "email";
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
            <NotificationSettings settings={settings.data} onChange={change} />
          </Section>
        </>
      )}

      <ThemeSection />

      <Section title={t.reading.title} description={t.reading.description}>
        <div>
          <ReaderSettingsSheet />
        </div>
      </Section>

      <Section title={readingHabitsText.goal.title} description={readingHabitsText.goal.description}>
        <DailyGoalSetting />
      </Section>

      {canChangePassword ? (
        <Section title={authText.change.title} description={authText.change.description}>
          <ChangePasswordForm />
        </Section>
      ) : null}

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

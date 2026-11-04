import { STORY_LANGUAGES, type StoryLanguage } from "@storynest/validation";

/** Which in-app notifications the reader wants. The invitations addressed to the reader are always delivered. */
export interface NotificationSettings {
  chapterPublished: boolean;
  commentReplied: boolean;
  collaborationAnswers: boolean;
}

export interface AccountSettings {
  language: StoryLanguage;
  notifications: NotificationSettings;
}

export const DEFAULT_SETTINGS: AccountSettings = {
  language: "vi",
  notifications: { chapterPublished: true, commentReplied: true, collaborationAnswers: true },
};

/** The columns of `user_settings` this feature reads and writes (the adult-content columns belong to adult-content). */
export interface SettingsRow {
  language_code: string;
  notify_chapter_published: boolean;
  notify_comment_replied: boolean;
  notify_collaboration_answers: boolean;
}

export const SETTINGS_COLUMNS =
  "language_code, notify_chapter_published, notify_comment_replied, notify_collaboration_answers";

const isLanguage = (value: string): value is StoryLanguage => (STORY_LANGUAGES as readonly string[]).includes(value);

/** No row means the defaults; an unknown language (a newer client wrote it) falls back to the default one. */
export function toSettings(row: SettingsRow | null): AccountSettings {
  if (row === null) return DEFAULT_SETTINGS;
  return {
    language: isLanguage(row.language_code) ? row.language_code : DEFAULT_SETTINGS.language,
    notifications: {
      chapterPublished: row.notify_chapter_published,
      commentReplied: row.notify_comment_replied,
      collaborationAnswers: row.notify_collaboration_answers,
    },
  };
}

export function toRow(settings: AccountSettings): SettingsRow {
  return {
    language_code: settings.language,
    notify_chapter_published: settings.notifications.chapterPublished,
    notify_comment_replied: settings.notifications.commentReplied,
    notify_collaboration_answers: settings.notifications.collaborationAnswers,
  };
}

export type NotificationKey = keyof NotificationSettings;

export function withNotification(settings: AccountSettings, key: NotificationKey, on: boolean): AccountSettings {
  if (settings.notifications[key] === on) return settings;
  return { ...settings, notifications: { ...settings.notifications, [key]: on } };
}

export function withLanguage(settings: AccountSettings, language: StoryLanguage): AccountSettings {
  return settings.language === language ? settings : { ...settings, language };
}

import {
  NOTIFICATION_PREFERENCE_TYPES,
  STORY_LANGUAGES,
  type NotificationPreferenceType,
  type StoryLanguage,
} from "@storynest/validation";

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

/** Every group switch off ("Turn all off"); the language and everything else stay. */
export function withAllNotificationsOff(settings: AccountSettings): AccountSettings {
  return {
    ...settings,
    notifications: { chapterPublished: false, commentReplied: false, collaborationAnswers: false },
  };
}

// --- per-type switches (notification_preferences) --------------------------------------------------------------------
// Under each group switch, a single event type can be switched off. A type is delivered only when its group AND its
// own switch are on (the database enforces it at insert time). No row means on.

/** In-app switch per event type the reader may mute. */
export type NotificationTypeSettings = Record<NotificationPreferenceType, boolean>;

export const DEFAULT_NOTIFICATION_TYPES: NotificationTypeSettings = Object.fromEntries(
  NOTIFICATION_PREFERENCE_TYPES.map((type) => [type, true]),
) as NotificationTypeSettings;

/** Which group switch each type sits under (the order is the order on screen). */
export const NOTIFICATION_GROUP_TYPES: Record<NotificationKey, readonly NotificationPreferenceType[]> = {
  chapterPublished: ["chapter_published"],
  commentReplied: ["comment_replied"],
  collaborationAnswers: ["collaboration_accepted", "collaboration_declined"],
};

export interface NotificationPreferenceRow {
  event_type: string;
  in_app: boolean;
}

export const NOTIFICATION_PREFERENCE_COLUMNS = "event_type, in_app";

const isPreferenceType = (value: string): value is NotificationPreferenceType =>
  (NOTIFICATION_PREFERENCE_TYPES as readonly string[]).includes(value);

/** Rows to switches; a type this client does not know (a newer server) is ignored. */
export function toNotificationTypes(rows: readonly NotificationPreferenceRow[]): NotificationTypeSettings {
  const types = { ...DEFAULT_NOTIFICATION_TYPES };
  for (const row of rows) if (isPreferenceType(row.event_type)) types[row.event_type] = row.in_app;
  return types;
}

/** A group with more than one type unfolds a switch per type; a single-type group's switch is the type's switch. */
export const hasTypeSwitches = (key: NotificationKey): boolean => NOTIFICATION_GROUP_TYPES[key].length > 1;

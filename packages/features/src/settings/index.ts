// Public API of the "settings" feature: account settings (language, notifications; adult content and reading
// preferences are edited here too but live in their own features).
export { SettingsScreen } from "./screens/settings-screen.tsx";
export { settingsKeys } from "./keys.ts";
export { settingsText } from "./strings.ts";
export { DEFAULT_SETTINGS, toRow, toSettings, type AccountSettings } from "./model/settings.ts";
export { LanguageSync } from "./components/language-sync.tsx";

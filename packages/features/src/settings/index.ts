// Public API of the "settings" feature: account settings (language, notifications; adult content and reading
// preferences are edited here too but live in their own features).
export { SettingsScreen } from "./screens/settings-screen.tsx";
export { settingsKeys } from "./keys.ts";
export { settingsText } from "./strings.ts";
export { DEFAULT_SETTINGS, toRow, toSettings, type AccountSettings } from "./model/settings.ts";
export { LanguageSync } from "./components/language-sync.tsx";
export { ThemeSwitch } from "./components/theme-switch.tsx";
export { useSiteTheme } from "./hooks/use-site-theme.ts";
export {
  SITE_THEMES,
  SITE_THEME_BOOTSTRAP_SCRIPT,
  SITE_THEME_STORAGE_KEY,
  toggledTheme,
  type SiteTheme,
} from "./model/site-theme.ts";

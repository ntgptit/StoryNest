export type { DataClient } from "./client.ts";
export { DataProvider, useDataClient, useDataClientGetter, useOptionalDataClient } from "./data.tsx";
export { AVATAR_BUCKET, UserAvatar, firstLetter, useAvatarUrl } from "./avatar.tsx";
export { QueryProvider } from "./query-provider.tsx";
export { createQueryClient, shouldRetry, type QueryClientOptions } from "./query.ts";
export { AppError, errorMessageKey, isPermanent, toAppError, unwrap, type AppErrorKind } from "./errors.ts";
export {
  AppLink,
  PlatformProvider,
  useNavigation,
  usePlatform,
  type Navigation,
  type PlatformAdapter,
  type PlatformLinkProps,
} from "./platform.tsx";
export { ToastProvider, useAppToast, type AppToast, type ToastKind, type ToastPort } from "./toast.tsx";
export { ErrorBoundary } from "./error-boundary.tsx";
export { translateErrors } from "./form-resolver.ts";
export {
  AuthProvider,
  authKeys,
  fetchProfile,
  useAuth,
  type AuthContextValue,
  type AuthState,
  type Profile,
} from "./auth.tsx";
export {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  currentLocale,
  defineText,
  getLanguage,
  isLanguage,
  languageChoices,
  plural,
  readStoredLanguage,
  registeredCatalogs,
  setLanguage,
  subscribeLanguage,
  type Language,
  type Messages,
} from "./i18n.ts";
export { LanguageProvider, useLanguage } from "./language.tsx";

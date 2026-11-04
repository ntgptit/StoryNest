/**
 * Language and text catalogs (WBS WP 0.4, decision Q4).
 *
 * No library: the texts are typed TypeScript objects that were already one module per feature, dates and numbers come
 * from the platform's Intl, and a plural is a function of Intl.PluralRules. What a library would add (ICU message files
 * for translators, loading a language on demand) is not needed for two languages that ship in the bundle; if it ever is,
 * `defineText` is the single place to change.
 *
 * How it works
 *  - `defineText(id, vi, en?)` returns an object shaped exactly like `vi` whose every property is looked up in the
 *    CURRENT language when it is read, not when the module loads. Components keep writing `commentText.item.like`;
 *    the catalog is a proxy, so `const t = commentText.item` at the top of a module stays correct after a switch.
 *    A string captured at load time (`label: shellText.nav.home` in a module-level constant) would not follow: read
 *    texts inside functions or components.
 *  - Vietnamese is the source. An English catalog must have the same keys, with the same kind of value; a missing key
 *    falls back to Vietnamese, and i18n.test.ts fails for any registered catalog that is incomplete.
 *  - The language lives in a tiny store (device storage + the account's setting, see LanguageProvider and
 *    useLanguageSync). The server always renders Vietnamese; the client switches after hydration.
 */
export const LANGUAGES = ["vi", "en"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "vi";
export const LANGUAGE_STORAGE_KEY = "storynest.language";

export const isLanguage = (value: unknown): value is Language =>
  typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);

let current: Language = DEFAULT_LANGUAGE;
const listeners = new Set<() => void>();

export function getLanguage(): Language {
  return current;
}

/** The language the reader chose on this device, or null if they never did (or storage is blocked). */
export function readStoredLanguage(): Language | null {
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

let choices = 0;

/** How many times the reader themselves chose a language (not counting a value applied from storage or the account). */
export function languageChoices(): number {
  return choices;
}

/**
 * Switches the language for the whole app.
 *  - `persist: false` applies a value that is already stored elsewhere (nothing is written, it is not a choice);
 *  - `fromAccount: true` applies the account's language (written to the device, but it is not the reader's choice).
 */
export function setLanguage(language: Language, options: { persist?: boolean; fromAccount?: boolean } = {}): void {
  if (options.persist !== false && options.fromAccount !== true) choices += 1;
  if (options.persist !== false) {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // blocked storage: the choice lasts for this page
    }
  }
  if (language === current) return;
  current = language;
  listeners.forEach((listener) => listener());
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The BCP-47 tag for Intl (dates, numbers, plurals) in the current language. */
export function currentLocale(): string {
  return current;
}

/** The shape an English catalog must have: strings are any string, functions keep their signature, objects recurse. */
export type Messages<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends string
    ? string
    : T extends readonly (infer U)[]
      ? readonly Messages<U>[]
      : T extends object
        ? { [K in keyof T]: Messages<T[K]> }
        : T;

interface Catalog {
  id: string;
  vi: object;
  en: object | undefined;
}

const catalogs = new Map<string, Catalog>();

/** Every catalog defined so far (for the completeness test and for tools). */
export function registeredCatalogs(): readonly Catalog[] {
  return [...catalogs.values()];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function lookup(catalog: Catalog, path: readonly string[]): unknown {
  const read = (root: unknown): unknown =>
    path.reduce<unknown>((node, key) => (isPlainObject(node) ? node[key] : undefined), root);
  const wanted = current === "en" && catalog.en ? read(catalog.en) : undefined;
  return wanted !== undefined ? wanted : read(catalog.vi);
}

function view(catalog: Catalog, path: readonly string[]): object {
  return new Proxy(
    {},
    {
      get(_target, key) {
        if (typeof key === "symbol") return undefined;
        const next = [...path, key];
        const value = lookup(catalog, next);
        return isPlainObject(value) ? view(catalog, next) : value;
      },
      has: (_target, key) =>
        typeof key === "string" && isPlainObject(lookup(catalog, path)) && key in (lookup(catalog, path) as object),
      ownKeys: () => Reflect.ownKeys((lookup(catalog, path) as object | undefined) ?? {}),
      getOwnPropertyDescriptor(_target, key) {
        if (typeof key === "symbol") return undefined;
        const value = lookup(catalog, [...path, key]);
        if (value === undefined) return undefined;
        return {
          enumerable: true,
          configurable: true,
          writable: false,
          value: isPlainObject(value) ? view(catalog, [...path, key]) : value,
        };
      },
      set: () => false,
      deleteProperty: () => false,
    },
  );
}

/** Defines the texts of one feature. `vi` is the source; `en` may be added once translated. */
export function defineText<T extends object>(id: string, vi: T, en?: Messages<T>): T {
  const catalog: Catalog = { id, vi, en };
  catalogs.set(id, catalog);
  return view(catalog, []) as T;
}

/**
 * Picks the form of a count: `plural(2, { one: "1 chapter", other: "{n} chapters" })`. A language with fewer forms
 * (Vietnamese has only "other") just never asks for the others.
 */
export function plural<T>(count: number, forms: { other: T } & Partial<Record<Intl.LDMLPluralRule, T>>): T {
  const rule = new Intl.PluralRules(currentLocale()).select(count);
  return forms[rule] ?? forms.other;
}

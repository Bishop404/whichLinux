import en from "./locales/en.json";

export type Locale = "en" | "pl";

export const LOCALES: readonly Locale[] = ["en", "pl"] as const;
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", pl: "Polski" };

type Dictionary = Record<string, string>;

/**
 * Every language but English is lazily loaded, so a visitor downloads exactly
 * one translation. English is already in the bundle as the fallback, so making
 * it a dynamic import would only add a round trip.
 */
const loaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  en: () => Promise.resolve({ default: en as Dictionary }),
  pl: () => import("./locales/pl.json"),
};

const STORAGE_KEY = "which-linux:locale";

let active: Locale = "en";
let dictionary: Dictionary = en as Dictionary;
/** English always backs the active language, so a partial translation still renders. */
const fallback = en as Dictionary;

function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** `?lang=` beats a remembered choice, which beats the browser, which falls back to English. */
export function detectLocale(): Locale {
  const requested = new URLSearchParams(location.search).get("lang");
  if (isLocale(requested)) return requested;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Private browsing can throw on access; the browser's own list is fine.
  }

  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return "en";
}

export async function setLocale(next: Locale): Promise<void> {
  dictionary = (await loaders[next]()).default;
  active = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Remembering the choice is a convenience, never a requirement.
  }
}

export function locale(): Locale {
  return active;
}

/** Looks up `key`, filling `{name}` placeholders from `vars`. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const template = dictionary[key] ?? fallback[key];

  if (template === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  if (!vars) return template;

  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole);
}

/** Reason keys carry separate wording for a tick and for a caveat. */
export function reasonText(key: string, value: number): string {
  return t(`${key}.${value >= 0 ? "pos" : "neg"}`);
}

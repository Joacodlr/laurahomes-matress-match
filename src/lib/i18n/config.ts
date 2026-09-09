/**
 * Locale configuration, mirroring laurahomes `src/i18n/config.ts`.
 *
 * Spanish is the default; English is available through the toggle. The choice
 * lives in a cookie so URLs stay clean — there is no `/es` or `/en` prefix.
 */
export const locales = ["es", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

/** Cookie key used to persist the visitor's locale choice. */
export const LOCALE_COOKIE = "mm_locale";

/** BCP-47 tags used for Intl number/currency formatting per locale. */
export const localeTag: Record<Locale, string> = {
  es: "es-ES",
  en: "en-IE",
};

/**
 * What the model is told to write in. Same mapping as laurahomes'
 * `LANGUAGE_LABEL`, and the reason its system prompt interpolates a variable
 * here rather than hardcoding a language.
 */
export const LANGUAGE_LABEL: Record<Locale, string> = {
  es: "Spanish",
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

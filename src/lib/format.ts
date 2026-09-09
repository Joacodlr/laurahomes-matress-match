import { localeTag, type Locale } from "./i18n/config";

/**
 * Locale-aware formatting, matching laurahomes `src/lib/format.ts` — prices
 * render natively per language ("1.299 €" in Spanish, "€1,299" in English).
 */

/** Format a EUR price with no decimals, positioned per locale conventions. */
export function formatPrice(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag[locale], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Fill `{name}` placeholders in a copy string. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

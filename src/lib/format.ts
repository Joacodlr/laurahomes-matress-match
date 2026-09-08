/** Spanish, EUR — this app sells in Spain and has no language toggle. */
const LOCALE_TAG = "es-ES";

/** Format a EUR price with no decimals, positioned per Spanish conventions. */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat(LOCALE_TAG, {
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

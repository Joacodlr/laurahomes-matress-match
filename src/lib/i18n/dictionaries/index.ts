import type { Locale } from "../config";
import type { Dictionary } from "../types";
import es from "./es";
import en from "./en";

export const dictionaries: Record<Locale, Dictionary> = { es, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

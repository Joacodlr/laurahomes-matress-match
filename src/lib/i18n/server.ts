import "server-only";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, locales, LOCALE_COOKIE, type Locale } from "./config";

/**
 * The visitor's locale, resolved on the server so the first render — and
 * `<html lang>` — is already correct with no client-side flash.
 *
 * Three steps, in order:
 *   1. the cookie, if they have used the toggle before;
 *   2. the browser's `Accept-Language`, so a first visit is in their language;
 *   3. Spanish.
 *
 * laurahomes stops at step 1 because it is a Spanish-first site people arrive at
 * deliberately. This one is a standalone link that may be handed to anyone, so
 * guessing from the browser is worth the extra step. An explicit choice always
 * wins: once the cookie exists, the header is never consulted again.
 */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const chosen = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;

  const header = (await headers()).get("accept-language");
  return localeFromAcceptLanguage(header) ?? defaultLocale;
}

/**
 * Best supported locale named by an `Accept-Language` header.
 *
 * Parsed by quality rather than order: `en;q=0.8, es;q=0.9` asks for Spanish
 * first even though English is written first. Only the primary subtag is
 * compared, so `en-GB` and `en-US` both match `en`. Returns null when the header
 * is missing or names nothing we have.
 */
function localeFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      const quality = q === undefined ? 1 : Number.parseFloat(q);
      return {
        primary: tag.trim().toLowerCase().split("-")[0],
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    // A `q=0` entry is an explicit refusal, not a weak preference.
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { primary } of ranked) {
    if ((locales as readonly string[]).includes(primary)) return primary as Locale;
  }
  return null;
}

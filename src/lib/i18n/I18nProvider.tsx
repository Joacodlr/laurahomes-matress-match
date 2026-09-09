"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "./config";
import { dictionaries } from "./dictionaries";
import type { Dictionary } from "./types";

/**
 * Ported from laurahomes `src/i18n/I18nProvider.tsx`.
 *
 * The locale is seeded from the server so the first paint is already right, then
 * held in client state. Changing it writes the cookie and refreshes, so anything
 * rendered on the server picks the new language up too.
 */

interface I18nContextValue {
  locale: Locale;
  /** The active dictionary. Access copy as `t.landing.title`, etc. */
  t: Dictionary;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const ONE_YEAR = 60 * 60 * 24 * 365;

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      // Persist the choice; the clean-URL strategy relies on the cookie only.
      // Writing it also stops `getServerLocale` from consulting the browser's
      // Accept-Language again — an explicit choice outranks a guess.
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
      document.documentElement.lang = next;
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, t: dictionaries[locale], setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

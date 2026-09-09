"use client";

import { locales, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/cn";

/**
 * Compact ES / EN segmented control that switches the active locale.
 * Ported from laurahomes `src/components/layout/LanguageToggle.tsx`.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t.lang.label}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-background/60 p-0.5",
        className,
      )}
    >
      {locales.map((code: Locale) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            aria-label={code === "es" ? t.lang.switchToEs : t.lang.switchToEn}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {code === "es" ? t.lang.es : t.lang.en}
          </button>
        );
      })}
    </div>
  );
}

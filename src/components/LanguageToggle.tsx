"use client";

import { locales, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/cn";

/**
 * Compact ES / EN segmented control that switches the active locale.
 * Ported from laurahomes `src/components/layout/LanguageToggle.tsx`.
 */
export function LanguageToggle({
  className,
  tone = "light",
}: {
  className?: string;
  /** `dark` inverts it for the landing hero, which sits on a photograph. */
  tone?: "light" | "dark";
}) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t.lang.label}
      className={cn(
        "inline-flex items-center rounded-full border p-0.5",
        tone === "dark"
          ? "border-white/25 bg-white/10 backdrop-blur-sm"
          : "border-border bg-background/60",
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
                ? tone === "dark"
                  ? "bg-white text-ink"
                  : "bg-ink text-cream"
                : tone === "dark"
                  ? "text-white/70 hover:text-white"
                  : "text-ink-faint hover:text-ink",
            )}
          >
            {code === "es" ? t.lang.es : t.lang.en}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LanguageToggle } from "./LanguageToggle";

/**
 * The opening screen: one photograph, one sentence, one button.
 *
 * Full-bleed rather than a card on a page, because the only decision here is
 * whether to start — and a hero that fills the window makes that the only thing
 * on screen. Everything explanatory moved into the questions themselves, where
 * it is answerable rather than merely readable.
 */
export function Landing() {
  const { t } = useI18n();
  const { landing } = t;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/*
       * The room. A photograph would be better and this is where one goes — the
       * layered gradients stand in for lamplight falling across linen, which is
       * what the real image should be. Swap this block for an <img> and nothing
       * above it needs to change.
       */}
      <div aria-hidden className="absolute inset-0 -z-20 bg-[#2a2119]" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_25%_18%,rgba(255,236,205,0.55),transparent_62%),radial-gradient(60%_60%_at_80%_40%,rgba(226,196,155,0.35),transparent_65%),radial-gradient(90%_70%_at_50%_100%,rgba(24,18,12,0.85),transparent_70%)]"
      />

      <div className="absolute right-6 top-6 z-10">
        <LanguageToggle tone="dark" />
      </div>

      <p className="step-in text-xs font-semibold uppercase tracking-[0.32em] text-white/70">
        {landing.eyebrow}
      </p>

      <h1
        className="step-in mt-8 max-w-3xl font-display text-5xl font-normal leading-[1.05] text-white sm:text-6xl md:text-7xl"
        style={{ "--step-delay": "80ms" } as React.CSSProperties}
      >
        {landing.title}
      </h1>

      <p
        className="step-in mt-6 max-w-lg text-base leading-relaxed text-white/75 sm:text-lg"
        style={{ "--step-delay": "160ms" } as React.CSSProperties}
      >
        {landing.subtitle}
      </p>

      <Link
        href="/match"
        className="step-in mt-12 inline-flex w-full max-w-xl items-center justify-center gap-3 rounded-full bg-cream px-10 py-5 text-sm font-medium uppercase tracking-[0.18em] text-ink transition-transform hover:scale-[1.015] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
        style={{ "--step-delay": "240ms" } as React.CSSProperties}
      >
        <Sparkles className="size-4 text-tan-deep" aria-hidden />
        {landing.cta}
      </Link>

      <p
        className="step-in mt-6 text-sm text-white/55"
        style={{ "--step-delay": "320ms" } as React.CSSProperties}
      >
        {landing.footnote}
      </p>
    </main>
  );
}

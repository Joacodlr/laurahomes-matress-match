"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

/**
 * The frame every auth screen sits in: a way back to the landing page, the
 * wordmark, a heading, the form, and one line of footer.
 *
 * Extracted when registration arrived — three screens (sign in, sign up,
 * verify) that have to look like the same product, and the fastest way for them
 * to drift apart is three copies of the same header markup.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-2 self-start text-xs font-semibold uppercase tracking-[0.22em] text-ink-faint transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {t.match.backHome}
      </Link>

      <header className="mt-12">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-ink-faint">
          {t.landing.eyebrow}
        </p>
        <h1 className="mt-4 font-display text-4xl font-normal leading-tight text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{subtitle}</p>}
      </header>

      {children}

      {footer && <div className="mt-8 text-center text-sm text-ink-soft">{footer}</div>}
    </main>
  );
}

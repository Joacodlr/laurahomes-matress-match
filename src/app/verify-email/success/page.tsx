"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { AuthLayout } from "@/components/auth/AuthLayout";

/** Shown once a verification link has been confirmed. */
export default function VerifyEmailSuccessPage() {
  const { t } = useI18n();
  const s = t.auth.verifySuccess;

  return (
    <AuthLayout title={s.title} subtitle={s.subtitle}>
      <Link
        href="/login"
        className="mt-10 inline-flex h-14 items-center justify-center rounded-full bg-ink text-xs font-semibold uppercase tracking-[0.2em] text-cream transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        {s.loginCta}
      </Link>
    </AuthLayout>
  );
}

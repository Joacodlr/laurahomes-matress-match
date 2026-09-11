"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { login, type AuthFormState } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { registerUrl, verifyEmailUrl } from "@/lib/laurahomes";
import { cn } from "@/lib/cn";

/**
 * Sign in with a LauraHomes account.
 *
 * There is no "create account" form here by design — accounts are created in
 * LauraHomes, which owns the verification email. The link below goes there, and
 * because both apps read the same `users` table, an account made there works
 * here the moment it is verified.
 */
export function LoginForm() {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(login, {});
  const [revealed, setRevealed] = useState(false);

  const copy = t.auth;

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
          {copy.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{copy.subtitle}</p>
      </header>

      <form action={formAction} className="mt-10 flex flex-col gap-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">
            {copy.email}
          </span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
            aria-invalid={Boolean(state.fieldErrors?.email)}
            className="mt-2 h-14 w-full rounded-md border border-border bg-card px-5 text-base text-ink outline-none transition-colors focus:border-tan-deep focus:ring-2 focus:ring-ring/25"
          />
          {state.fieldErrors?.email && (
            <span className="mt-1.5 block text-sm text-ink-soft">
              {state.fieldErrors.email}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">
            {copy.password}
          </span>
          <span className="relative mt-2 block">
            <input
              type={revealed ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(state.fieldErrors?.password)}
              className="h-14 w-full rounded-md border border-border bg-card pl-5 pr-14 text-base text-ink outline-none transition-colors focus:border-tan-deep focus:ring-2 focus:ring-ring/25"
            />
            <button
              type="button"
              onClick={() => setRevealed((shown) => !shown)}
              aria-label={revealed ? copy.hidePassword : copy.showPassword}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink"
            >
              {revealed ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </span>
          {state.fieldErrors?.password && (
            <span className="mt-1.5 block text-sm text-ink-soft">
              {state.fieldErrors.password}
            </span>
          )}
        </label>

        {state.error && (
          <p role="alert" className="rounded-md bg-cream-deep px-4 py-3 text-sm text-ink">
            {state.error}
          </p>
        )}

        {/* The account exists but has never verified its email. This app cannot
            send that email, so it says what to do rather than pretending. */}
        {state.unverified && (
          <p role="alert" className="rounded-md bg-cream-deep px-4 py-3 text-sm text-ink">
            {copy.unverified}{" "}
            <a
              href={verifyEmailUrl(state.values?.email)}
              className="font-medium text-tan-deep underline underline-offset-2"
            >
              {copy.unverifiedLink}
            </a>
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className={cn(
            "mt-2 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-ink text-xs font-semibold uppercase tracking-[0.2em] text-cream transition-transform",
            pending ? "opacity-70" : "hover:scale-[1.01] active:scale-[0.99]",
          )}
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? copy.submitting : copy.submit}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-soft">
        {copy.noAccount}{" "}
        <a
          href={registerUrl()}
          className="font-medium text-tan-deep underline underline-offset-2"
        >
          {copy.registerLink}
        </a>
      </p>
    </main>
  );
}

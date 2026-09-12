"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthFormState } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { AuthLayout } from "./AuthLayout";
import { Field, PasswordField } from "./Field";
import { SubmitButton } from "./SubmitButton";

const initialState: AuthFormState = {};

/**
 * Sign in.
 *
 * The account is a LauraHomes account — same `users` row — so one made in
 * either app works in both. An unverified one never reaches the session step:
 * the action redirects to /verify-email instead.
 */
export function LoginForm() {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(login, initialState);
  const copy = t.auth;

  return (
    <AuthLayout
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        <>
          {copy.noAccount}{" "}
          <Link
            href="/register"
            className="font-medium text-tan-deep underline underline-offset-2"
          >
            {copy.registerLink}
          </Link>
        </>
      }
    >
      <form action={formAction} className="mt-10 flex flex-col gap-4" noValidate>
        {state.error && (
          <p role="alert" className="rounded-md bg-cream-deep px-4 py-3 text-sm text-ink">
            {state.error}
          </p>
        )}

        <Field
          label={copy.email}
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email}
          required
        />
        <PasswordField
          label={copy.password}
          name="password"
          autoComplete="current-password"
          error={state.fieldErrors?.password}
          required
        />

        <SubmitButton
          pending={pending}
          label={copy.submit}
          pendingLabel={copy.submitting}
          className="mt-2"
        />
      </form>
    </AuthLayout>
  );
}

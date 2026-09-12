"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthFormState } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { AuthLayout } from "./AuthLayout";
import { Field, PasswordField } from "./Field";
import { SubmitButton } from "./SubmitButton";

const initialState: AuthFormState = {};

/**
 * Create an account.
 *
 * Ported from laurahomes' RegisterForm, minus the hidden sales-force code: that
 * field carries a share link through registration, and this app has no share
 * links to carry.
 *
 * `noValidate` so the browser does not pre-empt the server's messages — the
 * rules that matter (password length, whether the address is taken) are checked
 * server-side anyway, and two sets of error text disagreeing looks broken.
 */
export function RegisterForm() {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(register, initialState);
  const copy = t.auth.register;

  return (
    <AuthLayout
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        <>
          {copy.hasAccount}{" "}
          <Link href="/login" className="font-medium text-tan-deep underline underline-offset-2">
            {copy.loginLink}
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
          label={copy.name}
          name="name"
          type="text"
          autoComplete="given-name"
          defaultValue={state.values?.name}
          error={state.fieldErrors?.name}
          required
        />
        <Field
          label={copy.surname}
          name="surname"
          type="text"
          autoComplete="family-name"
          defaultValue={state.values?.surname}
          error={state.fieldErrors?.surname}
          required
        />
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
          autoComplete="new-password"
          error={state.fieldErrors?.password}
          required
        />

        <SubmitButton
          pending={pending}
          label={copy.submit}
          pendingLabel={copy.submitting}
          className="mt-2"
        />

        <p className="text-center text-xs leading-relaxed text-ink-faint">{copy.sharedNote}</p>
      </form>
    </AuthLayout>
  );
}

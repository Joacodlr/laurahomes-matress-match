"use server";

import { redirect } from "next/navigation";
import { loginSchema, toFieldErrors } from "@/lib/auth/validation";
import { findUserByEmail } from "@/lib/auth/repository";
import { verifyPassword } from "@/lib/auth/password";
import { startSession, endSession } from "@/lib/auth/session";

/**
 * Ported from laurahomes `src/app/actions/auth.ts`, login and logout only.
 *
 * There is deliberately no `register` here. Creating an account sends a
 * verification email and blocks sign-in until the link is clicked, which needs
 * the N8N email webhook, the templates, the verification-token secret and the
 * resend page — all of which LauraHomes already has. Duplicating them would
 * mean two apps writing the same `users` rows and sending the same emails; the
 * login screen links across instead.
 */

/** Shape returned to the form via `useActionState`. */
export interface AuthFormState {
  /** A form-wide error message (e.g. bad credentials). */
  error?: string;
  /** Per-field validation messages, keyed by input name. */
  fieldErrors?: Record<string, string>;
  /** Echo back submitted values so inputs are not cleared on error. */
  values?: { email?: string };
  /** Set when the account exists but has never verified its email. */
  unverified?: boolean;
}

/** Where a successful login lands. */
const HOME = "/match";

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = { email: String(formData.get("email") ?? "") };

  const parsed = loginSchema.safeParse({
    email: values.email,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error), values };
  }

  const { email, password } = parsed.data;
  const user = await findUserByEmail(email);

  // The same generic message whether the email or the password was wrong, so
  // this never reveals which addresses have accounts.
  const ok = user ? await verifyPassword(password, user.password_hash) : false;
  if (!user || !ok) {
    return { error: "Invalid email or password.", values };
  }

  // Unverified accounts cannot sign in, exactly as in LauraHomes. This app
  // cannot send the verification email, so it says so and points there rather
  // than redirecting to a resend page it does not have.
  if (!user.email_verified) {
    return { unverified: true, values };
  }

  await startSession({ id: user.id, email: user.email });
  redirect(HOME);
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}

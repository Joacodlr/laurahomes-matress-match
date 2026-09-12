"use server";

import { redirect } from "next/navigation";
import { loginSchema, registerSchema, toFieldErrors } from "@/lib/auth/validation";
import { createUser, emailExists, findUserByEmail } from "@/lib/auth/repository";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { startSession, endSession } from "@/lib/auth/session";

/**
 * Ported from laurahomes `src/app/actions/auth.ts`.
 *
 * Registering here creates a real LauraHomes account — same `users` row, same
 * bcrypt hash, same verification email — so nobody has to leave for a different
 * site and come back. The only piece not carried over is the sales-force share
 * code, which belongs to a LauraHomes flow this app has no part in.
 */

/** Shape returned to the forms via `useActionState`. */
export interface AuthFormState {
  /** A form-wide error message (e.g. bad credentials). */
  error?: string;
  /** Per-field validation messages, keyed by input name. */
  fieldErrors?: Record<string, string>;
  /** Echo back submitted values so inputs are not cleared on error. */
  values?: { name?: string; surname?: string; email?: string };
}

/** Where a successful login lands. */
const HOME = "/match";

export async function register(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    surname: String(formData.get("surname") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  const parsed = registerSchema.safeParse({
    name: values.name,
    surname: values.surname,
    email: values.email,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error), values };
  }

  const { name, surname, email, password } = parsed.data;

  // Checked up front for a readable message. The race — two submissions of the
  // same address at once — is still caught by the unique index below, which is
  // the check that actually holds.
  if (await emailExists(email)) {
    return {
      fieldErrors: { email: "An account with this email already exists." },
      values,
    };
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await createUser({ name, surname, email, passwordHash });
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return {
        fieldErrors: { email: "An account with this email already exists." },
        values,
      };
    }
    throw error;
  }

  // New accounts start unverified and are NOT signed in. The verify screen
  // sends the email on load and offers a resend.
  // redirect() throws NEXT_REDIRECT — it must stay outside any try/catch.
  redirect(`/verify-email?email=${encodeURIComponent(user.email)}`);
}

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

  // Unverified accounts cannot sign in. Send them to the resend screen.
  if (!user.email_verified) {
    redirect(`/verify-email?email=${encodeURIComponent(user.email)}&status=unverified`);
  }

  await startSession({ id: user.id, email: user.email });
  redirect(HOME);
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}

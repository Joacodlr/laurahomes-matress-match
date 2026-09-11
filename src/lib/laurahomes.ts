/**
 * Where LauraHomes lives.
 *
 * This app cannot create accounts — registration sends a verification email,
 * and that machinery belongs to the app that owns the `users` table. So the
 * login screen hands people over, and it needs to know where to.
 *
 * An env var rather than a literal because the host is going to change: the
 * default below is the current Vercel deployment, and production will move to a
 * real domain. Setting `NEXT_PUBLIC_LAURAHOMES_URL` then costs a redeploy
 * rather than a code change.
 *
 * `NEXT_PUBLIC_` because the links are rendered in the browser. Nothing secret
 * is involved — it is a public address.
 */
const BASE = (
  process.env.NEXT_PUBLIC_LAURAHOMES_URL || "https://laurahomes.vercel.app"
).replace(/\/+$/, "");

/** Where to send someone who has no account yet. */
export function registerUrl(): string {
  return `${BASE}/register`;
}

/**
 * Where to send someone whose account exists but has never been verified.
 *
 * The email is passed along so that screen can offer to resend without making
 * them type it again — it is the same query parameter LauraHomes' own login
 * redirect uses.
 */
export function verifyEmailUrl(email?: string): string {
  const query = email ? `?email=${encodeURIComponent(email)}&status=unverified` : "";
  return `${BASE}/verify-email${query}`;
}

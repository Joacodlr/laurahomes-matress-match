/**
 * Shared auth configuration: cookie names, token lifetimes, and secret loaders.
 *
 * This module is deliberately dependency-free (no `next/headers`, no DB) so it
 * can be imported from both the server (Server Actions, DAL) AND `proxy.ts`.
 */

/** httpOnly cookie holding the short-lived access token (JWT). */
export const ACCESS_TOKEN_COOKIE = "lh_access";
/** httpOnly cookie holding the longer-lived refresh token (JWT). */
export const REFRESH_TOKEN_COOKIE = "lh_refresh";

/** Access token lifetime: 1 hour. */
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
/**
 * Refresh token / session lifetime: 30 days, sliding.
 * The proxy re-issues the refresh token (and slides the DB `expires_at`) on each
 * refresh, so this is an *idle* window — active users stay logged in, and only
 * someone who doesn't return for 30 days has to re-authenticate.
 */
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export const isProduction = process.env.NODE_ENV === "production";

function requiredEnv(name: string): Uint8Array {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return new TextEncoder().encode(value);
}

/** Secret used to sign/verify access tokens. Loaded lazily so imports never throw. */
export const getAccessSecret = () => requiredEnv("JWT_ACCESS_SECRET");
/** Secret used to sign/verify refresh tokens. Kept separate from the access secret. */
export const getRefreshSecret = () => requiredEnv("JWT_REFRESH_SECRET");

/** Email-verification token lifetime: 24 hours. */
export const VERIFICATION_TOKEN_TTL_SECONDS = 60 * 60 * 24;
/** Secret used to sign/verify email-verification tokens. Separate from session secrets. */
export const getVerificationSecret = () => requiredEnv("JWT_VERIFICATION_SECRET");

/** Standard cookie options for the access token. */
export function accessCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  };
}

/** Standard cookie options for the refresh token. */
export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  };
}

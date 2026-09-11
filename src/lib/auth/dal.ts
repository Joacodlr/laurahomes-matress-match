import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE } from "./config";
import { verifyAccessToken } from "./tokens";
import { findUserByActiveSession, type PublicUser } from "./repository";

/**
 * Data Access Layer — the authoritative auth check.
 *
 * Ported from laurahomes `src/lib/auth/dal.ts`. `proxy.ts` does the fast,
 * optimistic gating on the JWT alone; this verifies the token AND confirms the
 * session is still live in the database, so a session revoked from LauraHomes
 * stops working here on the very next request.
 *
 * Wrapped in React's `cache()` so it runs at most once per render pass.
 */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const store = await cookies();
  const token = store.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifyAccessToken(token);
  if (!claims) return null;

  return findUserByActiveSession(claims.sid);
});

/**
 * Require an authenticated user.
 *
 * Redirects through the logout route rather than straight to /login when the
 * session is gone: cookies cannot be cleared during a render, and a still-valid
 * access token whose session was revoked would otherwise have the proxy waving
 * the request through into the same redirect forever.
 */
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/logout");
  return user;
}

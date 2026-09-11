import "server-only";
import { cookies, headers } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
  accessCookieOptions,
  refreshCookieOptions,
} from "./config";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./tokens";
import { createSession, deleteSession } from "./repository";

/**
 * Ported from laurahomes `src/lib/auth/session.ts`.
 *
 * The one omission is its opportunistic `deleteStaleSessions()` sweep on login.
 * That prunes rows belonging to BOTH apps, and a sweep firing from whichever of
 * the two happened to see a login is housekeeping with no clear owner. It stays
 * in LauraHomes, which is where accounts are created.
 */

/**
 * Start a session for a freshly authenticated user: create the DB session row,
 * then set the access + refresh cookies.
 */
export async function startSession(user: { id: string; email: string }): Promise<void> {
  const hdrs = await headers();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  const sessionId = await createSession({
    userId: user.id,
    expiresAt,
    userAgent: hdrs.get("user-agent"),
  });

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ sub: user.id, sid: sessionId, email: user.email }),
    signRefreshToken({ sub: user.id, sid: sessionId }),
  ]);

  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, accessToken, accessCookieOptions());
  store.set(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions());
}

/**
 * End the current session: revoke the DB row (so the refresh token is useless
 * everywhere, including in LauraHomes) and clear both cookies.
 */
export async function endSession(): Promise<void> {
  const store = await cookies();

  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    const claims = await verifyRefreshToken(refreshToken);
    if (claims) {
      await deleteSession(claims.sid);
    }
  }

  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

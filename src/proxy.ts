import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
  accessCookieOptions,
  refreshCookieOptions,
} from "@/lib/auth/config";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth/tokens";
import { touchSession } from "@/lib/auth/repository";

/**
 * Proxy (what earlier Next.js called middleware).
 *
 * Ported from laurahomes `src/proxy.ts`. Two jobs:
 *
 *   1. Seamless refresh and a sliding session. When the access token has
 *      expired but the refresh token has not, mint a new access token, re-issue
 *      the refresh token and push the session's DB expiry forward. Active users
 *      stay signed in; someone idle for thirty days does not. The only database
 *      touch is here, and only about once an hour per active user.
 *
 *   2. Route gating. Unauthenticated visitors are sent to /login, and
 *      authenticated ones are kept off it.
 *
 * This is the optimistic check — it trusts a well-formed JWT. The authoritative
 * one (is the session still live in the database?) is in `lib/auth/dal.ts`,
 * next to the data.
 */

const AUTH_PAGES = ["/login"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthPage = AUTH_PAGES.includes(pathname);
  // Everything the matcher lets through that is not an auth page is protected.
  const isProtected = !isAuthPage;

  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  let claims = accessToken ? await verifyAccessToken(accessToken) : null;
  let refreshedAccessToken: string | null = null;
  let refreshedRefreshToken: string | null = null;

  // Access token missing or expired — try to refresh from the refresh token.
  if (!claims) {
    const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    const refreshClaims = refreshToken ? await verifyRefreshToken(refreshToken) : null;
    if (refreshClaims) {
      // The refresh token carries no email; the DAL re-reads the user anyway.
      refreshedAccessToken = await signAccessToken({
        sub: refreshClaims.sub,
        sid: refreshClaims.sid,
        email: "",
      });
      refreshedRefreshToken = await signRefreshToken({
        sub: refreshClaims.sub,
        sid: refreshClaims.sid,
      });
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
      try {
        await touchSession(refreshClaims.sid, expiresAt);
      } catch {
        // A failed slide is not fatal — the tokens are still valid this round.
      }
      claims = { sub: refreshClaims.sub, sid: refreshClaims.sid, email: "" };
    }
  }

  const isAuthenticated = claims !== null;

  if (isProtected && !isAuthenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isAuthPage && isAuthenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/match";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (refreshedAccessToken) {
    res.cookies.set(ACCESS_TOKEN_COOKIE, refreshedAccessToken, accessCookieOptions());
  }
  if (refreshedRefreshToken) {
    res.cookies.set(REFRESH_TOKEN_COOKIE, refreshedRefreshToken, refreshCookieOptions());
  }
  return res;
}

export const config = {
  /*
   * Only where auth matters.
   *
   * `/` is absent on purpose: the landing page explains what this is, and
   * someone deciding whether to sign in has to be able to read it. The
   * questionnaire behind it is what needs an account.
   */
  matcher: ["/match/:path*", "/login"],
};

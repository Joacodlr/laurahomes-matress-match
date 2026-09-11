import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/config";
import { verifyRefreshToken } from "@/lib/auth/tokens";
import { deleteSession } from "@/lib/auth/repository";

/**
 * Involuntary logout. Deletes the session row (best effort), clears both
 * cookies, and sends the visitor to /login.
 *
 * Ported from laurahomes. The DAL redirects here whenever a session turns out
 * to be missing, revoked or expired. Clearing the cookies on a *response*
 * rather than during a render is what breaks the proxy/DAL redirect loop: until
 * they are gone, the proxy keeps seeing a well-formed token and waving the
 * request through to a page that immediately bounces it back.
 */
export async function GET(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    const claims = await verifyRefreshToken(refreshToken);
    if (claims) {
      try {
        await deleteSession(claims.sid);
      } catch {
        // Ignore — clearing the cookies below is what matters to the user.
      }
    }
  }

  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete(ACCESS_TOKEN_COOKIE);
  res.cookies.delete(REFRESH_TOKEN_COOKIE);
  return res;
}

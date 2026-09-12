import { NextResponse, type NextRequest } from "next/server";
import { verifyVerificationToken } from "@/lib/auth/tokens";
import { markEmailVerified } from "@/lib/auth/repository";

/**
 * GET /api/auth/verify-email/confirm?token=...
 *
 * The link in the verification email. Validates the token, stamps
 * `users.email_verified`, and sends the visitor to the success screen.
 *
 * Ported from laurahomes' route without its sales-force auto-join: that step
 * reads a cookie set when registering through a share link, and this app has no
 * share links.
 *
 * A bad token redirects rather than returning an error page — whoever clicked
 * this came from an email client, and the resend form is the useful thing to
 * put in front of them.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?status=invalid", req.url));
  }

  const claims = await verifyVerificationToken(token);
  if (!claims) {
    return NextResponse.redirect(new URL("/verify-email?status=invalid", req.url));
  }

  try {
    await markEmailVerified(claims.sub);
  } catch (error) {
    console.error("[verify-email/confirm] DB error:", error);
    return NextResponse.redirect(new URL("/verify-email?status=error", req.url));
  }

  return NextResponse.redirect(new URL("/verify-email/success", req.url));
}

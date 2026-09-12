import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/auth/repository";
import { sendVerificationEmail } from "@/lib/email/verification";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

/**
 * POST /api/auth/verify-email/send
 * Body: { email: string, locale?: "en" | "es" }
 *
 * Send (or resend) the verification email. Not auth-gated — the whole point is
 * that the person cannot sign in yet.
 *
 * Always answers `{ ok: true }` for valid input, whether or not the account
 * exists, so this cannot be used to find out which addresses are registered.
 * The mail only actually goes out for an existing, still-unverified account.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const locale = isLocale(body?.locale) ? body.locale : defaultLocale;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (user && !user.email_verified) {
    try {
      await sendVerificationEmail({
        userId: user.id,
        email: user.email,
        name: user.name,
        locale,
      });
    } catch (error) {
      console.error("[verify-email/send] failed:", error);
      return NextResponse.json(
        { error: "Could not send the email. Please try again later." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}

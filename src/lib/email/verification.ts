import "server-only";
import { signVerificationToken } from "@/lib/auth/tokens";
import type { Locale } from "@/lib/i18n/config";
import { getAppUrl, sendEmail } from "./send";

/**
 * Build and send the email-verification message for a new account.
 *
 * Ported from laurahomes `src/lib/email/verification.ts`. The token is a
 * stateless 24-hour JWT — nothing is stored, so a resend simply mints another
 * one and both links work until they expire.
 *
 * `JWT_VERIFICATION_SECRET` is shared with LauraHomes, so a link from either
 * app verifies the account for both. It has to be: the row being stamped is the
 * same row.
 */
export async function sendVerificationEmail(params: {
  userId: string;
  email: string;
  name: string;
  locale: Locale;
}): Promise<void> {
  const token = await signVerificationToken({ sub: params.userId, email: params.email });
  const baseUrl = await getAppUrl();
  const url = `${baseUrl}/api/auth/verify-email/confirm?token=${encodeURIComponent(token)}`;
  const { subject, html } = buildVerificationEmail({
    url,
    name: params.name,
    locale: params.locale,
  });
  await sendEmail({ to: params.email, subject, html });
}

/**
 * Localised subject and HTML body.
 *
 * Table layout and inline styles because that is what email clients render;
 * the palette is the app's own, written as hex — `oklch()` and custom
 * properties do not survive Gmail. No logo image: there is nothing in
 * `/public` to point at, and a broken image is worse than a wordmark.
 */
function buildVerificationEmail(params: {
  url: string;
  name: string;
  locale: Locale;
}): { subject: string; html: string } {
  const { url, name, locale } = params;

  const copy =
    locale === "es"
      ? {
          subject: "Confirma tu correo — Colchón Match",
          preheader: "Confirma tu correo para activar tu cuenta.",
          greeting: `Hola ${name},`,
          intro:
            "Gracias por crear tu cuenta. Confirma tu dirección de correo y podrás empezar tu match.",
          button: "Confirmar mi correo",
          fallback: "Si el botón no funciona, copia y pega este enlace en tu navegador:",
          expiry: "Este enlace caduca en 24 horas.",
          shared: "Esta misma cuenta te sirve también en LauraHomes.",
          ignore: "Si no creaste esta cuenta, puedes ignorar este mensaje.",
          brand: "Colchón",
        }
      : {
          subject: "Confirm your email — Mattress Match",
          preheader: "Confirm your email to activate your account.",
          greeting: `Hi ${name},`,
          intro:
            "Thanks for creating your account. Confirm your email address and you can start your match.",
          button: "Verify my email",
          fallback: "If the button doesn't work, copy and paste this link into your browser:",
          expiry: "This link expires in 24 hours.",
          shared: "The same account works on LauraHomes.",
          ignore: "If you didn't create this account, you can safely ignore this email.",
          brand: "Mattress",
        };

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#faf6f0;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf6f0;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:20px;border:1px solid #e5ddd2;overflow:hidden;">
            <tr>
              <td style="padding:36px 40px;font-family:Helvetica,Arial,sans-serif;color:#211c18;">
                <div style="text-align:center;margin-bottom:28px;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#8f857a;margin-bottom:8px;">LauraHomes</div>
                  <div style="font-size:22px;font-weight:700;color:#211c18;">
                    ${copy.brand}<span style="color:#9a7a66;"> Match</span>
                  </div>
                </div>
                <p style="font-size:16px;line-height:1.5;margin:0 0 12px;">${copy.greeting}</p>
                <p style="font-size:15px;line-height:1.6;color:#5d544c;margin:0 0 28px;">${copy.intro}</p>
                <a href="${url}" style="display:inline-block;background-color:#211c18;color:#faf6f0;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:9999px;">${copy.button}</a>
                <p style="font-size:13px;line-height:1.6;color:#8f857a;margin:28px 0 6px;">${copy.fallback}</p>
                <p style="font-size:13px;line-height:1.6;margin:0 0 24px;word-break:break-all;"><a href="${url}" style="color:#9a7a66;">${url}</a></p>
                <p style="font-size:13px;line-height:1.6;color:#8f857a;margin:0 0 4px;">${copy.expiry}</p>
                <p style="font-size:13px;line-height:1.6;color:#8f857a;margin:0 0 4px;">${copy.shared}</p>
                <p style="font-size:13px;line-height:1.6;color:#8f857a;margin:0;">${copy.ignore}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: copy.subject, html };
}

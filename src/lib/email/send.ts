import "server-only";
import { headers } from "next/headers";

/**
 * Email delivery via an N8N webhook.
 *
 * Ported from laurahomes `src/lib/email/send.ts`. No email-provider SDK ships
 * here either: we POST `{ to, subject, html }` to the same N8N workflow, which
 * owns the API key and the from-address. Both apps therefore send from the same
 * mailbox, which is what you want when they are handing the same account back
 * and forth.
 *
 * The bulk sender is not ported — the newsletter that needed it lives in
 * LauraHomes, and this app only ever mails one person at a time.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const webhookUrl = process.env.N8N_EMAIL_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("N8N_EMAIL_WEBHOOK_URL is not configured");
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Email webhook failed (${res.status}): ${text}`);
  }
}

/**
 * Absolute base URL for links in emails.
 *
 * Read from the incoming request so it works on localhost and in production
 * with no config: the forwarded host/proto the hosting proxy sets, falling back
 * to the plain `Host` header, and to http only for localhost. `APP_URL`
 * overrides it.
 *
 * This is what makes the verification link come back *here* rather than to
 * LauraHomes. Both are correct — the token is signed with a shared secret and
 * the `users` row is shared — but a link that returns to the app the person was
 * actually using is the one that does not confuse them.
 */
export async function getAppUrl(): Promise<string> {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000")
    .split(",")[0]
    .trim();
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = (h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https"))
    .split(",")[0]
    .trim();
  return `${proto}://${host}`;
}

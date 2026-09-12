"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/cn";
import { AuthLayout } from "./AuthLayout";
import { Field } from "./Field";
import { SubmitButton } from "./SubmitButton";

/**
 * How long before the resend button comes back.
 *
 * Client-side only, so it is a courtesy rather than a control — it stops the
 * button being mashed, not a determined script. The send endpoint is the same
 * for a registered and an unregistered address, so there is nothing to learn by
 * hammering it.
 */
const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailClient({ email, status }: { email: string; status: string }) {
  const { t, locale } = useI18n();
  const v = t.auth.verify;

  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(
    null,
  );
  const autoSentRef = useRef(false);

  // Tick the resend cooldown down to zero.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const sendVerification = useCallback(
    async (address: string) => {
      const target = address.trim();
      if (!target) return;

      setSending(true);
      setFeedback(null);
      try {
        const res = await fetch("/api/auth/verify-email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: target, locale }),
        });
        if (!res.ok) {
          setFeedback({ type: "error", msg: v.sendError });
        } else {
          setFeedback({ type: "success", msg: v.resent });
          setCooldown(RESEND_COOLDOWN_SECONDS);
        }
      } catch {
        setFeedback({ type: "error", msg: v.sendError });
      } finally {
        setSending(false);
      }
    },
    [locale, v.sendError, v.resent],
  );

  // Send once on arrival when we know the address — this screen is reached
  // straight after registering, or when an unverified account tries to sign in.
  // The ref guards against a second send in development's double-mount.
  useEffect(() => {
    if (autoSentRef.current || !email) return;
    autoSentRef.current = true;
    void sendVerification(email);
  }, [email, sendVerification]);

  const statusMsg =
    status === "unverified"
      ? v.statusUnverified
      : status === "invalid"
        ? v.statusInvalid
        : status === "error"
          ? v.statusError
          : "";

  function handleResend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending || cooldown > 0) return;
    const address = String(new FormData(e.currentTarget).get("email") ?? "");
    void sendVerification(address);
  }

  return (
    <AuthLayout
      title={v.title}
      subtitle={statusMsg ? undefined : v.subtitle}
      footer={
        <Link href="/login" className="font-medium text-tan-deep underline underline-offset-2">
          {v.backToLogin}
        </Link>
      }
    >
      <form onSubmit={handleResend} className="mt-10 flex flex-col gap-4" noValidate>
        {statusMsg && (
          <p role="alert" className="rounded-md bg-cream-deep px-4 py-3 text-sm text-ink">
            {statusMsg}
          </p>
        )}

        <p className="text-sm leading-relaxed text-ink-soft">{v.instruction}</p>

        <Field
          label={v.emailLabel}
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={email}
          required
        />

        {feedback && (
          <p
            role="status"
            className={cn(
              "rounded-md bg-cream-deep px-4 py-3 text-sm text-ink",
              // No red in this palette, so a failure is marked by an accent
              // edge rather than a colour the rest of the app never uses.
              feedback.type === "error" && "border-l-2 border-tan-deep",
            )}
          >
            {feedback.msg}
          </p>
        )}

        {/* A cooldown is not a pending submit: the countdown shows as the idle
            label, with no spinner, and `disabled` keeps Enter from firing it. */}
        <SubmitButton
          pending={sending}
          disabled={cooldown > 0}
          label={cooldown > 0 ? `${v.resendIn} ${cooldown}s` : v.resend}
          pendingLabel={v.resending}
          className="mt-2"
        />
      </form>
    </AuthLayout>
  );
}

import { VerifyEmailClient } from "@/components/auth/VerifyEmailClient";

/**
 * "Verify your email".
 *
 * Reachable while logged out — it sits outside the proxy matcher on purpose,
 * because everyone who lands here is by definition unable to sign in. Reached
 * after registering, when an unverified account tries to log in, and when a
 * verification link has expired.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; status?: string }>;
}) {
  const { email, status } = await searchParams;
  return <VerifyEmailClient email={email ?? ""} status={status ?? ""} />;
}

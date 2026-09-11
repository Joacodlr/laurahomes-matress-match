import { requireUser } from "@/lib/auth/dal";
import { MatchFlow } from "@/components/MatchFlow";

/**
 * The questionnaire itself, behind a sign-in.
 *
 * `requireUser()` rather than trusting the proxy: the proxy is the fast,
 * optimistic gate and only reads the JWT, so a session revoked since the token
 * was minted still looks valid to it. This is the check that goes to the
 * database.
 */
export default async function MatchPage() {
  await requireUser();

  return (
    <main className="flex flex-1 flex-col">
      <MatchFlow />
    </main>
  );
}

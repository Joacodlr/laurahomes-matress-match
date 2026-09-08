import { MatchFlow } from "@/components/MatchFlow";

/**
 * The app itself. No auth — anyone who lands here can run the questionnaire.
 *
 * The cost control for that lives in `POST /api/match` (a per-IP limiter), not
 * here: this page is static and free to serve.
 */
export default function MatchPage() {
  return (
    <main className="flex flex-1 flex-col">
      <MatchFlow />
    </main>
  );
}

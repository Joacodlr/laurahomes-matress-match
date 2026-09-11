"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { AnalyzingScreen } from "./AnalyzingScreen";
import { LanguageToggle } from "./LanguageToggle";
import { MatchProvider, useMatch } from "./MatchProvider";
import { QuestionScreen } from "./QuestionScreen";
import { ResultsScreen } from "./ResultsScreen";

/**
 * Which screen is showing.
 *
 * Four states, and the provider already knows which one it is in — `question`
 * is null once everything has been asked, `sending` covers the wait, and
 * `hasResults` says the answer has landed. Nothing extra is stored to track
 * this: a separate step counter is a second source of truth waiting to disagree
 * with the transcript.
 */
export function MatchFlow() {
  return (
    <MatchProvider>
      <MatchFlowInner />
    </MatchProvider>
  );
}

function MatchFlowInner() {
  const { t } = useI18n();
  const { question, sending, error, hasResults, retry, reset } = useMatch();

  return (
    <div className="relative min-h-dvh">
      <div className="absolute left-6 top-6 z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-ink-faint transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {t.match.backHome}
        </Link>
      </div>

      <div className="absolute right-6 top-6 z-10 flex items-center gap-4">
        <LanguageToggle />
        {/* A plain form, not a client handler: logging out is a server action
            that has to clear httpOnly cookies, which script cannot touch. */}
        <form action={logout}>
          <button
            type="submit"
            className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-faint transition-colors hover:text-ink"
          >
            {t.auth.signOut}
          </button>
        </form>
      </div>

      {/* Errors take the screen rather than sitting above a half-finished
          question: at this point every answer is in, so there is nothing else
          to do here but try again. */}
      {error ? (
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
          <h1 className="font-display text-2xl font-normal text-ink">{error}</h1>
          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-cream transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              {t.match.tryAgain}
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-faint transition-colors hover:text-ink"
            >
              {t.match.restart}
            </button>
          </div>
        </main>
      ) : sending ? (
        <AnalyzingScreen />
      ) : hasResults ? (
        <ResultsScreen />
      ) : question ? (
        <QuestionScreen />
      ) : (
        // Everything answered, nothing in flight and no result: the tab was
        // reloaded while the request was open, which keeps the answers and
        // loses the reply.
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
          <h1 className="font-display text-2xl font-normal text-ink">
            {t.match.results.resume}
          </h1>
          <button
            type="button"
            onClick={retry}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-cream transition-transform hover:scale-[1.02]"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            {t.match.tryAgain}
          </button>
        </main>
      )}
    </div>
  );
}

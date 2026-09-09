"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LanguageToggle } from "./LanguageToggle";
import { AnswerChoices } from "./AnswerChoices";
import { AssistantMessages } from "./AssistantMessages";
import { MatchProvider, useMatch, type Turn } from "./MatchProvider";

/**
 * The product finder, full page.
 *
 * Ported from laurahomes `src/components/products/ProductAssistant.tsx`, plus a
 * link back to this app's landing page — laurahomes reaches its version through
 * a nav bar that does not exist here.
 *
 * A conversation the shopper holds up entirely by clicking: the adviser asks,
 * four answers appear, picking one moves it along. After the last question one
 * call to the model weighs every answer and returns the products with a fit
 * score each. Cards come from real catalogue rows the server resolved — the
 * model only chose which ids to show and how well they fit, never what they say.
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
  const { turns, sending, error, started } = useMatch();

  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest turn in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, sending]);

  const opening: Turn[] = [{ role: "assistant", content: t.questions[0].prompt }];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-12 sm:py-16">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.match.backHome}
        </Link>
        <LanguageToggle />
      </div>

      <header className="mt-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sand">
          <Sparkles className="size-7 text-accent" aria-hidden />
        </div>
        <h1 className="mt-6 font-display text-3xl font-medium text-foreground sm:text-4xl">
          {t.match.title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">{t.match.subtitle}</p>
      </header>

      {/* Before the first click there is no transcript, so the first question
          stands in for one — the page opens already in conversation rather than
          with a heading that turns into a bubble the moment you answer it. */}
      <div className="mt-8">
        <AssistantMessages turns={started ? turns : opening} sending={sending} />
        <div ref={endRef} />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-clay-deep/30 bg-clay/15 p-3 text-center text-sm font-medium text-foreground"
        >
          {error}
        </p>
      )}

      <div className="sticky bottom-4 mt-8 rounded-2xl bg-background/80 py-3 backdrop-blur-sm">
        <AnswerChoices />
      </div>
    </div>
  );
}

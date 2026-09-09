"use client";

import { RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { fill } from "@/lib/format";
import { useMatch } from "./MatchProvider";

/**
 * The only way to talk to the finder: the current question's answers, as
 * buttons.
 *
 * Ported from laurahomes `src/components/products/AnswerChoices.tsx`, minus its
 * `stacked` variant — that exists for a side panel this app does not have.
 *
 * This is what replaced the text box. A shopper who can type will type anything
 * — a brand we do not stock, a question about delivery, a sentence in a third
 * language — and every one of those is a turn the adviser has to field and can
 * get wrong. Four buttons cannot be answered wrongly, and they double as the
 * prompt: the question is on screen and so is every acceptable reply.
 */
export function AnswerChoices() {
  const { t } = useI18n();
  const { question, answer, sending, step, total, retry, reset, started, hasResults } =
    useMatch();

  // Nothing left to ask. Either the recommendation is on screen, or it is still
  // owed — because the call failed, or because the tab was reloaded while it was
  // in flight, which loses the request but keeps the answers. Both leave the
  // shopper having answered everything with nothing to show for it, so both get
  // the same way out.
  if (!question) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!hasResults && !sending && (
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95"
          >
            <RefreshCw className="size-4" aria-hidden />
            {t.match.tryAgain}
          </button>
        )}
        {!sending && <RestartButton onClick={reset} label={t.match.restart} />}
      </div>
    );
  }

  return (
    <div>
      <p className="text-right text-xs uppercase tracking-widest text-muted-foreground">
        {fill(t.match.progress, { step: step + 1, total })}
      </p>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {question.answers.map((option, index) => (
          <button
            key={option.label}
            type="button"
            disabled={sending}
            onClick={() => answer(index)}
            className="rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors hover:border-accent/60 hover:bg-sand disabled:pointer-events-none disabled:opacity-50"
          >
            {option.label}
          </button>
        ))}
      </div>

      {started && (
        <div className="mt-3 flex justify-end">
          <RestartButton onClick={reset} label={t.match.restart} />
        </div>
      )}
    </div>
  );
}

function RestartButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <RefreshCw className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}

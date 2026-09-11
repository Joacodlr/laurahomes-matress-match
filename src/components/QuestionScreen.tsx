"use client";

import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { fill } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useMatch } from "./MatchProvider";

/**
 * One question, filling the screen.
 *
 * This replaced a chat transcript. A conversation is the right shape when
 * someone can say anything; here there are four buttons, and stacking every
 * previous exchange above them turned a six-question form into a wall of text
 * nobody re-read. One question at a time, and the dots carry the history
 * instead.
 *
 * Each answer's little acknowledgement still goes into the transcript — the
 * model is given it as context — it is simply no longer drawn.
 */

/** A small mark per answer, standing in for the emoji in the reference design. */
const MARKS = ["·", "—", "◦", "+"];

export function QuestionScreen() {
  const { t } = useI18n();
  const { question, step, total, answer, back, sending, started } = useMatch();

  if (!question) return null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-6 py-10">
      <header className="text-center">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-ink-faint">
          {t.landing.eyebrow}
        </p>

        {/* Dots rather than a bar: six is few enough to count, and a filled
            lozenge for the current one says "you are here" more plainly than a
            percentage. */}
        <div className="mt-5 flex items-center justify-center gap-2" aria-hidden>
          {Array.from({ length: total }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === step
                  ? "w-6 bg-ink"
                  : index < step
                    ? "w-1.5 bg-ink"
                    : "w-1.5 bg-sand",
              )}
            />
          ))}
        </div>

        <p className="mt-4 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-tan-deep">
          {fill(t.match.progress, { step: step + 1, total })}
        </p>
      </header>

      <div key={question.key} className="step-in mt-12 flex-1">
        <h1 className="font-display text-3xl font-normal leading-tight text-ink sm:text-4xl">
          {question.prompt}
        </h1>
        <p className="mt-3 text-sm text-ink-soft">{t.match.pickOne}</p>

        <div className="mt-8 flex flex-col gap-3">
          {question.answers.map((option, index) => (
            <button
              key={option.label}
              type="button"
              disabled={sending}
              onClick={() => answer(index)}
              className="step-in group flex items-center gap-5 rounded-lg border border-border bg-card px-5 py-5 text-left transition-all hover:border-tan hover:shadow-[0_14px_40px_-24px_rgba(40,30,20,0.5)] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{ "--step-delay": `${index * 60}ms` } as React.CSSProperties}
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cream-deep font-display text-lg text-tan-deep">
                {MARKS[index] ?? "·"}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium text-ink">{option.label}</span>
                <span className="mt-0.5 block text-sm text-ink-faint">{option.reply}</span>
              </span>

              {/* Empty until hovered — the choice is the click, so a filled
                  radio before one is made would be a lie. */}
              <span className="size-5 shrink-0 rounded-full border border-border transition-colors group-hover:border-tan-deep group-hover:bg-tan-deep" />
            </button>
          ))}
        </div>
      </div>

      {started && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={back}
            disabled={sending}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-ink-faint transition-colors hover:text-ink disabled:opacity-50"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {t.match.back}
          </button>
        </div>
      )}
    </main>
  );
}

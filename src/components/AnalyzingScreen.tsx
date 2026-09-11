"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/cn";

/**
 * The wait.
 *
 * One model call, a few seconds — long enough that a bare spinner reads as a
 * stall. The checklist is the honest version of what is happening: those are
 * the five things the adviser was actually given, ticked off at a pace that
 * fits the call rather than reporting real progress, which the API does not
 * stream.
 *
 * The count-up is presentational for the same reason. It is a way of saying
 * "still working" without claiming to know how much is left.
 */

/** Roughly how long a recommendation takes, for pacing the ticks. */
const EXPECTED_MS = 6000;

export function AnalyzingScreen() {
  const { t } = useI18n();
  const steps = t.match.analysing.steps;

  const [done, setDone] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const per = EXPECTED_MS / steps.length;
    // Ticks stop one short: the last item stays pending until the answer
    // actually lands and this screen is replaced, so nothing claims to have
    // finished while the request is still open.
    const timer = window.setInterval(() => {
      setDone((current) => (current < steps.length - 1 ? current + 1 : current));
    }, per);
    return () => window.clearInterval(timer);
  }, [steps.length]);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((n) => n + 100), 100);
    return () => window.clearInterval(timer);
  }, []);

  const progress = Math.min(96, (elapsed / EXPECTED_MS) * 100);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <div
        className="ring-sweep grid size-44 place-items-center rounded-full"
        style={{ "--sweep": progress } as React.CSSProperties}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label={t.match.analysing.title}
      >
        <div className="grid size-[10.5rem] place-items-center rounded-full bg-background">
          <span className="font-display text-4xl text-ink">
            {Math.max(0, Math.ceil((EXPECTED_MS - elapsed) / 1000))}
          </span>
        </div>
      </div>

      <h1 className="mt-10 font-display text-2xl font-normal text-ink sm:text-3xl">
        {t.match.analysing.title}
      </h1>

      <ul className="mt-10 w-full">
        {steps.map((label, index) => (
          <li
            key={label}
            className={cn(
              "flex items-center justify-between border-b border-border py-4 text-left text-sm transition-colors duration-500",
              index < done ? "text-ink" : "text-ink-faint/60",
            )}
          >
            <span>{label}</span>
            <Check
              className={cn(
                "size-4 transition-opacity duration-500",
                index < done ? "opacity-100" : "opacity-0",
              )}
              aria-hidden
            />
          </li>
        ))}
      </ul>
    </main>
  );
}

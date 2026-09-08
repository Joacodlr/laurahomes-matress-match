import Link from "next/link";
import { ArrowRight, BedDouble, ClipboardList, Scale, Sparkles } from "lucide-react";
import { COPY, QUESTIONS } from "@/lib/questions";

/**
 * The landing page: explain the idea, then get out of the way.
 *
 * A server component with no interactivity — the only thing to do here is press
 * the button, and everything on the page is static. That keeps the first paint
 * cheap and means the client bundle only loads once someone actually starts.
 */

const STEP_ICONS = [ClipboardList, Scale, Sparkles];

export default function LandingPage() {
  const { landing } = COPY;

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
        {/* A soft wash behind the hero so the cream background has some depth.
            Purely decorative, hence aria-hidden. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(60%_60%_at_50%_0%,var(--sand),transparent)]"
        />

        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sand">
            <BedDouble className="size-7 text-accent" aria-hidden />
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {landing.eyebrow}
          </p>

          <h1 className="mt-3 font-display text-4xl leading-tight font-medium text-foreground sm:text-5xl">
            {landing.title}
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {landing.subtitle}
          </p>

          <Link
            href="/match"
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-medium text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {landing.cta}
            <ArrowRight className="size-4" aria-hidden />
          </Link>

          <p className="mt-4 text-sm text-muted-foreground">{landing.footnote}</p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-3">
          {landing.steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? ClipboardList;
            return (
              <div
                key={step.title}
                className="rise rounded-2xl border border-border bg-card p-6"
                style={{ "--rise-delay": `${index * 90}ms` } as React.CSSProperties}
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-sand">
                  <Icon className="size-5 text-accent" aria-hidden />
                </div>
                <h2 className="mt-4 font-display text-lg font-medium text-foreground">
                  {step.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-4xl text-center text-sm text-muted-foreground">
          {QUESTIONS.length} preguntas · menos de un minuto
        </p>
      </section>
    </main>
  );
}

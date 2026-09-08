"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, ExternalLink, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { COPY, QUESTIONS } from "@/lib/questions";
import { fill, formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * The questionnaire and its result.
 *
 * A guided questionnaire, not a chatbot: the visitor answers by clicking, never
 * by typing. Every prompt and acknowledgement is fixed text from `questions.ts`,
 * so each click lands instantly and costs nothing — the model is called exactly
 * once, at the end, to weigh all the answers together.
 *
 * State lives in this component rather than a provider or storage: there is one
 * surface, and a half-finished interrogation about mattress firmness is not
 * worth restoring across a refresh. "Start over" is always there.
 */

interface Recommendation {
  id: string;
  name: string;
  imageUrl: string | null;
  productUrl: string | null;
  price: number;
  onSale: boolean;
  salePrice: number | null;
  categoryName: string | null;
  /** 0-100, how well this fits the answers given. */
  match: number;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export function MatchFlow() {
  const { match: copy } = COPY;

  const [turns, setTurns] = useState<Turn[]>([
    { role: "assistant", content: QUESTIONS[0].prompt },
  ]);
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ reply: string; products: Recommendation[] } | null>(
    null,
  );

  /**
   * The answers so far, in the shape the API wants. State rather than a ref
   * because the retry button's disabled state is derived from it, and a ref read
   * during render would not track.
   */
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const question = step < QUESTIONS.length ? QUESTIONS[step] : null;

  // Keep the newest turn in view as the questionnaire grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, sending, result]);

  async function recommend(submitted: { question: string; answer: string }[]) {
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: submitted }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        products?: Recommendation[];
        error?: string;
      };

      if (!res.ok || !data.reply) {
        setError(res.status === 429 ? copy.errorBusy : data.error || copy.errorGeneric);
        return;
      }

      setResult({ reply: data.reply, products: data.products ?? [] });
    } catch {
      setError(copy.errorNetwork);
    } finally {
      setSending(false);
    }
  }

  function answer(index: number) {
    if (sending || !question) return;

    const chosen = question.answers[index];
    if (!chosen) return;

    // Built locally as well as stored, because `recommend` below needs the full
    // list now — a state update is not readable in the same tick.
    const nextAnswers = [...answers, { question: question.prompt, answer: chosen.label }];
    setAnswers(nextAnswers);

    const next: Turn[] = [
      ...turns,
      { role: "user", content: chosen.label },
      { role: "assistant", content: chosen.reply },
    ];

    const following = QUESTIONS[step + 1];
    if (following) {
      next.push({ role: "assistant", content: following.prompt });
      setTurns(next);
      setStep(step + 1);
      return;
    }

    next.push({ role: "assistant", content: copy.finishing });
    setTurns(next);
    setStep(step + 1);
    void recommend(nextAnswers);
  }

  function restart() {
    setAnswers([]);
    setTurns([{ role: "assistant", content: QUESTIONS[0].prompt }]);
    setStep(0);
    setResult(null);
    setError(null);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {copy.backHome}
        </Link>

        {question && (
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {fill(copy.progress, { step: step + 1, total: QUESTIONS.length })}
          </span>
        )}
      </div>

      {/* Progress bar — a questionnaire with no visible end is a questionnaire
          people abandon. */}
      <div
        className="mt-4 h-1 overflow-hidden rounded-full bg-sand"
        role="progressbar"
        aria-valuenow={Math.min(step, QUESTIONS.length)}
        aria-valuemin={0}
        aria-valuemax={QUESTIONS.length}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${(Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 100}%` }}
        />
      </div>

      {/* Transcript */}
      <div className="mt-8 space-y-4" aria-live="polite">
        {turns.map((turn, index) => (
          <div
            key={index}
            className={cn("flex", turn.role === "user" ? "justify-end" : "items-start gap-3")}
          >
            {turn.role === "assistant" && (
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sand">
                <Bot className="size-4 text-accent" aria-hidden />
              </span>
            )}
            <p
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm",
                turn.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground shadow-sm",
              )}
            >
              {turn.content}
            </p>
          </div>
        ))}

        {sending && (
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sand">
              <Bot className="size-4 text-accent" aria-hidden />
            </span>
            <span className="inline-flex items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {copy.thinking}
            </span>
          </div>
        )}

        {/* The recommendation */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sand">
                <Bot className="size-4 text-accent" aria-hidden />
              </span>
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-card px-4 py-3 text-sm text-foreground shadow-sm">
                {result.reply}
              </p>
            </div>

            {result.products.length > 0 && (
              <div className="grid gap-4 pl-11 sm:grid-cols-2 lg:grid-cols-3">
                {result.products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-clay-deep/30 bg-clay/15 p-4 text-center"
        >
          <p className="text-sm font-medium text-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void recommend(answers)}
            disabled={sending || answers.length === 0}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-foreground/30 hover:bg-sand disabled:opacity-50"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            {copy.tryAgain}
          </button>
        </div>
      )}

      {/* Answers for the current question */}
      {question && !sending && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {question.answers.map((option, index) => (
            <button
              key={option.label}
              type="button"
              onClick={() => answer(index)}
              className="rise rounded-2xl border border-border bg-card px-5 py-4 text-left text-sm font-medium text-foreground transition-colors hover:border-accent/60 hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{ "--rise-delay": `${index * 60}ms` } as React.CSSProperties}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {(result || error) && (
        <button
          type="button"
          onClick={restart}
          className="mx-auto mt-8 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          {copy.restart}
        </button>
      )}
    </div>
  );
}

function ProductCard({ product, index }: { product: Recommendation; index: number }) {
  const onSale = product.onSale && product.salePrice !== null;
  const price = onSale ? product.salePrice! : product.price;

  // Products without a destination still deserve a card; they just aren't links.
  const Wrapper = product.productUrl ? "a" : "div";
  const linkProps = product.productUrl
    ? { href: product.productUrl, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Wrapper
      {...linkProps}
      className={cn(
        "rise group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all",
        product.productUrl && "hover:border-accent/50 hover:shadow-lg",
      )}
      style={{ "--rise-delay": `${index * 90}ms` } as React.CSSProperties}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-sand">
        {product.imageUrl ? (
          // Absolute laurahomes.es upload URLs — a plain img avoids next/image
          // remote-pattern config for a host that changes with each import.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Sparkles className="size-6" aria-hidden />
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-sm">
          {fill(COPY.match.matchLabel, { score: product.match })}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.categoryName && (
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {product.categoryName}
          </span>
        )}
        <h3 className="font-display text-base leading-snug text-foreground">{product.name}</h3>

        <div className="mt-auto flex items-baseline gap-2 pt-3">
          <span className="font-medium text-foreground">{formatPrice(price)}</span>
          {onSale && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {product.productUrl && (
          <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-clay-deep">
            {COPY.match.order}
            <ExternalLink className="size-3" aria-hidden />
          </span>
        )}
      </div>
    </Wrapper>
  );
}

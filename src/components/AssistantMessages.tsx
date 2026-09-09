"use client";

import { useEffect, useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { COPY } from "@/lib/questions";
import { fill, formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Recommendation, Turn } from "./MatchProvider";

/**
 * The transcript: bubbles plus the product cards a recommendation carries.
 *
 * Ported from laurahomes `src/components/products/AssistantMessages.tsx`. The
 * source has a `compact` variant for its side panel; there is no side panel
 * here, so that branch is gone and the full-width layout is the only one.
 *
 * Every recommendation wears a fit percentage, counting up from zero into a
 * little meter above the picture. Three cards with no ordering cue put the work
 * of comparing them back on the shopper, which is what they came here to avoid;
 * a filling bar says "look at this one first" before the text is even read. It
 * is the adviser's own judgement of the answers, not a measurement — see
 * `clampMatch` in lib/products/matcher.ts for what happens when it declines to
 * give one.
 */
export function AssistantMessages({ turns, sending }: { turns: Turn[]; sending: boolean }) {
  return (
    <div className="space-y-5" aria-live="polite">
      {turns.map((turn, index) => (
        <div key={index}>
          <div
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

          {turn.products && turn.products.length > 0 && (
            <div className="mt-4 grid gap-4 pl-11 sm:grid-cols-2 lg:grid-cols-3">
              {turn.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      ))}

      {sending && (
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sand">
            <Bot className="size-4 text-accent" aria-hidden />
          </span>
          <span className="inline-flex items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {COPY.match.thinking}
          </span>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Recommendation }) {
  const onSale = product.onSale && product.salePrice !== null;
  const price = onSale ? product.salePrice! : product.price;

  // laurahomes links to its own `/products/{id}` page. There is no such page
  // here, so the card points at the retailer URL the row carries — and a product
  // without one is a plain div rather than a link to nowhere.
  const Wrapper = product.productUrl ? "a" : "div";
  const linkProps = product.productUrl
    ? { href: product.productUrl, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Wrapper
      {...linkProps}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all",
        product.productUrl && "hover:border-accent/50 hover:shadow-lg",
      )}
    >
      <MatchMeter score={product.match} />

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
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
        {product.categoryName && (
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {product.categoryName}
          </span>
        )}
        <h3 className="font-display text-base leading-snug text-foreground">{product.name}</h3>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="font-medium text-foreground">{formatPrice(price)}</span>
          {onSale && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>
    </Wrapper>
  );
}

/**
 * Count from 0 up to `target` over `duration`, eased out.
 *
 * The number arrives with the card, so animating it is the difference between a
 * figure that was simply printed and one that was arrived at — the second reads
 * as a verdict. Anyone who has asked their system not to animate gets the final
 * value immediately instead.
 */
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let frame = 0;
    let startedAt: number | null = null;

    const tick = (now: number) => {
      // Handled inside the frame rather than in the effect body: a synchronous
      // setState there would cascade a second render before paint.
      if (reduced) {
        setValue(target);
        return;
      }

      startedAt ??= now;
      const progress = Math.min(1, (now - startedAt) / duration);
      // Ease-out cubic: quick off the mark, settling onto the final figure.
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

/**
 * The fit percentage: a labelled bar across the top of the card. Renders nothing
 * when the score is missing.
 */
function MatchMeter({ score }: { score: number }) {
  const shown = useCountUp(typeof score === "number" && !Number.isNaN(score) ? score : 0);

  if (typeof score !== "number" || Number.isNaN(score)) return null;

  const label = fill(COPY.match.matchLabel, { score: shown });

  return (
    <div className="border-b border-border px-4 pb-2.5 pt-3">
      <p className="text-xs font-semibold tracking-wide text-clay-deep">{label}</p>
      {/* Width is driven straight off the counter rather than by a CSS
          transition — two animations racing on the same property is what makes
          a bar look like it is stuttering. */}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand">
        <div
          className="h-full rounded-full bg-clay-deep"
          style={{ width: `${shown}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={fill(COPY.match.matchLabel, { score: Math.round(score) })}
        />
      </div>
    </div>
  );
}

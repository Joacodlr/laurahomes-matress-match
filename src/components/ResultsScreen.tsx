"use client";

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { fill, formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useMatch, type Recommendation } from "./MatchProvider";

/**
 * The answer.
 *
 * One product gets the whole screen — the percentage, the photograph, the
 * reasoning — and the runners-up sit underneath as cards. A grid of three
 * equals makes the visitor do the comparing again, which is the work they came
 * here to hand over.
 *
 * The adviser's own sentences appear under the headline rather than being
 * replaced by generated copy: it explains the pick using what they answered,
 * and that explanation is most of the value.
 */
export function ResultsScreen() {
  const { t } = useI18n();
  const { turns, reset } = useMatch();

  const last = turns.at(-1);
  const products = last?.products ?? [];
  const reply = last?.content ?? "";

  const [best, ...rest] = products;

  if (!best) return null;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-20 pt-14">
      <section className="flex flex-col items-center text-center">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-ink-faint">
          {t.match.results.ready}
        </p>

        <MatchRing score={best.match} label={t.match.results.matchWord} />

        <p className="mt-8 max-w-md text-base leading-relaxed text-ink-soft">{reply}</p>
      </section>

      <ProductCard product={best} featured />

      {rest.length > 0 && (
        <section className="mt-14">
          <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-ink-faint">
            {t.match.results.alsoFits}
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {rest.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-14 flex justify-center">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-ink-faint transition-colors hover:text-ink"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          {t.match.restart}
        </button>
      </div>
    </main>
  );
}

/**
 * The headline percentage, sweeping up to its value.
 *
 * The number arrives with the page, so animating it is the difference between a
 * figure that was printed and one that was arrived at. Anyone who asked their
 * system not to animate gets the final value immediately.
 */
function MatchRing({ score, label }: { score: number; label: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let frame = 0;
    let startedAt: number | null = null;

    const tick = (now: number) => {
      // The reduced-motion branch is handled inside the frame, not in the
      // effect body: a synchronous setState there cascades a second render
      // before paint. Same arrangement as laurahomes' own count-up.
      if (reduced) {
        setShown(score);
        return;
      }

      startedAt ??= now;
      const progress = Math.min(1, (now - startedAt) / 1100);
      setShown(Math.round(score * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div
      className="ring-sweep mt-8 grid size-52 place-items-center rounded-full"
      style={{ "--sweep": shown } as React.CSSProperties}
      role="img"
      aria-label={`${score}% ${label}`}
    >
      <div className="grid size-[12.5rem] place-items-center rounded-full bg-background">
        <span className="font-display text-5xl leading-none text-ink">{shown}%</span>
        <span className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-ink-faint">
          {label}
        </span>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  featured = false,
}: {
  product: Recommendation;
  featured?: boolean;
}) {
  const { t, locale } = useI18n();
  const onSale = product.onSale && product.salePrice !== null;
  const price = onSale ? product.salePrice! : product.price;

  // A product with no destination is still worth showing; it just is not a link.
  const Wrapper = product.productUrl ? "a" : "div";
  const linkProps = product.productUrl
    ? { href: product.productUrl, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Wrapper
      {...linkProps}
      className={cn(
        "group mt-12 block overflow-hidden rounded-lg border border-border bg-card transition-all",
        featured ? "mt-14" : "mt-0",
        product.productUrl && "hover:border-tan hover:shadow-[0_22px_60px_-34px_rgba(40,30,20,0.55)]",
      )}
    >
      <div className={cn("relative overflow-hidden bg-cream-deep", featured ? "aspect-[16/10]" : "aspect-[4/3]")}>
        {product.imageUrl ? (
          // A plain img: these are absolute laurahomes.es upload URLs, and
          // next/image would need every one of those hosts declared.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-ink-faint">
            <Sparkles className="size-6" aria-hidden />
          </div>
        )}

        {!featured && (
          <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-ink backdrop-blur-sm">
            {fill(t.match.matchLabel, { score: product.match })}
          </span>
        )}
      </div>

      <div className={cn(featured ? "p-8" : "p-5")}>
        {product.categoryName && (
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-ink-faint">
            {product.categoryName}
          </p>
        )}

        <h3
          className={cn(
            "mt-2 font-display font-normal text-ink",
            featured ? "text-3xl" : "text-xl",
          )}
        >
          {product.name}
        </h3>

        <div className="mt-4 flex items-baseline gap-3">
          <span className={cn("font-medium text-ink", featured ? "text-2xl" : "text-lg")}>
            {formatPrice(price, locale)}
          </span>
          {onSale && (
            <span className="text-sm text-ink-faint line-through">
              {formatPrice(product.price, locale)}
            </span>
          )}
        </div>

        {product.productUrl && (
          <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-tan-deep">
            {t.match.results.view}
            <ExternalLink className="size-3.5" aria-hidden />
          </span>
        )}
      </div>
    </Wrapper>
  );
}

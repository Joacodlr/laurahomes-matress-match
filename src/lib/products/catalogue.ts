import "server-only";
import { listProducts } from "./repository";
import visionFinishes from "./finishes.json";
import type { Product } from "./types";

/**
 * Cached view of the shared catalogue, plus the compact digest the matcher
 * reasons over.
 *
 * Why cached at all: the matcher sends the whole catalogue with every
 * recommendation, so reading it live would mean a full `products` scan per
 * visitor who finishes the questionnaire.
 *
 * Ported from laurahomes `src/lib/products/catalogue.ts`. The manual
 * invalidation hook is gone — this app has no admin write path to invalidate
 * from, so the TTL is the only refresh. A product added in LauraHomes therefore
 * shows up here within five minutes rather than immediately, which is fine for
 * a read-only shopfront.
 */

const TTL_MS = 5 * 60 * 1000;

/** Description characters kept per product in the digest. */
const DIGEST_DESCRIPTION_CHARS = 220;

export interface Catalogue {
  products: Product[];
  /** One line per product, for the system prompt. */
  digest: string;
  /** Category names that actually have products. */
  categories: string[];
}

interface CacheEntry extends Catalogue {
  expiresAt: number;
}

// Cached on globalThis so a dev hot-reload doesn't re-query on every change.
const globalForCatalogue = globalThis as unknown as { __mmCatalogue?: CacheEntry | null };

export async function getCatalogue(): Promise<Catalogue> {
  const cached = globalForCatalogue.__mmCatalogue;
  if (cached && cached.expiresAt > Date.now()) return cached;

  const products = await listProducts();
  const entry: CacheEntry = {
    products,
    digest: buildDigest(products),
    categories: [
      ...new Set(
        products
          .map((product) => product.categoryName)
          .filter((name): name is string => Boolean(name)),
      ),
    ],
    expiresAt: Date.now() + TTL_MS,
  };

  globalForCatalogue.__mmCatalogue = entry;
  return entry;
}

/**
 * Finish and colour words worth pulling out of a description.
 *
 * Spanish only, because that is what the catalogue is written in. Ordered
 * longest-first where one word contains another, so "gris" inside "gris
 * antracita" does not shadow the more specific term.
 */
const FINISH_WORDS = [
  "blanco",
  "negro",
  "antracita",
  "wengue",
  "cambrian",
  "nogal",
  "roble",
  "cemento",
  "beige",
  "crema",
  "gris",
  "natural",
  "madera",
] as const;

/** What the vision pass recorded for one product, if anything. */
interface VisionFinish {
  tone: "claro" | "oscuro" | "mixto" | "desconocido";
  colours: string[];
  confident: boolean;
}

const VISION: Record<string, VisionFinish> = visionFinishes as Record<string, VisionFinish>;

/**
 * What we know about how a product looks.
 *
 * Two sources, because neither is enough alone. The description names a finish
 * for only ten of the twenty-eight products; the photograph knows for
 * twenty-seven, but a photo of a mattress on a white backdrop can be read as a
 * white mattress, so the model was asked to say `desconocido` rather than guess.
 * Where both speak, both are kept — the text tends to list the finishes a
 * product is *sold* in, the photo shows the one that was *shot*.
 *
 * See scripts/classify-finishes.mjs for how the photo half is produced.
 */
function describeFinish(product: Product): { tone: string; colours: string[] } {
  // The whole description, NOT the truncated one: the finishes are usually
  // listed near the end, under "acabados disponibles", and truncating first
  // threw that away for six of the twenty-eight products.
  const haystack = `${product.name} ${product.description ?? ""}`.toLowerCase();
  const fromText = FINISH_WORDS.filter((word) => haystack.includes(word));

  const seen = VISION[String(product.id)];
  const fromPhoto = seen && seen.tone !== "desconocido" ? seen.colours : [];

  return {
    // An unconfident verdict still narrows things down, but the prompt is told
    // to treat it as weaker evidence than one the model stood behind.
    tone: !seen || seen.tone === "desconocido"
      ? "unknown"
      : seen.confident
        ? seen.tone
        : `${seen.tone}?`,
    colours: [...new Set([...fromText, ...fromPhoto])],
  };
}

/**
 * The catalogue as the model sees it.
 *
 * Ids are included because the matcher answers with ids, never with product
 * text — that is what makes a hallucinated product impossible rather than merely
 * unlikely. Descriptions are trimmed: the real ones average ~690 characters of
 * technical Spanish, and sending all of them would be most of the prompt for
 * detail that does not help a recommendation.
 *
 * Finishes get a column of their own because trimming used to bury them. They
 * are also explicitly marked `unknown` when the text names none — 18 of 28
 * products say nothing about colour, and a blank field invites the model to
 * assume a finish it cannot see. Saying so lets the prompt forbid claiming one.
 */
export function buildDigest(products: Product[]): string {
  return products
    .map((product) => {
      const onSale = product.onSale && product.salePrice !== null;
      const price = onSale ? product.salePrice! : product.price;
      const sale = onSale ? ` (on sale, was ${product.price})` : "";
      const description = (product.description ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, DIGEST_DESCRIPTION_CHARS);

      const { tone, colours } = describeFinish(product);

      return [
        `id=${product.id}`,
        product.name,
        product.categoryName ?? "uncategorised",
        `${price} EUR${sale}`,
        `tone: ${tone}`,
        `colours: ${colours.length > 0 ? colours.join("/") : "unknown"}`,
        description || "no description",
      ].join(" | ");
    })
    .join("\n");
}

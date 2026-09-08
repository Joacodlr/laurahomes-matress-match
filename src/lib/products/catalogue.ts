import "server-only";
import { listProducts } from "./repository";
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
 * The catalogue as the model sees it.
 *
 * Ids are included because the matcher answers with ids, never with product
 * text — that is what makes a hallucinated product impossible rather than merely
 * unlikely. Descriptions are trimmed: the real ones average ~690 characters of
 * technical Spanish, and sending all of them would be most of the prompt for
 * detail that does not help a recommendation.
 */
function buildDigest(products: Product[]): string {
  return products
    .map((product) => {
      const onSale = product.onSale && product.salePrice !== null;
      const price = onSale ? product.salePrice! : product.price;
      const sale = onSale ? ` (on sale, was ${product.price})` : "";
      const description = (product.description ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, DIGEST_DESCRIPTION_CHARS);

      return [
        `id=${product.id}`,
        product.name,
        product.categoryName ?? "uncategorised",
        `${price} EUR${sale}`,
        description || "no description",
      ].join(" | ");
    })
    .join("\n");
}

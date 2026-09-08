/**
 * The product shape, matching LauraHomes' `products` table.
 *
 * This app reads that catalogue and never writes to it, so the admin-side
 * `ProductInput` from the source project has no equivalent here.
 */
export interface Product {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  description: string | null;
  /**
   * Main picture — the first of `imageUrls`. Kept as its own field because
   * every card wants exactly one image.
   */
  imageUrl: string | null;
  /** Every picture, main one first. Empty when the product has no image. */
  imageUrls: string[];
  /** Where the Order button sends the visitor, e.g. the laurahomes.es page. */
  productUrl: string | null;
  price: number;
  onSale: boolean;
  salePrice: number | null;
}

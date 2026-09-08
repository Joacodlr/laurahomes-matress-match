import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { query } from "@/lib/db";
import type { Product } from "./types";

/**
 * Read side of the shared LauraHomes catalogue.
 *
 * Ported from laurahomes `src/lib/products/repository.ts`, reduced to the single
 * query this app makes: list everything, so the matcher can weigh the whole
 * catalogue at once. The admin write path and the random-picker used for
 * MiniStore seeding are both out of scope here.
 */

interface ProductRow extends RowDataPacket {
  id: string;
  category_id: string | null;
  category_name: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  product_url: string | null;
  price: string;
  on_sale: 0 | 1;
  sale_price: string | null;
}

const PRODUCT_COLUMNS = `p.id, p.category_id, c.name AS category_name, p.name,
            p.description, p.image_url, p.product_url, p.price, p.on_sale,
            p.sale_price`;

/**
 * `image_url` holds a JSON array of every gallery image, main picture first.
 * Rows that predate the gallery import store a single bare URL instead, so both
 * shapes are accepted rather than requiring a data migration.
 */
function parseImageUrls(raw: string | null): string[] {
  const value = raw?.trim();
  if (!value) return [];

  if (value.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (url): url is string => typeof url === "string" && url.trim() !== "",
        );
      }
    } catch {
      // Malformed JSON — fall through and treat the column as one plain URL.
    }
  }

  return [value];
}

function mapProduct(row: ProductRow): Product {
  const imageUrls = parseImageUrls(row.image_url);

  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    name: row.name,
    description: row.description,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    productUrl: row.product_url,
    price: Number(row.price),
    onSale: Boolean(row.on_sale),
    salePrice: row.sale_price !== null ? Number(row.sale_price) : null,
  };
}

export async function listProducts(): Promise<Product[]> {
  const rows = await query<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p
       LEFT JOIN product_categories c ON c.id = p.category_id
      ORDER BY p.name ASC`,
  );
  return rows.map(mapProduct);
}

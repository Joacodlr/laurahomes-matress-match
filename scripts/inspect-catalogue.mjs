/**
 * Print the catalogue exactly as the matcher sees it.
 *
 * Diagnostic only — reads `products`, writes nothing. The point is to answer a
 * question the code cannot: when a shopper asks for a dark finish, is the colour
 * anywhere in the text the model is given? If it is not, no amount of prompt
 * wording will make the filter work.
 *
 * Usage:
 *   node scripts/inspect-catalogue.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** Next.js loads .env for the app; standalone scripts need to do it themselves. */
function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) continue;

    for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadEnvFiles();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Add it to .env and retry.");
  process.exit(1);
}

const connection = await mysql.createConnection({
  uri: databaseUrl,
  ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
  supportBigNumbers: true,
  bigNumberStrings: true,
});

/** Colour and finish words the style question actually asks about. */
const STYLE_WORDS = [
  "blanco", "white", "oscuro", "dark", "negro", "black", "gris", "grey", "gray",
  "roble", "oak", "nogal", "walnut", "wengue", "wenge", "cambrian", "madera",
  "beige", "crema", "cream", "natural", "cemento", "antracita",
];

try {
  const [rows] = await connection.query(
    `SELECT p.id, p.name, c.name AS category, p.price, p.on_sale, p.sale_price,
            p.description
       FROM products p
       LEFT JOIN product_categories c ON c.id = p.category_id
      ORDER BY c.name ASC, p.price ASC`,
  );

  console.log(`${rows.length} products\n`);

  const byCategory = new Map();
  for (const row of rows) {
    const key = row.category ?? "(sin categoría)";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(row);
  }

  let withStyle = 0;

  for (const [category, items] of byCategory) {
    console.log(`\n=== ${category} (${items.length}) ===`);
    for (const item of items) {
      const price = Number(item.sale_price ?? item.price);
      const haystack = `${item.name} ${item.description ?? ""}`.toLowerCase();
      const found = STYLE_WORDS.filter((word) => haystack.includes(word));
      if (found.length > 0) withStyle++;

      const descLen = (item.description ?? "").trim().length;
      console.log(
        `  ${String(price).padStart(7)} €  ${item.name}` +
          `\n            desc: ${descLen} chars` +
          `  |  colour/finish words: ${found.length ? found.join(", ") : "NONE"}`,
      );
    }
  }

  console.log("\n──────────────────────────────────────────");
  console.log(`Products whose name or description names a colour/finish: ${withStyle}/${rows.length}`);

  const prices = rows.map((r) => Number(r.sale_price ?? r.price)).sort((a, b) => a - b);
  console.log(`Price range: ${prices[0]} € – ${prices[prices.length - 1]} €`);
  const bands = { "<300": 0, "300-600": 0, "600-1000": 0, ">1000": 0 };
  for (const p of prices) {
    if (p < 300) bands["<300"]++;
    else if (p <= 600) bands["300-600"]++;
    else if (p <= 1000) bands["600-1000"]++;
    else bands[">1000"]++;
  }
  console.log("Products per budget band:", bands);
} finally {
  await connection.end();
}

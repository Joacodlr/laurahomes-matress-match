/**
 * Look at every product photo and record what colour the thing actually is.
 *
 * Eighteen of the twenty-eight products say nothing about colour anywhere in
 * their name or description, so the style question had nothing to filter on.
 * The photograph knows, though — so this asks a vision model once per product
 * and writes the answer to `src/lib/products/finishes.json`, which the catalogue
 * reads at runtime.
 *
 * A script and a committed file rather than a live call, for three reasons:
 *   - 28 vision calls per recommendation would add seconds and real cost to
 *     every visitor, for an answer that is identical every time;
 *   - the app runs on Vercel, where an in-memory cache dies with each cold
 *     start, so "cache it on first use" would mostly mean "call it again";
 *   - product photos change far less often than the app is used.
 *
 * Re-run it when the catalogue changes. It is safe to run repeatedly: existing
 * entries are reused unless --force is given, so a new product costs one call
 * rather than twenty-eight.
 *
 * Usage:
 *   node scripts/classify-finishes.mjs
 *   node scripts/classify-finishes.mjs --force     # re-classify everything
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const OUTPUT = path.join(root, "src", "lib", "products", "finishes.json");

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

const force = process.argv.includes("--force");

const apiKey = process.env.OPENAI_API_KEY;
const databaseUrl = process.env.DATABASE_URL;
if (!apiKey || !databaseUrl) {
  console.error("Both OPENAI_API_KEY and DATABASE_URL must be set in .env.");
  process.exit(1);
}

/** Same parsing the app uses: a JSON array of URLs, or one bare URL. */
function firstImage(raw) {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.find((url) => typeof url === "string" && url.trim()) ?? null;
      }
    } catch {
      // Malformed JSON — fall through and treat the column as one plain URL.
    }
  }
  return value;
}

const SYSTEM = `You are looking at a product photo from a Spanish bedroom furniture shop.

Report the colour and finish of the FURNITURE ITSELF — not the background, not
the bedding styled around it, not any promotional text overlaid on the image.

Answer with strict JSON only:
{"tone": "claro" | "oscuro" | "mixto" | "desconocido",
 "colours": string[],
 "childFriendly": "si" | "no" | "desconocido",
 "confident": boolean}

- "tone" is the single most useful field:
    claro   — white, cream, beige, light wood, light grey
    oscuro  — black, anthracite, wenge, dark walnut, dark grey
    mixto   — the photo plainly shows the same product in several finishes,
              which many of these are sold in
    desconocido — you genuinely cannot tell, or the image is a promotional
              banner rather than a product shot
- "colours" lists the finishes you can actually see, in Spanish, lowercase
  (blanco, negro, gris, antracita, roble, nogal, wengue, beige, madera...).
  Use [] when the tone is desconocido.
- "childFriendly" says whether this looks like furniture for a child's room:
    si   — clearly aimed at children: a trundle or nest bed, a toy-storage
           chest, a narrow single frame, bright playful colours
    no   — clearly an adult double, or plainly generic bedroom furniture
    desconocido — you cannot tell from the photo
  Judge only what you can see. A plain single mattress is NOT automatically for
  a child; adults sleep in single beds too.
- "confident" is false when you are guessing. A mattress photographed on a white
  studio background is a WHITE MATTRESS only if the mattress itself is white —
  if you are really describing the backdrop, say desconocido instead.

Being wrong here is worse than saying you do not know: the shop shows this to
customers as a colour match, and a customer checks colour immediately.`;

/**
 * Fetch the image ourselves and hand it over as a data URL.
 *
 * Passing the plain URL made OpenAI fetch it, and laurahomes.es was too slow for
 * ten of the twenty-eight — every one came back "unable to download content
 * before the timeout". Downloading here means our own generous timeout applies
 * instead of theirs, and the request that reaches OpenAI needs no network at all.
 */
async function toDataUrl(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(60_000),
    headers: {
      // Some hosts refuse a request with no User-Agent outright.
      "User-Agent": "Mozilla/5.0 (compatible; mattress-match/1.0)",
    },
  });
  if (!res.ok) throw new Error(`image fetch ${res.status}`);

  const type = res.headers.get("content-type") ?? "image/jpeg";
  if (!type.startsWith("image/")) throw new Error(`not an image (${type})`);

  const buffer = Buffer.from(await res.arrayBuffer());
  // Well under OpenAI's own ceiling, and a product photo this large is already
  // a sign something other than a photo came back.
  if (buffer.byteLength > 18_000_000) throw new Error("image too large");

  return `data:${type};base64,${buffer.toString("base64")}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One classification, retrying while the account is over its token-per-minute
 * limit.
 *
 * An inlined image is a few thousand tokens, so a run of 28 walks straight into
 * the TPM ceiling about two thirds of the way through. The limit resets on a
 * rolling minute, so waiting is the entire fix — but waiting has to happen here,
 * because the alternative is a product silently keeping no colour.
 */
async function classifyWithRetry(imageUrl, attempts = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await classify(imageUrl);
    } catch (error) {
      const rateLimited = /rate limit/i.test(error.message);
      if (!rateLimited || attempt >= attempts) throw error;

      const wait = 15_000 * attempt;
      console.log(`    rate limited, waiting ${wait / 1000}s…`);
      await sleep(wait);
    }
  }
}

async function classify(imageUrl) {
  const inlined = await toDataUrl(imageUrl);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "What colour is this piece of furniture?" },
            { type: "image_url", image_url: { url: inlined } },
          ],
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `OpenAI ${res.status}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("empty response");

  const parsed = JSON.parse(content);
  const tone = ["claro", "oscuro", "mixto", "desconocido"].includes(parsed.tone)
    ? parsed.tone
    : "desconocido";

  const childFriendly = ["si", "no", "desconocido"].includes(parsed.childFriendly)
    ? parsed.childFriendly
    : "desconocido";

  return {
    tone,
    colours: Array.isArray(parsed.colours)
      ? parsed.colours.filter((c) => typeof c === "string" && c.trim()).map((c) => c.toLowerCase())
      : [],
    childFriendly,
    confident: parsed.confident === true,
  };
}

const existing = fs.existsSync(OUTPUT) && !force
  ? JSON.parse(fs.readFileSync(OUTPUT, "utf8"))
  : {};

const connection = await mysql.createConnection({
  uri: databaseUrl,
  ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
  supportBigNumbers: true,
  bigNumberStrings: true,
});

try {
  const [rows] = await connection.query(
    "SELECT id, name, image_url FROM products ORDER BY id ASC",
  );

  const results = { ...existing };
  let called = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const id = String(row.id);

    if (results[id] && !force) {
      skipped++;
      continue;
    }

    const image = firstImage(row.image_url);
    if (!image) {
      console.log(`  ${row.name}: no image, skipping`);
      results[id] = { tone: "desconocido", colours: [], confident: false };
      continue;
    }

    try {
      const verdict = await classifyWithRetry(image);
      called++;
      results[id] = verdict;
      const flag = verdict.confident ? " " : "?";
      const kids = verdict.childFriendly === "si" ? "  [niños]" : "";
      console.log(
        `${flag} ${row.name.padEnd(38)} ${verdict.tone.padEnd(12)} ` +
          `${verdict.colours.join(", ").padEnd(22)}${kids}`,
      );
    } catch (error) {
      // Deliberately NOT recorded. A failure is a slow image or a hiccup, not a
      // verdict — writing it as "desconocido" would make the next run skip it
      // forever, and the product would silently lose its colour for good.
      console.error(`  ${row.name}: FAILED — ${error.message}`);
      failed++;
    }
  }

  fs.writeFileSync(OUTPUT, `${JSON.stringify(results, null, 2)}\n`);

  const tally = Object.values(results).reduce((acc, r) => {
    acc[r.tone] = (acc[r.tone] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\nWrote ${OUTPUT}`);
  console.log(`${called} classified, ${skipped} reused, ${failed} failed.`);
  if (failed > 0) {
    console.log("Failures were not recorded — just run the script again to retry them.");
  }
  console.log("Tones:", tally);
} finally {
  await connection.end();
}

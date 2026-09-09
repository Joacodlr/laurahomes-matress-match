# Mattress Match

A standalone version of LauraHomes' mattress finder. A landing page explains the
idea; pressing the button starts a six-question questionnaire; at the end the
model weighs every answer against the real catalogue and returns up to three
products with a fit score each.

No sign-in. No account. Nothing is written to the database — this app reads the
`products` and `product_categories` tables and nothing else.

## What it reuses

The matching logic is ported from `laurahomes`:

| Here | Ported from |
| --- | --- |
| `src/lib/products/matcher.ts` | `src/lib/products/assistant.ts` (its `recommendNow` branch only) |
| `src/lib/products/catalogue.ts` | same path in laurahomes |
| `src/lib/products/repository.ts` | same path, reduced to `listProducts` |
| `src/lib/i18n/dictionaries/` | the `assistant` dictionary entries, es and en |
| `src/lib/i18n/I18nProvider.tsx` | same path in laurahomes |
| `src/app/globals.css` | the design tokens, minus the blog/catalogue layers |

The model never writes product text: it is given the catalogue with ids and
answers with ids, and anything it returns that is not a real id is discarded.
Every field on a card comes from the database row.

## Language

Spanish and English, with an ES / EN toggle in the corner. The locale is
resolved on the server, so the first paint is already correct:

1. the `mm_locale` cookie, if the visitor has used the toggle before;
2. the browser's `Accept-Language`, parsed by quality;
3. Spanish.

laurahomes stops at step 1 — it is a Spanish-first site people arrive at
deliberately. This one is a standalone link that may be handed to anyone, so
guessing from the browser is worth the extra step. An explicit choice always
wins: once the cookie exists the header is never consulted again.

The chosen locale is also what the adviser writes its reply in — it is
interpolated into the system prompt, exactly as laurahomes does it.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

### The `.env` file

Create a file named `.env` **in this folder** — the same directory as
`package.json`:

```
mattress-match/
├── package.json
├── next.config.ts
└── .env          ← here
```

It needs four values, all of which already exist in the LauraHomes `.env`:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | The same MySQL connection string LauraHomes uses. |
| `OPENAI_API_KEY` | yes | Same key. Every completed questionnaire spends credit. |
| `OPENAI_MODEL` | no | Defaults to `gpt-4o-mini`. |
| `DATABASE_SSL` | no | Set to `false` only for a local DB without SSL. |

`.env` is gitignored, so it will not be committed.

Nothing else from the LauraHomes `.env` is used here — no Stripe, no AWS, no
n8n, no JWT secret. Copying the whole file across would work but would put
credentials in a deployment that has no use for them, so copy only the rows
above.

## Deploying to Vercel

Nothing to configure in the repo — Vercel detects Next.js and uses the right
build command on its own. There is deliberately no `vercel.json`; the defaults
are correct here and a config file would only be one more thing to keep true.

1. **vercel.com → Add New → Project**, then import
   `Joacodlr/laurahomes-matress-match`.
2. Leave every build setting at its detected default (Framework: Next.js,
   Build: `next build`, Output: `.next`).
3. Add the environment variables below, for **Production, Preview and
   Development**.
4. **Deploy.**

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the same MySQL string LauraHomes uses |
| `OPENAI_API_KEY` | the same OpenAI key |
| `OPENAI_MODEL` | optional; omit to use `gpt-4o-mini` |

Leave `DATABASE_SSL` **unset** in production — RDS wants SSL and the default
path enables it. Setting it to `false` there would break the connection.

Every later push to `main` redeploys automatically.

The database must accept connections from Vercel's IP range. LauraHomes already
runs there against the same instance, so this should need no change.

## Costs and abuse

`POST /api/match` calls OpenAI and is open to anyone with the URL. A per-IP
limiter in `src/lib/rate-limit.ts` allows 8 completions per 10 minutes, which is
generous for a person and useless for a script.

It is a speed bump, not a lock: the counter lives in each serverless instance's
memory, so the real ceiling is that limit times however many instances are warm,
and it resets when an instance recycles. If this ever gets real traffic, move it
to a shared store (Vercel KV, Upstash) rather than lowering the number.

import "server-only";
import { LANGUAGE_LABEL, type Locale } from "@/lib/i18n/config";
import { BUDGET_BANDS, STYLE_TONES } from "@/lib/questionnaire";
import { buildDigest, getCatalogue } from "./catalogue";
import type { Product } from "./types";

/**
 * The matcher: weigh the questionnaire answers and pick the products that fit.
 *
 * Ported from laurahomes `src/lib/products/assistant.ts`, keeping only its
 * `recommendNow` branch. That project's adviser has two modes because it also
 * supports a free-text conversation; here the questionnaire is the only way in,
 * so the model is called exactly once, at the end, and its only job is to choose
 * and rank. Left in the question-asking mode it reliably asks one more question
 * — the one thing a click-only flow has no way to answer.
 *
 * The transcript is passed through as alternating chat messages, exactly as the
 * source project sends it: the question prompts as `assistant` turns and the
 * chosen labels as `user` turns. Flattening it into one block changes what the
 * model is looking at and, with it, what it picks — so the shape is part of the
 * contract, not a formatting detail.
 *
 * The model never writes product text: it is given the catalogue with ids and
 * answers with ids, and anything it returns that is not a real id is discarded.
 * Every field the shopper sees comes from the database row. These are real
 * products with real prices, and an invented one would be a lie someone could
 * act on.
 *
 * Raw `fetch` against the completions endpoint with JSON mode, matching how the
 * source project calls OpenAI — no SDK dependency.
 */

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

/** Someone is watching a spinner, so this is kept short. */
const TIMEOUT_MS = 30_000;

/**
 * Turns of history sent back. Comfortably more than the questionnaire asks, and
 * deliberately so: the whole point is that the recommendation weighs every
 * answer, and a ceiling that dropped the first few would silently throw away
 * what the shopper is even shopping for.
 */
export const MAX_HISTORY = 40;

/** Per-message ceiling. A shopper describing a bedroom needs far less than this. */
export const MAX_MESSAGE_CHARS = 800;

/** Recommendations per reply. More than this stops being a recommendation. */
const MAX_RECOMMENDATIONS = 3;

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
}

/** A recommended product with how well it fits what the shopper asked for. */
export interface Recommendation {
  product: Product;
  /** 0-100. How good a fit this is, best first. */
  match: number;
}

export interface MatchResult {
  reply: string;
  recommendations: Recommendation[];
}

/**
 * Fit scores when the model gives none, or gives nonsense.
 *
 * The percentage is a confidence cue, not a measurement — it tells the shopper
 * which of three cards to look at first. So a plausible descending set beats
 * showing nothing, and beats pretending to a precision the model does not have.
 */
const FALLBACK_MATCH = [94, 88, 82];

/** Keep scores inside a band that reads as a recommendation rather than a warning. */
const MIN_MATCH = 60;
const MAX_MATCH = 99;

/** What the shopper picked, by question key, as the index of their answer. */
export type Choices = Record<string, number>;

/** The price actually charged — the sale price when there is one. */
function effectivePrice(product: Product): number {
  return product.onSale && product.salePrice !== null ? product.salePrice : product.price;
}

/**
 * Drop anything the shopper cannot afford.
 *
 * The ceiling is enforced here rather than asked of the model, because price is
 * the one attribute in this catalogue that is always present and unambiguous —
 * and an instruction to "compare against the band before you write a word" is a
 * request, while a filter is a guarantee.
 *
 * Only the ceiling. The floor is a preference handed to the model instead: a
 * budget of "600-1000" is what someone will spend, not a refusal to see anything
 * cheaper, and this catalogue discounts a 930 EUR mattress to 465.
 *
 * When nothing at all is affordable the whole catalogue comes back with `unmet`
 * set — an empty result helps nobody, but the prompt then has to say plainly
 * that everything is over budget rather than presenting it as a fit.
 */
function withinBudget(
  products: Product[],
  band: { min: number; max: number | null } | undefined,
): { products: Product[]; unmet: boolean } {
  if (!band || band.max === null) return { products, unmet: false };

  const affordable = products.filter((product) => effectivePrice(product) <= band.max!);

  return affordable.length > 0
    ? { products: affordable, unmet: false }
    : { products, unmet: true };
}

/**
 * Laurahomes' `recommendNow` branch, keeping its `${language}` interpolation —
 * that line is what makes the adviser answer in the visitor's language.
 *
 * Two sections have since diverged, both because this app enforces in code what
 * that one only asks for: the budget paragraph is replaced by `budgetNote`
 * (the catalogue arrives pre-filtered), and the finishes section is new (that
 * project has no colour data to reason about at all).
 */
function systemPrompt(
  digest: string,
  categories: string[],
  locale: Locale,
  constraints: { budgetNote: string; styleNote: string },
): string {
  const language = LANGUAGE_LABEL[locale];

  return [
    "You are the LauraHomes product adviser. LauraHomes sells bedroom furniture:",
    `${categories.join(", ")}.`,
    "",
    "The shopper has just finished a guided questionnaire. Every question they",
    "were going to be asked has been asked, and they cannot type a reply — the",
    "interface only offers buttons, and there are none left. So do NOT ask",
    "anything. Recommend now, using everything they told you.",
    "",
    "HOW TO BEHAVE",
    `- Write your reply in ${language}, and only in ${language}.`,
    "- Two or three sentences. Say what you picked up from their answers and why",
    "  these fit — warmly, like a shop assistant, not like a form.",
    "- Never invent a product, a price, a measurement or a feature. Everything",
    "  must come from the catalogue below.",
    "- The catalogue carries one starting price per product and no per-size",
    "  prices, so never quote a figure for a particular size — you do not have those.",
    constraints.budgetNote,
    "",
    "FINISHES — READ THIS BEFORE MENTIONING A COLOUR",
    "Each entry carries `tone:` and `colours:`. Together they are the ONLY thing",
    "you know about how a product looks. `tone` comes from someone actually",
    "looking at the photograph; `colours` merges what the photo showed with what",
    "the description lists.",
    "- tone `claro` — light: white, cream, beige, pale wood, light grey.",
    "- tone `oscuro` — dark: black, anthracite, wenge, dark wood.",
    "- tone `mixto` — the product is SOLD in several finishes, so it is neither",
    "  inherently light nor dark. Say it is AVAILABLE in the one they want, never",
    "  that it simply is that colour.",
    "- tone ending in `?` — the reading was not confident. You may mention it, but",
    "  hedge: 'parece' / 'looks', never a flat statement.",
    "- tone `unknown` — nobody could tell. You do NOT know what colour it is. Never",
    "  call it dark, white, wooden or anything else, and never claim it matches the",
    "  look they asked for. Recommend it on comfort, size, storage or price if it",
    "  earns a place — just say nothing whatsoever about its appearance.",
    constraints.styleNote,
    "- Inventing a colour is the worst thing you can do here: it is the one claim a",
    "  customer checks immediately, and being wrong about it costs the sale.",
    "- Same for anything else they asked for that we do not stock. Name the gap,",
    "  then offer the closest thing.",
    "",
    "HOW TO ANSWER",
    "Reply with STRICT JSON only, no markdown fences and no commentary:",
    '{"reply": string, "recommendations": [{"id": string, "match": number}]}',
    "- `reply` is what the shopper reads. Do NOT list product names, prices or",
    "  descriptions in it — the interface renders a card for every id you return.",
    `- \`recommendations\` holds 1 to ${MAX_RECOMMENDATIONS} entries, best first, no id twice.`,
    "- `id` is copied exactly from the catalogue.",
    "- `match` is a whole number from 60 to 99: how well that product fits",
    "  everything they told you, all their answers weighed together. Reserve the",
    "  nineties for a genuinely good fit and rank them so the first is highest.",
    "  A product whose finish is unknown, or which does not come in the colour they",
    "  asked for, cannot score above 80 — you cannot verify the thing they asked",
    "  for, so the number must not pretend otherwise.",
    "",
    "CATALOGUE (id | name | category | price | tone | colours | description)",
    digest,
  ].join("\n");
}

export async function matchProducts(
  history: AssistantTurn[],
  locale: Locale,
  choices: Choices = {},
): Promise<MatchResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const { products: all, categories } = await getCatalogue();

  const band = BUDGET_BANDS[choices.budget];
  const { products: affordable, unmet } = withinBudget(all, band);

  const budgetNote = !band
    ? "- No budget was given, so do not comment on price."
    : unmet
      ? `- IMPORTANT: the shopper can spend up to ${band.max} EUR and EVERYTHING in the` +
        "\n  catalogue below costs more. Your FIRST sentence must say plainly that we" +
        "\n  have nothing in their range, and only then offer the closest options." +
        "\n  Never describe an over-budget product as fitting their budget."
      : `- The catalogue below has ALREADY been filtered to what the shopper can` +
        `\n  afford (up to ${band.max ?? "any"} EUR). Everything you can see is within reach,` +
        "\n  so treat price as settled and never apologise for it." +
        (band.min > 0
          ? `\n- They indicated a budget starting around ${band.min} EUR. Where two options` +
            "\n  fit equally well, prefer the one nearer that figure — it is usually the" +
            "\n  better product — but do NOT reject something cheaper that genuinely" +
            "\n  suits them, and never imply they must spend more."
          : "");

  const wanted = STYLE_TONES[choices.style];
  const styleNote = wanted
    ? `- THE LOOK THEY ASKED FOR: ${wanted.label}. Strongly prefer products whose` +
      `\n  tone is \`${wanted.tone}\`, or \`mixto\` when their colours include one of:` +
      `\n  ${wanted.colours.join(", ")}. A product with the wrong tone is a poor match no` +
      "\n  matter how good it is otherwise — if you recommend one anyway, say why and" +
      "\n  score it accordingly. If nothing in the catalogue offers the look they" +
      "\n  asked for, say so plainly rather than pretending something does."
    : "- They have no colour preference, so do not dwell on finishes.";

  // Built from the filtered list, not the cached full one — the model must not
  // see a product it is not allowed to recommend.
  const digest = buildDigest(affordable);

  const res = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt(digest, categories, locale, { budgetNote, styleNote }),
        },
        ...history.slice(-MAX_HISTORY).map((turn) => ({
          role: turn.role,
          content: turn.content.slice(0, MAX_MESSAGE_CHARS),
        })),
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  } | null;

  if (!res.ok) {
    // OpenAI's own message is what makes a failure debuggable.
    throw new Error(data?.error?.message ?? `OpenAI request failed (${res.status}).`);
  }

  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned an empty response.");

  const decoded = parseJsonLoosely(content);
  const reply = typeof decoded?.reply === "string" ? decoded.reply.trim() : "";
  if (!reply) throw new Error("OpenAI returned no reply text.");

  // Resolved against the filtered list, not the full catalogue: an id the model
  // was never shown is one it invented or smuggled back in, and either way it
  // must not reach a card. This is what makes the budget a guarantee rather than
  // an instruction.
  return { reply, recommendations: resolveRecommendations(decoded, affordable) };
}

/**
 * Turn the model's answer into real rows with a fit score.
 *
 * Two shapes are accepted, as in the source project: `recommendations: [{id,
 * match}]`, and the plain `product_ids: []` a model occasionally falls back to.
 * Unknown ids are dropped silently rather than reported: a model that invents an
 * id has nothing to show, and the reply text still stands on its own. Duplicates
 * are collapsed because a model asked for three options will occasionally repeat
 * its favourite.
 */
function resolveRecommendations(
  decoded: Record<string, unknown> | null,
  catalogue: Product[],
): Recommendation[] {
  const entries = readEntries(decoded);
  if (entries.length === 0) return [];

  const byId = new Map(catalogue.map((product) => [String(product.id), product]));
  const seen = new Set<string>();
  const resolved: Recommendation[] = [];

  for (const { id, match } of entries) {
    if (!id || seen.has(id)) continue;

    const product = byId.get(id);
    if (!product) {
      console.warn(`[matcher] model returned an unknown product id: ${id}`);
      continue;
    }

    seen.add(id);
    resolved.push({ product, match: clampMatch(match, resolved.length) });
    if (resolved.length >= MAX_RECOMMENDATIONS) break;
  }

  return resolved;
}

/** Both reply shapes, flattened to `{ id, match }` with match possibly absent. */
function readEntries(
  decoded: Record<string, unknown> | null,
): { id: string; match: number | null }[] {
  const asId = (value: unknown): string =>
    typeof value === "string"
      ? value.trim()
      : typeof value === "number"
        ? String(value)
        : "";

  if (Array.isArray(decoded?.recommendations)) {
    return decoded.recommendations.map((entry) => {
      const row = (entry ?? {}) as { id?: unknown; match?: unknown };
      return {
        id: asId(row.id),
        match: typeof row.match === "number" && Number.isFinite(row.match) ? row.match : null,
      };
    });
  }

  if (Array.isArray(decoded?.product_ids)) {
    return decoded.product_ids.map((entry) => ({ id: asId(entry), match: null }));
  }

  return [];
}

/**
 * A usable percentage for the card at `rank`.
 *
 * A model that returns 100, or 7, or nothing at all still has to produce a badge
 * a shopper can read, so anything outside the band falls back to the position it
 * was ranked in — which is the information the model was actually confident about.
 */
function clampMatch(match: number | null, rank: number): number {
  const fallback = FALLBACK_MATCH[rank] ?? FALLBACK_MATCH[FALLBACK_MATCH.length - 1];
  if (match === null) return fallback;

  const rounded = Math.round(match);
  if (rounded < MIN_MATCH || rounded > MAX_MATCH) return fallback;
  return rounded;
}

/** JSON, retried once with markdown fences stripped — models add them anyway. */
function parseJsonLoosely(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const stripped = raw.replace(/^```(?:json)?|```$/gm, "").trim();
    try {
      return JSON.parse(stripped) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getServerLocale } from "@/lib/i18n/server";
import {
  MAX_HISTORY,
  MAX_MESSAGE_CHARS,
  matchProducts,
  type AssistantTurn,
  type Choices,
} from "@/lib/products/matcher";
import { allowRequest, clientIp } from "@/lib/rate-limit";

/**
 * POST /api/match
 * Body: { messages: { role: "user" | "assistant", content: string }[], locale?: string }
 *
 * The end of the questionnaire: weigh every answer against the catalogue and
 * return up to three products with a fit score each.
 *
 * The body is the same shape laurahomes' `/api/product-assistant` takes, and the
 * validation below is its `readMessages` verbatim — the transcript reaches the
 * model in exactly the same form, which is what makes the two give the same
 * answer to the same clicks.
 *
 * Sign-in required: every call spends OpenAI credit, and the proxy does not
 * cover `/api/*`. The per-IP limiter stays as a second line — an account is not
 * a rate limit, and one signed-in visitor can still loop this.
 */

// A single completion — well inside any platform limit, but declared so a slow
// upstream fails here rather than at the edge.
export const maxDuration = 45;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!allowRequest(clientIp(req))) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    messages?: unknown;
    locale?: unknown;
    choices?: unknown;
  };

  // The reply language follows the toggle the visitor is looking at, not the
  // language they happen to read in. Falls back to the cookie (and then to
  // Accept-Language) so a caller that omits it still behaves.
  const locale: Locale = isLocale(typeof body.locale === "string" ? body.locale : undefined)
    ? (body.locale as Locale)
    : await getServerLocale();

  let messages: AssistantTurn[];
  try {
    messages = readMessages(body.messages);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const result = await matchProducts(messages, locale, readChoices(body.choices));
    return NextResponse.json({
      reply: result.reply,
      products: result.recommendations.map(({ product, match }) => ({
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        productUrl: product.productUrl,
        price: product.price,
        onSale: product.onSale,
        salePrice: product.salePrice,
        categoryName: product.categoryName,
        match,
      })),
    });
  } catch (error) {
    // The upstream message can carry account details, so it stays in the log.
    console.error("Mattress match error:", error);
    return NextResponse.json(
      { error: "The adviser is unavailable right now. Please try again." },
      { status: 502 },
    );
  }
}

/**
 * The structured answers, as `{ questionKey: answerIndex }`.
 *
 * Lenient on purpose: a malformed entry is dropped rather than failing the
 * request, because every one of these is an optimisation — the transcript still
 * carries the same information in prose. Losing the budget index costs a
 * catalogue filter, not the recommendation.
 */
function readChoices(raw: unknown): Choices {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const out: Choices = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key !== "string" || key.length > 40) continue;
    if (typeof value !== "number" || !Number.isInteger(value)) continue;
    if (value < 0 || value > 20) continue;
    out[key] = value;
  }
  return out;
}

function readMessages(raw: unknown): AssistantTurn[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("'messages' must be a non-empty array");
  }
  if (raw.length > MAX_HISTORY * 2) {
    throw new Error("Conversation too long");
  }

  const messages: AssistantTurn[] = [];

  for (const entry of raw) {
    const turn = (entry ?? {}) as { role?: unknown; content?: unknown };
    if (turn.role !== "user" && turn.role !== "assistant") {
      throw new Error("Each message needs a role of 'user' or 'assistant'");
    }
    if (typeof turn.content !== "string" || !turn.content.trim()) {
      throw new Error("Each message needs non-empty content");
    }
    messages.push({
      role: turn.role,
      content: turn.content.trim().slice(0, MAX_MESSAGE_CHARS),
    });
  }

  if (messages[messages.length - 1]?.role !== "user") {
    throw new Error("The last message must be from the user");
  }

  return messages;
}

import { NextResponse } from "next/server";
import { matchProducts, type AnsweredQuestion } from "@/lib/products/matcher";
import { QUESTIONS } from "@/lib/questions";
import { allowRequest, clientIp } from "@/lib/rate-limit";

/**
 * POST /api/match
 * Body: { answers: { question: string, answer: string }[] }
 *
 * The end of the questionnaire: weigh every answer against the catalogue and
 * return up to three products with a fit score each.
 *
 * There is no sign-in, so the only thing between this and someone else's OpenAI
 * bill is the per-IP limiter and the shape check below. See `lib/rate-limit.ts`
 * for what that does and does not cover.
 */

// A single completion — well inside any platform limit, but declared so a slow
// upstream fails here rather than at the edge.
export const maxDuration = 45;

/** Answers are picked from fixed buttons, so anything long is not from our UI. */
const MAX_FIELD_CHARS = 300;

export async function POST(req: Request) {
  if (!allowRequest(clientIp(req))) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { answers?: unknown };

  let answers: AnsweredQuestion[];
  try {
    answers = readAnswers(body.answers);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const result = await matchProducts(answers);
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
 * Validate the submitted answers.
 *
 * The count is capped at the questionnaire's own length: a caller sending
 * hundreds of "answers" would otherwise turn one request into a very large
 * prompt at our expense.
 */
function readAnswers(raw: unknown): AnsweredQuestion[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("'answers' must be a non-empty array");
  }
  if (raw.length > QUESTIONS.length) {
    throw new Error("Too many answers");
  }

  const answers: AnsweredQuestion[] = [];

  for (const entry of raw) {
    const row = (entry ?? {}) as { question?: unknown; answer?: unknown };
    if (typeof row.question !== "string" || !row.question.trim()) {
      throw new Error("Each answer needs a non-empty question");
    }
    if (typeof row.answer !== "string" || !row.answer.trim()) {
      throw new Error("Each answer needs a non-empty answer");
    }
    answers.push({
      question: row.question.trim().slice(0, MAX_FIELD_CHARS),
      answer: row.answer.trim().slice(0, MAX_FIELD_CHARS),
    });
  }

  return answers;
}

/**
 * Which questions apply to what the visitor said they are shopping for.
 *
 * The first question asks the category; everything after it is filtered against
 * that answer. Without this every visitor answers every question, so someone
 * after a headboard is asked how firm they like a mattress and whether they need
 * storage under the bed — neither of which has anything to do with what they
 * came for, and both of which the adviser then weighs anyway.
 *
 * Keyed by the *index* of the chosen answer in the first question, because that
 * order is authored identically in both dictionaries and the labels are not:
 * matching on translated text would break the moment someone switches language.
 * The indices are the answers to `need`, in order:
 *
 *   0 — a mattress
 *   1 — a bed base
 *   2 — a headboard
 *   3 — the whole bed
 *
 * A question whose key is absent here applies to everyone. Keep this in step
 * with the `questions` array in the dictionaries: a key that no longer exists is
 * ignored, but a new question added without an entry is shown to everybody,
 * which is the safe direction to fail in.
 */
export const QUESTION_SCOPE: Record<string, readonly number[]> = {
  // Mattress feel and sleep habits: only when a mattress is in play.
  firmness: [0, 3],
  sleep: [0, 3],
  // Under-bed storage is what a base is chosen for; it says nothing about a
  // mattress or a headboard.
  storage: [1, 3],
};

/**
 * The questions that apply, given the answer chosen for the first one.
 *
 * `chosen` is null until the category has been picked, and the full list is
 * returned then — the first question is in every path, so index 0 is stable
 * either way, which is what lets the caller keep deriving its position from the
 * number of answers given.
 */
export function scopedQuestions<T extends { key: string }>(
  questions: readonly T[],
  chosen: number | null,
): readonly T[] {
  if (chosen === null) return questions;

  return questions.filter((question) => {
    const scope = QUESTION_SCOPE[question.key];
    return !scope || scope.includes(chosen);
  });
}

/**
 * What each answer to the first question is actually asking to be shown.
 *
 * `categories` are the real `product_categories.name` values; `nameWords` catch
 * the same thing from the product's own name. Both are needed because the
 * catalogue is not perfectly filed — `Cabecero LUNA` sits under "Canapés", and a
 * shopper asking for a headboard should still be shown it. Matching either way
 * is the difference between honouring the request and honouring the paperwork.
 *
 * The one uncategorised row, "Pack Oferta Colchón Visco y Canapé de Madera",
 * legitimately matches both a mattress and a base request. That is correct: it
 * is both.
 */
export const CATEGORY_SCOPE: readonly ({
  label: string;
  categories: readonly string[];
  nameWords: readonly string[];
} | null)[] = [
  {
    label: "a mattress",
    categories: ["Colchones"],
    nameWords: ["colchón", "colchon"],
  },
  {
    label: "a bed base",
    categories: ["Canapés", "Canapes", "Base cama"],
    nameWords: ["canapé", "canape", "base", "cama"],
  },
  {
    label: "a headboard",
    categories: ["Cabecero", "Cabeceros"],
    nameWords: ["cabecero", "cabecera"],
  },
  null, // el conjunto completo — everything is relevant
];

/**
 * The price band behind each answer to the `budget` question, in order.
 *
 * Kept here rather than parsed out of the label because the label is translated
 * ("Menos de 300 €" / "Under EUR 300") and a number read out of prose is a
 * number waiting to be read wrong. `max: null` means no upper bound.
 *
 * `max` is a hard ceiling and `min` is only a preference. "Entre 600 € y 1000 €"
 * is how someone says what they are willing to spend, not a refusal to be shown
 * anything cheaper — and this catalogue discounts a 930 € mattress to 465, which
 * a strict floor would hide from exactly the shopper most likely to buy it.
 * The floor still matters enough to steer the ranking, so it is passed to the
 * model as a preference rather than dropped.
 */
export const BUDGET_BANDS: readonly { min: number; max: number | null }[] = [
  { min: 0, max: 300 },
  { min: 300, max: 600 },
  { min: 600, max: 1000 },
  { min: 1000, max: null },
];

/**
 * What each answer to the `style` question is actually asking for, in the same
 * vocabulary the catalogue digest uses.
 *
 * `tone` matches the field written by the vision pass (see
 * scripts/classify-finishes.mjs); `colours` is what makes a `mixto` product —
 * one sold in several finishes — count as a match. A null entry means no
 * preference was expressed.
 */
export const STYLE_TONES: readonly ({
  label: string;
  tone: "claro" | "oscuro";
  colours: readonly string[];
} | null)[] = [
  {
    label: "warm wood",
    tone: "claro",
    colours: ["madera", "roble", "nogal", "natural", "marrón"],
  },
  {
    label: "white and bright",
    tone: "claro",
    colours: ["blanco", "crema", "beige"],
  },
  {
    label: "dark and cosy",
    tone: "oscuro",
    colours: ["negro", "wengue", "antracita", "gris", "cambrian", "morado"],
  },
  null, // me da igual el color
];

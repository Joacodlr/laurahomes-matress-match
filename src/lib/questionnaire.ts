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
 * The price band behind each answer to the `budget` question, in order.
 *
 * Kept here rather than parsed out of the label because the label is translated
 * ("Menos de 300 €" / "Under EUR 300") and a number read out of prose is a
 * number waiting to be read wrong. `max: null` means no upper bound.
 *
 * This is what lets the budget be enforced in code instead of asked of the
 * model. Price is the one attribute in this catalogue that is reliably present
 * and unambiguous, so it is the one thing worth filtering on rather than
 * describing.
 */
export const BUDGET_BANDS: readonly { min: number; max: number | null }[] = [
  { min: 0, max: 300 },
  { min: 300, max: 600 },
  { min: 600, max: 1000 },
  { min: 1000, max: null },
];

/** The finishes each answer to the `style` question is asking for. */
export const STYLE_FINISHES: readonly (readonly string[])[] = [
  ["madera", "roble", "nogal", "natural"], // madera cálida
  ["blanco", "crema", "beige"], // blanco y luminoso
  ["negro", "wengue", "antracita", "gris", "cambrian"], // oscuro y acogedor
  [], // me da igual el color
];

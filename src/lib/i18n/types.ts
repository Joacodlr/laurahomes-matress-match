import type es from "./dictionaries/es";

/**
 * The dictionary shape is derived from the Spanish dictionary, which is the
 * source of truth. Every other locale must satisfy this type.
 *
 * Same arrangement as laurahomes `src/i18n/types.ts`, and the reason `es.ts`
 * carries no `as const`: that would make every string a readonly literal, which
 * a second dictionary's own strings could never satisfy.
 */
export type Dictionary = typeof es;

/** One question in the guided questionnaire. */
export type Question = Dictionary["questions"][number];

/** One tappable answer to a question. */
export type Answer = Question["answers"][number];

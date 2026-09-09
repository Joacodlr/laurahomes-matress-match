/**
 * The questionnaire, in order. This is the only thing a visitor can say: every
 * answer is a click, never typed text.
 *
 * Lifted from LauraHomes' `assistant.questions` dictionary entry. `reply` is the
 * adviser's fixed acknowledgement for that answer — fixed rather than generated
 * so the conversation advances instantly and costs nothing, with the model
 * called exactly once at the end. Asking it to compose each "noted, for two
 * people" would mean a round trip per click, and a chance per click to wander
 * off and invent a question of its own.
 *
 * Shared with the client, so no `server-only` here.
 */

export interface Answer {
  label: string;
  reply: string;
}

export interface Question {
  /** Identifies the question. Not shown to anyone. */
  key: string;
  prompt: string;
  answers: Answer[];
}

export const QUESTIONS: readonly Question[] = [
  {
    key: "need",
    prompt: "¿Qué buscas para tu dormitorio?",
    answers: [
      { label: "Un colchón cómodo", reply: "Perfecto, empecemos por el colchón." },
      { label: "Una cama con almacenaje", reply: "Buena idea, el almacenaje se agradece." },
      { label: "Un cabecero moderno", reply: "Genial, un cabecero cambia todo el cuarto." },
      { label: "Lo que tengáis en oferta", reply: "Me gusta, vamos a por las ofertas." },
    ],
  },
  {
    key: "sleepers",
    prompt: "¿Quién va a dormir en ella?",
    answers: [
      { label: "Solo yo", reply: "Anotado, para una persona." },
      { label: "Dos personas", reply: "Vale, entonces buscamos algo para dos." },
      { label: "Es para un niño", reply: "Entendido, habitación infantil." },
      { label: "Es para invitados", reply: "Perfecto, para la habitación de invitados." },
    ],
  },
  {
    key: "firmness",
    prompt: "¿Cómo te gusta el colchón?",
    answers: [
      { label: "Firme", reply: "Firme, tomo nota." },
      { label: "Medio", reply: "El término medio funciona para casi todo el mundo." },
      { label: "Blando y mullido", reply: "Blandito, entendido." },
      { label: "No estoy seguro", reply: "Tranquilo, para eso estoy yo." },
    ],
  },
  {
    key: "sleep",
    prompt: "¿Cómo duermes normalmente?",
    answers: [
      { label: "Como un tronco", reply: "Qué envidia." },
      { label: "Me despierto varias veces", reply: "Vamos a intentar arreglar eso." },
      { label: "Paso calor por la noche", reply: "Entonces buscamos algo transpirable." },
      { label: "Me duele la espalda al levantarme", reply: "Eso pesa mucho en la elección." },
    ],
  },
  {
    key: "style",
    prompt: "¿Qué estilo te gusta más?",
    answers: [
      { label: "Madera cálida", reply: "Madera, buena elección." },
      { label: "Blanco y luminoso", reply: "Blanco, siempre acierta." },
      { label: "Oscuro y acogedor", reply: "Oscuro, con carácter." },
      { label: "Me da igual el color", reply: "Perfecto, nos centramos en el confort." },
    ],
  },
  {
    key: "budget",
    prompt: "Y por último, ¿qué presupuesto tienes en mente?",
    answers: [
      { label: "Menos de 300 €", reply: "Ajustado, pero hay opciones." },
      { label: "Entre 300 € y 600 €", reply: "Ese rango da mucho juego." },
      { label: "Entre 600 € y 1000 €", reply: "Con eso llegamos a lo mejor del catálogo." },
      { label: "Más de 1000 €", reply: "Sin límite, entonces vamos a por lo mejor." },
    ],
  },
];

/** Copy that isn't part of a question. Spanish, like the rest of the app. */
export const COPY = {
  landing: {
    eyebrow: "LauraHomes",
    title: "Encuentra el colchón que te toca",
    subtitle:
      "Seis preguntas rápidas sobre cómo duermes, qué estilo te gusta y qué presupuesto tienes. Al final te decimos exactamente qué encaja mejor de nuestro catálogo — y por qué.",
    cta: "Vamos a buscar tu colchón",
    steps: [
      {
        title: "Responde seis preguntas",
        body: "Todo a golpe de clic. Nada que escribir, menos de un minuto.",
      },
      {
        title: "Pesamos tus respuestas",
        body: "Comparamos lo que nos has contado con todo el catálogo real, precios incluidos.",
      },
      {
        title: "Tres opciones, con su porqué",
        body: "Cada una con su porcentaje de encaje y una explicación en lenguaje claro.",
      },
    ],
    footnote: "Sin registro. Sin correo. Solo tu colchón.",
  },
  // Verbatim from laurahomes' `assistant` dictionary entry, so the two read
  // identically. `errorBusy` and `backHome` are the only additions: this app has
  // a rate limiter and a landing page, and that one has neither.
  match: {
    title: "Encuentra tu producto",
    subtitle:
      "Responde a unas preguntas rápidas y te decimos qué encaja mejor de nuestro catálogo.",
    progress: "Pregunta {step} de {total}",
    thinking: "Buscando lo que mejor encaja…",
    finishing: "Gracias, ya tengo todo lo que necesito. Dame un segundo…",
    matchLabel: "{score}% para ti",
    restart: "Empezar de nuevo",
    tryAgain: "Reintentar",
    errorGeneric: "No hemos podido responder. Inténtalo de nuevo.",
    errorNetwork: "Sin conexión con el servidor. Comprueba tu red e inténtalo de nuevo.",
    errorBusy: "Demasiadas consultas seguidas. Espera un momento e inténtalo otra vez.",
    backHome: "Volver al inicio",
  },
} as const;

/**
 * Spanish dictionary — the default locale and the source of truth for the
 * dictionary shape. `en.ts` must satisfy the `Dictionary` type derived from this.
 *
 * The `match` section is taken verbatim from laurahomes' `assistant` entry, so
 * the finder reads identically in both apps. The `landing` section is this app's
 * own — laurahomes has no landing page.
 */
const es = {
  meta: {
    title: "Match de Colchón — LauraHomes",
    description:
      "Responde seis preguntas y te recomendamos el colchón de nuestro catálogo que mejor encaja contigo, con precios reales.",
  },
  lang: {
    label: "Idioma",
    es: "ES",
    en: "EN",
    switchToEs: "Cambiar a español",
    switchToEn: "Cambiar a inglés",
  },
  landing: {
    eyebrow: "Colchón Match",
    title: "Encuentra el colchón perfecto para ti.",
    subtitle:
      "Responde unas preguntas y descubriremos qué colchón encaja mejor contigo.",
    cta: "Empezar mi match",
    footnote: "Solo tardarás 60 segundos.",
  },
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
    back: "Atrás",
    pickOne: "Elige la opción que más se acerque.",
    analysing: {
      title: "Analizando tu forma de dormir…",
      steps: [
        "Tu posición al dormir",
        "Tu firmeza ideal",
        "Tu nivel de confort",
        "Tus necesidades",
        "Tu presupuesto",
      ],
    },
    results: {
      ready: "Tu match está listo.",
      matchWord: "Match",
      alsoFits: "También encajan contigo",
      view: "Ver producto",
      resume: "Ya tenemos tus respuestas. Vuelve a pedir tu match.",
    },
    backHome: "Volver al inicio",
  },
  /**
   * The questionnaire, in order. This is the only thing a visitor can say: every
   * answer is a click, never typed text.
   *
   * `key` identifies the question and is NOT translated — it must be identical
   * across locales. `reply` is the adviser's fixed acknowledgement for that
   * answer; fixed rather than generated so the conversation advances instantly,
   * with the model called exactly once at the end.
   */
  questions: [
    {
      key: "need",
      prompt: "¿Qué estás buscando?",
      answers: [
        { label: "Un colchón", reply: "Perfecto, empecemos por el colchón." },
        { label: "Un canapé o una base", reply: "Buena elección, la base cambia el descanso." },
        { label: "Un cabecero", reply: "Genial, un cabecero cambia todo el cuarto." },
        { label: "El conjunto completo", reply: "Vamos entonces a por la cama entera." },
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
    // From here on, questions are shown only when they apply to what was picked
    // above — see QUESTION_SCOPE in lib/questionnaire.ts. Nobody is asked about
    // mattress firmness while shopping for a headboard.
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
      key: "storage",
      prompt: "¿Necesitas almacenaje debajo de la cama?",
      answers: [
        { label: "Todo el que pueda", reply: "Entonces miramos canapés abatibles." },
        { label: "Algo vendría bien", reply: "Vale, algo de espacio extra." },
        { label: "No me hace falta", reply: "Perfecto, más opciones abiertas." },
        { label: "No lo había pensado", reply: "Te lo tengo en cuenta por si acaso." },
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
  ],
};

export default es;

import type { Dictionary } from "../types";

/**
 * English dictionary. Must match the shape of the Spanish source of truth.
 *
 * The `match` section and every question are copied verbatim from laurahomes'
 * English `assistant` entry, so a shopper gets the same wording in either app.
 */
const en: Dictionary = {
  meta: {
    title: "Mattress Match — LauraHomes",
    description:
      "Answer six questions and we'll recommend the mattress from our catalogue that suits you best, with real prices.",
  },
  lang: {
    label: "Language",
    es: "ES",
    en: "EN",
    switchToEs: "Switch to Spanish",
    switchToEn: "Switch to English",
  },
  landing: {
    eyebrow: "Mattress Match",
    title: "Find the mattress that is right for you.",
    subtitle:
      "Answer a few questions and we will work out which mattress suits you best.",
    cta: "Start my match",
    footnote: "It takes about 60 seconds.",
  },
  match: {
    title: "Find your product",
    subtitle:
      "Answer a few quick questions and we'll tell you what fits best from our catalogue.",
    progress: "Question {step} of {total}",
    thinking: "Finding your best matches…",
    finishing: "Thanks — that's everything I need. Give me a second…",
    matchLabel: "{score}% match",
    restart: "Start over",
    tryAgain: "Try again",
    errorGeneric: "We couldn't answer that. Please try again.",
    errorNetwork: "Couldn't reach the server. Check your connection and try again.",
    errorBusy: "Too many requests in a row. Wait a moment and try again.",
    back: "Back",
    pickOne: "Pick whichever comes closest.",
    analysing: {
      title: "Reading how you sleep…",
      steps: [
        "How you sleep",
        "Your ideal firmness",
        "Your comfort level",
        "What you need",
        "Your budget",
      ],
    },
    results: {
      ready: "Your match is ready.",
      matchWord: "Match",
      alsoFits: "These also suit you",
      view: "View product",
      resume: "We still have your answers. Ask for your match again.",
    },
    backHome: "Back to start",
  },
  questions: [
    {
      key: "need",
      prompt: "What are you looking for?",
      answers: [
        { label: "A mattress", reply: "Perfect, let's start with the mattress." },
        { label: "A bed base", reply: "Good choice — the base changes how you sleep." },
        { label: "A headboard", reply: "Nice, a headboard changes the whole room." },
        { label: "The whole bed", reply: "Right, let's put the whole thing together then." },
      ],
    },
    {
      key: "sleepers",
      prompt: "Who's going to sleep in it?",
      answers: [
        { label: "Just me", reply: "Noted, for one." },
        { label: "Two of us", reply: "Right, so we're looking for something for two." },
        { label: "It's for a child", reply: "Got it — a child's room." },
        { label: "It's for guests", reply: "Perfect, the guest room it is." },
      ],
    },
    // From here on, questions are shown only when they apply to what was picked
    // above — see QUESTION_SCOPE in lib/questionnaire.ts. Nobody is asked about
    // mattress firmness while shopping for a headboard.
    {
      key: "firmness",
      prompt: "How do you like your mattress?",
      answers: [
        { label: "Firm", reply: "Firm, noted." },
        { label: "Medium", reply: "Medium works for almost everyone." },
        { label: "Soft and plush", reply: "Nice and soft, understood." },
        { label: "I'm not sure", reply: "No worries, that's what I'm here for." },
      ],
    },
    {
      key: "sleep",
      prompt: "How do you usually sleep?",
      answers: [
        { label: "Like a log", reply: "Lucky you." },
        { label: "I wake up several times", reply: "Let's see if we can fix that." },
        { label: "I get hot at night", reply: "Then we want something breathable." },
        { label: "I wake up with back pain", reply: "That weighs heavily on the choice." },
      ],
    },
    {
      key: "storage",
      prompt: "Do you need storage under the bed?",
      answers: [
        { label: "As much as possible", reply: "Then we'll look at lift-up bases." },
        { label: "Some would help", reply: "Right, a bit of extra space." },
        { label: "I don't need any", reply: "Perfect, that opens up more options." },
        { label: "Hadn't thought about it", reply: "I'll keep it in mind just in case." },
      ],
    },
    {
      key: "style",
      prompt: "Which look do you prefer?",
      answers: [
        { label: "Warm wood", reply: "Wood, good choice." },
        { label: "White and bright", reply: "White never misses." },
        { label: "Dark and cosy", reply: "Dark, with character." },
        { label: "I don't mind the colour", reply: "Perfect, we'll focus on comfort." },
      ],
    },
    {
      key: "budget",
      prompt: "Last one — what budget do you have in mind?",
      answers: [
        { label: "Under EUR 300", reply: "Tight, but there are options." },
        { label: "EUR 300 to 600", reply: "That range gives us plenty to work with." },
        { label: "EUR 600 to 1000", reply: "That reaches the best of the catalogue." },
        { label: "Over EUR 1000", reply: "No limit — let's go for the best then." },
      ],
    },
  ],
};

export default en;

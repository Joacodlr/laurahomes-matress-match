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
    eyebrow: "LauraHomes",
    title: "Find your ideal mattress",
    subtitle:
      "Answer six questions about how you sleep, the look you want and your budget. We'll recommend the options from our catalogue that suit you best — with prices, and the reasoning behind each one.",
    cta: "Find my mattress",
    footnote: "No sign-up, no personal details.",
    steps: [
      {
        title: "Answer six questions",
        body: "Just pick from the options we give you. No forms, nothing to write.",
      },
      {
        title: "We weigh your answers",
        body: "Against our full catalogue — real prices and real specifications.",
      },
      {
        title: "Get three recommendations",
        body: "Each with a fit score and a clear explanation of why it suits you.",
      },
    ],
    meta: "6 questions · under a minute",
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
    backHome: "Back to start",
  },
  questions: [
    {
      key: "need",
      prompt: "What are you looking for?",
      answers: [
        { label: "A comfortable mattress", reply: "Perfect, let's start with the mattress." },
        { label: "A bed with storage", reply: "Good thinking — storage always helps." },
        { label: "A modern headboard", reply: "Nice, a headboard changes the whole room." },
        { label: "Whatever's on sale", reply: "I like your style. Let's look at the offers." },
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

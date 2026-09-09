"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { COPY, QUESTIONS, type Question } from "@/lib/questions";

/**
 * One product-finder conversation.
 *
 * Ported from laurahomes `src/components/products/ProductAssistantProvider.tsx`.
 *
 * The finder is a guided questionnaire, not a chatbot: the shopper answers by
 * clicking, never by typing. The questions and the adviser's little
 * acknowledgements are fixed text, so every click lands instantly and costs
 * nothing — the model is called exactly once, at the end, to weigh all the
 * answers and pick the products. Asking it to compose each intermediate "noted,
 * for two people" would have meant a round trip per click, and a chance per
 * click to wander off and invent a question of its own.
 *
 * The transcript is mirrored into `sessionStorage`, which covers a hard refresh
 * or opening the page directly in a new tab. Session rather than local storage
 * because a product hunt belongs to the visit — returning tomorrow to a
 * half-finished interrogation about mattress firmness would be odd, and "start
 * over" is always there.
 *
 * The transcript is held in a module-level store read through
 * `useSyncExternalStore` rather than in `useState` seeded by an effect. That is
 * the sanctioned way to read something the server cannot see: React renders
 * `getServerSnapshot()` while hydrating and swaps to the real snapshot
 * immediately after, with no mismatch and no effect writing state on mount.
 */

const STORAGE_KEY = "mm_match_v1";

/** A runaway transcript would eventually outgrow the storage quota. */
const MAX_STORED_TURNS = 40;

export interface Recommendation {
  id: string;
  name: string;
  imageUrl: string | null;
  productUrl: string | null;
  price: number;
  onSale: boolean;
  salePrice: number | null;
  categoryName: string | null;
  /** 0-100, how well this fits the answers given. */
  match: number;
}

export interface Turn {
  role: "user" | "assistant";
  content: string;
  /**
   * Shown to the shopper but withheld from the model: the canned
   * acknowledgements ("Anotado, para una persona.") are our own words and
   * repeating them back only invites the model to imitate the pattern instead of
   * answering. The question prompts are NOT local — without them an answer of
   * "Menos de 300 €" is a price with nothing attached to it.
   */
  local?: boolean;
  /** Only ever set on an assistant turn. */
  products?: Recommendation[];
}

/* ───────────── The persisted transcript ───────────── */

/**
 * Shared, referentially stable empty transcript. `getServerSnapshot` must return
 * the same object every call or React re-renders forever.
 */
const EMPTY: Turn[] = [];

/** null until the first client read; thereafter the current snapshot. */
let snapshot: Turn[] | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Turn[] {
  if (snapshot) return snapshot;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    snapshot = Array.isArray(parsed) ? (parsed as Turn[]) : EMPTY;
  } catch {
    // Unreadable or disabled storage is not worth failing over — start fresh.
    snapshot = EMPTY;
  }
  return snapshot;
}

function getServerSnapshot(): Turn[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function setTranscript(next: Turn[]): void {
  snapshot = next;
  try {
    if (next.length === 0) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next.slice(-MAX_STORED_TURNS)),
      );
    }
  } catch {
    // Quota, or private mode refusing writes. The in-memory conversation still works.
  }
  for (const listener of listeners) listener();
}

/**
 * Which question comes next.
 *
 * Derived from the transcript rather than stored beside it: one user turn is one
 * answered question, so the step cannot drift out of sync with what is on screen
 * — including after a refresh, which restores the transcript alone.
 */
function stepFrom(turns: Turn[]): number {
  return turns.filter((turn) => turn.role === "user").length;
}

/* ───────────── Provider ───────────── */

interface ContextValue {
  turns: Turn[];
  sending: boolean;
  error: string | null;
  /** How many questions have been answered. */
  step: number;
  /** The question awaiting an answer, or null once they have all been asked. */
  question: Question | null;
  /** Answer the current question. `index` is into that question's `answers`. */
  answer: (index: number) => void;
  /** Re-run the final recommendation after a failure. */
  retry: () => void;
  reset: () => void;
  started: boolean;
  /** The recommendation is on screen. False while it is still owed. */
  hasResults: boolean;
}

const MatchContext = createContext<ContextValue | null>(null);

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const turns = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Transient, per-visit state: not worth persisting, and a stale "sending"
  // restored from storage would leave the buttons disabled forever.
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = stepFrom(turns);

  const recommend = useCallback(async (history: Turn[]) => {
    setError(null);
    setSending(true);

    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history
            .filter((turn) => !turn.local)
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        products?: Recommendation[];
        error?: string;
      };

      if (!res.ok || !data.reply) {
        setError(
          res.status === 429 ? COPY.match.errorBusy : data.error || COPY.match.errorGeneric,
        );
        return;
      }

      setTranscript([
        ...history,
        { role: "assistant", content: data.reply, products: data.products ?? [] },
      ]);
    } catch {
      setError(COPY.match.errorNetwork);
    } finally {
      setSending(false);
    }
  }, []);

  const answer = useCallback(
    (index: number) => {
      if (sending) return;

      const question = QUESTIONS[step];
      const chosen = question?.answers[index];
      if (!question || !chosen) return;

      // The current question is written into the transcript lazily, when it is
      // answered. That keeps the landing state a clean hero with the first
      // question's buttons under it, rather than a one-line conversation nobody
      // has taken part in yet.
      const opened: Turn[] =
        turns.length > 0 ? turns : [{ role: "assistant", content: question.prompt }];

      const next: Turn[] = [
        ...opened,
        { role: "user", content: chosen.label },
        { role: "assistant", content: chosen.reply, local: true },
      ];

      const following = QUESTIONS[step + 1];
      if (following) {
        next.push({ role: "assistant", content: following.prompt });
        setTranscript(next);
        return;
      }

      next.push({ role: "assistant", content: COPY.match.finishing, local: true });
      setTranscript(next);
      void recommend(next);
    },
    [recommend, sending, step, turns],
  );

  const retry = useCallback(() => {
    if (sending || turns.length === 0) return;
    void recommend(turns);
  }, [recommend, sending, turns]);

  const reset = useCallback(() => {
    setTranscript(EMPTY);
    setError(null);
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      turns,
      sending,
      error,
      step,
      question: step < QUESTIONS.length ? QUESTIONS[step] : null,
      answer,
      retry,
      reset,
      started: turns.length > 0,
      hasResults: turns.at(-1)?.products !== undefined,
    }),
    [answer, error, reset, retry, sending, step, turns],
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

export function useMatch(): ContextValue {
  const ctx = useContext(MatchContext);
  if (!ctx) {
    throw new Error("useMatch must be used inside <MatchProvider>.");
  }
  return ctx;
}

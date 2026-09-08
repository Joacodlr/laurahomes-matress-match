import "server-only";

/**
 * A crude per-IP rate limit for the one endpoint that spends money.
 *
 * There is no sign-in here, so without this the OpenAI key is effectively
 * public: anyone who finds the URL can loop the endpoint and bill it to us. A
 * questionnaire takes a person the better part of a minute to fill in, so a
 * handful of completions per IP per window is generous for real use and useless
 * for anyone scripting it.
 *
 * KNOWN LIMITS — this is a speed bump, not a lock:
 *   - State is per serverless instance. Vercel runs several, so the effective
 *     ceiling is this limit times however many instances are warm.
 *   - It resets whenever an instance recycles.
 *   - `x-forwarded-for` is trusted, and behind Vercel's proxy that is correct,
 *     but it means anyone able to reach the origin directly can spoof it.
 *
 * If this app ever gets real traffic, replace it with something backed by a
 * shared store (Vercel KV, Upstash) rather than tightening the numbers here.
 */

/** Completions allowed per IP per window. */
const LIMIT = 8;

const WINDOW_MS = 10 * 60 * 1000;

/** Stop the map growing without bound when a lot of IPs pass through. */
const MAX_TRACKED_IPS = 5000;

interface Bucket {
  count: number;
  resetAt: number;
}

// On globalThis so a dev hot-reload doesn't hand everyone a fresh allowance.
const globalForLimit = globalThis as unknown as { __mmRateLimit?: Map<string, Bucket> };

function buckets(): Map<string, Bucket> {
  if (!globalForLimit.__mmRateLimit) {
    globalForLimit.__mmRateLimit = new Map();
  }
  return globalForLimit.__mmRateLimit;
}

/** The caller's IP, as far as we can tell. Falls back to a shared bucket. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** True when this request is within the allowance. Counts the request. */
export function allowRequest(ip: string): boolean {
  const map = buckets();
  const now = Date.now();

  // Opportunistic sweep — cheap, and only when the map is actually large.
  if (map.size > MAX_TRACKED_IPS) {
    for (const [key, bucket] of map) {
      if (bucket.resetAt <= now) map.delete(key);
    }
  }

  const existing = map.get(ip);
  if (!existing || existing.resetAt <= now) {
    map.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (existing.count >= LIMIT) return false;

  existing.count += 1;
  return true;
}

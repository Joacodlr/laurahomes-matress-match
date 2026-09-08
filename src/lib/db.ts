import "server-only";
import mysql from "mysql2/promise";

/**
 * Single shared MySQL connection pool.
 *
 * Points at the same database LauraHomes uses — this app only ever reads the
 * `products` and `product_categories` tables, and writes nothing at all.
 *
 * Cached on `globalThis` so Next.js hot-reloads in development don't open a new
 * pool on every change (which would eventually exhaust RDS connections).
 *
 * Ported from laurahomes `src/lib/db.ts`, trimmed to the read path this app
 * needs: the write-retry distinction is gone because there are no writes.
 */
const globalForDb = globalThis as unknown as { __mmPool?: mysql.Pool };

function createPool(): mysql.Pool {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set.");
  const url = new URL(raw);

  return mysql.createPool({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    // RDS supports SSL; `rejectUnauthorized: false` accepts its certificate
    // without bundling the CA. Opt out with DATABASE_SSL=false for local dev.
    ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
    connectionLimit: 10,
    // Keep at most a few connections parked. Every idle socket is one that can
    // be silently killed by something in the network path.
    maxIdle: 4,
    idleTimeout: 30_000,
    // TCP keepalive stops a NAT gateway or firewall treating a quiet connection
    // as abandoned — the usual cause of a reset that only surfaces on next use.
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    // Return BIGINT columns (product ids) as strings to avoid precision loss.
    supportBigNumbers: true,
    bigNumberStrings: true,
    timezone: "Z",
  });
}

function getPool(): mysql.Pool {
  if (!globalForDb.__mmPool) {
    globalForDb.__mmPool = createPool();
  }
  return globalForDb.__mmPool;
}

/**
 * Error codes that mean the connection died, not that the statement was wrong.
 * Anything else — a syntax error, a missing table — must surface as-is.
 */
const TRANSIENT_CODES = new Set([
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "PROTOCOL_CONNECTION_LOST",
  "ER_CLIENT_INTERACTION_TIMEOUT",
]);

function isTransientConnectionError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && TRANSIENT_CODES.has(code);
}

/**
 * Run a parameterized SELECT and return the typed rows.
 *
 * Retries once when the connection itself failed. A pooled connection can be
 * reset while it sits idle — by a NAT gateway reaping it, a laptop suspending,
 * an RDS failover — and nothing notices until the next statement tries to use
 * it. The pool drops the broken one on error, so a second attempt gets a fresh
 * connection instead of failing the request.
 *
 * Safe to retry unconditionally here because this app issues reads only.
 */
export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  try {
    const [rows] = await getPool().query(sql, params);
    return rows as T[];
  } catch (error) {
    if (!isTransientConnectionError(error)) throw error;

    const code = (error as { code?: string }).code;
    console.warn(`Database connection lost (${code}); retrying query once.`);

    const [rows] = await getPool().query(sql, params);
    return rows as T[];
  }
}

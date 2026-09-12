import "server-only";
import { randomUUID } from "node:crypto";
import { execute, insert, query } from "@/lib/db";

/**
 * Users and sessions, against the SAME tables LauraHomes uses.
 *
 * Ported from laurahomes `src/lib/auth/repository.ts`. An account created here
 * is a LauraHomes account: same row, same bcrypt hash, same verification
 * stamp. Signing up in either app signs you in to both.
 *
 * The one column contract that matters: `users.password_hash` is a bcrypt hash,
 * and both apps read and write it with the same library at the same cost
 * factor. Nothing re-hashes anything.
 *
 * Permission tiers are the one thing left out. Every account made here is
 * `Basic`, which is what self-registration produces in LauraHomes too;
 * promoting anyone is done there, where the admin screens live.
 */

/** Tier every self-registered account starts at. Mirrors the `users.type` enum. */
const DEFAULT_USER_TYPE = "Basic";

/** Full user row, including the password hash. Never send this to the client. */
export interface UserRow {
  id: string;
  name: string;
  surname: string;
  email: string;
  password_hash: string;
  /** When the email was verified (NULL = still unverified). */
  email_verified: Date | null;
}

/** Safe user shape for the client (no secrets). */
export interface PublicUser {
  id: string;
  name: string;
  surname: string;
  email: string;
}

// --- users -----------------------------------------------------------------

/**
 * Create an account. The row lands in the shared `users` table, so it is a
 * LauraHomes account from the moment it exists.
 *
 * `email_verified` is left NULL — the column default. Sign-in is blocked until
 * the link in the verification email stamps it.
 */
export async function createUser(input: {
  name: string;
  surname: string;
  email: string;
  passwordHash: string;
}): Promise<PublicUser> {
  const id = await insert(
    `INSERT INTO users (name, surname, email, password_hash, type)
     VALUES (?, ?, ?, ?, ?)`,
    [input.name, input.surname, input.email, input.passwordHash, DEFAULT_USER_TYPE],
  );
  return { id, name: input.name, surname: input.surname, email: input.email };
}

export async function emailExists(email: string): Promise<boolean> {
  const rows = await query(`SELECT 1 FROM users WHERE email = ? LIMIT 1`, [email]);
  return rows.length > 0;
}

/**
 * Stamp a user's email as verified. Only writes while it is still NULL, so a
 * re-clicked link does not overwrite the original verification timestamp.
 */
export async function markEmailVerified(userId: string): Promise<void> {
  await execute(
    `UPDATE users SET email_verified = NOW() WHERE id = ? AND email_verified IS NULL`,
    [userId],
  );
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await query<UserRow>(
    `SELECT id, name, surname, email, password_hash, email_verified
       FROM users
      WHERE email = ?
      LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
}

// --- sessions ---------------------------------------------------------------

export async function createSession(input: {
  userId: string;
  expiresAt: Date;
  userAgent?: string | null;
}): Promise<string> {
  // MySQL has no RETURNING, so the session id (a UUID) is generated here.
  const id = randomUUID();
  await execute(
    `INSERT INTO sessions (id, user_id, expires_at, user_agent)
     VALUES (?, ?, ?, ?)`,
    [id, input.userId, input.expiresAt, input.userAgent ?? null],
  );
  return id;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await execute(`DELETE FROM sessions WHERE id = ?`, [sessionId]);
}

/**
 * Slide a session's idle expiry forward (called on each token refresh).
 * Skips revoked sessions so a revoked one cannot be kept alive.
 */
export async function touchSession(sessionId: string, expiresAt: Date): Promise<void> {
  await execute(
    `UPDATE sessions SET expires_at = ? WHERE id = ? AND revoked = FALSE`,
    [expiresAt, sessionId],
  );
}

/**
 * Look up the user for an active session in a single query.
 * Returns null if the session is unknown, revoked, or expired.
 *
 * This is the authoritative check: a session revoked in LauraHomes stops
 * working here on the next request, because both apps read this same row.
 */
export async function findUserByActiveSession(
  sessionId: string,
): Promise<PublicUser | null> {
  const rows = await query<PublicUser>(
    `SELECT u.id, u.name, u.surname, u.email
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
        AND s.revoked = FALSE
        AND s.expires_at > UTC_TIMESTAMP()
      LIMIT 1`,
    [sessionId],
  );
  return rows[0] ?? null;
}

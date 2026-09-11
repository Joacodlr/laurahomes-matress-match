import "server-only";
import { randomUUID } from "node:crypto";
import { execute, query } from "@/lib/db";

/**
 * Users and sessions, against the SAME tables LauraHomes uses.
 *
 * Ported from laurahomes `src/lib/auth/repository.ts`, trimmed to what this app
 * does: read a user to check a password, and create/read/delete/slide session
 * rows. Account creation, email verification and permission tiers are
 * deliberately absent — LauraHomes owns those, and duplicating them here would
 * mean two apps racing to write the same rows.
 *
 * The one column contract that matters: `users.password_hash` is a bcrypt hash
 * written by LauraHomes, and `verifyPassword` here reads it with the same
 * library. Nothing re-hashes anything.
 */

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

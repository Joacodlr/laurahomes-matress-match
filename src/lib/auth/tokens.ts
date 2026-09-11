/**
 * JWT signing and verification (via `jose`).
 *
 * Kept free of Node/Next-only APIs so it works in `proxy.ts` as well as on the
 * server. Two token types:
 *   - access token  (1h): identifies the user for normal requests.
 *   - refresh token (30d, sliding): used to mint a new access token when it expires.
 *
 * Both carry `sub` (user id) and `sid` (session id — the `sessions` row).
 */
import { SignJWT, jwtVerify } from "jose";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  VERIFICATION_TOKEN_TTL_SECONDS,
  getAccessSecret,
  getRefreshSecret,
  getVerificationSecret,
} from "./config";

export interface AccessTokenClaims {
  /** User id. */
  sub: string;
  /** Session id (sessions.id). */
  sid: string;
  /** Convenience copy of the user's email (may be empty after a proxy refresh). */
  email: string;
}

export interface RefreshTokenClaims {
  sub: string;
  sid: string;
}

export async function signAccessToken(claims: AccessTokenClaims): Promise<string> {
  return new SignJWT({ sid: claims.sid, email: claims.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getAccessSecret());
}

export async function signRefreshToken(claims: RefreshTokenClaims): Promise<string> {
  return new SignJWT({ sid: claims.sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_SECONDS}s`)
    .sign(getRefreshSecret());
}

/** Verify an access token. Returns null on any error (expired, tampered, missing). */
export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
      return null;
    }
    return {
      sub: payload.sub,
      sid: payload.sid,
      email: typeof payload.email === "string" ? payload.email : "",
    };
  } catch {
    return null;
  }
}

/** Verify a refresh token. Returns null on any error. */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
      return null;
    }
    return { sub: payload.sub, sid: payload.sid };
  } catch {
    return null;
  }
}

/**
 * Email-verification token — a short-lived (24h), stateless JWT carrying the
 * user id. A distinct secret AND an explicit `purpose` claim keep it from being
 * interchangeable with session tokens. Nothing is stored server-side, so the
 * link is self-contained and works even if the user isn't logged in.
 */
export interface VerificationTokenClaims {
  /** User id. */
  sub: string;
  /** Convenience copy of the email being verified. */
  email: string;
}

export async function signVerificationToken(
  claims: VerificationTokenClaims,
): Promise<string> {
  return new SignJWT({ email: claims.email, purpose: "verify-email" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${VERIFICATION_TOKEN_TTL_SECONDS}s`)
    .sign(getVerificationSecret());
}

/** Verify an email-verification token. Returns null on any error (expired, tampered, wrong purpose). */
export async function verifyVerificationToken(
  token: string,
): Promise<VerificationTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getVerificationSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || payload.purpose !== "verify-email") {
      return null;
    }
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : "",
    };
  } catch {
    return null;
  }
}

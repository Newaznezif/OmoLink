/**
 * The signed envelope: the only artifact that decides whether a session has to
 * unlock.
 *
 * It is HMAC-SHA256 over a tiny payload, written as an httpOnly cookie, and the
 * secret is read from `APP_LOCK_SECRET` on the server alone. That combination is what
 * makes the lock worth having: an account's own Supabase token can rewrite the rows
 * in `app_lock_settings`, but it cannot produce a cookie this function accepts, so
 * editing settings by hand does not open the application.
 *
 * Runs on Web Crypto only, so the same code verifies in edge middleware and in Node
 * route handlers. Nothing here touches cookies, the database or the request.
 */

import {
  APP_LOCK_COOKIE,
  ENVELOPE_MAX_AGE_SECONDS,
  decideLock,
  type Envelope,
  type LockVerdict
} from './state';

const PREFIX = 'v1';
/** Clock skew the verifier tolerates, in case a deployment and a browser disagree. */
const SKEW_MS = 30_000;
/** A secret this short is not a secret; the feature reports itself unavailable. */
const MIN_SECRET_LENGTH = 32;

export function appLockSecret(): string | undefined {
  const secret = process.env.APP_LOCK_SECRET?.trim();
  if (!secret || secret.length < MIN_SECRET_LENGTH) return undefined;
  return secret;
}

/**
 * Whether this deployment can mint and verify envelopes at all. False is reported to
 * the account as "the lock is not available here" and refuses to be turned on — the
 * alternative would be a lock nobody can open, since unlocking also mints.
 */
export function appLockConfigured(): boolean {
  return appLockSecret() !== undefined;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array | undefined {
  if (!/^[A-Za-z0-9\-_]*$/.test(value)) return undefined;
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  try {
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return undefined;
  }
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

/** Equal length, then compare every byte without early exit. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * The two pieces every signed token in this feature is built from, exported so the
 * ceremony challenge uses the same bytes as the envelope rather than a second,
 * slightly-different implementation of the same idea.
 */
export const tokenBase64Url = { encode: bytesToBase64Url, decode: base64UrlToBytes };

export async function signToken(secret: string, message: string): Promise<string> {
  return bytesToBase64Url(await hmac(secret, message));
}

export async function tokenMatches(secret: string, message: string, signature: string): Promise<boolean> {
  const expected = await signToken(secret, message);
  const provided = base64UrlToBytes(signature);
  const wanted = base64UrlToBytes(expected);
  return Boolean(provided && wanted && constantTimeEqual(provided, wanted));
}

/** When one unlock stops being honoured, from the account's own `grant_minutes`. */
export function unlockDeadline(grantMinutes: number, now: number): number {
  const minutes = Number.isFinite(grantMinutes) && grantMinutes > 0 ? grantMinutes : 15;
  return now + Math.round(minutes * 60_000);
}

export async function mintEnvelope(envelope: Envelope, secret: string): Promise<string> {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        u: envelope.userId,
        r: envelope.required ? 1 : 0,
        x: envelope.unlockedUntil,
        i: envelope.issuedAt,
        s: envelope.stepUp ? 1 : 0
      })
    )
  );
  const signature = bytesToBase64Url(await hmac(secret, `${PREFIX}.${payload}`));
  return `${PREFIX}.${payload}.${signature}`;
}

/**
 * `undefined` for every kind of nonsense: wrong shape, bad signature, unknown
 * prefix, future-dated, older than the cookie's own life. Callers treat that as
 * "no envelope", which sends the session to be re-minted rather than trusting it.
 */
export async function readEnvelope(value: string | undefined, secret: string, now: number): Promise<Envelope | undefined> {
  if (!value) return undefined;
  const parts = value.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return undefined;
  const [, payload, signature] = parts;
  if (!payload || !signature) return undefined;

  const provided = base64UrlToBytes(signature);
  if (!provided) return undefined;
  if (!(await tokenMatches(secret, `${PREFIX}.${payload}`, signature))) return undefined;

  const raw = base64UrlToBytes(payload);
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object') return undefined;

  const row = parsed as { u?: unknown; r?: unknown; x?: unknown; i?: unknown; s?: unknown };
  if (typeof row.u !== 'string' || !row.u) return undefined;
  if (row.r !== 0 && row.r !== 1) return undefined;
  if (!(row.x === null || (typeof row.x === 'number' && Number.isFinite(row.x)))) return undefined;
  if (typeof row.i !== 'number' || !Number.isFinite(row.i)) return undefined;
  // Absent means "minted before a step-up was recorded", which reads as no step-up. A
  // browser cannot supply this field either way: it is inside the signed payload.
  if (!(row.s === undefined || row.s === 0 || row.s === 1)) return undefined;

  const issuedAt = row.i;
  if (issuedAt > now + SKEW_MS) return undefined;
  if (issuedAt < now - ENVELOPE_MAX_AGE_SECONDS * 1000 - SKEW_MS) return undefined;

  return { userId: row.u, required: row.r === 1, unlockedUntil: row.x as number | null, issuedAt, stepUp: row.s === 1 };
}

export type SessionLock = {
  verdict: LockVerdict;
  envelope?: Envelope;
  /** The account this envelope was minted for, when there is one. */
  userId?: string;
};

/**
 * The verdict for a request. `stale` (minted for somebody else, or expired past the
 * cookie's own life) is reported as `unknown` so the caller re-mints instead of
 * trusting it — that is what makes signing out, an expired session, and switching
 * accounts land on a correct verdict rather than an old one.
 */
export async function lockForRequest(input: {
  cookieValue: string | undefined;
  secret: string | undefined;
  now: number;
  expectedUserId?: string;
}): Promise<SessionLock> {
  if (!input.secret) return { verdict: 'unknown' };
  const envelope = await readEnvelope(input.cookieValue, input.secret, input.now);
  if (!envelope) return { verdict: 'unknown' };
  if (input.expectedUserId && envelope.userId !== input.expectedUserId) return { verdict: 'unknown' };
  return { verdict: decideLock(envelope, input.now), envelope, userId: envelope.userId };
}

/** Cookie attributes for the envelope, in one place so the two writers agree. */
export function envelopeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ENVELOPE_MAX_AGE_SECONDS
  };
}

export { APP_LOCK_COOKIE };

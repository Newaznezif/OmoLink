import 'server-only';
/**
 * The WebAuthn ceremony challenge, kept between its two halves in a signed, path-
 * scoped httpOnly cookie instead of a server-side store.
 *
 * Why a cookie and not memory: this deployment is serverless, and the half-second gap
 * between "here are your creation options" and "here is the signed response" routinely
 * lands on a different function instance, so an in-memory challenge would break the
 * ceremony in production and work on a laptop. A signed token travels with the
 * browser and needs nothing kept alive.
 *
 * Why signed: a bare cookie value is one the client can choose. Binding the challenge
 * to the account and to a short lifetime — and verifying the signature before use —
 * means the response can only be answered against a challenge this server actually
 * issued, which is the point of the challenge.
 */

import { cookies } from 'next/headers';
import { APP_LOCK_CHALLENGE_COOKIE, CHALLENGE_MAX_AGE_SECONDS } from './state';
import { appLockSecret, tokenBase64Url, signToken } from './envelope';

const PREFIX = 'v1c';

function challengeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    // Only sent to the ceremony endpoints, so it is not carried to every request.
    path: '/api/app-lock',
    maxAge: CHALLENGE_MAX_AGE_SECONDS
  };
}

/**
 * Stores the challenge for the second half of a ceremony. Returns false when this
 * deployment has no `APP_LOCK_SECRET`, which is the same condition that makes the
 * whole lock unavailable — the caller must not start a ceremony it cannot finish.
 */
export async function writeCeremonyChallenge(input: { userId: string; challenge: string }): Promise<boolean> {
  const secret = appLockSecret();
  if (!secret) return false;

  const payload = tokenBase64Url.encode(
    new TextEncoder().encode(JSON.stringify({ u: input.userId, c: input.challenge, t: Date.now() }))
  );
  const signature = await signToken(secret, `${PREFIX}.${payload}`);
  cookies().set(APP_LOCK_CHALLENGE_COOKIE, `${PREFIX}.${payload}.${signature}`, challengeCookieOptions());
  return true;
}

/**
 * The challenge this server issued for this account, or `undefined`: no cookie, a
 * different account, a tampered signature, or older than the ceremony is allowed to
 * take.
 *
 * The cookie is cleared on the way out, which makes a second half of the ceremony
 * answer the challenge once for a browser. It is honest to say what that does not
 * cover: this deployment keeps no server-side record of consumed challenges, so a
 * client that held on to the value could resend it for the rest of the 300 seconds.
 * What that would buy is nothing — the challenge is not the secret, the credential's
 * signature over it is, and the origin, the rp id and user verification are checked
 * whatever the challenge says. A replay is therefore a retry, not a way in.
 */
export async function readCeremonyChallenge(userId: string, now: number): Promise<string | undefined> {
  const secret = appLockSecret();
  const raw = cookies().get(APP_LOCK_CHALLENGE_COOKIE)?.value;
  if (!secret || !raw) return undefined;

  const parts = raw.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return undefined;
  const [, payload, signature] = parts;
  if (!payload || !signature) return undefined;

  const expected = await signToken(secret, `${PREFIX}.${payload}`);
  if (signature.length !== expected.length) return undefined;
  let diff = 0;
  for (let i = 0; i < signature.length; i += 1) diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return undefined;

  const bytes = tokenBase64Url.decode(payload);
  if (!bytes) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
  const row = parsed as { u?: unknown; c?: unknown; t?: unknown };
  if (row.u !== userId || typeof row.c !== 'string' || typeof row.t !== 'number') return undefined;
  if (!row.c) return undefined;
  if (row.t > now + 30_000 || row.t < now - CHALLENGE_MAX_AGE_SECONDS * 1000) return undefined;

  cookies().delete(APP_LOCK_CHALLENGE_COOKIE);
  return row.c;
}

export function clearCeremonyChallenge() {
  cookies().delete(APP_LOCK_CHALLENGE_COOKIE);
}

import 'server-only';
/**
 * The lock password, in the only form it is ever kept: an scrypt digest computed on
 * the server, with a salt generated per account.
 *
 * Deliberately not in the browser and not in a cookie: no plaintext ever reaches
 * localStorage, sessionStorage or IndexedDB, and the digest travels back only as a
 * stored value the account itself can read. The unlock endpoint compares a candidate
 * against the digest and nothing else.
 *
 * Node-only (`node:crypto`), so it belongs to route handlers and server actions —
 * never to the edge middleware, which only verifies an HMAC it was handed.
 */

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { LOCK_PASSWORD_MAX, LOCK_PASSWORD_MIN } from './state';

/** 16384 * 8 * 128 ≈ 16 MB of work per guess — expensive to attack, fast enough to tap. */
const COST = { N: 16384, r: 8, p: 1 };
const SALT_BYTES = 32;
const KEY_BYTES = 64;
const MAXMEM = 64 * 1024 * 1024;
const HEX = /^[0-9a-f]+$/;

function derive(password: string, salt: Uint8Array, N: number, r: number, p: number, keylen: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    scrypt(Buffer.from(password, 'utf8'), Buffer.from(salt), keylen, { N, r, p, maxmem: MAXMEM }, (error, derived) => {
      if (error) reject(error);
      else resolve(new Uint8Array(derived));
    });
  });
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

function fromHex(value: string): Uint8Array | undefined {
  if (!HEX.test(value) || value.length % 2) return undefined;
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export type ParsedLockPassword = {
  N: number;
  r: number;
  p: number;
  salt: Uint8Array;
  hash: Uint8Array;
};

/**
 * Reads `scrypt$N$r$p$salt$hash`, the same shape the check constraint in migration
 * 0008 accepts. Anything else — including a row written by hand — parses to
 * `undefined` and therefore verifies as false, rather than being trusted because it
 * looks like a digest.
 */
export function parseLockPassword(stored: string | null | undefined): ParsedLockPassword | undefined {
  if (!stored) return undefined;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return undefined;
  const N = Number.parseInt(parts[1], 10);
  const r = Number.parseInt(parts[2], 10);
  const p = Number.parseInt(parts[3], 10);
  if (![N, r, p].every((n) => Number.isFinite(n) && n > 0)) return undefined;
  const salt = fromHex(parts[4]);
  const hash = fromHex(parts[5]);
  if (!salt || !hash) return undefined;
  return { N, r, p, salt, hash };
}

export async function hashLockPassword(password: string): Promise<string> {
  const salt = new Uint8Array(randomBytes(SALT_BYTES));
  const hash = await derive(password, salt, COST.N, COST.r, COST.p, KEY_BYTES);
  return `scrypt$${COST.N}$${COST.r}$${COST.p}$${toHex(salt)}$${toHex(hash)}`;
}

/**
 * Constant-time compare of two equal-length digests. A stored value that does not
 * parse, or parameters that differ from what was asked for, is a refusal, not a
 * crash: the unlock endpoint sees one more failed attempt.
 */
export async function verifyLockPassword(stored: string | null | undefined, password: string): Promise<boolean> {
  const parsed = parseLockPassword(stored);
  if (!parsed) return false;
  if (password.length === 0) return false;
  // Parameters the row claims but this process will not pay for (a hand-written digest
  // with an N over MAXMEM) are the same kind of answer as one that fails to parse: the
  // stored value cannot be verified, which is a refusal, not a 500 at the owner.
  let candidate: Uint8Array;
  try {
    candidate = await derive(password, parsed.salt, parsed.N, parsed.r, parsed.p, parsed.hash.length);
  } catch {
    return false;
  }
  if (candidate.length !== parsed.hash.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(parsed.hash));
}

export type PasswordIssue = 'too_short' | 'too_long' | 'blank' | null;

/**
 * The only length rules worth enforcing: long enough to be worth attacking slowly,
 * short enough to type on a phone. Case and symbols are free — an app lock is not the
 * place to fight someone over their passphrase.
 */
export function passwordIssue(password: unknown): PasswordIssue {
  if (typeof password !== 'string') return 'blank';
  if (!password.trim()) return 'blank';
  if (password.length < LOCK_PASSWORD_MIN) return 'too_short';
  if (password.length > LOCK_PASSWORD_MAX) return 'too_long';
  return null;
}

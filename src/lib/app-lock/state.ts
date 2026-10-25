/**
 * The app lock's vocabulary, kept free of cookies, databases and Node APIs so the
 * rules can be read and tested on their own.
 *
 * Two facts have to stay apart, because collapsing them is how a lock becomes a
 * lie:
 *
 *  - what the account *asked for* (these settings: on/off, which step-up, how long
 *    an unlock lasts), which lives in Postgres and is writable by the account's own
 *    token;
 *  - whether *this session* currently satisfies that ask, which lives only in an
 *    HMAC-signed httpOnly cookie the browser cannot read and the token holder cannot
 *    mint.
 *
 * So nothing here stores "locked". `decideLock` reads a signed envelope and says
 * what it means, and the envelope is minted or re-minted only by server code that
 * holds the secret.
 */

export const APP_LOCK_COOKIE = 'omonettab_app_lock';
/** Carries the WebAuthn/registration challenge between the two halves of a ceremony. */
export const APP_LOCK_CHALLENGE_COOKIE = 'omonettab_lock_challenge';

export type LockMethod = 'webauthn' | 'password' | 'either';
export const LOCK_METHODS: readonly LockMethod[] = ['webauthn', 'password', 'either'];

export type AppLockSettings = {
  enabled: boolean;
  method: LockMethod;
  /** Ask the app to re-lock when the tab or installed window is hidden. */
  lockOnBackground: boolean;
  /** 0 = never re-lock merely for being idle; otherwise minutes of quiet before it asks. */
  idleMinutes: number;
  /** Server-side lifetime of one unlock. This is the bound that holds with no scripts. */
  grantMinutes: number;
  hasPassword: boolean;
  credentialCount: number;
  failedAttempts: number;
  /** ISO string, or null when no cool-down is running. */
  lockedUntil: string | null;
  /**
   * When the account's lock *policy* last moved — the row's `updated_at`, which the
   * application bumps only for a change that other devices should notice (the choices,
   * the password door, and "lock it now"). An open unlock window minted before this
   * instant does not survive it.
   *
   * Failed-attempt bookkeeping deliberately does not move it: one account's typo on one
   * phone must not sign the owner out of their laptop.
   */
  policyChangedAt: string | null;
};

export const DEFAULT_LOCK_SETTINGS: AppLockSettings = {
  enabled: false,
  method: 'either',
  lockOnBackground: true,
  idleMinutes: 0,
  grantMinutes: 15,
  hasPassword: false,
  credentialCount: 0,
  failedAttempts: 0,
  lockedUntil: null,
  policyChangedAt: null
};

/** Bounds kept in step with the check constraints of migration 0008. */
export const GRANT_MINUTES_MIN = 1;
export const GRANT_MINUTES_MAX = 720;
export const IDLE_MINUTES_MAX = 720;
export const LOCK_PASSWORD_MIN = 8;
export const LOCK_PASSWORD_MAX = 128;
export const LOCK_LABEL_MAX = 60;

/** How long the envelope itself may be kept by the browser. */
export const ENVELOPE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
/** A ceremony is a few taps long; past this the challenge is worthless. */
export const CHALLENGE_MAX_AGE_SECONDS = 300;

/**
 * How long one presented envelope is trusted before the account's settings are read
 * again. This single number is what turns the envelope's 30-day cookie life into a
 * bounded statement: an account that switched its lock on, or pressed "lock it now",
 * reaches every other device within this long — one re-check per session, not one
 * database read per request.
 */
export const ENVELOPE_TRUST_SECONDS = 60;

/**
 * Postgres stamps the policy change with its own clock and the envelope carries this
 * server's, so the two are only compared when they disagree by more than this.
 */
export const POLICY_CLOCK_SKEW_MS = 30_000;

/**
 * The documented worst case for a lock change reaching another signed-in device:
 * one expired trust window plus the clock allowance.
 */
export const MAX_POLICY_PROPAGATION_SECONDS = ENVELOPE_TRUST_SECONDS + POLICY_CLOCK_SKEW_MS / 1000;

export type Envelope = {
  userId: string;
  /** True when the account asked for a lock at the moment this envelope was minted. */
  required: boolean;
  /** Epoch milliseconds until which one unlock is honoured, or null when locked. */
  unlockedUntil: number | null;
  issuedAt: number;
  /**
   * True only when a verified step-up — a device assertion or the lock password, both
   * checked on the server — is what opened this window. Signing in with the account
   * password does not set it: that proves the OmoNetTab password, not the lock's own.
   */
  stepUp: boolean;
};

export type LockVerdict =
  /** No envelope to trust: the session needs minting before anything else. */
  | 'unknown'
  /** This session is not carrying a lock requirement. */
  | 'off'
  /** Unlocked, and still inside the window one step-up bought. */
  | 'unlocked'
  /** Required, and the window is gone or never opened. */
  | 'locked'
  /**
   * The account's settings could not be read, so nothing can be said about whether
   * this session satisfies them. It is a separate verdict rather than `off` because
   * "we could not check" must never be reported as "no check needed".
   */
  | 'unavailable';

/**
 * What an API route is told about its own session. A word rather than a thrown error so
 * `src/lib/session.ts` stays the only place that knows what an `AuthorizationError` is,
 * and so the two modules never import each other at load time.
 *
 * `stale` is an envelope that verifies but names a different account; `unavailable` is a
 * settings read that failed. Both are refusals, and neither is the same answer as
 * `locked`, which the client can act on by showing the unlock screen.
 */
export type SessionLockState = 'pass' | 'locked' | 'stale' | 'unavailable';

export function decideLock(envelope: Envelope | undefined, now: number): LockVerdict {
  if (!envelope) return 'unknown';
  if (!envelope.required) return 'off';
  if (envelope.unlockedUntil !== null && envelope.unlockedUntil > now) return 'unlocked';
  return 'locked';
}

/**
 * Whether a presented envelope has outlived its trust window and the account's settings
 * have to be read again. Every caller that can answer that question is server-side and
 * cookie-writing; the edge middleware treats a stale verdict as a session to re-mint.
 */
export function envelopeNeedsRecheck(envelope: Envelope | undefined, now: number): boolean {
  if (!envelope) return true;
  return now - envelope.issuedAt >= ENVELOPE_TRUST_SECONDS * 1000;
}

/**
 * Whether an open unlock window is still worth carrying across a re-check.
 *
 * Two things end it: its own deadline, and any change to the account's lock policy that
 * post-dates the envelope. The second is what makes "lock it now" mean more than the one
 * browser that pressed the button, and it is why the comparison uses the policy instant
 * rather than re-reading the deadline the envelope already states.
 */
export function grantSurvivesRecheck(input: { envelope: Envelope; policyChangedAt: string | null; now: number }): boolean {
  const { envelope, policyChangedAt, now } = input;
  if (envelope.unlockedUntil === null || envelope.unlockedUntil <= now) return false;
  if (!policyChangedAt) return true;
  const changed = Date.parse(policyChangedAt);
  if (!Number.isFinite(changed)) return true;
  return changed - envelope.issuedAt <= POLICY_CLOCK_SKEW_MS;
}

/**
 * What a request that touches the lock password has to present first.
 *
 * Setting the first one proves nothing, because there is nothing to prove against.
 * Replacing or removing one is a different matter: whoever asks either produces the
 * current password or stands in a session a verified step-up opened. Without the second
 * branch, an owner who has their enrolled device but has forgotten the lock password
 * would have nothing to try.
 */
export type LockPasswordProof = 'none' | 'step-up' | 'password';

export function requiredLockPasswordProof(input: {
  wantsPassword: boolean;
  wantsClear: boolean;
  hasPassword: boolean;
  stepUp: boolean;
}): LockPasswordProof {
  const replaces = input.wantsPassword && input.hasPassword;
  const removes = input.wantsClear && input.hasPassword;
  if (!replaces && !removes) return 'none';
  return input.stepUp ? 'step-up' : 'password';
}

/**
 * Whether the account could actually satisfy the lock it is asking for. A method with
 * no door behind it is refused rather than saved, because an unopenable lock is a
 * defect: the owner would meet it on their next sign-in with nothing to try.
 */
export function hasWayBackIn(input: {
  method: LockMethod;
  hasPassword: boolean;
  credentialCount: number;
}): boolean {
  const password = input.hasPassword;
  const credential = input.credentialCount > 0;
  if (input.method === 'password') return password;
  if (input.method === 'webauthn') return credential;
  return password || credential;
}

export type LockDoors = { webauthn: boolean; password: boolean };

/** Which step-ups this account can offer on the unlock screen, right now. */
export function usableDoors(settings: AppLockSettings): LockDoors {
  return {
    webauthn: settings.method !== 'password' && settings.credentialCount > 0,
    password: settings.method !== 'webauthn' && settings.hasPassword
  };
}

/**
 * The cool-down the account is sitting in, if any. `retryAfterSeconds` is what the
 * unlock screen shows; 0 means no cool-down is running.
 */
export function coolDown(lockedUntil: string | null, now: number): { running: boolean; retryAfterSeconds: number } {
  if (!lockedUntil) return { running: false, retryAfterSeconds: 0 };
  const until = Date.parse(lockedUntil);
  if (!Number.isFinite(until) || until <= now) return { running: false, retryAfterSeconds: 0 };
  return { running: true, retryAfterSeconds: Math.ceil((until - now) / 1000) };
}

export const FREE_ATTEMPTS = 5;
const BACKOFF_START_SECONDS = 15;
const BACKOFF_CAP_SECONDS = 15 * 60;

/**
 * Backoff for repeated failures: nothing until `FREE_ATTEMPTS`, then 15s, 30s, 60s,
 * doubling up to a quarter of an hour.
 *
 * Honest about its reach: this throttles the real unlock path. It is not a boundary
 * against someone who hand-writes a request with the account's own access token, and
 * no copy in the interface says that it is.
 */
export function nextFailureState(failedAttempts: number, now: number): { failedAttempts: number; lockedUntil: string | null } {
  const next = failedAttempts + 1;
  if (next < FREE_ATTEMPTS) return { failedAttempts: next, lockedUntil: null };
  const steps = next - FREE_ATTEMPTS;
  const seconds = Math.min(BACKOFF_CAP_SECONDS, BACKOFF_START_SECONDS * 2 ** steps);
  return { failedAttempts: next, lockedUntil: new Date(now + seconds * 1000).toISOString() };
}

/** `grant_minutes`/`idle_minutes` arrive from a request body; never trust the number. */
export function clampGrantMinutes(value: unknown): number {
  const n = typeof value === 'number' ? Math.round(value) : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return DEFAULT_LOCK_SETTINGS.grantMinutes;
  return Math.min(GRANT_MINUTES_MAX, Math.max(GRANT_MINUTES_MIN, n));
}

export function clampIdleMinutes(value: unknown): number {
  const n = typeof value === 'number' ? Math.round(value) : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return DEFAULT_LOCK_SETTINGS.idleMinutes;
  return Math.min(IDLE_MINUTES_MAX, Math.max(0, n));
}

export function readLockMethod(value: unknown): LockMethod | undefined {
  return LOCK_METHODS.find((method) => method === value);
}

export function clampLabel(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return 'This device';
  return text.slice(0, LOCK_LABEL_MAX);
}

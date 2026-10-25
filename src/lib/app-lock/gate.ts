import 'server-only';
/**
 * The two moments that matter, in one place: minting an envelope, and asking whether
 * the current request satisfies the lock.
 *
 * Everything here trusts one thing only — the signature from `envelope.ts`. Settings
 * are read when a *decision about the account* is made (sign-in, unlock, a settings
 * change), or when the envelope the session presented has outlived its trust window
 * (`ENVELOPE_TRUST_SECONDS`), never as a per-request authority on its own.
 *
 * The trust window is what keeps that re-read cheap and still honest. A session with a
 * fresh envelope costs no query at all; a session whose envelope has aged gets one read
 * of its own settings, and anything the account changed in the meantime — the lock
 * switched on, "lock it now" pressed, the timings tightened — takes effect then. The
 * worst case a second device can hold an unlock it no longer deserves is
 * `MAX_POLICY_PROPAGATION_SECONDS`.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  APP_LOCK_COOKIE,
  DEFAULT_LOCK_SETTINGS,
  decideLock,
  envelopeNeedsRecheck,
  grantSurvivesRecheck,
  type AppLockSettings,
  type SessionLockState
} from './state';
import { appLockAvailable, lockClient, readLockSettingsResult, type LockSettingsRead } from './store';
import {
  appLockSecret,
  envelopeCookieOptions,
  lockForRequest,
  mintEnvelope,
  unlockDeadline,
  type SessionLock
} from './envelope';

export const UNLOCK_PATH = '/unlock';

export function readLockCookie(): string | undefined {
  try {
    return cookies().get(APP_LOCK_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

export async function clearLockEnvelope(): Promise<void> {
  cookies().delete(APP_LOCK_COOKIE);
}

export type EnvelopeIntent = {
  userId: string;
  required: boolean;
  unlockedUntil: number | null;
  /** Whether a verified step-up is what opened this window. Never a browser's claim. */
  stepUp: boolean;
};

/**
 * Writes the envelope for this account. `unlockedUntil` is the deadline one step-up
 * bought; `null` means the session is required to unlock and has not yet.
 */
export async function writeLockEnvelope(input: EnvelopeIntent): Promise<void> {
  const secret = appLockSecret();
  if (!secret) return;
  const value = await mintEnvelope(
    {
      userId: input.userId,
      required: input.required,
      unlockedUntil: input.unlockedUntil,
      issuedAt: Date.now(),
      stepUp: input.stepUp
    },
    secret
  );
  cookies().set(APP_LOCK_COOKIE, value, envelopeCookieOptions());
}

/**
 * Mint, then report the verdict — in a route handler this is the cookie the next request
 * carries, and in a server-component render Next refuses the write and the answer comes
 * from the same numbers the mint would have carried. Either way the verdict is the
 * settings-derived one; a refused write is never a reason to say "no lock".
 */
async function mintAndReport(intent: EnvelopeIntent): Promise<SessionLock> {
  const now = Date.now();
  try {
    await writeLockEnvelope(intent);
  } catch {
    // The refusal is expected outside a route handler, and it changes nothing about the
    // answer below: the mint is a convenience for the next request, never the decision.
  }
  const observed = await currentLock();
  if (observed.verdict !== 'unknown' && observed.userId === intent.userId) return observed;
  return { verdict: decideLock({ ...intent, issuedAt: now }, now), userId: intent.userId };
}

/**
 * At sign-in the account's settings decide what this session carries. Completing the
 * account password is a stronger proof than the lock asks for the *window*, so an
 * enabled lock opens one here rather than demanding a second step-up in the same breath
 * — which is also what makes a lost device credential survivable: signing out and back
 * in with the account password is always a way back in.
 *
 * It is not the lock's own step-up, and this does not pretend to be one: `stepUp` stays
 * false, so signing in never lets someone change or remove a lock password they cannot
 * produce.
 */
export async function envelopeForSignIn(userId: string): Promise<void> {
  const now = Date.now();
  const read = await readAccountLockSettings(userId);

  // The settings could not be read, so whether this account has a lock on is unknown.
  // Unknown is closed, not open: an account that might be protected is treated as one
  // that is, and the unlock screen is the place that says what went wrong.
  if (read.status === 'error') {
    await writeLockEnvelope({ userId, required: true, unlockedUntil: null, stepUp: false });
    return;
  }

  // `absent` is the one failure allowed to mean no lock: there is no table, so there is
  // nothing this deployment can enforce — migration 0008 was simply never applied.
  const settings = read.status === 'ok' ? read.settings : DEFAULT_LOCK_SETTINGS;
  if (!settings.enabled) {
    await writeLockEnvelope({ userId, required: false, unlockedUntil: null, stepUp: false });
    return;
  }
  await writeLockEnvelope({ userId, required: true, unlockedUntil: unlockDeadline(settings.grantMinutes, now), stepUp: false });
}

/** After a verified step-up: same requirement, a window the server signed, and the provenance that came with it. */
export async function envelopeAfterStepUp(userId: string, settings: AppLockSettings, now: number): Promise<void> {
  await writeLockEnvelope({ userId, required: true, unlockedUntil: unlockDeadline(settings.grantMinutes, now), stepUp: true });
}

/**
 * After a settings save from a session that is already open. The window is rewritten with
 * the new lifetime so turning the lock on does not lock the owner out mid-form, and the
 * provenance is carried, not invented: saving settings is not a step-up.
 */
export async function envelopeAfterSettings(userId: string, settings: AppLockSettings, stepUp: boolean, now: number): Promise<void> {
  if (!settings.enabled) {
    await writeLockEnvelope({ userId, required: false, unlockedUntil: null, stepUp: false });
    return;
  }
  await writeLockEnvelope({ userId, required: true, unlockedUntil: unlockDeadline(settings.grantMinutes, now), stepUp });
}

/** "Lock it now": keeps the requirement and drops the window. */
export async function envelopeAfterLock(userId: string, settings: AppLockSettings): Promise<void> {
  await writeLockEnvelope({ userId, required: settings.enabled, unlockedUntil: null, stepUp: false });
}

export async function currentLock(): Promise<SessionLock> {
  return lockForRequest({ cookieValue: readLockCookie(), secret: appLockSecret(), now: Date.now() });
}

/**
 * The account's settings, classified: `ok`, `absent` (migration 0008 not applied), or
 * `error` (the read failed and says nothing about the account). Every caller has to say
 * what it does with all three, and only `absent` is allowed to mean "no lock".
 *
 * Building the client is part of the read. A deployment that cannot even name its
 * database — no url, no key, a half-configured project — is a failure to inspect, not an
 * absence of the schema, so it is classified here rather than allowed to escape as an
 * exception past a gate that was supposed to answer for it.
 */
export async function readAccountLockSettings(userId: string): Promise<LockSettingsRead> {
  let client: SupabaseClient;
  try {
    client = lockClient();
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'lock store unavailable' };
  }
  return readLockSettingsResult(client, userId);
}

/**
 * The verdict for a request: the envelope while it is inside its trust window, and one
 * re-check of the account's own settings the moment it is not.
 *
 * A re-check is where a policy change reaches a session that did not make it. An open
 * window is carried forward only when the account's policy has not moved since the
 * envelope was signed; if it has, the window closes and the step-up is asked for again.
 * When the settings cannot be read at all the verdict is `unavailable`, which every
 * caller treats as closed — the one reading that is never offered as "no lock" is a
 * failure that was not a `0008` absence.
 */
export async function resolveLockForActor(actor: { userId: string }): Promise<SessionLock> {
  const now = Date.now();
  const presented = await matchingEnvelope(actor.userId);
  if (presented && !envelopeNeedsRecheck(presented.envelope, now)) return presented;

  const read = await readAccountLockSettings(actor.userId);
  if (read.status === 'error') return { verdict: 'unavailable' };

  const settings = read.status === 'ok' ? read.settings : DEFAULT_LOCK_SETTINGS;
  const carried =
    presented?.envelope && grantSurvivesRecheck({ envelope: presented.envelope, policyChangedAt: settings.policyChangedAt, now })
      ? { unlockedUntil: presented.envelope.unlockedUntil, stepUp: presented.envelope.stepUp }
      : { unlockedUntil: null as number | null, stepUp: false };

  return mintAndReport({
    userId: actor.userId,
    required: settings.enabled,
    unlockedUntil: settings.enabled ? carried.unlockedUntil : null,
    stepUp: settings.enabled ? carried.stepUp : false
  });
}

/** The envelope this browser presented, when it is this account's and it verifies. */
async function matchingEnvelope(userId: string): Promise<SessionLock | undefined> {
  const lock = await currentLock();
  return lock.verdict !== 'unknown' && lock.userId === userId ? lock : undefined;
}

/**
 * Whether a verified step-up opened this session's window. Settings writes ask, because
 * replacing or removing the lock password is allowed on that provenance as well as on the
 * current password.
 *
 * Route handlers have already re-checked the envelope by the time this is called
 * (`requireSignedIn` resolves the lock first), so the answer is the fresh one.
 */
export async function sessionStepUp(): Promise<boolean> {
  const lock = await currentLock();
  return lock.verdict === 'unlocked' && lock.envelope?.stepUp === true;
}

/**
 * The page-side gate, called from `requireArea`. Locked means "this session has to step
 * up", and the answer is a redirect, not an error page: the unlock screen is a real place
 * a person can go. `unavailable` goes to the same screen, which is the one page that can
 * say honestly that it could not check — and still offers sign-out, so a database that
 * is not answering never becomes a dead end.
 */
export async function enforceAreaLock(actor: { userId: string }, path: string): Promise<void> {
  if (!appLockAvailable()) return;
  const lock = await resolveLockForActor(actor);
  if (lock.verdict === 'locked' || lock.verdict === 'unavailable') {
    redirect(`${UNLOCK_PATH}?next=${encodeURIComponent(path)}`);
  }
}

/**
 * The API-side answer, as a word rather than a throw, so `session.ts` can stay the
 * only place that knows what an `AuthorizationError` is. Without that split the two
 * modules would import each other at load time.
 *
 * `stale` means the envelope that came back belongs to a different account than the
 * verified actor — the signature is valid but the session it describes is gone.
 * `unavailable` means the account's settings could not be read, so nothing is known
 * about whether this session satisfies them; both are refusals, and neither is 401 for
 * nobody's fault but a database's.
 */
export async function appLockApiVerdict(actor: { userId: string }): Promise<SessionLockState> {
  if (!appLockAvailable()) return 'pass';
  const lock = await currentLock();
  if (lock.verdict !== 'unknown' && lock.userId !== actor.userId) return 'stale';
  const resolved = await resolveLockForActor(actor);
  if (resolved.verdict === 'locked') return 'locked';
  if (resolved.verdict === 'unavailable') return 'unavailable';
  return 'pass';
}

export { APP_LOCK_COOKIE };

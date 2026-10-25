import { NextResponse } from 'next/server';
import { getT } from '@/lib/i18n/server';
import { requireSignedIn } from '@/lib/session';
import { clearCeremonyChallenge } from '@/lib/app-lock/challenge';
import { envelopeAfterSettings, readAccountLockSettings, sessionStepUp } from '@/lib/app-lock/gate';
import { lockAuthResponse, lockError, readJsonBody, readString } from '@/lib/app-lock/http';
import {
  FREE_ATTEMPTS,
  clampGrantMinutes,
  clampIdleMinutes,
  coolDown,
  hasWayBackIn,
  nextFailureState,
  readLockMethod,
  requiredLockPasswordProof,
  usableDoors,
  type AppLockSettings
} from '@/lib/app-lock/state';
import { hashLockPassword, passwordIssue, verifyLockPassword } from '@/lib/app-lock/password';
import {
  appLockAvailable,
  clearLockPassword,
  lockClient,
  recordAttempts,
  storeLockPassword,
  storedPasswordHash,
  writeLockSettings,
  type SettingsPatch
} from '@/lib/app-lock/store';

export const dynamic = 'force-dynamic';

/**
 * The account's lock configuration: on/off, which step-up, how long an unlock lasts,
 * and the lock password itself.
 *
 * Four rules hold this together:
 *
 *  1. An enabled lock always has a door. Both directions of that are refused before the
 *     write: enabling without any way back in, and removing the last way back in. The
 *     same rule exists as a database trigger in migration 0008, because hiding a button
 *     is not a boundary.
 *  2. Replacing or removing a lock password that already exists needs proof — either the
 *     current password, or a window that a *verified step-up* opened on this device. An
 *     envelope minted at sign-in does not count (`stepUp` is false there), so a stolen
 *     account cookie cannot quietly take the lock's password over; and a person holding
 *     the enrolled device can still change a password they have forgotten, which is the
 *     recovery that makes the rule survivable.
 *  3. Turning the lock *off* needs no proof of the password. That is the documented way
 *     back in for an owner who has lost both doors, and removing it would be a way to
 *     lock people out of their own account.
 *  4. Nothing here returns a digest. `hasPassword` is a boolean, and that is the most
 *     any response says about the password.
 */
export async function POST(req: Request) {
  const t = getT();
  try {
    if (!appLockAvailable()) return lockError(t, 'appLock.notAvailable', 409);

    const actor = await requireSignedIn();
    const client = lockClient();
    const userId = actor.userId;
    const body = await readJsonBody(req);

    const read = await readAccountLockSettings(userId);
    if (read.status === 'absent') return lockError(t, 'appLock.notAvailable', 409);
    if (read.status === 'error') return lockError(t, 'appLock.storeUnavailable', 503);
    const settings = read.settings;

    // --- the choices, read before anything is written ---------------------------
    // Deciding these first is what makes the door rule below a refusal instead of a
    // half-applied change: a request that clears the last door must not be able to
    // empty the password column and only then discover it broke the lock, which is how
    // the database trigger would answer — as an exception, and as a 500 to the owner.
    const method = body.method === undefined ? settings.method : readLockMethod(body.method);
    if (!method) return lockError(t, 'appLock.methodInvalid', 400);

    const enabled = body.enabled === undefined ? settings.enabled : body.enabled === true;
    const lockOnBackground = body.lockOnBackground === undefined ? settings.lockOnBackground : body.lockOnBackground === true;
    const idleMinutes = clampIdleMinutes(body.idleMinutes ?? settings.idleMinutes);
    const grantMinutes = clampGrantMinutes(body.grantMinutes ?? settings.grantMinutes);

    // --- the lock password -------------------------------------------------------
    const newPassword = typeof body.password === 'string' ? body.password : '';
    const wantsPassword = newPassword.length > 0;
    const wantsClear = body.clearPassword === true;
    if (wantsPassword && wantsClear) return lockError(t, 'appLock.passwordConflict', 400);

    const prospectiveHasPassword = wantsPassword ? true : wantsClear ? false : settings.hasPassword;

    if (enabled && !hasWayBackIn({ method, hasPassword: prospectiveHasPassword, credentialCount: settings.credentialCount })) {
      return lockError(t, 'appLock.needWayBackIn', 409);
    }

    // --- the proof, before any write -------------------------------------------
    // Asked for and settled here, so no branch below can reach the database with a
    // password change that nobody evidenced.
    const stepUp = await sessionStepUp();
    const proof = requiredLockPasswordProof({ wantsPassword, wantsClear, hasPassword: settings.hasPassword, stepUp });

    if (proof === 'password') {
      const current = readString(body, 'currentPassword', 128);
      if (!current) return lockError(t, 'appLock.passwordProofRequired', 400);

      const matched = await verifyLockPassword(await storedPasswordHash(client, userId), current);
      if (!matched) {
        // Taking over an existing password is the same act as failing to unlock with it,
        // so it goes to the same refusal and spends from the same counter.
        const state = nextFailureState(settings.failedAttempts, Date.now());
        await recordAttempts(client, userId, state);
        const after = coolDown(state.lockedUntil, Date.now());
        return lockError(t, 'appLock.wrongPassword', 401, {
          retryAfterSeconds: after.retryAfterSeconds,
          attemptsLeft: Math.max(0, FREE_ATTEMPTS - state.failedAttempts)
        });
      }
    }

    let hasPassword = settings.hasPassword;

    if (wantsClear) {
      await clearLockPassword(client, userId);
      hasPassword = false;
    }

    if (wantsPassword) {
      const issue = passwordIssue(newPassword);
      if (issue) return lockError(t, issue === 'too_short' ? 'appLock.passwordTooShort' : issue === 'too_long' ? 'appLock.passwordTooLong' : 'appLock.passwordBlank', 400);

      await storeLockPassword(client, userId, await hashLockPassword(newPassword));
      hasPassword = true;
      // A password that was just produced or replaced is not a session in a cool-down.
      await recordAttempts(client, userId, { failedAttempts: 0, lockedUntil: null });
    }

    const patch: SettingsPatch = { enabled, method, lockOnBackground, idleMinutes, grantMinutes };
    await writeLockSettings(client, userId, patch);

    const next: AppLockSettings = { ...settings, ...patch, hasPassword };

    // The envelope follows the choice that was just made, in this session. Turning the
    // lock on from inside an unlocked session does not lock the owner out mid-form; the
    // window is rewritten with the new lifetime. Turning it off ends the requirement.
    // Other devices see the change through the policy instant `writeLockSettings` moved.
    await envelopeAfterSettings(userId, next, stepUp, Date.now());

    clearCeremonyChallenge();

    return NextResponse.json({ ok: true, settings: publicLockSettings(next), doors: usableDoors(next) });
  } catch (err) {
    return lockAuthResponse(t, err);
  }
}

/**
 * What a response is allowed to say about the lock: the choices, and whether a door
 * exists. Never the digest, never the salt, never the attempt count. A route file
 * exports its handlers and nothing else, so this stays module-local.
 */
function publicLockSettings(settings: AppLockSettings) {
  return {
    enabled: settings.enabled,
    method: settings.method,
    lockOnBackground: settings.lockOnBackground,
    idleMinutes: settings.idleMinutes,
    grantMinutes: settings.grantMinutes,
    hasPassword: settings.hasPassword,
    credentialCount: settings.credentialCount
  };
}

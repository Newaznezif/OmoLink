import { NextResponse } from 'next/server';
import { getT } from '@/lib/i18n/server';
import { requireSignedIn } from '@/lib/session';
import { clearCeremonyChallenge } from '@/lib/app-lock/challenge';
import { envelopeAfterLock, readAccountLockSettings } from '@/lib/app-lock/gate';
import { lockAuthResponse, lockError } from '@/lib/app-lock/http';
import { appLockAvailable, lockClient, touchLockPolicy } from '@/lib/app-lock/store';

export const dynamic = 'force-dynamic';

/**
 * "Lock it now", from a handover or a borrowed-phone scare.
 *
 * It does two things, and the second is the reason this is a server endpoint rather than
 * a client-side state change:
 *
 *  1. this session's envelope is rewritten with the window closed, and
 *  2. the account's policy instant moves, which ends the open window on *every* other
 *     device of this account the next time each one's envelope reaches the end of its
 *     trust window — `MAX_POLICY_PROPAGATION_SECONDS` at the latest.
 *
 * Without step 2 the button would only be drawing a curtain over the one browser that
 * pressed it, and a curtain is not a lock.
 *
 * Writing the policy first is deliberate: if the database refuses, the endpoint answers an
 * error and this browser keeps a window it was told it had lost, rather than the other way
 * round. Failing loudly is the safe direction for a button whose whole job is to close
 * doors.
 */
export async function POST() {
  const t = getT();
  try {
    if (!appLockAvailable()) return lockError(t, 'appLock.notAvailable', 409);
    const actor = await requireSignedIn();
    const read = await readAccountLockSettings(actor.userId);
    if (read.status === 'absent') return lockError(t, 'appLock.notAvailable', 409);
    if (read.status === 'error') return lockError(t, 'appLock.storeUnavailable', 503);

    if (read.settings.enabled) await touchLockPolicy(lockClient(), actor.userId);
    await envelopeAfterLock(actor.userId, read.settings);
    clearCeremonyChallenge();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return lockAuthResponse(t, err);
  }
}

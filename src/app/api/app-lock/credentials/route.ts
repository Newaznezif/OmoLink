import { NextResponse } from 'next/server';
import { getT } from '@/lib/i18n/server';
import { requireSignedIn } from '@/lib/session';
import { clearCeremonyChallenge } from '@/lib/app-lock/challenge';
import { readAccountLockSettings } from '@/lib/app-lock/gate';
import { lockAuthResponse, lockError, readJsonBody, readString } from '@/lib/app-lock/http';
import { hasWayBackIn } from '@/lib/app-lock/state';
import { appLockAvailable, listCredentials, lockClient, removeCredential, touchLockPolicy } from '@/lib/app-lock/store';

export const dynamic = 'force-dynamic';

/**
 * The account's enrolled devices.
 *
 * The public key is deliberately absent from this projection: it is the verification
 * secret, the browser has no use for it, and there is no reason to put a copy of it in
 * a page a shoulder can read. Only what a person needs to recognise the row — label,
 * when it was added, when it was last used.
 */
export async function GET() {
  const t = getT();
  try {
    if (!appLockAvailable()) return lockError(t, 'appLock.notAvailable', 409);
    const actor = await requireSignedIn();
    const credentials = await listCredentials(lockClient(), actor.userId);
    return NextResponse.json({
      credentials: credentials.map((credential) => ({
        id: credential.id,
        label: credential.label,
        createdAt: credential.createdAt,
        lastUsedAt: credential.lastUsedAt
      }))
    });
  } catch (err) {
    return lockAuthResponse(t, err);
  }
}

/**
 * Removes one of this account's credentials — the id is the row id, and RLS already
 * limits the delete to rows whose `user_id` is the signed-in user.
 *
 * The interesting refusal is the last one: with the lock on and a method that needs a
 * device, deleting the only enrolled device would leave an openable-looking lock with no
 * way through it. That is refused rather than trusted to the recovery path.
 */
export async function DELETE(req: Request) {
  const t = getT();
  try {
    if (!appLockAvailable()) return lockError(t, 'appLock.notAvailable', 409);
    const actor = await requireSignedIn();
    const client = lockClient();
    const body = await readJsonBody(req);
    const rowId = readString(body, 'id', 64);
    if (!rowId) return lockError(t, 'appLock.credentialNotFound', 400);

    const read = await readAccountLockSettings(actor.userId);
    if (read.status === 'absent') return lockError(t, 'appLock.notAvailable', 409);
    if (read.status === 'error') return lockError(t, 'appLock.storeUnavailable', 503);
    const settings = read.settings;

    const credentials = await listCredentials(client, actor.userId);
    const target = credentials.find((credential) => credential.id === rowId);
    if (!target) return lockError(t, 'appLock.credentialNotFound', 404);

    const remaining = credentials.length - 1;
    if (settings.enabled && !hasWayBackIn({ method: settings.method, hasPassword: settings.hasPassword, credentialCount: remaining })) {
      return lockError(t, 'appLock.lastDoorCredential', 409, { remaining });
    }

    await removeCredential(client, actor.userId, rowId);
    // A device that is no longer trusted should not keep an unlock window open elsewhere
    // on the strength of a check it made while it still was. This moves the account's
    // policy instant, so every other session is asked to step up again within
    // `MAX_POLICY_PROPAGATION_SECONDS`.
    await touchLockPolicy(client, actor.userId);
    clearCeremonyChallenge();
    return NextResponse.json({ ok: true, credentialCount: remaining });
  } catch (err) {
    return lockAuthResponse(t, err);
  }
}

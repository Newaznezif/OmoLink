import { NextResponse, type NextRequest } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getT } from '@/lib/i18n/server';
import { requireSignedIn } from '@/lib/session';
import { writeCeremonyChallenge } from '@/lib/app-lock/challenge';
import { readAccountLockSettings } from '@/lib/app-lock/gate';
import { lockAuthResponse, lockError } from '@/lib/app-lock/http';
import { usableDoors } from '@/lib/app-lock/state';
import { webauthnIdentity } from '@/lib/app-lock/rp';
import { appLockAvailable, listCredentials, lockClient } from '@/lib/app-lock/store';

export const dynamic = 'force-dynamic';

/**
 * The first half of an unlock ceremony: the server's challenge, handed to the browser.
 *
 * `lock: false` is the whole point of this endpoint — a locked session has to be able
 * to ask to be unlocked. It is still a signed-in session: Supabase decides who is
 * asking, and only that account's own credentials (RLS) can appear in `allowCredentials`.
 *
 * The challenge goes into a signed, path-scoped httpOnly cookie rather than the JSON
 * response, so the browser never gets to choose which challenge it is asked to sign.
 */
export async function GET(req: NextRequest) {
  const t = getT();
  try {
    if (!appLockAvailable()) return lockError(t, 'appLock.notAvailable', 409);

    const actor = await requireSignedIn({ lock: false });
    const client = lockClient();
    const read = await readAccountLockSettings(actor.userId);
    if (read.status === 'absent') return lockError(t, 'appLock.notAvailable', 409);
    if (read.status === 'error') return lockError(t, 'appLock.storeUnavailable', 503);
    const settings = read.settings;

    // Nothing to offer: the account's method excludes devices, or has enrolled none.
    // Reported as `available: false` rather than an error, because the unlock screen has
    // a password door to show in that case.
    if (!usableDoors(settings).webauthn) return NextResponse.json({ available: false });

    const credentials = await listCredentials(client, actor.userId);
    if (credentials.length === 0) return NextResponse.json({ available: false });

    const identity = webauthnIdentity(req.headers.get('host'));
    if (!identity) return lockError(t, 'appLock.rpUnknown', 503);

    const options = await generateAuthenticationOptions({
      rpID: identity.rpId,
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports
      })),
      // Required, not preferred: this step-up is the thing being proved, and a
      // credential presented without the platform confirming the person is not that.
      userVerification: 'required',
      timeout: 60_000
    });

    const stored = await writeCeremonyChallenge({ userId: actor.userId, challenge: options.challenge });
    if (!stored) return lockError(t, 'appLock.notAvailable', 409);

    return NextResponse.json({ available: true, options });
  } catch (err) {
    return lockAuthResponse(t, err);
  }
}

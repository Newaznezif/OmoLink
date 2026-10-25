import { NextResponse, type NextRequest } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getT } from '@/lib/i18n/server';
import { requireSignedIn } from '@/lib/session';
import { writeCeremonyChallenge } from '@/lib/app-lock/challenge';
import { lockAuthResponse, lockError, readJsonBody, readString } from '@/lib/app-lock/http';
import { clampLabel } from '@/lib/app-lock/state';
import { webauthnIdentity } from '@/lib/app-lock/rp';
import { appLockAvailable, listCredentials, lockClient } from '@/lib/app-lock/store';

export const dynamic = 'force-dynamic';

/** Enrolling a device is a configuration change, so it needs an unlocked session. */
const MAX_CREDENTIALS = 10;

/**
 * The first half of an enrolment: creation options the browser hands to the platform.
 *
 * `userName` is the account id rather than the email on purpose — it ends up stored
 * inside the platform's own passkey record, and the id says everything a credential
 * needs to say about who it belongs to without copying an address onto a device.
 *
 * `attestationType: 'none'` is deliberate too: this lock trusts the *assertion* it will
 * verify later, not a manufacturer's certificate about the authenticator's model.
 * Requiring attestation would refuse ordinary phones while proving nothing extra.
 */
export async function POST(req: NextRequest) {
  const t = getT();
  try {
    if (!appLockAvailable()) return lockError(t, 'appLock.notAvailable', 409);

    const actor = await requireSignedIn();
    const client = lockClient();
    const body = await readJsonBody(req);

    const existing = await listCredentials(client, actor.userId);
    if (existing.length >= MAX_CREDENTIALS) {
      return lockError(t, 'appLock.tooManyCredentials', 409, { limit: MAX_CREDENTIALS });
    }

    const identity = webauthnIdentity(req.headers.get('host'));
    if (!identity) return lockError(t, 'appLock.rpUnknown', 503);

    const options = await generateRegistrationOptions({
      rpName: identity.rpName,
      rpID: identity.rpId,
      userName: actor.userId,
      userDisplayName: readString(body, 'label', 60) || 'This device',
      attestationType: 'none',
      excludeCredentials: existing.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports
      })),
      authenticatorSelection: {
        // Discoverable (resident) so the account can pick a device back out of the
        // platform without the site having to name the credential id first.
        residentKey: 'preferred',
        userVerification: 'required'
      }
    });

    const stored = await writeCeremonyChallenge({ userId: actor.userId, challenge: options.challenge });
    if (!stored) return lockError(t, 'appLock.notAvailable', 409);

    return NextResponse.json({ ok: true, options, label: clampLabel(body.label) });
  } catch (err) {
    return lockAuthResponse(t, err);
  }
}

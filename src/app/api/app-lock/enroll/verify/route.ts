import { NextResponse } from 'next/server';
import { verifyRegistrationResponse, type RegistrationResponseJSON } from '@simplewebauthn/server';
import { getT } from '@/lib/i18n/server';
import { requireSignedIn } from '@/lib/session';
import { readCeremonyChallenge } from '@/lib/app-lock/challenge';
import { tokenBase64Url } from '@/lib/app-lock/envelope';
import { lockAuthResponse, lockError, readJsonBody } from '@/lib/app-lock/http';
import { clampLabel } from '@/lib/app-lock/state';
import { webauthnIdentity } from '@/lib/app-lock/rp';
import { addCredential, appLockAvailable, listCredentials, lockClient } from '@/lib/app-lock/store';

export const dynamic = 'force-dynamic';

/**
 * The second half of an enrolment, and the only place a credential is ever stored.
 *
 * What the browser sent is checked against the challenge this server issued for *this*
 * account, the origin this deployment recognises, and the rp id it is configured for.
 * A credential enrolled on some other site, or replayed from an older ceremony, does
 * not get a row. The public key is kept as the bytes the verification returned, in
 * base64url, and never handed back to a browser afterwards.
 */
export async function POST(req: Request) {
  const t = getT();
  try {
    if (!appLockAvailable()) return lockError(t, 'appLock.notAvailable', 409);

    const actor = await requireSignedIn();
    const client = lockClient();
    const body = await readJsonBody(req);

    const identity = webauthnIdentity(req.headers.get('host'));
    if (!identity) return lockError(t, 'appLock.rpUnknown', 503);

    const challenge = await readCeremonyChallenge(actor.userId, Date.now());
    if (!challenge) return lockError(t, 'appLock.ceremonyExpired', 400);

    const response = body.response as RegistrationResponseJSON | undefined;
    if (!response || typeof response.id !== 'string' || !response.response?.clientDataJSON) {
      return lockError(t, 'appLock.registrationFailed', 400);
    }

    let result;
    try {
      result = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: identity.expectedOrigins,
        expectedRPID: identity.rpId,
        // The person proved who they are to the platform in order to create this key,
        // and the lock is only as strong as that promise.
        requireUserVerification: true
      });
    } catch {
      return lockError(t, 'appLock.registrationFailed', 400);
    }

    if (!result.verified || !result.registrationInfo) return lockError(t, 'appLock.registrationFailed', 400);

    const { credential, credentialDeviceType, credentialBackedUp, aaguid } = result.registrationInfo;
    const publicKey = tokenBase64Url.encode(credential.publicKey);
    if (!publicKey) return lockError(t, 'appLock.registrationFailed', 400);

    await addCredential(client, actor.userId, {
      credentialId: credential.id,
      publicKey,
      counter: credential.counter,
      // The hints live on the attestation response, not the credential the
      // verification returns: they say how to reach this device next time.
      transports: Array.isArray(response.response.transports) ? response.response.transports.map(String) : [],
      label: clampLabel(body.label),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      aaguid: aaguid || null
    });

    const stored = await listCredentials(client, actor.userId);
    return NextResponse.json({ ok: true, credentialCount: stored.length });
  } catch (err) {
    return lockAuthResponse(t, err);
  }
}

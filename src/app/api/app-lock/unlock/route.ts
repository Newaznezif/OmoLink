import { NextResponse, type NextRequest } from 'next/server';
import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from '@simplewebauthn/server';
import { getT } from '@/lib/i18n/server';
import { requireSignedIn } from '@/lib/session';
import { readCeremonyChallenge } from '@/lib/app-lock/challenge';
import { tokenBase64Url } from '@/lib/app-lock/envelope';
import { envelopeAfterStepUp, readAccountLockSettings, writeLockEnvelope } from '@/lib/app-lock/gate';
import { lockAuthResponse, lockError, readJsonBody, readString } from '@/lib/app-lock/http';
import { FREE_ATTEMPTS, coolDown, nextFailureState, usableDoors, type LockMethod } from '@/lib/app-lock/state';
import { verifyLockPassword } from '@/lib/app-lock/password';
import { appLockAvailable, listCredentials, lockClient, markCredentialUsed, recordAttempts, storedPasswordHash } from '@/lib/app-lock/store';
import { webauthnIdentity } from '@/lib/app-lock/rp';

export const dynamic = 'force-dynamic';

/**
 * The second half of an unlock. Two doors, and both are verified here, on the server:
 *
 *  - the lock password, compared against an scrypt digest this code computed;
 *  - a WebAuthn assertion, checked by `verifyAuthenticationResponse` against the
 *    challenge this server issued, the credential public key it stored at enrolment,
 *    the expected rp id and the expected origin.
 *
 * Nothing on this list is a JavaScript boolean the page sets. A browser that lies about
 * `verified` still cannot produce a signature for a challenge it never saw, and it
 * cannot mint the envelope this endpoint writes — which is the artifact the gate reads.
 *
 * The envelope written here is marked as a step-up (`s: 1` inside the signed payload).
 * That provenance is what later lets this session replace or remove the lock password, so
 * it is set only on the two paths above, after a server-side verification, and never from
 * anything in the request body.
 *
 * `lock: false` (a locked session must be able to stand at the door), but Supabase
 * decided who is asking before any of this ran.
 */
export async function POST(req: NextRequest) {
  const t = getT();
  try {
    if (!appLockAvailable()) return lockError(t, 'appLock.notAvailable', 409);

    const actor = await requireSignedIn({ lock: false });
    const client = lockClient();
    const userId = actor.userId;
    const body = await readJsonBody(req);

    const read = await readAccountLockSettings(userId);
    if (read.status === 'absent') return lockError(t, 'appLock.notAvailable', 409);
    // A read that failed is a 503, not a step-up refused: this endpoint is the door, and
    // the honest answer when the door's own lock cannot be inspected is "not now".
    if (read.status === 'error') return lockError(t, 'appLock.storeUnavailable', 503);
    let settings = read.settings;

    // The lock went off in another tab while this screen was open. Say so by writing the
    // envelope that matches, rather than pretending a step-up was needed.
    if (!settings.enabled) {
      await writeLockEnvelope({ userId, required: false, unlockedUntil: null, stepUp: false });
      return NextResponse.json({ ok: true, verdict: 'off' });
    }

    const now = Date.now();
    const waiting = coolDown(settings.lockedUntil, now);
    if (waiting.running) {
      return lockError(t, 'appLock.coolingDown', 429, { retryAfterSeconds: waiting.retryAfterSeconds });
    }

    const doors = usableDoors(settings);
    const method = readString(body, 'method', 16) as LockMethod | '';

    if (method === 'password') {
      if (!doors.password) return lockError(t, 'appLock.doorUnavailable', 400);
      const candidate = typeof body.password === 'string' ? body.password : '';
      const stored = await storedPasswordHash(client, userId);
      const matched = await verifyLockPassword(stored, candidate);

      if (!matched) {
        // One more failure, and the backoff the server decided — the browser is only
        // told how long to wait, never allowed to choose it.
        const state = nextFailureState(settings.failedAttempts, now);
        await recordAttempts(client, userId, state);
        settings = { ...settings, failedAttempts: state.failedAttempts, lockedUntil: state.lockedUntil };
        const after = coolDown(state.lockedUntil, now);
        return lockError(t, 'appLock.wrongPassword', 401, {
          retryAfterSeconds: after.retryAfterSeconds,
          attemptsLeft: Math.max(0, FREE_ATTEMPTS - state.failedAttempts)
        });
      }

      await recordAttempts(client, userId, { failedAttempts: 0, lockedUntil: null });
      await envelopeAfterStepUp(userId, settings, Date.now());
      return NextResponse.json({ ok: true, verdict: 'unlocked' });
    }

    if (method === 'webauthn') {
      if (!doors.webauthn) return lockError(t, 'appLock.doorUnavailable', 400);

      const identity = webauthnIdentity(req.headers.get('host'));
      if (!identity) return lockError(t, 'appLock.rpUnknown', 503);

      const challenge = await readCeremonyChallenge(userId, Date.now());
      if (!challenge) return lockError(t, 'appLock.ceremonyExpired', 400);

      const response = body.assertion as AuthenticationResponseJSON | undefined;
      if (!response || typeof response.id !== 'string' || !response.response?.signature) {
        return lockError(t, 'appLock.assertionFailed', 400);
      }

      const stored = (await listCredentials(client, userId)).find((credential) => credential.credentialId === response.id);
      if (!stored) return lockError(t, 'appLock.unknownCredential', 400);
      const publicKey = tokenBase64Url.decode(stored.publicKey);
      if (!publicKey) return lockError(t, 'appLock.unknownCredential', 400);

      let verified = false;
      let newCounter = stored.counter;
      try {
        const result = await verifyAuthenticationResponse({
          response,
          expectedChallenge: challenge,
          expectedOrigin: identity.expectedOrigins,
          expectedRPID: identity.rpId,
          requireUserVerification: true,
          credential: { id: stored.credentialId, publicKey, counter: stored.counter }
        });
        verified = result.verified;
        newCounter = result.authenticationInfo.newCounter;
      } catch {
        verified = false;
      }

      if (!verified) {
        // A failed assertion costs nothing against the password backoff, and that is
        // deliberate: a thumb that was merely damp should not start a cool-down. There
        // is nothing to guess here — the secret never leaves the device — so counting
        // these would only punish the account holder.
        return lockError(t, 'appLock.assertionFailed', 401);
      }

      await markCredentialUsed(client, userId, response.id, newCounter);
      await recordAttempts(client, userId, { failedAttempts: 0, lockedUntil: null });
      await envelopeAfterStepUp(userId, settings, Date.now());
      return NextResponse.json({ ok: true, verdict: 'unlocked' });
    }

    return lockError(t, 'appLock.methodUnknown', 400);
  } catch (err) {
    return lockAuthResponse(t, err);
  }
}

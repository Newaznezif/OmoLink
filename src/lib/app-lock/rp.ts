/**
 * Which relying party this WebAuthn ceremony belongs to.
 *
 * A WebAuthn credential is bound to one domain and cannot be asserted on another, so
 * this is not a cosmetic setting: getting it wrong means an enrolled phone suddenly
 * has nothing to present. Production OmoNetTab is `omo-net-tab.vercel.app`, and a
 * Vercel preview URL is a *different* rp id with its own, separate enrollments.
 *
 * `APP_LOCK_RP_ID` exists for the cases the request cannot answer — behind a custom
 * domain, or a preview whose credential should not be trusted — and it is deliberately
 * a plain (non-`NEXT_PUBLIC`) variable here: the server must decide which rp id it will
 * verify against rather than accept one a browser claims.
 */

const HOST_ONLY = /^[a-z0-9.-]+$/i;

function requestedHost(value: string | null | undefined): string | undefined {
  const raw = (value ?? '').trim().toLowerCase();
  if (!raw) return undefined;
  // A scheme, a path or a query is not a host, and reading `https://example.com` as the
  // host `https` is how an rp id becomes a string nothing recognizes.
  if (raw.includes('/') || raw.includes('?') || raw.includes('#')) return undefined;
  const parts = raw.split(':');
  if (parts.length > 2) return undefined;
  if (parts.length === 2 && !/^\d+$/.test(parts[1])) return undefined;
  const host = parts[0];
  if (!host || !HOST_ONLY.test(host)) return undefined;
  // An IP address cannot be an rp id: WebAuthn requires a domain name.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return undefined;
  if (host === 'localhost' || host.endsWith('.localhost')) return 'localhost';
  return host;
}

function csv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export type WebauthnIdentity = {
  rpId: string;
  /** Exact origins a ceremony must report. Never a wildcard. */
  expectedOrigins: string[];
  /** Friendly name stored on the credential by the platform. */
  rpName: string;
};

function identity(rpId: string): WebauthnIdentity {
  const allowed = csv(process.env.APP_LOCK_ALLOWED_ORIGINS);
  const expectedOrigins = allowed.length > 0 ? allowed : rpId === 'localhost' ? ['http://localhost:3000', 'http://localhost:3140'] : [`https://${rpId}`];

  // The request's own Origin is never added to that list. It is the value being
  // checked, and a ceremony that could name its own origin could name any other site's.
  return { rpId, expectedOrigins, rpName: 'OmoNetTab' };
}

/**
 * Resolved from the environment, with the request's own Host allowed to answer only where
 * that is safe. Returns `undefined` when no rp id can be agreed — the endpoints then refuse
 * the ceremony instead of guessing a domain and quietly enrolling a credential that can
 * never be asserted again.
 *
 * In production the environment is the *only* source. A `Host` header is data a client (or
 * anybody between the client and the app) chooses, and binding an rp id to it would mean a
 * request that names another domain could get a credential enrolled for that domain, or
 * have one verified against it. `NEXT_PUBLIC_…` is not the issue here — this file runs on
 * the server — but a missing variable is, so production refuses rather than falls back:
 * set `APP_LOCK_RP_ID` to the bare host the site is served from.
 */
export function webauthnIdentity(hostHeader: string | null | undefined): WebauthnIdentity | undefined {
  const configured = requestedHost(process.env.APP_LOCK_RP_ID);
  if (process.env.NODE_ENV === 'production') {
    // No localhost in production, and noHost either: an unconfigured production rp id is a
    // deployment gap, not something to paper over with the value in the request.
    if (!configured || configured === 'localhost') return undefined;
    return identity(configured);
  }
  const rpId = configured || requestedHost(hostHeader);
  if (!rpId) return undefined;
  return identity(rpId);
}

/** Whether the browser can even attempt a platform passkey here. */
export function webauthnSupportNote(): { rpIdConfigured: boolean; rpId: string | undefined } {
  const rpId = (process.env.APP_LOCK_RP_ID ?? '').trim().toLowerCase();
  return { rpIdConfigured: Boolean(rpId), rpId: rpId || undefined };
}

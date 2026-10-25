import 'server-only';
/**
 * Shared plumbing for the `/api/app-lock/*` endpoints.
 *
 * Every one of them answers with a translated `error` string and an honest status, and
 * every one of them refuses a request body that is not JSON. A JSON-only body is part
 * of the design, not tidiness: a cross-site `<form>` can post a session cookie with
 * `SameSite=Lax` on a top-level navigation, but it cannot set `Content-Type:
 * application/json` without a CORS preflight the site never grants. Combined with the
 * cookie attributes, that is what keeps another origin from spending someone's unlock
 * attempts or enrolling a device they never touched.
 */

import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/session';
import { LockStoreError } from '@/lib/app-lock/store';
import type { TranslationKey, Translator } from '@/lib/i18n';

export type LockBody = Record<string, unknown>;

/** The request body as an object, or `{}` when it is absent or not JSON. */
export async function readJsonBody(req: Request): Promise<LockBody> {
  if (!req.headers.get('content-type')?.includes('application/json')) return {};
  const parsed = (await req.json().catch(() => null)) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return parsed as LockBody;
}

export function lockError(t: Translator, key: TranslationKey, status: number, extra: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ error: t(key), ...extra }, { status });
}

/**
 * Turns a thrown error into its honest status.
 *
 * A `LockStoreError` is answered by what its code says: a missing table is a deployment
 * fact (409, "this lock is not available here"), and every other database failure is 503 —
 * a refusal the client may retry, not a 500 dressed up as one and not, ever, a pass.
 *
 * A database this process cannot even reach throws before there is a code to read:
 * `lockClient()` refuses a deployment with no url or no key. That is the same fact as a
 * failed query — nothing was inspected — so it gets the same 503, and it must never fall
 * through to the catch-all below.
 *
 * Anything else is reported as a failed ceremony rather than echoed, because a Supabase or
 * WebAuthn message can name a table or a column and that is not something a phone needs
 * shown.
 */
export function lockAuthResponse(t: Translator, err: unknown): NextResponse {
  if (err instanceof LockStoreError) {
    return err.schemaMissing
      ? lockError(t, 'appLock.notAvailable', 409)
      : lockError(t, 'appLock.storeUnavailable', 503);
  }
  if (err instanceof Error && err.message.includes('Supabase')) {
    return lockError(t, 'appLock.storeUnavailable', 503);
  }
  if (!(err instanceof Error && err.name === 'AuthorizationError')) {
    return NextResponse.json({ error: t('appLock.ceremonyFailed') }, { status: 500 });
  }
  const { body, status } = authErrorResponse(err, t('appLock.ceremonyFailed'));
  return NextResponse.json(body, { status });
}

export function readString(body: LockBody, key: string, max: number): string {
  const value = body[key];
  if (typeof value !== 'string') return '';
  return value.slice(0, max);
}

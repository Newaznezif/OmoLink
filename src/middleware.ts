import { NextResponse, type NextRequest } from 'next/server';
import { getDataMode } from './lib/supabase/config';
import { APP_LOCK_COOKIE, envelopeNeedsRecheck } from './lib/app-lock/state';
import { appLockSecret, lockForRequest } from './lib/app-lock/envelope';

/**
 * Where an unlocked session standing at `/unlock` is allowed to go.
 *
 * A hand-written `value.startsWith('/') && !value.startsWith('//')` is the usual way
 * this check goes wrong: a URL parser reads `/\evil.com` — and a tab before the slash —
 * as an authority, so the "relative path" is really somebody else's site. Parsing first
 * and comparing origins is the rule, and it is spelled out here rather than reused from
 * `safeNext()` in `src/lib/session.ts` because that module reads cookies and the
 * database, and this file runs on the edge.
 */
const ACCOUNT_TARGETS = ['/dashboard', '/buyer', '/admin'];

function accountTarget(req: NextRequest, value: string | null): URL {
  const home = new URL('/', req.url);
  if (typeof value !== 'string' || !value) return home;
  let target: URL;
  try {
    target = new URL(value, req.nextUrl.origin);
  } catch {
    return home;
  }
  if (target.origin !== req.nextUrl.origin) return home;
  return ACCOUNT_TARGETS.some((prefix) => target.pathname === prefix || target.pathname.startsWith(`${prefix}/`))
    ? target
    : home;
}

/**
 * The app lock's edge gate.
 *
 * It asks exactly one question, and asks it cheaply: does the envelope this browser
 * presented say "unlocked, for this account, still inside its window"? Answering it
 * needs no database and no session read, because the answer was signed by the server
 * when the step-up happened and cannot be written by anybody else.
 *
 * Deliberately narrow:
 *
 *  - Only the three account areas and the unlock screen are matched. Public pages are
 *    never touched, so a locked account can still browse, and the offline shell, the
 *    service worker and `/api/*` keep answering exactly as they did before.
 *  - `/api/app-lock/*` is not matched either. Those endpoints are how a locked session
 *    gets unlocked; gating them here would be the door locking itself from the outside.
 *  - Demo mode and an unconfigured `APP_LOCK_SECRET` return immediately. Without a
 *    secret nothing can be verified *or* minted, so enforcing here would trap people
 *    in a screen no server can open.
 *
 * Two verdicts are possible here that resolve elsewhere: `unknown` sends the session to
 * be minted from the account's own settings by `/api/app-lock/bootstrap`, and `locked`
 * sends it to the unlock screen. A verdict that has outlived the envelope's trust window
 * (`ENVELOPE_TRUST_SECONDS`) counts as `unknown` even when it reads `off` or `unlocked`:
 * that is the one moment the server re-reads the account's settings, and it is what stops
 * a lock switched on — or "lock it now" pressed — on another device from leaving this
 * browser open indefinitely. The bound is documented as
 * `MAX_POLICY_PROPAGATION_SECONDS`.
 *
 * `/unlock` is deliberately *not* sent to bootstrap when its envelope has gone stale: the
 * screen is standing at a door that has to be answered from the settings, and the page
 * reads them itself. Bouncing it would trade one gate for a loop.
 *
 * The authoritative per-request check — the one that has the verified actor and can compare
 * identities — lives in `requireArea()` and `requireRole()`, which is also where the
 * offline and direct-API cases are refused.
 */
export async function middleware(req: NextRequest) {
  if (getDataMode() !== 'supabase') return NextResponse.next();
  const secret = appLockSecret();
  if (!secret) return NextResponse.next();

  const path = req.nextUrl.pathname;
  const now = Date.now();
  const lock = await lockForRequest({
    cookieValue: req.cookies.get(APP_LOCK_COOKIE)?.value,
    secret,
    now
  });
  const recheck = envelopeNeedsRecheck(lock.envelope, now);

  // Already unlocked: the screen has nothing to offer, so send them where they came
  // from instead of letting a bookmarked /unlock sit in the way. A stale envelope does
  // not get that treatment — see the note above about why the page must answer for it.
  if (path === '/unlock') {
    if (!recheck && (lock.verdict === 'off' || lock.verdict === 'unlocked')) {
      return NextResponse.redirect(accountTarget(req, req.nextUrl.searchParams.get('next')));
    }
    return NextResponse.next();
  }

  if (lock.verdict === 'locked') {
    const url = req.nextUrl.clone();
    url.pathname = '/unlock';
    url.search = `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if (recheck) {
    const url = req.nextUrl.clone();
    url.pathname = '/api/app-lock/bootstrap';
    url.search = `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/buyer/:path*', '/admin/:path*', '/unlock']
};

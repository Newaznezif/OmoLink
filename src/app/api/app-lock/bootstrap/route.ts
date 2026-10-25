import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';
import { resolveLockForActor } from '@/lib/app-lock/gate';
import { appLockAvailable } from '@/lib/app-lock/store';

export const dynamic = 'force-dynamic';

/**
 * Mints an envelope for a session that has none worth trusting — an account that signed
 * in before this feature existed, a cleared cookie, a switched account, or an envelope
 * that has outlived its trust window.
 *
 * It grants nothing. The requirement comes from the account's own settings, an open window
 * is carried forward only while the account's policy has not moved, and the session with
 * the lock on arrives at the unlock screen rather than slipping through an endpoint that
 * was supposed to be boring.
 *
 * A settings read that *fails* is sent to the unlock screen too, not to the account area:
 * "we could not check" is not evidence that nothing needs checking. The screen is the one
 * place that says so out loud and still offers sign-out, so this endpoint can neither
 * become a way round the lock nor a loop a visitor cannot leave.
 *
 * Only same-site account paths are honoured as `next`, reusing `safeNext()` so this
 * cannot be pointed at another host.
 */
export async function GET(req: NextRequest) {
  const requested = safeNext(req.nextUrl.searchParams.get('next')) ?? '/';

  if (!appLockAvailable()) return NextResponse.redirect(new URL(requested, req.url));

  const client = supabaseServer();
  const {
    data: { user }
  } = await client.auth.getUser();

  // Nobody is signed in, as far as Supabase is concerned. Say so plainly rather than
  // minting an envelope for an account that does not exist.
  if (!user) return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(requested)}`, req.url));

  const lock = await resolveLockForActor({ userId: user.id });
  if (lock.verdict === 'locked' || lock.verdict === 'unavailable') {
    const url = req.nextUrl.clone();
    url.pathname = '/unlock';
    url.search = `?next=${encodeURIComponent(requested)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(requested, req.url));
}

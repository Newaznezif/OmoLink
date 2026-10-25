import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { envelopeForSignIn } from '@/lib/app-lock/gate';
import { landingFor, safeNext, type Actor } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Completes the email-confirmation and password-recovery redirects. Supabase
 * sends the visitor here with ?code=..., which is exchanged for a session stored
 * in auth cookies; ?next= then says where to continue.
 *
 * Only two explicit next values are trusted (/reset-password and /onboarding)
 * plus the account areas safeNext() already allows, so this endpoint cannot be
 * turned into an open redirect.
 *
 * Every redirect is relative on purpose. An absolute target needs an origin, and
 * neither candidate is trustworthy: NEXT_PUBLIC_SITE_URL is easy to leave unset on
 * a first deployment, and req.url inside a route handler reports the server's own
 * address rather than the address the visitor used — both send the visitor to a
 * dead localhost. The browser resolves a relative Location against the site it is
 * already on, and safeNext() refuses '//', so no target can become a
 * protocol-relative redirect either.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const requestedNext = url.searchParams.get('next') ?? '';

  const go = (path: string) => new NextResponse(null, { status: 302, headers: { location: path } });

  if (!code) return go('/sign-in?error=missing_code');

  const client = supabaseServer();
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) return go(`/sign-in?error=${encodeURIComponent(error.message)}`);

  // A recovery link means the old password is known to be compromised or
  // forgotten: send the visitor straight to the new-password form.
  if (requestedNext === '/reset-password') return go('/reset-password');

  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) return go('/sign-in');

  // Email confirmation is a fresh account session, so it opens the app lock the same
  // way a password sign-in does. The recovery branch above deliberately does not: a
  // visitor on the way to choosing a new password has not finished signing in.
  await envelopeForSignIn(user.id);

  const { data: row } = await client.from('profiles').select('id, role, status').eq('user_id', user.id).maybeSingle();
  const profile = row as Pick<Actor, 'role' | 'status'> | null;
  // Confirmed by email but registration never finished its profile row.
  if (!profile) return go('/onboarding');
  if (profile.status === 'suspended') return go('/access-denied?reason=suspended');
  return go(safeNext(requestedNext) ?? landingFor(profile.role as Actor['role']));
}

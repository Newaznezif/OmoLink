import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
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
 */
export async function GET(req: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const requestedNext = url.searchParams.get('next') ?? '';

  if (!code) {
    return NextResponse.redirect(new URL('/sign-in?error=missing_code', siteUrl), { status: 302 });
  }

  const client = supabaseServer();
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(error.message)}`, siteUrl), { status: 302 });
  }

  const go = (path: string) => NextResponse.redirect(new URL(path, siteUrl), { status: 302 });

  // A recovery link means the old password is known to be compromised or
  // forgotten: send the visitor straight to the new-password form.
  if (requestedNext === '/reset-password') return go('/reset-password');

  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) return go('/sign-in');

  const { data: row } = await client.from('profiles').select('id, role, status').eq('user_id', user.id).maybeSingle();
  const profile = row as Pick<Actor, 'role' | 'status'> | null;
  // Confirmed by email but registration never finished its profile row.
  if (!profile) return go('/onboarding');
  if (profile.status === 'suspended') return go('/access-denied?reason=suspended');
  return go(safeNext(requestedNext) ?? landingFor(profile.role as Actor['role']));
}

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/store';
import { getRepo } from '@/lib/repo';
import { restoreThemeFromAccount } from '@/lib/theme-server';
import { safeNext } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Demo mode has no password store, so this endpoint must refuse rather than
  // reach for Supabase credentials that are not configured.
  if (isDemoMode()) {
    return NextResponse.json(
      { error: 'This build runs in demo mode: use the sample-account picker on the sign-in page instead.' },
      { status: 400 }
    );
  }
  const form = await req.formData().catch(() => null);
  const email = String(form?.get('email') ?? '').trim();
  const password = String(form?.get('password') ?? '');
  const requestedNext = safeNext(String(form?.get('next') ?? ''));

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are both required.' }, { status: 400 });
  }

  const { data, error } = await supabaseServer().auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message ?? 'Could not sign in with those credentials.' },
      { status: 401 }
    );
  }

  // Where to land is decided from the stored profile, never from the browser.
  // No profile row means registration stopped halfway (email confirmation).
  const { data: profile } = await supabaseServer()
    .from('profiles')
    .select('id, role, status')
    .eq('user_id', data.session.user.id)
    .maybeSingle();
  const raw = profile as { role: string } | null;

  const fallback = !raw ? '/onboarding' : raw.role === 'admin' ? '/admin' : raw.role === 'buyer' ? '/buyer' : '/dashboard';

  // Read the account's saved colour scheme through the repository, which selects
  // the whole row: a database that has not had migration 0007 applied simply has no
  // theme to hand back, and the browser's own choice is left as it is. Naming the
  // column in the select above would have made this sign-in fail instead.
  const fullProfile = await getRepo().getProfileByUserId(data.session.user.id);
  restoreThemeFromAccount(fullProfile?.theme);
  // Relative target: an absolute one would have to be built from configuration
  // (easy to forget on a first deployment) or from req.url, which reports the
  // server's own address rather than the address the visitor used. Both land a
  // signed-in user on a dead localhost. requestedNext is already limited to
  // same-site paths by safeNext().
  return new NextResponse(null, { status: 303, headers: { location: requestedNext ?? fallback } });
}

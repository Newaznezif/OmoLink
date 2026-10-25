import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/store';
import { getRepo } from '@/lib/repo';
import { restoreThemeFromAccount } from '@/lib/theme-server';
import { safeNext } from '@/lib/session';
import { envelopeForSignIn } from '@/lib/app-lock/gate';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const t = getT();
  // Demo mode has no password store, so this endpoint must refuse rather than
  // reach for Supabase credentials that are not configured.
  if (isDemoMode()) {
    return NextResponse.json(
      { error: t('apiSignIn.demoMode') },
      { status: 400 }
    );
  }
  const form = await req.formData().catch(() => null);
  const email = String(form?.get('email') ?? '').trim();
  const password = String(form?.get('password') ?? '');
  const requestedNext = safeNext(String(form?.get('next') ?? ''));

  if (!email || !password) {
    return NextResponse.json({ error: t('apiSignIn.emailPasswordRequired') }, { status: 400 });
  }

  const { data, error } = await supabaseServer().auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message ?? t('apiSignIn.couldNotSignIn') },
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
  // The app lock starts its own session here, separately from Supabase's. Signing in
  // with the account password satisfies the lock for as long as the account's grant
  // lasts, and says "no lock" when the account never asked for one — so this call is
  // what makes the lock survivable when a device credential goes missing.
  await envelopeForSignIn(data.session.user.id);
  // Relative target: an absolute one would have to be built from configuration
  // (easy to forget on a first deployment) or from req.url, which reports the
  // server's own address rather than the address the visitor used. Both land a
  // signed-in user on a dead localhost. requestedNext is already limited to
  // same-site paths by safeNext().
  return new NextResponse(null, { status: 303, headers: { location: requestedNext ?? fallback } });
}

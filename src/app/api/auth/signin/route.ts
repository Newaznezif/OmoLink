import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { safeNext } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const fallback = !raw ? '/onboarding' : raw.role === 'admin' ? '/admin' : raw.role === 'buyer' ? '/buyer' : '/dashboard';
  return NextResponse.redirect(new URL(requestedNext ?? fallback, siteUrl), { status: 303 });
}

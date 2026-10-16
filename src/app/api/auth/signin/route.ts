import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get('email') ?? '').trim();
  const password = String(form?.get('password') ?? '');

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return NextResponse.redirect(new URL('/dashboard', siteUrl), { status: 303 });
}

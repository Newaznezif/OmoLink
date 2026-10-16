import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Completes the email-confirmation / PKCE flow. Supabase redirects here with
 * ?code=..., which is exchanged for a session stored in auth cookies.
 */
export async function GET(req: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const code = new URL(req.url).searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/sign-in?error=missing_code', siteUrl), { status: 302 });
  }

  const client = supabaseServer();
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(error.message)}`, siteUrl), { status: 302 });
  }
  return NextResponse.redirect(new URL('/dashboard/profile', siteUrl), { status: 302 });
}

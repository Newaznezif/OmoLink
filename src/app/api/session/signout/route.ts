import { NextResponse } from 'next/server';
import { clearSession, getSessionProfile } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const profile = await getSessionProfile();
  if (profile) {
    // In demo mode we don't have real auth to invalidate. Clearing the cookie
    // ends the session for the browser.
  }
  clearSession();
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'), {
    status: 302
  });
}

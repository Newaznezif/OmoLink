import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session';
import { isDemoMode } from '@/lib/store';
import { supabaseServer } from '@/lib/supabase/server';
import { clearLockEnvelope } from '@/lib/app-lock/gate';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (isDemoMode()) {
    // Demo sign-in is only a cookie; deleting it ends the session.
    clearSession();
  } else {
    await supabaseServer().auth.signOut();
  }
  // The app lock's envelope describes a session, not a person, so it goes when the
  // session does. Leaving it behind is how the next account to sign in on this phone
  // would inherit the previous one's unlock window.
  clearLockEnvelope();
  // Relative so the visitor returns to the origin they actually used. Building
  // an absolute URL needed either configuration or the server's own address, and
  // a wrong one of those sends a signed-out visitor to a dead localhost.
  return new NextResponse(null, { status: 302, headers: { location: '/' } });
}

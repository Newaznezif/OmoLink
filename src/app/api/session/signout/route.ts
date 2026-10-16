import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session';
import { isDemoMode } from '@/lib/store';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (isDemoMode()) {
    // Demo sign-in is only a cookie; deleting it ends the session.
    clearSession();
  } else {
    await supabaseServer().auth.signOut();
  }
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'), {
    status: 302
  });
}

import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { writeSession } from '@/lib/session';
import { restoreThemeFromAccount } from '@/lib/theme-server';
import { canSignInAsDemo, isDemoMode } from '@/lib/store';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

/**
 * Demo sign-in only. There is no role in the request or the cookie: the session
 * stores a user id, and every later request reads role and status back from the
 * stored profile. A suspended demo account can still sign in and see its own
 * data, but requireRole() blocks it from acting.
 */
export async function POST(req: Request) {
  const t = getT();
  if (!isDemoMode()) {
    return NextResponse.json(
      { error: t('apiSession.demoSignInDisabled') },
      { status: 400 }
    );
  }
  const body = (await req.json().catch(() => ({}))) as { userId?: string };
  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!canSignInAsDemo(userId)) {
    return NextResponse.json({ error: t('apiSession.unknownDemoUser') }, { status: 400 });
  }
  const profile = await getRepo().getProfileByUserId(userId);
  if (!profile) {
    return NextResponse.json({ error: t('apiSession.noProfile') }, { status: 404 });
  }
  writeSession({ userId });
  // The saved scheme travels with the account: without this, signing in on a
  // browser that has never been used here would paint the default instead.
  restoreThemeFromAccount(profile.theme);
  return NextResponse.json({
    ok: true,
    profile: { id: profile.id, displayName: profile.displayName, role: profile.role }
  });
}

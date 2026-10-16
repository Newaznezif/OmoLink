import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { requireRole, writeSession, SESSION_COOKIE } from '@/lib/session';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const DEMO_USERS = [
  { userId: 'demo_user_basket', role: 'producer' as const },
  { userId: 'demo_user_honey', role: 'producer' as const },
  { userId: 'demo_user_guide', role: 'producer' as const },
  { userId: 'demo_user_textile', role: 'producer' as const },
  { userId: 'demo_user_dairy', role: 'producer' as const },
  { userId: 'demo_user_admin', role: 'admin' as const }
];

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { userId?: string };
  const userId = body.userId;
  const candidate = DEMO_USERS.find((u) => u.userId === userId);
  if (!candidate) {
    return NextResponse.json({ error: 'Unknown demo user.' }, { status: 400 });
  }
  const repo = getRepo();
  const profile = await repo.getProfileByUserId(candidate.userId);
  if (!profile) {
    return NextResponse.json({ error: 'No profile exists for that demo account.' }, { status: 404 });
  }
  writeSession({ userId: candidate.userId, role: candidate.role });
  return NextResponse.json({ ok: true, profile: { id: profile.id, displayName: profile.displayName } });
}

export async function DELETE() {
  const session = cookies().get(SESSION_COOKIE);
  if (session) requireRole(['producer', 'buyer', 'coordinator', 'admin']);
  // Cookie deletion handled by signout route. Kept for parity.
  return NextResponse.json({ ok: true });
}

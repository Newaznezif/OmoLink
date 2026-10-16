import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const next = {
    ...profile,
    displayName: typeof body.displayName === 'string' && body.displayName.trim().length > 1 ? body.displayName.trim() : profile.displayName,
    community: typeof body.community === 'string' && body.community.trim() ? body.community.trim() : profile.community,
    operatingArea: typeof body.operatingArea === 'string' && body.operatingArea.trim() ? body.operatingArea.trim() : profile.operatingArea,
    shortBio: typeof body.shortBio === 'string' && body.shortBio.trim().length >= 20 ? body.shortBio.trim() : profile.shortBio
  };
  const saved = await getRepo().upsertProfile(next);
  return NextResponse.json({ profile: saved });
}

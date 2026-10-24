import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { requireRole } from '@/lib/session';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const t = getT();
  try {
    const actor = await requireRole('admin');
    const body = (await req.json().catch(() => ({}))) as { profileId?: string; decision?: string; reason?: string };
    if (!body.profileId || !body.reason) {
      return NextResponse.json({ error: t('apiVerification.missingFields') }, { status: 400 });
    }
    const decision = body.decision;
    if (decision !== 'approved' && decision !== 'rejected' && decision !== 'needs_more_info') {
      return NextResponse.json({ error: t('apiVerification.invalidDecision') }, { status: 400 });
    }
    const record = await getRepo().recordVerificationReview({
      profileId: body.profileId,
      // The reviewer is the signed-in account, never a value the client chose.
      reviewerProfileId: actor.profileId,
      decision,
      reason: body.reason.trim()
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('apiVerification.couldNotRecord');
    const forbidden = message.includes('authorised') || message.includes('signed in');
    return NextResponse.json({ error: message }, { status: forbidden ? 403 : 400 });
  }
}

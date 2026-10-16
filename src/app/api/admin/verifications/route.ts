import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Only authorised reviewers can record verification decisions.' }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { profileId?: string; reviewerProfileId?: string; decision?: string; reason?: string };
  if (!body.profileId || !body.reviewerProfileId || !body.reason) {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });
  }
  const decision = body.decision;
  if (decision !== 'approved' && decision !== 'rejected' && decision !== 'needs_more_info') {
    return NextResponse.json({ error: 'Invalid decision.' }, { status: 400 });
  }
  try {
    const record = await getRepo().recordVerificationReview({
      profileId: body.profileId,
      reviewerProfileId: body.reviewerProfileId,
      decision,
      reason: body.reason.trim()
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not record decision.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

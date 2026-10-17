import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { authErrorResponse, requireSignedIn } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Review submission. Everything that decides whether the review is allowed —
 * signed in, active, own inquiry, that inquiry completed, one review per
 * inquiry — is enforced again inside the repository, so a hand-made request
 * cannot skip it.
 */
export async function POST(req: Request) {
  let actor;
  try {
    actor = await requireSignedIn();
  } catch (err) {
    const { body, status } = authErrorResponse(err, 'Sign in to leave a review.');
    return NextResponse.json(body, { status });
  }

  const body = (await req.json().catch(() => ({}))) as {
    listingId?: string;
    inquiryId?: string;
    rating?: number;
    comment?: string;
  };

  const rating = Number(body.rating);
  const comment = typeof body.comment === 'string' ? body.comment : '';
  if (!body.listingId || !body.inquiryId) {
    return NextResponse.json({ error: 'The review needs a listing and an arrangement.' }, { status: 400 });
  }

  const repo = getRepo();
  // The displayed name comes from the signed-in profile, never from the request.
  const profile = await repo.getProfile(actor.profileId);
  if (!profile) return NextResponse.json({ error: 'No profile found for this account.' }, { status: 401 });

  try {
    const review = await repo.createReview({
      listingId: body.listingId,
      inquiryId: body.inquiryId,
      rating,
      comment,
      actor,
      authorName: profile.displayName
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not save the review.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

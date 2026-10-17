import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { getSessionActor } from '@/lib/session';
import type { InquiryStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ALL_STATUSES: InquiryStatus[] = [
  'new',
  'accepted',
  'awaiting_confirmation',
  'fulfillment_arranged',
  'completed',
  'cancelled'
];

/**
 * A buyer may only record what they themselves experienced: that the arrangement
 * was completed, or that they no longer want it. Acceptance and fulfilment are
 * the seller's words to say.
 */
const BUYER_STATUSES: InquiryStatus[] = ['completed', 'cancelled'];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const actor = await getSessionActor();
  if (!actor) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (actor.status === 'suspended') {
    return NextResponse.json({ error: 'This account is suspended. Contact an administrator.' }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  if (!body.status || !ALL_STATUSES.includes(body.status as InquiryStatus)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }
  const status = body.status as InquiryStatus;

  const repo = getRepo();
  // Which side of this record the caller is on is read from stored data, never
  // from the request, and an administrator is neither side.
  let side: 'buyer' | 'seller' | undefined;
  if (actor.role === 'producer' || actor.role === 'coordinator') {
    const mine = await repo.listInquiriesForSeller(actor.profileId);
    if (mine.some((i) => i.id === params.id)) side = 'seller';
  } else if (actor.role === 'buyer') {
    const mine = await repo.listInquiriesForBuyer(actor.profileId);
    if (mine.some((i) => i.id === params.id)) side = 'buyer';
  }
  if (!side) return NextResponse.json({ error: 'No such arrangement in your records.' }, { status: 404 });

  if (side === 'buyer' && !BUYER_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: 'Only the seller records acceptance or fulfilment. You can confirm completion or cancel.' },
      { status: 403 }
    );
  }

  const detail =
    side === 'buyer'
      ? `Buyer recorded this arrangement as ${status.replace(/_/g, ' ')}.`
      : `Seller changed status to ${status.replace(/_/g, ' ')}.`;

  try {
    const updated = await repo.updateInquiryStatus(params.id, status, side, detail);
    return NextResponse.json({ inquiry: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not update.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

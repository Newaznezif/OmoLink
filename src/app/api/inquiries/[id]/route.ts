import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import type { InquiryStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const producer = await getSessionProfile();
  if (!producer) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const allowed: InquiryStatus[] = ['new', 'accepted', 'awaiting_confirmation', 'fulfillment_arranged', 'completed', 'cancelled'];
  if (!body.status || !allowed.includes(body.status as InquiryStatus)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }
  const repo = getRepo();
  const all = await repo.listInquiriesForSeller(producer.id);
  if (!all.find((i) => i.id === params.id)) {
    return NextResponse.json({ error: 'Inquiry not found for your listings.' }, { status: 404 });
  }
  try {
    const updated = await repo.updateInquiryStatus(params.id, body.status as InquiryStatus, 'seller', `Status changed to ${body.status}.`);
    return NextResponse.json({ inquiry: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not update.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

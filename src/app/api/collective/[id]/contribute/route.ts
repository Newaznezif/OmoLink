import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const body = await _req.json().catch(() => ({}));
  const quantity = Number((body as { quantity?: unknown }).quantity);
  const note = typeof (body as { note?: unknown }).note === 'string' ? (body as { note: string }).note.slice(0, 500) : undefined;
  const producer = await getSessionProfile();
  if (!producer) {
    return NextResponse.json({ error: 'Sign in as a producer before contributing.' }, { status: 401 });
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Quantity must be a positive whole number.' }, { status: 400 });
  }
  try {
    const contribution = await getRepo().contribute({
      opportunityId: params.id,
      producerProfileId: producer.id,
      quantity,
      note
    });
    return NextResponse.json({ contribution }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Contribution failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

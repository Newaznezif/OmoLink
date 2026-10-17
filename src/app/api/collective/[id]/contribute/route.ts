import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { authErrorResponse, requireRole, type Actor } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const body = await _req.json().catch(() => ({}));
  const quantity = Number((body as { quantity?: unknown }).quantity);
  const note = typeof (body as { note?: unknown }).note === 'string' ? (body as { note: string }).note.slice(0, 500) : undefined;
  let actor: Actor;
  try {
    // A buyer, a suspended account or an edited session cookie never gets here.
    actor = await requireRole(['producer', 'coordinator']);
  } catch (err) {
    const { body, status } = authErrorResponse(err, 'Sign in as a producer before contributing.');
    return NextResponse.json(body, { status });
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Quantity must be a positive whole number.' }, { status: 400 });
  }
  try {
    const contribution = await getRepo().contribute({
      opportunityId: params.id,
      producerProfileId: actor.profileId,
      quantity,
      note
    });
    return NextResponse.json({ contribution }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Contribution failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

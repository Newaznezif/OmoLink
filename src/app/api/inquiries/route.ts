import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { getSessionActor } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const required = ['listingId', 'buyerName', 'buyerContact', 'quantity', 'preference', 'message'];
  for (const key of required) {
    if (!(key in input)) {
      return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 });
    }
  }
  if (typeof input.listingId !== 'string' || input.listingId.length > 200) {
    return NextResponse.json({ error: 'Invalid listing reference.' }, { status: 400 });
  }
  if (typeof input.buyerName !== 'string' || input.buyerName.length > 200) {
    return NextResponse.json({ error: 'Buyer name too long.' }, { status: 400 });
  }
  if (typeof input.buyerContact !== 'string' || input.buyerContact.length > 200) {
    return NextResponse.json({ error: 'Contact too long.' }, { status: 400 });
  }
  if (typeof input.quantity !== 'number' || !Number.isInteger(input.quantity) || input.quantity < 1) {
    return NextResponse.json({ error: 'Quantity must be a positive whole number.' }, { status: 400 });
  }
  if (!['pickup', 'delivery', 'booking', 'unsure'].includes(String(input.preference))) {
    return NextResponse.json({ error: 'Invalid preference.' }, { status: 400 });
  }
  if (typeof input.message !== 'string' || input.message.length > 4000) {
    return NextResponse.json({ error: 'Message must be under 4000 characters.' }, { status: 400 });
  }

  try {
    const repo = getRepo();
    // Signed-in buyers get the arrangement in their own records, so the link comes
    // from the session rather than from anything the browser sent.
    const actor = await getSessionActor();
    if (actor && actor.status !== 'active') {
      return NextResponse.json({ error: 'This account is suspended. Contact an administrator.' }, { status: 403 });
    }
    const buyerProfileId = actor?.role === 'buyer' ? actor.profileId : undefined;
    const inquiry = await repo.createInquiry({
      listingId: input.listingId,
      buyerName: input.buyerName,
      buyerContact: input.buyerContact,
      quantity: input.quantity,
      preference: input.preference as 'pickup' | 'delivery' | 'booking' | 'unsure',
      preferredDate: typeof input.preferredDate === 'string' ? input.preferredDate : undefined,
      message: input.message,
      buyerProfileId,
      idempotencyKey: typeof input.idempotencyKey === 'string' ? input.idempotencyKey : undefined
    });
    return NextResponse.json({ inquiry }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

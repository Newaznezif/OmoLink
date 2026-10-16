import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { parseDecimalAmount } from '@/lib/money';
import type { AvailabilityStatus, Listing, UnitOfSale } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const producer = await getSessionProfile();
  if (!producer) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const repo = getRepo();
  const existing = await repo.getListing(params.id);
  if (!existing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  if (existing.producerId !== producer.id) {
    return NextResponse.json({ error: 'You can only edit your own listing.' }, { status: 403 });
  }

  const patch: Partial<Listing> = {};
  if (typeof body.published === 'boolean' || body.published === 'true' || body.published === 'false') {
    patch.published = body.published === true || body.published === 'true';
  }
  if (typeof body.availability === 'string') {
    const allowed: AvailabilityStatus[] = ['available', 'limited', 'made_to_order', 'seasonal', 'unavailable'];
    if (!allowed.includes(body.availability as AvailabilityStatus)) {
      return NextResponse.json({ error: 'Invalid availability value.' }, { status: 400 });
    }
    patch.availability = body.availability as AvailabilityStatus;
  }
  if (typeof body.title === 'string' && body.title.trim().length >= 4) patch.title = body.title.trim();
  if (typeof body.description === 'string' && body.description.trim().length >= 20) patch.description = body.description.trim();
  if (typeof body.unitPriceEtb === 'string') {
    const cents = parseDecimalAmount(body.unitPriceEtb);
    if (cents === null || cents <= 0) return NextResponse.json({ error: 'Invalid price.' }, { status: 400 });
    patch.unitPrice = { cents, currency: 'ETB' };
  }
  if (typeof body.availableQuantity === 'string' || typeof body.availableQuantity === 'number') {
    const qty = Number(body.availableQuantity);
    if (!Number.isInteger(qty) || qty < 0) return NextResponse.json({ error: 'Invalid available quantity.' }, { status: 400 });
    patch.availableQuantity = qty;
  }
  if (typeof body.minOrderQuantity === 'string' || typeof body.minOrderQuantity === 'number') {
    const min = Number(body.minOrderQuantity);
    if (!Number.isInteger(min) || min < 1) return NextResponse.json({ error: 'Invalid minimum order quantity.' }, { status: 400 });
    patch.minOrderQuantity = min;
  }
  if (typeof body.unitOfSale === 'string') patch.unitOfSale = body.unitOfSale as UnitOfSale;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  try {
    const updated = await repo.updateListing(existing.id, patch, producer.id);
    return NextResponse.json({ listing: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

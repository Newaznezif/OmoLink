import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { authErrorResponse, requireRole, type Actor } from '@/lib/session';
import { parseDecimalAmount } from '@/lib/money';
import { makeId } from '@/lib/ids';
import { UNIT_OF_SALES, type AvailabilityStatus, type Listing, type ListingImage, type UnitOfSale } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAX_IMAGES = 6;

/**
 * Images are links to a picture hosted elsewhere: this build has no object
 * storage configured, and claiming an upload that cannot happen would be worse
 * than saying so. Consent is required because a photo of a person, a ceremony
 * or cultural property is not the seller's to publish — the record states the
 * claim, it does not verify it.
 *
 * An entry that carries the id of a picture already on this listing is kept
 * exactly as stored. That is what lets a producer delete one picture from a set
 * without re-submitting the rest, including the generated SVG placeholders whose
 * src is a data URL rather than a web address.
 */
function normalizeImages(value: unknown, existing: Listing): { images: ListingImage[] } | { error: string } {
  if (!Array.isArray(value)) return { error: 'Images must be a list.' };
  if (value.length > MAX_IMAGES) return { error: `A listing can carry at most ${MAX_IMAGES} images.` };

  const images: ListingImage[] = [];
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) return { error: 'Each image needs a link and a description.' };
    const entry = raw as Record<string, unknown>;
    const stored = existing.images.find((img) => img.id === entry.id);
    if (stored) {
      images.push(stored);
      continue;
    }

    const src = typeof entry.src === 'string' ? entry.src.trim() : '';
    const alt = typeof entry.alt === 'string' ? entry.alt.trim() : '';
    const caption = typeof entry.caption === 'string' ? entry.caption.trim() : '';

    if (!/^https?:\/\/\S+$/i.test(src)) {
      return { error: 'A new picture needs a full http(s) address. This build cannot accept uploaded files.' };
    }
    if (alt.length < 3) return { error: 'Every image needs an alt description of at least 3 characters.' };
    if (alt.length > 200 || caption.length > 200) return { error: 'Image descriptions must stay under 200 characters.' };
    if (entry.consentRecorded !== true && entry.consentRecorded !== 'true') {
      return { error: 'Confirm that you may publish this image before saving it.' };
    }

    images.push({ id: makeId('img'), listingId: existing.id, src, alt, caption, consentRecorded: true, isSample: false });
  }
  return { images };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let actor: Actor;
  try {
    actor = await requireRole(['producer', 'coordinator']);
  } catch (err) {
    const { body, status } = authErrorResponse(err, 'Not signed in.');
    return NextResponse.json(body, { status });
  }
  const producer = await getRepo().getProfile(actor.profileId);
  if (!producer) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const repo = getRepo();
  const existing = await repo.getListing(params.id);
  if (!existing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  if (existing.producerId !== producer.id) {
    return NextResponse.json({ error: 'You can only edit your own listing.' }, { status: 403 });
  }

  const patch: Partial<Listing> = {};

  // Archiving is a state change with its own repository rule (keep the inquiry
  // history, drop out of the marketplace), so it is not smuggled in as a field.
  if (body.archived === true || body.archived === 'true') {
    try {
      const archived = await repo.archiveListing(existing.id, actor);
      return NextResponse.json({ listing: archived });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not archive this listing.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (typeof body.published === 'boolean' || body.published === 'true' || body.published === 'false') {
    patch.published = body.published === true || body.published === 'true';
    // Publishing is also how a listing comes back from the archive; leaving
    // archived true would mark it "Published" while the marketplace still hid it.
    if (patch.published) patch.archived = false;
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
  if (typeof body.unitOfSale === 'string') {
    if (!UNIT_OF_SALES.includes(body.unitOfSale as UnitOfSale)) {
      return NextResponse.json({ error: 'Invalid unit of sale.' }, { status: 400 });
    }
    patch.unitOfSale = body.unitOfSale as UnitOfSale;
  }

  // Images replace the whole set, which is what both repositories implement.
  if (body.images !== undefined) {
    const images = normalizeImages(body.images, existing);
    if ('error' in images) return NextResponse.json({ error: images.error }, { status: 400 });
    patch.images = images.images;
  }

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

/**
 * Permanent removal, and deliberately the hardest thing a seller can do here:
 * the repository refuses while any inquiry record points at the listing,
 * because that record is a buyer's evidence of an arrangement.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  let actor: Actor;
  try {
    actor = await requireRole(['producer', 'coordinator']);
  } catch (err) {
    const { body, status } = authErrorResponse(err, 'Not signed in.');
    return NextResponse.json(body, { status });
  }

  const repo = getRepo();
  const existing = await repo.getListing(params.id);
  if (!existing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  if (existing.producerId !== actor.profileId) {
    return NextResponse.json({ error: 'You can only delete your own listing.' }, { status: 403 });
  }

  try {
    await repo.deleteListing(existing.id, actor);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not delete this listing.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

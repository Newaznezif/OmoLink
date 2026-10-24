import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { authErrorResponse, requireRole, type Actor } from '@/lib/session';
import { parseDecimalAmount } from '@/lib/money';
import { makeId } from '@/lib/ids';
import { getT } from '@/lib/i18n/server';
import type { Translator } from '@/lib/i18n';
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
function normalizeImages(value: unknown, existing: Listing, t: Translator): { images: ListingImage[] } | { error: string } {
  if (!Array.isArray(value)) return { error: t('apiListings.imagesMustBeList') };
  if (value.length > MAX_IMAGES) return { error: t('apiListings.imagesMax', { max: MAX_IMAGES }) };

  const images: ListingImage[] = [];
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) return { error: t('apiListings.imageNeedsLink') };
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
      return { error: t('apiListings.imageNeedsHttpAddress') };
    }
    if (alt.length < 3) return { error: t('apiListings.imageAltTooShort') };
    if (alt.length > 200 || caption.length > 200) return { error: t('apiListings.imageDescriptionTooLong') };
    if (entry.consentRecorded !== true && entry.consentRecorded !== 'true') {
      return { error: t('apiListings.imageConsentRequired') };
    }

    images.push({ id: makeId('img'), listingId: existing.id, src, alt, caption, consentRecorded: true, isSample: false });
  }
  return { images };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const t = getT();
  let actor: Actor;
  try {
    actor = await requireRole(['producer', 'coordinator']);
  } catch (err) {
    const { body, status } = authErrorResponse(err, t('apiListings.notSignedIn'));
    return NextResponse.json(body, { status });
  }
  const producer = await getRepo().getProfile(actor.profileId);
  if (!producer) return NextResponse.json({ error: t('apiListings.notSignedIn') }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const repo = getRepo();
  const existing = await repo.getListing(params.id);
  if (!existing) return NextResponse.json({ error: t('apiListings.notFound') }, { status: 404 });
  if (existing.producerId !== producer.id) {
    return NextResponse.json({ error: t('apiListings.onlyEditOwn') }, { status: 403 });
  }

  const patch: Partial<Listing> = {};

  // Archiving is a state change with its own repository rule (keep the inquiry
  // history, drop out of the marketplace), so it is not smuggled in as a field.
  if (body.archived === true || body.archived === 'true') {
    try {
      const archived = await repo.archiveListing(existing.id, actor);
      return NextResponse.json({ listing: archived });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('apiListings.archiveFailed');
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
      return NextResponse.json({ error: t('apiListings.invalidAvailability') }, { status: 400 });
    }
    patch.availability = body.availability as AvailabilityStatus;
  }
  if (typeof body.title === 'string' && body.title.trim().length >= 4) patch.title = body.title.trim();
  if (typeof body.description === 'string' && body.description.trim().length >= 20) patch.description = body.description.trim();
  if (typeof body.unitPriceEtb === 'string') {
    const cents = parseDecimalAmount(body.unitPriceEtb);
    if (cents === null || cents <= 0) return NextResponse.json({ error: t('apiListings.invalidPrice') }, { status: 400 });
    patch.unitPrice = { cents, currency: 'ETB' };
  }
  if (typeof body.availableQuantity === 'string' || typeof body.availableQuantity === 'number') {
    const qty = Number(body.availableQuantity);
    if (!Number.isInteger(qty) || qty < 0) return NextResponse.json({ error: t('apiListings.invalidAvailableQuantity') }, { status: 400 });
    patch.availableQuantity = qty;
  }
  if (typeof body.minOrderQuantity === 'string' || typeof body.minOrderQuantity === 'number') {
    const min = Number(body.minOrderQuantity);
    if (!Number.isInteger(min) || min < 1) return NextResponse.json({ error: t('apiListings.invalidMinimumQuantity') }, { status: 400 });
    patch.minOrderQuantity = min;
  }
  if (typeof body.unitOfSale === 'string') {
    if (!UNIT_OF_SALES.includes(body.unitOfSale as UnitOfSale)) {
      return NextResponse.json({ error: t('apiListings.invalidUnitOfSale') }, { status: 400 });
    }
    patch.unitOfSale = body.unitOfSale as UnitOfSale;
  }

  // Images replace the whole set, which is what both repositories implement.
  if (body.images !== undefined) {
    const images = normalizeImages(body.images, existing, t);
    if ('error' in images) return NextResponse.json({ error: images.error }, { status: 400 });
    patch.images = images.images;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: t('apiListings.nothingToUpdate') }, { status: 400 });
  }

  try {
    const updated = await repo.updateListing(existing.id, patch, producer.id);
    return NextResponse.json({ listing: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('apiListings.updateFailed');
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * Permanent removal, and deliberately the hardest thing a seller can do here:
 * the repository refuses while any inquiry record points at the listing,
 * because that record is a buyer's evidence of an arrangement.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const t = getT();
  let actor: Actor;
  try {
    actor = await requireRole(['producer', 'coordinator']);
  } catch (err) {
    const { body, status } = authErrorResponse(err, t('apiListings.notSignedIn'));
    return NextResponse.json(body, { status });
  }

  const repo = getRepo();
  const existing = await repo.getListing(params.id);
  if (!existing) return NextResponse.json({ error: t('apiListings.notFound') }, { status: 404 });
  if (existing.producerId !== actor.profileId) {
    return NextResponse.json({ error: t('apiListings.onlyDeleteOwn') }, { status: 403 });
  }

  try {
    await repo.deleteListing(existing.id, actor);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('apiListings.deleteFailed');
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

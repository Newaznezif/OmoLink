import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { makeId } from '@/lib/ids';
import { parseDecimalAmount } from '@/lib/money';
import type { AvailabilityStatus, Listing, ListingKind, UnitOfSale } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const producer = await getSessionProfile();
  if (!producer) return NextResponse.json({ error: 'Sign in as a producer first.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();
  const categoryId = String(body.categoryId ?? '').trim();
  const priceCents = parseDecimalAmount(String(body.unitPriceEtb ?? ''));
  const availableQuantity = Number(body.availableQuantity);
  const minOrderQuantity = Number(body.minOrderQuantity);
  const kind = (body.kind === 'service' ? 'service' : 'product') as ListingKind;
  const unitOfSale = String(body.unitOfSale ?? 'item') as UnitOfSale;
  const availability = String(body.availability ?? 'available') as AvailabilityStatus;
  const pickupOptions = String(body.pickupOptions ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const deliveryAvailable = body.deliveryAvailable === true || body.deliveryAvailable === 'true';
  const publish = body.publish === true || body.publish === 'true';
  const producerId = String(body.producerId ?? producer.id);

  if (producerId !== producer.id) return NextResponse.json({ error: 'You can only publish under your own profile.' }, { status: 403 });
  if (!title || !description || !categoryId || priceCents === null) {
    return NextResponse.json({ error: 'Fill in every required field with a valid price.' }, { status: 400 });
  }
  if (!Number.isInteger(availableQuantity) || availableQuantity < 0) return NextResponse.json({ error: 'Invalid available quantity.' }, { status: 400 });
  if (!Number.isInteger(minOrderQuantity) || minOrderQuantity < 1) return NextResponse.json({ error: 'Invalid minimum order quantity.' }, { status: 400 });

  const id = makeId('lst');
  const slug = makeSlug(title, id);
  const now = new Date().toISOString();
  const tourismMeta = kind === 'service' ? readTourism(body) : undefined;

  const listing: Listing = {
    id,
    slug,
    kind,
    title,
    description,
    categoryId,
    producerId,
    community: producer.community,
    unitPrice: { cents: priceCents, currency: 'ETB' },
    unitOfSale,
    availableQuantity,
    minOrderQuantity,
    availability,
    pickupOptions: pickupOptions.length > 0 ? pickupOptions : ['Agreed with producer'],
    deliveryAvailable,
    lastUpdated: now,
    createdAt: now,
    verification: producer.verification,
    published: publish,
    tourism: tourismMeta,
    images: [makePlaceholderImage(id, title)],
    isDemo: true
  };

  try {
    const saved = await getRepo().createListing(listing);
    return NextResponse.json({ listing: saved }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not create the listing.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function makeSlug(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'listing'}-${id.slice(-4)}`;
}

function readTourism(body: Record<string, unknown>): NonNullable<Listing['tourism']> | undefined {
  const t = (body.tourism ?? {}) as Record<string, unknown>;
  const packageName = String(t.packageName ?? '').trim();
  const durationHours = Number(t.durationHours);
  const groupCapacity = Number(t.groupCapacity);
  const inclusions = String(t.inclusions ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const exclusions = String(t.exclusions ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const bookingConditions = String(t.bookingConditions ?? '').trim();
  const meetingPoint = String(t.meetingPoint ?? '').trim();
  const cancellationPolicy = String(t.cancellationPolicy ?? '').trim();
  if (!packageName) return undefined;
  return {
    packageName,
    durationHours: Number.isFinite(durationHours) ? durationHours : 0,
    groupCapacity: Number.isInteger(groupCapacity) ? groupCapacity : 0,
    inclusions,
    exclusions,
    bookingConditions,
    meetingPoint,
    cancellationPolicy
  };
}

function makePlaceholderImage(listingId: string, title: string): Listing['images'][number] {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><rect width="600" height="400" fill="#dfa773"/><rect x="16" y="16" width="568" height="368" fill="none" stroke="rgba(255,255,255,0.4)" stroke-dasharray="8 6" rx="10"/><text x="50%" y="52%" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" fill="#331b0f">${escapeXml(title.slice(0, 40))}</text><text x="50%" y="62%" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#331b0f">Placeholder — sample image</text></svg>`;
  return {
    id: `img_${listingId}`,
    listingId,
    caption: 'Placeholder image generated by the demo app.',
    src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    alt: 'Placeholder illustration. Not a documentary photograph of a real product.',
    consentRecorded: true,
    isSample: true
  };
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}

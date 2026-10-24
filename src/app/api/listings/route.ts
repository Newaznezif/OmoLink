import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { authErrorResponse, requireRole, type Actor } from '@/lib/session';
import { makeId } from '@/lib/ids';
import { parseDecimalAmount } from '@/lib/money';
import { getT } from '@/lib/i18n/server';
import type { Translator } from '@/lib/i18n';
import { UNIT_OF_SALES, type AvailabilityStatus, type Listing, type ListingKind, type UnitOfSale } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const t = getT();
  let actor: Actor;
  try {
    // requireRole reads the role and the account status back from the stored
    // profile, so a buyer, a suspended account or an edited cookie cannot reach
    // this write.
    actor = await requireRole(['producer', 'coordinator']);
  } catch (err) {
    const { body, status } = authErrorResponse(err, t('apiListings.signInAsProducer'));
    return NextResponse.json(body, { status });
  }
  const producer = await getRepo().getProfile(actor.profileId);
  if (!producer) return NextResponse.json({ error: t('apiListings.signInAsProducer') }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();
  const categoryId = String(body.categoryId ?? '').trim();
  const priceCents = parseDecimalAmount(String(body.unitPriceEtb ?? ''));
  const availableQuantity = Number(body.availableQuantity);
  const minOrderQuantity = Number(body.minOrderQuantity);
  const kind = (body.kind === 'service' ? 'service' : 'product') as ListingKind;
  const unitOfSale = UNIT_OF_SALES.includes(body.unitOfSale as UnitOfSale)
    ? (body.unitOfSale as UnitOfSale)
    : 'item';
  const availability = String(body.availability ?? 'available') as AvailabilityStatus;
  const pickupOptions = String(body.pickupOptions ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const deliveryAvailable = body.deliveryAvailable === true || body.deliveryAvailable === 'true';
  const publish = body.publish === true || body.publish === 'true';
  // Ownership comes from the session, never from the request body.
  const producerId = producer.id;

  if (!title || !description || !categoryId || priceCents === null) {
    return NextResponse.json({ error: t('apiListings.fillRequired') }, { status: 400 });
  }
  if (!Number.isInteger(availableQuantity) || availableQuantity < 0) return NextResponse.json({ error: t('apiListings.invalidAvailableQuantity') }, { status: 400 });
  if (!Number.isInteger(minOrderQuantity) || minOrderQuantity < 1) return NextResponse.json({ error: t('apiListings.invalidMinimumQuantity') }, { status: 400 });

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
    images: [makePlaceholderImage(id, title, t)],
    isDemo: true
  };

  try {
    const saved = await getRepo().createListing(listing);
    return NextResponse.json({ listing: saved }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('apiListings.createFailed');
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

function makePlaceholderImage(listingId: string, title: string, t: Translator): Listing['images'][number] {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><rect width="600" height="400" fill="#dfa773"/><rect x="16" y="16" width="568" height="368" fill="none" stroke="rgba(255,255,255,0.4)" stroke-dasharray="8 6" rx="10"/><text x="50%" y="52%" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" fill="#331b0f">${escapeXml(title.slice(0, 40))}</text><text x="50%" y="62%" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#331b0f">${t('apiPlaceholder.sampleCaption')}</text></svg>`;
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

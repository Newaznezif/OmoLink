import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { getSessionActor } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import { Badge, Card, CardBody, Empty, SampleTag, Section, VerificationLabel } from '@/components/ui';
import { ListingCard } from '@/components/listing-card';
import { InquiryForm } from '@/components/inquiry-form';
import { QrCode } from '@/components/qr-code';
import { ReportListingButton } from '@/components/report-listing';
import { ListingReviews } from '@/components/listing-reviews';

export const dynamic = 'force-dynamic';

export default async function ListingPage({ params }: { params: { id: string } }) {
  const repo = getRepo();
  const listing = await repo.getListing(params.id);
  if (!listing || !listing.published) notFound();
  const producer = await repo.getProfile(listing.producerId);
  const category = (await repo.listCategories()).find((c) => c.id === listing.categoryId);
  const related = await repo.relatedListings(listing);
  const profiles = await repo.listPublicProfiles();
  const producerById = new Map(profiles.map((p) => [p.id, p]));
  const actor = await getSessionActor();
  const buyerRecordsPath = actor && actor.role === 'buyer' && actor.status === 'active' ? '/buyer/inquiries' : undefined;

  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/listings/${listing.id}`;

  return (
    <>
      <Section
        eyebrow={category?.name ?? 'Listing'}
        title={listing.title}
        actions={
          <>
            <VerificationLabel status={listing.verification} isDemo={listing.isDemo} />
            {listing.isDemo && <SampleTag />}
          </>
        }
      >
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="space-y-6">
            <Card>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={listing.images[0]?.src} alt={listing.images[0]?.alt ?? listing.title} className="w-full aspect-[4/3] object-cover" />
            </Card>
            <Card>
              <CardBody>
                <h2 className="font-semibold text-ink-900 mb-2">Description</h2>
                <p className="whitespace-pre-line text-ink-700">{listing.description}</p>
              </CardBody>
            </Card>

            {listing.kind === 'service' && listing.tourism && <TourismMeta meta={listing.tourism} />}

            <Card>
              <CardBody>
                <h2 className="font-semibold text-ink-900 mb-3">Pricing and stock</h2>
                <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                  <Info label="Unit price" value={<strong>{formatMoney(listing.unitPrice)}</strong>} />
                  <Info label="Unit of sale" value={listing.unitOfSale} />
                  <Info label="Available quantity" value={`${listing.availableQuantity} ${listing.unitOfSale}`} />
                  <Info label="Minimum order" value={`${listing.minOrderQuantity} ${listing.unitOfSale}`} />
                  <Info label="Availability" value={<AvailabilityText listing={listing} />} />
                  <Info label="Delivery" value={listing.deliveryAvailable ? 'Available on request' : 'Not offered'} />
                  <Info label="Last updated" value={new Date(listing.lastUpdated).toDateString()} />
                </dl>
                <p className="mt-3 text-xs text-ink-500">
                  Prices are shown per unit in Ethiopian Birr (ETB) with no hidden fees. Any transport or coordination
                  cost is arranged separately and always disclosed.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="font-semibold text-ink-900 mb-2">Pickup options</h2>
                <ul className="list-disc pl-5 text-sm text-ink-700 space-y-1">
                  {listing.pickupOptions.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            {related.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-ink-900 mb-3">Related listings</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {related.map((l) => (
                    <ListingCard key={l.id} listing={l} producer={producerById.get(l.producerId)} />
                  ))}
                </div>
              </div>
            )}
            <ListingReviews listingId={listing.id} producerName={producer?.displayName ?? 'the seller'} />
        </div>

          <aside className="space-y-4">
            <Card>
              <CardBody>
                <h2 className="font-semibold text-ink-900">Send an inquiry</h2>
                <p className="text-sm text-ink-700 mt-1">
                  This submits an inquiry, not a confirmed sale. The producer will respond with pickup or delivery
                  details and payment arrangements. Nothing here is a payment.
                </p>
              </CardBody>
            </Card>
            <InquiryForm
              recordsPath={buyerRecordsPath}
              listing={{
                id: listing.id,
                title: listing.title,
                unitPriceCents: listing.unitPrice.cents,
                unitOfSale: listing.unitOfSale,
                minOrderQuantity: listing.minOrderQuantity,
                availableQuantity: listing.availableQuantity,
                availability: listing.availability
              }}
            />
            {producer && (
              <Card>
                <CardBody>
                  <h2 className="font-semibold text-ink-900 mb-2">About the producer</h2>
                  <Link href={`/producers/${producer.id}`} className="font-semibold text-clay-800 underline">
                    {producer.displayName}
                  </Link>
                  <p className="text-sm text-ink-700 mt-1">{producer.community}</p>
                  <p className="text-sm text-ink-700 mt-2">{producer.shortBio}</p>
                  <div className="mt-2">
                    <VerificationLabel status={producer.verification} isDemo={producer.isDemo} />
                  </div>
                </CardBody>
              </Card>
            )}
            <Card>
              <CardBody>
                <h2 className="font-semibold text-ink-900 mb-2">Share this listing</h2>
                <p className="text-sm text-ink-700 mb-3">
                  Scan the QR with another phone to open the same public listing. QR codes link to real public URLs —
                  never to a private contact or a fabricated verification certificate.
                </p>
                <QrCode value={publicUrl} size={180} label="QR for this listing URL" />
                <div className="mt-2 break-all text-xs text-ink-500">{publicUrl}</div>
              </CardBody>
            </Card>
            <ReportListingButton listingId={listing.id} />
          </aside>
        </div>
      </Section>

      {listing.availability === 'unavailable' && (
        <Section>
          <Empty
            title="Currently unavailable"
            body="The producer marked this listing as unavailable. You can still send an inquiry to be notified when it becomes available again."
          />
        </Section>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-ink-900 font-medium">{value}</dd>
    </div>
  );
}

function AvailabilityText({ listing }: { listing: { availability: 'available' | 'limited' | 'made_to_order' | 'seasonal' | 'unavailable' } }) {
  const map = { available: 'Available', limited: 'Limited stock', made_to_order: 'Made to order', seasonal: 'Seasonal', unavailable: 'Unavailable' } as const;
  return <Badge tone={listing.availability === 'unavailable' ? 'danger' : 'neutral'}>{map[listing.availability]}</Badge>;
}

function TourismMeta({ meta }: { meta: NonNullable<import('@/lib/types').Listing['tourism']> }) {
  return (
    <Card>
      <CardBody>
        <h2 className="font-semibold text-ink-900 mb-3">Experience details</h2>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <Info label="Package" value={meta.packageName} />
          <Info label="Duration" value={`${meta.durationHours} hours`} />
          <Info label="Group capacity" value={`${meta.groupCapacity} people`} />
          <Info label="Meeting point" value={meta.meetingPoint} />
        </dl>
        <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold text-ink-900 mb-1">Inclusions</h3>
            <ul className="list-disc pl-5 text-ink-700 space-y-0.5">
              {meta.inclusions.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-ink-900 mb-1">Exclusions</h3>
            <ul className="list-disc pl-5 text-ink-700 space-y-0.5">
              {meta.exclusions.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 text-sm">
          <h3 className="font-semibold text-ink-900 mb-1">Booking conditions</h3>
          <p className="text-ink-700">{meta.bookingConditions}</p>
          <h3 className="font-semibold text-ink-900 mt-3 mb-1">Cancellation</h3>
          <p className="text-ink-700">{meta.cancellationPolicy}</p>
        </div>
      </CardBody>
    </Card>
  );
}

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { getSessionActor } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';
import { SampleTag, VerificationLabel } from '@/components/status-labels';
import { ListingCard } from '@/components/listing-card';
import { InquiryForm } from '@/components/inquiry-form';
import { QrCode } from '@/components/qr-code';
import { ReportListingButton } from '@/components/report-listing';
import { ListingReviews } from '@/components/listing-reviews';
import { getLanguage, getT } from '@/lib/i18n/server';
import { categoryTexts, listingTexts } from '@/lib/i18n/catalog';

export const dynamic = 'force-dynamic';

export default async function ListingPage({ params }: { params: { id: string } }) {
  const t = getT();
  const lang = getLanguage();
  const repo = getRepo();
  const listing = await repo.getListing(params.id);
  if (!listing || !listing.published) notFound();
  const copy = listingTexts(lang, listing);
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
        eyebrow={category ? categoryTexts(lang, category).name.text : t('listing.eyebrowFallback')}
        title={copy.title.text}
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
              <img src={listing.images[0]?.src} alt={listing.images[0]?.alt ?? copy.title.text} className="w-full aspect-[4/3] object-cover" />
              {listing.images.length > 1 && (
                <ul className="grid grid-cols-3 gap-2 p-3">
                  {listing.images.slice(1).map((img) => (
                    <li key={img.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.src} alt={img.alt} className="w-full aspect-square object-cover rounded-lg border border-ink-100" />
                      <p className="mt-1 text-xs text-ink-500">{img.caption || img.alt}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <CardBody>
                <h2 className="font-semibold text-ink-900 mb-2">{t('listing.descriptionTitle')}</h2>
                <p className="whitespace-pre-line text-ink-700">{copy.description.text}</p>
              </CardBody>
            </Card>

            {listing.kind === 'service' && listing.tourism && <TourismMeta meta={listing.tourism} />}

            <Card>
              <CardBody>
                <h2 className="font-semibold text-ink-900 mb-3">{t('listing.pricingTitle')}</h2>
                <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                  <Info label={t('listing.unitPrice')} value={<strong>{formatMoney(listing.unitPrice)}</strong>} />
                  <Info label={t('listing.unitOfSale')} value={listing.unitOfSale} />
                  <Info label={t('listing.availableQuantity')} value={`${listing.availableQuantity} ${listing.unitOfSale}`} />
                  <Info label={t('listing.minimumOrder')} value={`${listing.minOrderQuantity} ${listing.unitOfSale}`} />
                  <Info label={t('listing.availabilityLabel')} value={<AvailabilityText listing={listing} />} />
                  <Info
                    label={t('listing.delivery')}
                    value={listing.deliveryAvailable ? t('listing.deliveryOnRequest') : t('listing.deliveryNotOffered')}
                  />
                  <Info label={t('listing.lastUpdated')} value={new Date(listing.lastUpdated).toDateString()} />
                </dl>
                <p className="mt-3 text-xs text-ink-500">{t('listing.priceNote')}</p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="font-semibold text-ink-900 mb-2">{t('listing.pickupTitle')}</h2>
                <ul className="list-disc pl-5 text-sm text-ink-700 space-y-1">
                  {listing.pickupOptions.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            {related.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-ink-900 mb-3">{t('listing.relatedTitle')}</h2>
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
                <h2 className="font-semibold text-ink-900">{t('listing.inquiryTitle')}</h2>
                <p className="text-sm text-ink-700 mt-1">{t('listing.inquiryIntro')}</p>
              </CardBody>
            </Card>
            <InquiryForm
              lang={lang}
              recordsPath={buyerRecordsPath}
              listing={{
                id: listing.id,
                title: copy.title.text,
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
                  <h2 className="font-semibold text-ink-900 mb-2">{t('listing.producerTitle')}</h2>
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
                <h2 className="font-semibold text-ink-900 mb-2">{t('listing.shareTitle')}</h2>
                <p className="text-sm text-ink-700 mb-3">{t('listing.shareBody')}</p>
                <QrCode value={publicUrl} size={180} label={t('listing.shareQrAria')} />
                <div className="mt-2 break-all text-xs text-ink-500">{publicUrl}</div>
              </CardBody>
            </Card>
            <ReportListingButton listingId={listing.id} lang={lang} />
          </aside>
        </div>
      </Section>

      {listing.availability === 'unavailable' && (
        <Section>
          <Empty title={t('listing.unavailableTitle')} body={t('listing.unavailableBody')} />
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
  const t = getT();
  const map = {
    available: t('status.available'),
    limited: t('status.limitedStock'),
    made_to_order: t('status.madeToOrder'),
    seasonal: t('status.seasonal'),
    unavailable: t('status.unavailable')
  } as const;
  return <Badge tone={listing.availability === 'unavailable' ? 'danger' : 'neutral'}>{map[listing.availability]}</Badge>;
}

function TourismMeta({ meta }: { meta: NonNullable<import('@/lib/types').Listing['tourism']> }) {
  const t = getT();
  return (
    <Card>
      <CardBody>
        <h2 className="font-semibold text-ink-900 mb-3">{t('listing.experienceTitle')}</h2>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <Info label={t('listing.package')} value={meta.packageName} />
          <Info label={t('listing.duration')} value={t('listing.durationHours', { hours: meta.durationHours })} />
          <Info label={t('listing.groupCapacity')} value={t('listing.groupPeople', { count: meta.groupCapacity })} />
          <Info label={t('listing.meetingPoint')} value={meta.meetingPoint} />
        </dl>
        <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold text-ink-900 mb-1">{t('listing.inclusions')}</h3>
            <ul className="list-disc pl-5 text-ink-700 space-y-0.5">
              {meta.inclusions.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-ink-900 mb-1">{t('listing.exclusions')}</h3>
            <ul className="list-disc pl-5 text-ink-700 space-y-0.5">
              {meta.exclusions.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 text-sm">
          <h3 className="font-semibold text-ink-900 mb-1">{t('listing.bookingConditions')}</h3>
          <p className="text-ink-700">{meta.bookingConditions}</p>
          <h3 className="font-semibold text-ink-900 mt-3 mb-1">{t('listing.cancellation')}</h3>
          <p className="text-ink-700">{meta.cancellationPolicy}</p>
        </div>
      </CardBody>
    </Card>
  );
}

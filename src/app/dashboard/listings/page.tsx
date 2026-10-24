import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { formatMoney } from '@/lib/money';
import { getLanguage, getT } from '@/lib/i18n/server';
import { t as translate, type TranslationKey } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';
import { VerificationLabel } from '@/components/status-labels';
import { ListingLifecycleActions } from '@/components/listing-actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('nav.myListings'),
    description: t('myListings.metaDescription')
  };
}

const AVAILABILITY_KEY: Record<
  'available' | 'limited' | 'made_to_order' | 'seasonal' | 'unavailable',
  TranslationKey
> = {
  available: 'status.available',
  limited: 'status.limitedOption',
  made_to_order: 'status.madeToOrder',
  seasonal: 'status.seasonal',
  unavailable: 'status.unavailable'
};

export default async function DashboardListingsPage() {
  const t = getT();
  const lang = getLanguage();
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  const [listings, inquiries] = await Promise.all([
    repo.listListingsByProducer(actor.profileId),
    repo.listInquiriesForSeller(actor.profileId)
  ]);
  const sorted = [...listings].sort((a, b) => (a.lastUpdated < b.lastUpdated ? 1 : -1));
  const inquiriesByListing = new Map<string, number>();
  for (const i of inquiries) {
    inquiriesByListing.set(i.listingId, (inquiriesByListing.get(i.listingId) ?? 0) + 1);
  }

  const publishedCount = sorted.filter((l) => l.published && !l.archived).length;

  return (
    <Section
      eyebrow={t('myListings.eyebrow')}
      title={t('nav.myListings')}
      description={t('myListings.sectionDescription')}
      actions={
        <Link href="/dashboard/listings/new" className="inline-flex bg-clay-700 text-white font-semibold px-4 py-2 rounded-lg">
          {t('myListings.newListing')}
        </Link>
      }
    >
      {sorted.length === 0 ? (
        <Empty
          title={t('myListings.emptyTitle')}
          body={t('myListings.emptyBody')}
        />
      ) : (
        <>
          <p className="text-sm text-ink-500">
            {t('myListings.visibleCount', { published: publishedCount, total: sorted.length })}
          </p>
          <ul className="space-y-3 mt-2">
            {sorted.map((l) => {
              const linkedInquiries = inquiriesByListing.get(l.id) ?? 0;
              return (
                <li key={l.id}>
                  <Card>
                    <CardBody>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <Link href={`/listings/${l.id}`} className="text-lg font-semibold hover:underline">
                            {l.title}
                          </Link>
                          <div className="text-sm text-ink-500">
                            {t('myListings.priceLine', { price: formatMoney(l.unitPrice), unit: l.unitOfSale, quantity: l.availableQuantity })}
                            {l.minOrderQuantity > 1 ? t('myListings.minimumSuffix', { count: l.minOrderQuantity }) : ''}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge tone={l.archived ? 'neutral' : l.published ? 'success' : 'warning'}>
                            {l.archived ? t('myListings.badgeArchived') : l.published ? t('myListings.badgePublished') : t('myListings.badgeDraft')}
                          </Badge>
                          <VerificationLabel status={l.verification} isDemo={l.isDemo} />
                          <AvailabilityBadge lang={lang} availability={l.availability} />
                          {linkedInquiries > 0 && <Badge tone="info">{t('myListings.inquiryCountBadge', { count: linkedInquiries })}</Badge>}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/listings/${l.id}`}
                          className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm font-semibold hover:bg-clay-50"
                        >
                          {t('myListings.edit')}
                        </Link>
                        <Link
                          href={`/dashboard/inquiries?listing=${l.id}`}
                          className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm font-semibold hover:bg-clay-50"
                        >
                          {t('myListings.inquiriesForListing')}
                        </Link>
                      </div>
                      <ListingLifecycleActions lang={lang} listing={l} inquiryCount={linkedInquiries} />
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('myListings.rulesTitle')}</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>
              <strong>{t('myListings.termPublish')}</strong>{t('myListings.bodyPublish')}
            </li>
            <li>
              <strong>{t('myListings.termUnpublish')}</strong>{t('myListings.bodyUnpublish')}
            </li>
            <li>
              <strong>{t('myListings.termArchive')}</strong>{t('myListings.bodyArchive')}
            </li>
            <li>
              <strong>{t('myListings.termDelete')}</strong>{t('myListings.bodyDelete')}
            </li>
            <li>
              <strong>{t('listing.availabilityLabel')}</strong>{t('myListings.bodyAvailability')}
            </li>
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            {t('myListings.serverCheckNote')}
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}

function AvailabilityBadge({ lang, availability }: { lang: LanguageCode; availability: 'available' | 'limited' | 'made_to_order' | 'seasonal' | 'unavailable' }) {
  const tone = availability === 'unavailable' ? 'danger' : availability === 'limited' || availability === 'seasonal' ? 'warning' : 'neutral';
  return <Badge tone={tone}>{translate(lang, AVAILABILITY_KEY[availability])}</Badge>;
}

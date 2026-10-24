import { notFound } from 'next/navigation';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { getLanguage, getT } from '@/lib/i18n/server';
import { Section } from '@/components/ui';
import { ListingForm, type ListingFormValues } from '@/components/listing-form';
import { ListingImages } from '@/components/listing-images';

export const dynamic = 'force-dynamic';

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const t = getT();
  const lang = getLanguage();
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  const listing = await repo.getListing(params.id);
  if (!listing) notFound();
  if (listing.producerId !== actor.profileId) {
    return (
      <Section eyebrow={t('listingForm.notAllowedEyebrow')} title={t('listingForm.notAllowedTitle')}>
        <p className="text-ink-700">{t('listingForm.notAllowedBody')}</p>
      </Section>
    );
  }
  const categories = await repo.listCategories();
  const initial: Partial<ListingFormValues> = {
    kind: listing.kind,
    title: listing.title,
    description: listing.description,
    categoryId: listing.categoryId,
    unitPriceEtb: (listing.unitPrice.cents / 100).toFixed(2),
    unitOfSale: listing.unitOfSale,
    availableQuantity: String(listing.availableQuantity),
    minOrderQuantity: String(listing.minOrderQuantity),
    availability: listing.availability,
    pickupOptions: listing.pickupOptions.join('\n'),
    deliveryAvailable: listing.deliveryAvailable,
    publish: listing.published,
    tourism: listing.tourism
      ? {
          packageName: listing.tourism.packageName,
          durationHours: String(listing.tourism.durationHours),
          groupCapacity: String(listing.tourism.groupCapacity),
          inclusions: listing.tourism.inclusions.join(', '),
          exclusions: listing.tourism.exclusions.join(', '),
          bookingConditions: listing.tourism.bookingConditions,
          meetingPoint: listing.tourism.meetingPoint,
          cancellationPolicy: listing.tourism.cancellationPolicy
        }
      : undefined
  };
  return (
    <Section eyebrow={t('myListings.eyebrow')} title={t('listingForm.editTitle', { title: listing.title })}>
      <ListingForm lang={lang} categories={categories} producerId={actor.profileId} initial={initial} listingId={listing.id} />
      <ListingImages lang={lang} listing={listing} />
    </Section>
  );
}

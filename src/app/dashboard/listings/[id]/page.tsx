import { notFound } from 'next/navigation';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { parseDecimalAmount } from '@/lib/money';
import { Section } from '@/components/ui';
import { ListingForm, type ListingFormValues } from '@/components/listing-form';

export const dynamic = 'force-dynamic';

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const repo = getRepo();
  const listing = await repo.getListing(params.id);
  if (!listing) notFound();
  if (listing.producerId !== profile.id) {
    return (
      <Section eyebrow="Authorization required" title="You cannot edit this listing">
        <p className="text-ink-700">This listing belongs to another producer. Only its creator can edit it.</p>
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
  void parseDecimalAmount;
  return (
    <Section eyebrow="Dashboard" title={`Edit “${listing.title}”`}>
      <ListingForm categories={categories} producerId={profile.id} initial={initial} listingId={listing.id} />
    </Section>
  );
}

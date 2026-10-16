import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { Section } from '@/components/ui';
import { ListingForm } from '@/components/listing-form';

export const dynamic = 'force-dynamic';

export default async function NewListingPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const categories = await getRepo().listCategories();
  return (
    <Section
      eyebrow="Dashboard"
      title="Create a listing"
      description="Publish a product or service. Drafts are saved on this device so you can finish them offline. Prices, quantity and availability update the moment you publish."
    >
      <ListingForm categories={categories} producerId={profile.id} />
    </Section>
  );
}

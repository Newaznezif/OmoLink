import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { getLanguage, getT } from '@/lib/i18n/server';
import { Section } from '@/components/ui';
import { ListingForm } from '@/components/listing-form';

export const dynamic = 'force-dynamic';

export default async function NewListingPage() {
  const t = getT();
  const lang = getLanguage();
  const profile = await getSessionProfile();
  if (!profile) return null;
  const categories = await getRepo().listCategories();
  return (
    <Section
      eyebrow={t('myListings.eyebrow')}
      title={t('listingForm.newTitle')}
      description={t('listingForm.newDescription')}
    >
      <ListingForm lang={lang} categories={categories} producerId={profile.id} />
    </Section>
  );
}

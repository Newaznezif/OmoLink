import { getRepo } from '@/lib/repo';
import { AdminSection } from '@/components/admin-shell';
import { Button, Card, CardBody, Field, Input, Textarea } from '@/components/ui';
import { HOMEPAGE_SECTIONS, type HomepageSectionId, type SiteSettings } from '@/lib/types';
import { getT } from '@/lib/i18n/server';
import type { TranslationKey } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const SECTION_LABELS: Record<HomepageSectionId, { label: TranslationKey; hint: TranslationKey }> = {
  hero: { label: 'homepageAdmin.headline', hint: 'homepageAdmin.hintHero' },
  search: { label: 'homepageAdmin.labelSearch', hint: 'homepageAdmin.hintSearch' },
  featured_products: { label: 'homepageAdmin.labelFeaturedProducts', hint: 'homepageAdmin.hintFeaturedProducts' },
  featured_tourism: { label: 'home.featuredTourismTitle', hint: 'homepageAdmin.hintFeaturedTourism' },
  categories: { label: 'homepageAdmin.labelCategories', hint: 'homepageAdmin.hintCategories' },
  producer_highlights: { label: 'home.producersTitle', hint: 'homepageAdmin.hintProducerHighlights' },
  collective: { label: 'nav.groupOrders', hint: 'homepageAdmin.hintCollective' },
  team: { label: 'nav.team', hint: 'homepageAdmin.hintTeam' },
  how_it_works: { label: 'nav.how', hint: 'homepageAdmin.hintHowItWorks' },
  trust: { label: 'homepageAdmin.labelTrust', hint: 'homepageAdmin.hintTrust' }
};

export default async function AdminHomepagePage({
  searchParams
}: {
  searchParams: { status?: string | string[]; error?: string | string[] };
}) {
  const t = getT();
  const repo = getRepo();
  const [settings, listings, profiles] = await Promise.all([
    repo.getSiteSettings(),
    repo.listPublicListings(),
    repo.listPublicProfiles()
  ]);

  const position = (id: HomepageSectionId) => {
    const index = settings.homepageSections.findIndex((s) => s.id === id);
    return index < 0 ? (HOMEPAGE_SECTIONS.indexOf(id) + 1) * 10 : (index + 1) * 10;
  };
  const isVisible = (id: HomepageSectionId) => settings.homepageSections.find((s) => s.id === id)?.visible ?? true;
  const products = listings.filter((l) => l.kind === 'product');
  const services = listings.filter((l) => l.kind === 'service');

  return (
    <AdminSection
      title={t('nav.homepage')}
      description={t('homepageAdmin.description')}
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('homepageAdmin.headline')}</h2>
          <form method="post" action="/api/admin/homepage" className="mt-3 grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Field label={t('listingForm.titleLabel')} htmlFor="heroTitle" required hint={t('homepageAdmin.titleHint')}>
                <Input id="heroTitle" name="heroTitle" defaultValue={settings.heroTitle} maxLength={120} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label={t('listing.descriptionTitle')} htmlFor="heroDescription">
                <Textarea id="heroDescription" name="heroDescription" defaultValue={settings.heroDescription} maxLength={600} />
              </Field>
            </div>

            <div className="md:col-span-2 border-t border-ink-100 pt-4">
              <h3 className="font-semibold text-ink-900">{t('homepageAdmin.sections')}</h3>
              <p className="mt-1 text-sm text-ink-700">
                {t('homepageAdmin.sectionsNote')}
              </p>
              <ul className="mt-3 space-y-2">
                {HOMEPAGE_SECTIONS.map((id) => (
                  <li key={id} className="grid md:grid-cols-[1fr_auto_auto] gap-3 items-center border-b border-ink-100 pb-2">
                    <label htmlFor={`section_${id}`} className="text-sm font-semibold text-ink-900">
                      {t(SECTION_LABELS[id].label)}
                      <span className="block font-normal text-ink-500">{t(SECTION_LABELS[id].hint)}</span>
                    </label>
                    <label htmlFor={`section_${id}`} className="flex items-center gap-2 text-sm">
                      <input
                        id={`section_${id}`}
                        name={`section_${id}`}
                        type="checkbox"
                        value="on"
                        defaultChecked={isVisible(id)}
                        className="h-4 w-4"
                      />
                      {t('homepageAdmin.show')}
                    </label>
                    <label htmlFor={`order_${id}`} className="flex items-center gap-2 text-sm">
                      <span className="text-ink-500">{t('homepageAdmin.position')}</span>
                      <Input id={`order_${id}`} name={`order_${id}`} type="number" step="1" defaultValue={String(position(id))} className="w-24" />
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <FeaturedGroup
              legend={t('homepageAdmin.labelFeaturedProducts')}
              name="featuredProduct"
              selected={settings.featuredProductIds}
              options={products.map((l) => ({ id: l.id, label: l.title }))}
              note={t('homepageAdmin.noteFeaturedProducts')}
            />
            <FeaturedGroup
              legend={t('homepageAdmin.legendFeaturedServices')}
              name="featuredService"
              selected={settings.featuredServiceIds}
              options={services.map((l) => ({ id: l.id, label: l.title }))}
              note={t('homepageAdmin.noteFeaturedServices')}
            />
            <div className="md:col-span-2">
              <FeaturedGroup
                legend={t('home.producersTitle')}
                name="featuredProducer"
                selected={settings.featuredProducerIds}
                options={profiles.map((p) => ({ id: p.id, label: `${p.displayName} — ${p.community}` }))}
                note={t('homepageAdmin.noteProducerHighlights')}
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit">{t('homepageAdmin.save')}</Button>
              <p className="text-xs text-ink-500">{t('homepageAdmin.savedNote')}</p>
            </div>
          </form>
        </CardBody>
      </Card>
    </AdminSection>
  );
}

function FeaturedGroup({
  legend,
  name,
  selected,
  options,
  note
}: {
  legend: string;
  name: string;
  selected: SiteSettings['featuredProductIds'];
  options: { id: string; label: string }[];
  note: string;
}) {
  const t = getT();
  return (
    <fieldset className="md:col-span-1 border border-ink-100 rounded-xl p-3">
      <legend className="px-1 text-sm font-semibold text-ink-900">{legend}</legend>
      {options.length === 0 ? (
        <p className="text-sm text-ink-500">{t('homepageAdmin.emptyFeatured')}</p>
      ) : (
        <ul className="mt-1 max-h-56 overflow-y-auto space-y-1 text-sm">
          {options.map((option) => (
            <li key={option.id}>
              <label htmlFor={`${name}-${option.id}`} className="flex items-start gap-2">
                <input
                  id={`${name}-${option.id}`}
                  name={name}
                  type="checkbox"
                  value={option.id}
                  defaultChecked={selected.includes(option.id)}
                  className="mt-1 h-4 w-4"
                />
                <span>{option.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-ink-500">{note}</p>
    </fieldset>
  );
}

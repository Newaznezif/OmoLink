import { getRepo } from '@/lib/repo';
import { AdminSection } from '@/components/admin-shell';
import { Button, Card, CardBody, Field, Input, Textarea } from '@/components/ui';
import { HOMEPAGE_SECTIONS, type HomepageSectionId, type SiteSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SECTION_LABELS: Record<HomepageSectionId, { label: string; hint: string }> = {
  hero: { label: 'Headline', hint: 'Title, description and the browse buttons.' },
  search: { label: 'Search box', hint: 'Sends the visitor to /explore with the query.' },
  featured_products: { label: 'Featured products', hint: 'Highlighted listings, newest first if none are chosen.' },
  featured_tourism: { label: 'Tourism services', hint: 'Guides and experiences.' },
  categories: { label: 'Category grid', hint: 'Only categories that are visible to shoppers.' },
  producer_highlights: { label: 'Producer highlights', hint: 'Selling profiles.' },
  collective: { label: 'Group orders', hint: 'Open collective opportunities and the explainer.' },
  how_it_works: { label: 'How it works', hint: 'Three-step explanation of the inquiry flow.' },
  trust: { label: 'Trust and consent', hint: 'Verification, consent and sample-data statements.' }
};

export default async function AdminHomepagePage({
  searchParams
}: {
  searchParams: { status?: string | string[]; error?: string | string[] };
}) {
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
      title="Homepage"
      description="What visitors see first. Everything on this page is stored, so a text change does not need a code change or a redeploy."
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Headline</h2>
          <form method="post" action="/api/admin/homepage" className="mt-3 grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Field label="Title" htmlFor="heroTitle" required hint="Plain text. HTML typed here is displayed literally, never rendered.">
                <Input id="heroTitle" name="heroTitle" defaultValue={settings.heroTitle} maxLength={120} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Description" htmlFor="heroDescription">
                <Textarea id="heroDescription" name="heroDescription" defaultValue={settings.heroDescription} maxLength={600} />
              </Field>
            </div>

            <div className="md:col-span-2 border-t border-ink-100 pt-4">
              <h3 className="font-semibold text-ink-900">Sections</h3>
              <p className="mt-1 text-sm text-ink-700">
                Tick to show. The position number sets the order — lower comes first, and ties keep the alphabetical
                order of the section names.
              </p>
              <ul className="mt-3 space-y-2">
                {HOMEPAGE_SECTIONS.map((id) => (
                  <li key={id} className="grid md:grid-cols-[1fr_auto_auto] gap-3 items-center border-b border-ink-100 pb-2">
                    <label htmlFor={`section_${id}`} className="text-sm font-semibold text-ink-900">
                      {SECTION_LABELS[id].label}
                      <span className="block font-normal text-ink-500">{SECTION_LABELS[id].hint}</span>
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
                      Show
                    </label>
                    <label htmlFor={`order_${id}`} className="flex items-center gap-2 text-sm">
                      <span className="text-ink-500">Position</span>
                      <Input id={`order_${id}`} name={`order_${id}`} type="number" step="1" defaultValue={String(position(id))} className="w-24" />
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <FeaturedGroup
              legend="Featured products"
              name="featuredProduct"
              selected={settings.featuredProductIds}
              options={products.map((l) => ({ id: l.id, label: l.title }))}
              note="Choose up to a few. Anything not chosen falls back to the newest published listings."
            />
            <FeaturedGroup
              legend="Featured tourism services"
              name="featuredService"
              selected={settings.featuredServiceIds}
              options={services.map((l) => ({ id: l.id, label: l.title }))}
              note="Only published services are listed."
            />
            <div className="md:col-span-2">
              <FeaturedGroup
                legend="Producer highlights"
                name="featuredProducer"
                selected={settings.featuredProducerIds}
                options={profiles.map((p) => ({ id: p.id, label: `${p.displayName} — ${p.community}` }))}
                note="Selling profiles only; buyer accounts are private and never listed."
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit">Save homepage</Button>
              <p className="text-xs text-ink-500">Saved immediately to the site-settings record and audited.</p>
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
  return (
    <fieldset className="md:col-span-1 border border-ink-100 rounded-xl p-3">
      <legend className="px-1 text-sm font-semibold text-ink-900">{legend}</legend>
      {options.length === 0 ? (
        <p className="text-sm text-ink-500">Nothing published to choose from yet.</p>
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

import { getRepo } from '@/lib/repo';
import type { Category, Listing, ListingKind, Profile } from '@/lib/types';
import { getLanguage, getT } from '@/lib/i18n/server';
import { categoryTexts } from '@/lib/i18n/catalog';
import type { TranslationKey } from '@/lib/i18n';
import { ListingCard } from '@/components/listing-card';
import { Empty, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export type MarketplaceProps = {
  searchParams?: Record<string, string | string[] | undefined>;
  kind?: ListingKind;
  titleKey: TranslationKey;
  eyebrowKey: TranslationKey;
  descriptionKey: TranslationKey;
};

export async function MarketplaceView({ searchParams, kind, titleKey, eyebrowKey, descriptionKey }: MarketplaceProps) {
  const t = getT();
  const repo = getRepo();
  const [listings, profiles, categories] = await Promise.all([
    repo.listPublicListings(),
    repo.listPublicProfiles(),
    repo.listCategories()
  ]);

  const q = typeof searchParams?.q === 'string' ? searchParams.q.trim().toLowerCase() : '';
  const cat = typeof searchParams?.category === 'string' ? searchParams.category : '';
  const loc = typeof searchParams?.location === 'string' ? searchParams.location.trim().toLowerCase() : '';
  const sort = typeof searchParams?.sort === 'string' ? searchParams.sort : 'newest';
  const minPriceRaw = typeof searchParams?.min === 'string' ? Number(searchParams.min) : NaN;
  const maxPriceRaw = typeof searchParams?.max === 'string' ? Number(searchParams.max) : NaN;
  const avail = typeof searchParams?.availability === 'string' ? searchParams.availability : '';

  const producerById = new Map<string, Profile>(profiles.map((p) => [p.id, p]));

  let filtered = listings.filter((l) => (kind ? l.kind === kind : true));
  if (q) {
    filtered = filtered.filter((l) => {
      const producer = producerById.get(l.producerId);
      return (
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.community.toLowerCase().includes(q) ||
        (producer?.displayName.toLowerCase().includes(q) ?? false)
      );
    });
  }
  if (cat) filtered = filtered.filter((l) => l.categoryId === cat);
  if (loc) filtered = filtered.filter((l) => l.community.toLowerCase().includes(loc));
  if (avail) filtered = filtered.filter((l) => l.availability === avail);
  if (Number.isFinite(minPriceRaw)) filtered = filtered.filter((l) => l.unitPrice.cents / 100 >= minPriceRaw);
  if (Number.isFinite(maxPriceRaw)) filtered = filtered.filter((l) => l.unitPrice.cents / 100 <= maxPriceRaw);

  filtered = sortListings(filtered, sort);

  return (
    <Section eyebrow={t(eyebrowKey)} title={t(titleKey)} description={t(descriptionKey)}>
      <FilterBar listings={listings} categories={categories} searchParams={searchParams ?? {}} kind={kind} />
      {filtered.length === 0 ? (
        <Empty title={t('market.emptyTitle')} body={t('market.emptyBody')} />
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0">
          {filtered.map((l) => (
            <li key={l.id}>
              <ListingCard listing={l} producer={producerById.get(l.producerId)} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function sortListings(listings: Listing[], sort: string): Listing[] {
  const arr = [...listings];
  switch (sort) {
    case 'price_asc':
      return arr.sort((a, b) => a.unitPrice.cents - b.unitPrice.cents);
    case 'price_desc':
      return arr.sort((a, b) => b.unitPrice.cents - a.unitPrice.cents);
    case 'updated':
      return arr.sort((a, b) => (a.lastUpdated < b.lastUpdated ? 1 : -1));
    case 'newest':
    default:
      return arr.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
}

function FilterBar({
  listings,
  categories,
  searchParams,
  kind
}: {
  listings: Listing[];
  categories: Category[];
  searchParams: Record<string, string | string[] | undefined>;
  kind?: ListingKind;
}) {
  const t = getT();
  const lang = getLanguage();
  const relevantCategories = categories.filter((c) => {
    if (!kind) return true;
    if (c.kind === 'both') return true;
    return c.kind === kind;
  });
  const locations = Array.from(new Set(listings.map((l) => l.community)));
  const activeCategory = typeof searchParams.category === 'string' ? searchParams.category : '';
  const activeQ = typeof searchParams.q === 'string' ? searchParams.q : '';
  const activeLocation = typeof searchParams.location === 'string' ? searchParams.location : '';
  const activeSort = typeof searchParams.sort === 'string' ? searchParams.sort : 'newest';
  const activeAvailability = typeof searchParams.availability === 'string' ? searchParams.availability : '';
  const activeMin = typeof searchParams.min === 'string' ? searchParams.min : '';
  const activeMax = typeof searchParams.max === 'string' ? searchParams.max : '';

  return (
    <form
      method="get"
      className="mb-6 grid md:grid-cols-6 gap-3 bg-white border border-ink-100 rounded-2xl p-4"
      aria-label={t('market.filtersAria')}
    >
      <div className="md:col-span-2">
        <label htmlFor="q" className="block text-xs font-semibold text-ink-700 mb-1">
          {t('filter.search')}
        </label>
        <input id="q" name="q" type="search" defaultValue={activeQ} className="w-full rounded-lg border border-ink-100 px-3 py-2 min-h-11" />
      </div>
      <div>
        <label htmlFor="category" className="block text-xs font-semibold text-ink-700 mb-1">
          {t('filter.category')}
        </label>
        <select id="category" name="category" defaultValue={activeCategory} className="w-full rounded-lg border border-ink-100 px-3 py-2 min-h-11">
          <option value="">{t('common.any')}</option>
          {relevantCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryTexts(lang, c).name.text}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="location" className="block text-xs font-semibold text-ink-700 mb-1">
          {t('filter.community')}
        </label>
        <select id="location" name="location" defaultValue={activeLocation} className="w-full rounded-lg border border-ink-100 px-3 py-2 min-h-11">
          <option value="">{t('common.any')}</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="availability" className="block text-xs font-semibold text-ink-700 mb-1">
          {t('listing.availabilityLabel')}
        </label>
        <select
          id="availability"
          name="availability"
          defaultValue={activeAvailability}
          className="w-full rounded-lg border border-ink-100 px-3 py-2 min-h-11"
        >
          <option value="">{t('common.any')}</option>
          <option value="available">{t('status.available')}</option>
          <option value="limited">{t('status.limitedOption')}</option>
          <option value="made_to_order">{t('status.madeToOrder')}</option>
          <option value="seasonal">{t('status.seasonal')}</option>
          <option value="unavailable">{t('status.unavailable')}</option>
        </select>
      </div>
      <div>
        <label htmlFor="sort" className="block text-xs font-semibold text-ink-700 mb-1">
          {t('filter.sort')}
        </label>
        <select id="sort" name="sort" defaultValue={activeSort} className="w-full rounded-lg border border-ink-100 px-3 py-2 min-h-11">
          <option value="newest">{t('filter.sortNewest')}</option>
          <option value="updated">{t('filter.sortUpdated')}</option>
          <option value="price_asc">{t('filter.sortPriceAsc')}</option>
          <option value="price_desc">{t('filter.sortPriceDesc')}</option>
        </select>
      </div>
      <div>
        <label htmlFor="min" className="block text-xs font-semibold text-ink-700 mb-1">
          {t('filter.minPrice')}
        </label>
        <input id="min" name="min" inputMode="decimal" defaultValue={activeMin} className="w-full rounded-lg border border-ink-100 px-3 py-2 min-h-11" />
      </div>
      <div>
        <label htmlFor="max" className="block text-xs font-semibold text-ink-700 mb-1">
          {t('filter.maxPrice')}
        </label>
        <input id="max" name="max" inputMode="decimal" defaultValue={activeMax} className="w-full rounded-lg border border-ink-100 px-3 py-2 min-h-11" />
      </div>
      <div className="md:col-span-6 flex gap-2 flex-wrap">
        <button type="submit" className="bg-clay-700 text-white font-semibold rounded-lg px-4 py-2 min-h-11">
          {t('filter.apply')}
        </button>
        <a href={kind ? `/${kind}` : '/explore'} className="border border-ink-100 rounded-lg px-4 py-2 min-h-11 font-semibold text-ink-700">
          {t('filter.reset')}
        </a>
      </div>
    </form>
  );
}

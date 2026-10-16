import { getRepo } from '@/lib/repo';
import type { Category, Listing, ListingKind, Profile } from '@/lib/types';
import { ListingCard } from '@/components/listing-card';
import { Empty, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export type MarketplaceProps = {
  searchParams?: Record<string, string | string[] | undefined>;
  kind?: ListingKind;
  title: string;
  eyebrow: string;
  description: string;
};

export async function MarketplaceView({ searchParams, kind, title, eyebrow, description }: MarketplaceProps) {
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
    <Section eyebrow={eyebrow} title={title} description={description}>
      <FilterBar listings={listings} categories={categories} searchParams={searchParams ?? {}} kind={kind} />
      {filtered.length === 0 ? (
        <Empty
          title="No listings match your filters"
          body="Try clearing a filter or broadening the search. All listings on this build are sample data."
        />
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
      aria-label="Filter listings"
    >
      <div className="md:col-span-2">
        <label htmlFor="q" className="block text-xs font-semibold text-ink-700 mb-1">
          Search
        </label>
        <input id="q" name="q" type="search" defaultValue={activeQ} className="w-full rounded-lg border border-ink-100 px-3 py-2 min-h-11" />
      </div>
      <div>
        <label htmlFor="category" className="block text-xs font-semibold text-ink-700 mb-1">
          Category
        </label>
        <select id="category" name="category" defaultValue={activeCategory} className="w-full rounded-lg border border-ink-100 px-3 py-2 min-h-11">
          <option value="">Any</option>
          {relevantCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="location" className="block text-xs font-semibold text-ink-700 mb-1">
          Community
        </label>
        <select id="location" name="location" defaultValue={activeLocation} className="w-full rounded-lg border border-ink-100 px-3 py-2 min-h-11">
          <option value="">Any</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="availability" className="block text-xs font-semibold text-ink-700 mb-1">
          Availability
        </label>
        <select
          id="availability"
          name="availability"
          defaultValue={activeAvailability}
          className="w-full rounded-lg border border-ink-100 px-3 py-2 min-h-11"
        >
          <option value="">Any</option>
          <option value="available">Available</option>
          <option value="limited">Limited</option>
          <option value="made_to_order">Made to order</option>
          <option value="seasonal">Seasonal</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>
      <div>
        <label htmlFor="sort" className="block text-xs font-semibold text-ink-700 mb-1">
          Sort
        </label>
        <select id="sort" name="sort" defaultValue={activeSort} className="w-full rounded-lg border border-ink-100 px-3 py-2 min-h-11">
          <option value="newest">Newest</option>
          <option value="updated">Recently updated</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>
      <div>
        <label htmlFor="min" className="block text-xs font-semibold text-ink-700 mb-1">
          Min ETB
        </label>
        <input id="min" name="min" inputMode="decimal" defaultValue={activeMin} className="w-full rounded-lg border border-ink-100 px-3 py-2 min-h-11" />
      </div>
      <div>
        <label htmlFor="max" className="block text-xs font-semibold text-ink-700 mb-1">
          Max ETB
        </label>
        <input id="max" name="max" inputMode="decimal" defaultValue={activeMax} className="w-full rounded-lg border border-ink-100 px-3 py-2 min-h-11" />
      </div>
      <div className="md:col-span-6 flex gap-2 flex-wrap">
        <button type="submit" className="bg-clay-700 text-white font-semibold rounded-lg px-4 py-2 min-h-11">
          Apply filters
        </button>
        <a href={kind ? `/${kind}` : '/explore'} className="border border-ink-100 rounded-lg px-4 py-2 min-h-11 font-semibold text-ink-700">
          Reset
        </a>
      </div>
    </form>
  );
}

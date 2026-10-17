import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { Badge, Button, Card, CardBody, Empty, Field, Input, Select, Section, VerificationLabel } from '@/components/ui';
import { ProducerCard } from '@/components/producer-card';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export const metadata = {
  title: 'Sellers and guides',
  description: 'Browse the producers, artisan groups and local guides who list on OmoNETAB.'
};

export default async function ProducersPage({ searchParams }: { searchParams?: SearchParams }) {
  const text = (key: string): string => {
    const value = searchParams?.[key];
    return typeof value === 'string' ? value : '';
  };
  const repo = getRepo();
  const [profiles, listings, categories, groups] = await Promise.all([
    repo.listPublicProfiles(),
    repo.listPublicListings(),
    repo.listCategories(),
    repo.listGroups()
  ]);

  const q = text('q').trim().toLowerCase();
  const categoryId = text('category');
  const verifiedOnly = text('verification') === 'verified';
  const groupOnly = text('type') === 'group';

  const listingCount = new Map<string, number>();
  const kindsByProducer = new Map<string, Set<string>>();
  for (const l of listings) {
    listingCount.set(l.producerId, (listingCount.get(l.producerId) ?? 0) + 1);
    const set = kindsByProducer.get(l.producerId) ?? new Set<string>();
    set.add(l.kind);
    kindsByProducer.set(l.producerId, set);
  }
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const rows = profiles.filter((p) => {
    if (verifiedOnly && p.verification !== 'verified') return false;
    if (groupOnly && !['producer_group', 'cooperative'].includes(p.producerType)) return false;
    if (categoryId && !p.categories.includes(categoryId)) return false;
    if (!q) return true;
    return [p.displayName, p.community, p.operatingArea, p.shortBio, p.organizationName ?? '']
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  return (
    <Section
      eyebrow="Marketplace"
      title="Sellers, groups and guides"
      description="Accounts that chose to publish a profile. Each card opens what that account lists, where it works and how it asks to be contacted. Profiles here are sample records until a real producer registers."
    >
      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <Field label="Search name, community or what they make" htmlFor="q">
              <Input id="q" name="q" defaultValue={text('q')} />
            </Field>
            <Field label="Category" htmlFor="category">
              <Select id="category" name="category" defaultValue={categoryId}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Account type" htmlFor="type">
              <Select id="type" name="type" defaultValue={text('type')}>
                <option value="">Anyone who sells</option>
                <option value="group">Groups and cooperatives</option>
              </Select>
            </Field>
            <Field label="Verification" htmlFor="verification">
              <Select id="verification" name="verification" defaultValue={text('verification')}>
                <option value="">Any status</option>
                <option value="verified">Verified only</option>
              </Select>
            </Field>
            <div className="md:col-span-4 flex flex-wrap items-end gap-2">
              <Button type="submit" size="sm">
                Apply filters
              </Button>
              <Link
                href="/producers"
                className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-9 text-sm font-semibold inline-flex items-center"
              >
                Clear
              </Link>
              <p className="text-sm text-ink-500">
                {rows.length} of {profiles.length} {profiles.length === 1 ? 'profile matches' : 'profiles match'}
              </p>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty
          title="No profile matches those filters"
          body="Try clearing the category or the verification filter. Nothing is added to this list to fill the space."
          action={
            <Link href="/producers" className="underline font-semibold text-clay-700">
              Show everyone
            </Link>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => (
            <div key={p.id}>
              <ProducerCard producer={p} />
              <div className="mt-1 px-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                <VerificationLabel status={p.verification} isDemo={p.isDemo} />
                <span>
                  {listingCount.get(p.id) ?? 0} {listingCount.get(p.id) === 1 ? 'listing' : 'listings'}
                </span>
                {categoryId && categoryById.get(categoryId) && <Badge tone="info">{categoryById.get(categoryId)!.name}</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-bold text-ink-900">Groups and cooperatives</h2>
        <p className="mt-1 text-sm text-ink-500">
          A group is how several producers pool quantity for one buyer order. Membership counts are sample data until a
          coordinator registers a real group.
        </p>
        {groups.length === 0 ? (
          <p className="mt-3 text-sm text-ink-700">No group has been registered yet.</p>
        ) : (
          <ul className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => {
              const members = profiles.filter((p) => g.memberProfileIds.includes(p.id));
              return (
                <li key={g.id}>
                  <Card className="h-full">
                    <CardBody>
                      <h3 className="font-semibold text-ink-900">{g.name}</h3>
                      <p className="text-sm text-ink-500">{g.community}</p>
                      <p className="mt-2 text-sm text-ink-700">{g.description}</p>
                      <p className="mt-2 text-sm text-ink-700">
                        {members.length > 0
                          ? `Published members: ${members.map((m) => m.displayName).join(', ')}`
                          : 'No member publishes a profile yet.'}
                      </p>
                      <p className="mt-2 text-xs text-ink-500">
                        <Link href="/collective-orders" className="underline font-semibold text-clay-700">
                          Open group orders
                        </Link>
                      </p>
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-6 text-sm text-ink-700">
        Selling something yourself?{' '}
        <Link href="/register" className="underline font-semibold text-clay-700">
          Create an account
        </Link>{' '}
        and choose a selling account type, or read{' '}
        <Link href="/how-it-works" className="underline font-semibold text-clay-700">
          how OmoNETAB works
        </Link>
        .
      </p>
    </Section>
  );
}

import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { AdminSection, BackField, ConfirmField } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Empty, Input, Select } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import type { Listing } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const text = (key: string): string => (typeof searchParams[key] === 'string' ? (searchParams[key] as string) : '');
  const repo = getRepo();
  const [listings, profiles, categories] = await Promise.all([
    repo.listAllListings(),
    repo.listAllProfiles(),
    repo.listAllCategories()
  ]);

  const q = text('q').trim().toLowerCase();
  const state = text('state');
  const categoryId = text('category');
  const producerById = new Map(profiles.map((p) => [p.id, p]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const rows = listings.filter((l) => {
    if (categoryId && l.categoryId !== categoryId) return false;
    if (state === 'published' && !(l.published && !l.archived)) return false;
    if (state === 'unpublished' && (l.published || l.archived)) return false;
    if (state === 'archived' && !l.archived) return false;
    if (!q) return true;
    return [l.title, l.community, producerById.get(l.producerId)?.displayName ?? ''].join(' ').toLowerCase().includes(q);
  });

  return (
    <AdminSection
      title="Listing moderation"
      description="Published, unpublished and archived records. Unpublishing hides a listing from shoppers without deleting the producer’s work or its inquiry history."
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <div>
              <label htmlFor="q" className="block text-sm font-semibold text-ink-900 mb-1">
                Search title, community or producer
              </label>
              <Input id="q" name="q" defaultValue={text('q')} />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-semibold text-ink-900 mb-1">
                State
              </label>
              <Select id="state" name="state" defaultValue={state}>
                <option value="">All</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-ink-900 mb-1">
                Category
              </label>
              <Select id="category" name="category" defaultValue={categoryId}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.active === false ? ' (hidden)' : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="rounded-lg bg-clay-700 text-white px-4 py-2 min-h-11 font-semibold">
                Apply
              </button>
              <Link href="/admin/listings" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold">
                Clear
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty title="No listing matches" body="Try clearing the filters. Nothing here is generated as a placeholder." />
      ) : (
        <div className="space-y-3">
          {rows.map((listing) => (
            <ModerationRow
              key={listing.id}
              listing={listing}
              producerName={producerById.get(listing.producerId)?.displayName ?? listing.producerId}
              categoryName={categoryById.get(listing.categoryId)?.name ?? listing.categoryId}
            />
          ))}
        </div>
      )}
    </AdminSection>
  );
}

function ModerationRow({
  listing,
  producerName,
  categoryName
}: {
  listing: Listing;
  producerName: string;
  categoryName: string;
}) {
  const visible = listing.published && !listing.archived;
  return (
    <Card>
      <CardBody className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink-900">{listing.title}</h3>
            {visible ? <Badge tone="success">published</Badge> : listing.archived ? <Badge tone="neutral">archived</Badge> : <Badge tone="warning">unpublished</Badge>}
            {listing.featured && <Badge tone="info">homepage</Badge>}
            {listing.kind === 'service' ? <Badge tone="neutral">tourism service</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {producerName} · {categoryName} · {formatMoney(listing.unitPrice)} per {listing.unitOfSale} ·{' '}
            {listing.availability} · {listing.availableQuantity} available
          </p>
          <p className="mt-1 text-sm text-ink-700 line-clamp-2">{listing.description}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <Link href={`/listings/${listing.id}`} className="underline font-semibold text-clay-700">
              Open public page
            </Link>
          </div>
        </div>

        <form method="post" action="/api/admin/listings" className="lg:w-72 shrink-0 space-y-2">
          <BackField path="/admin/listings" />
          <input type="hidden" name="listingId" value={listing.id} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="action" value={listing.featured ? 'unfeature' : 'feature'} size="sm" variant="secondary">
              {listing.featured ? 'Remove from homepage' : 'Feature on homepage'}
            </Button>
            {listing.published ? (
              <Button type="submit" name="action" value="unpublish" size="sm" variant="secondary">
                Unpublish
              </Button>
            ) : (
              <Button type="submit" name="action" value="publish" size="sm">
                Publish
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-start">
            <ConfirmField id={`confirm-${listing.id}`} label="Confirm archive or delete" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="action" value="archive" size="sm" variant="danger">
              Archive
            </Button>
            <Button type="submit" name="action" value="delete" size="sm" variant="danger">
              Delete
            </Button>
          </div>
          <p className="text-xs text-ink-500">
            Delete is refused while inquiries are attached; archiving keeps the history.
          </p>
        </form>
      </CardBody>
    </Card>
  );
}

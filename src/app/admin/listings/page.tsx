import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { AdminSection, BackField, ConfirmField } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Empty, Input, Select } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { getT } from '@/lib/i18n/server';
import type { Listing } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const t = getT();
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
      title={t('moderation.title')}
      description={t('moderation.description')}
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <div>
              <label htmlFor="q" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('moderation.searchLabel')}
              </label>
              <Input id="q" name="q" defaultValue={text('q')} />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('opportunityForm.stateLabel')}
              </label>
              <Select id="state" name="state" defaultValue={state}>
                <option value="">{t('reports.allOptions')}</option>
                <option value="published">{t('myListings.badgePublished')}</option>
                <option value="unpublished">{t('moderation.stateUnpublished')}</option>
                <option value="archived">{t('myListings.badgeArchived')}</option>
              </Select>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('filter.category')}
              </label>
              <Select id="category" name="category" defaultValue={categoryId}>
                <option value="">{t('producers.allCategories')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.active === false ? t('moderation.categoryHiddenSuffix') : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="rounded-lg bg-clay-700 text-white px-4 py-2 min-h-11 font-semibold">
                {t('buyerInquiries.apply')}
              </button>
              <Link href="/admin/listings" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold">
                {t('common.clear')}
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty title={t('moderation.emptyTitle')} body={t('moderation.emptyBody')} />
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
  const t = getT();
  const visible = listing.published && !listing.archived;
  return (
    <Card>
      <CardBody className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink-900">{listing.title}</h3>
            {visible ? <Badge tone="success">{t('buyerProfile.statusPublished')}</Badge> : listing.archived ? <Badge tone="neutral">{t('listingReports.badgeArchived')}</Badge> : <Badge tone="warning">{t('moderation.badgeUnpublished')}</Badge>}
            {listing.featured && <Badge tone="info">{t('moderation.badgeHomepage')}</Badge>}
            {listing.kind === 'service' ? <Badge tone="neutral">{t('moderation.badgeTourismService')}</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {producerName} · {categoryName} · {t('moderation.pricePerUnit', { price: formatMoney(listing.unitPrice), unit: listing.unitOfSale })} ·{' '}
            {listing.availability} · {t('moderation.quantityAvailable', { count: listing.availableQuantity })}
          </p>
          <p className="mt-1 text-sm text-ink-700 line-clamp-2">{listing.description}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <Link href={`/listings/${listing.id}`} className="underline font-semibold text-clay-700">
              {t('moderation.openPublicPage')}
            </Link>
          </div>
        </div>

        <form method="post" action="/api/admin/listings" className="lg:w-72 shrink-0 space-y-2">
          <BackField path="/admin/listings" />
          <input type="hidden" name="listingId" value={listing.id} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="action" value={listing.featured ? 'unfeature' : 'feature'} size="sm" variant="secondary">
              {listing.featured ? t('moderation.featureOff') : t('moderation.featureOn')}
            </Button>
            {listing.published ? (
              <Button type="submit" name="action" value="unpublish" size="sm" variant="secondary">
                {t('listingActions.unpublish')}
              </Button>
            ) : (
              <Button type="submit" name="action" value="publish" size="sm">
                {t('listingActions.publish')}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-start">
            <ConfirmField id={`confirm-${listing.id}`} label={t('moderation.confirmArchiveDelete')} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="action" value="archive" size="sm" variant="danger">
              {t('listingActions.archive')}
            </Button>
            <Button type="submit" name="action" value="delete" size="sm" variant="danger">
              {t('listingActions.delete')}
            </Button>
          </div>
          <p className="text-xs text-ink-500">
            {t('moderation.deleteRefusedNote')}
          </p>
        </form>
      </CardBody>
    </Card>
  );
}

import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { AdminSection } from '@/components/admin-shell';
import { Badge, Card, CardBody, Empty } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

const INQUIRY_STATES = [
  'new',
  'accepted',
  'awaiting_confirmation',
  'fulfillment_arranged',
  'completed',
  'cancelled'
] as const;

export default async function AdminAnalyticsPage() {
  const t = getT();
  const repo = getRepo();
  const [stats, admin, listings, categories, opportunities, inquiries, profiles] = await Promise.all([
    repo.aggregateStats(),
    repo.adminStats(),
    repo.listAllListings(),
    repo.listAllCategories(),
    repo.listOpportunities(),
    repo.listAllInquiries(),
    repo.listAllProfiles()
  ]);

  const publicListings = listings.filter((l) => l.published && !l.archived);
  const estimatedValueCents = inquiries
    .filter((i) => i.status !== 'cancelled')
    .reduce((total, i) => total + i.estimatedSubtotalCents, 0);

  const byCategory = categories
    .map((category) => ({
      name: category.name,
      total: listings.filter((l) => l.categoryId === category.id).length,
      visible: publicListings.filter((l) => l.categoryId === category.id).length
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const byCommunity = [...new Set(publicListings.map((l) => l.community).filter(Boolean))]
    .map((community) => ({
      community,
      count: publicListings.filter((l) => l.community === community).length
    }))
    .sort((a, b) => b.count - a.count || a.community.localeCompare(b.community));

  const inquiryRows = INQUIRY_STATES.map((state) => ({ state, count: inquiries.filter((i) => i.status === state).length }));

  return (
    <AdminSection
      title={t('analytics.title')}
      description={t('analytics.description')}
    >
      {isDemoMode() && (
        <p className="rounded-lg border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-800">
          <strong>{t('analytics.demoTitle')}</strong> {t('analytics.demoBody')}
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('analytics.catalogue')}</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <Row label={t('analytics.listingsStored')} value={listings.length} />
              <Row label={t('analytics.visibleInMarketplace')} value={publicListings.length} />
              <Row label={t('analytics.unpublishedByProducer')} value={listings.filter((l) => !l.published && !l.archived).length} />
              <Row label={t('myListings.badgeArchived')} value={admin.archivedListings} />
              <Row label={t('analytics.promotedOnHomepage')} value={listings.filter((l) => l.featured).length} />
              <Row label={t('footer.tourismServices')} value={publicListings.filter((l) => l.kind === 'service').length} />
              <Row label={t('analytics.categoriesInUse')} value={byCategory.filter((c) => c.total > 0).length} />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('nav.accounts')}</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <Row label={t('analytics.profilesStored')} value={profiles.length} />
              <Row label={t('analytics.sellingAccounts')} value={admin.byRole.producer} />
              <Row label={t('analytics.groupCoordinators')} value={admin.byRole.coordinator} />
              <Row label={t('analytics.buyersAndTourists')} value={admin.byRole.buyer} />
              <Row label={t('analytics.administrators')} value={admin.byRole.admin} />
              <Row label={t('accountSettings.statusSuspended')} value={admin.suspended} />
              <Row label={t('impact.verifiedProfiles')} value={stats.verified} />
              <Row label={t('analytics.awaitingVerification')} value={admin.pendingVerifications} />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('nav.arrangements')}</h2>
            <p className="mt-1 text-xs text-ink-500">
              {t('analytics.arrangementsNote')}
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {inquiryRows.map((row) => (
                <li key={row.state} className="flex justify-between">
                  <span className="text-ink-500">{t(`inquiries.statusWord.${row.state}`)}</span>
                  <span className="font-semibold text-ink-900">{row.count}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 text-sm border-t border-ink-100 pt-2">
              <Row label={t('analytics.totalRecorded')} value={inquiries.length} />
              <Row
                label={t('analytics.buyerEstimateSum')}
                value={formatMoney({ cents: estimatedValueCents, currency: 'ETB' })}
                hint={t('analytics.buyerEstimateHint')}
              />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('nav.groupOrders')}</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <Row label={t('analytics.opportunitiesStored')} value={opportunities.length} />
              <Row label={t('analytics.openOrClosingSoon')} value={admin.openOpportunities} />
              <Row label={t('analytics.quantityContributed')} value={stats.collectiveContributed} />
              <Row label={t('analytics.quantityTargeted')} value={stats.collectiveTarget} />
              <Row label={t('analytics.producerGroups')} value={stats.groups} />
            </dl>
            <p className="mt-2 text-xs text-ink-500">
              {t('analytics.contributedNote')}
            </p>
            <p className="mt-2 text-sm">
              <Link href="/admin/opportunities" className="underline font-semibold text-clay-700">
                {t('analytics.manageGroupOrders')}
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('analytics.listingsByCategory')}</h2>
          {byCategory.length === 0 ? (
            <Empty title={t('analytics.noCategoriesTitle')} body={t('analytics.noCategoriesBody')} />
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="text-left text-xs text-ink-500 pb-2">
                  {t('analytics.categoryCaption')}
                </caption>
                <thead>
                  <tr className="text-left border-b border-ink-100">
                    <th className="py-2 pr-4 font-semibold text-ink-900">{t('reports.category')}</th>
                    <th className="py-2 pr-4 font-semibold text-ink-900">{t('analytics.thVisible')}</th>
                    <th className="py-2 font-semibold text-ink-900">{t('analytics.thStored')}</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map((row) => (
                    <tr key={row.name} className="border-b border-ink-100 last:border-0">
                      <td className="py-2 pr-4">{row.name}</td>
                      <td className="py-2 pr-4">{row.visible}</td>
                      <td className="py-2">
                        {row.total}
                        {row.total > row.visible && (
                          <Badge tone="neutral" className="ml-2">
                            {t('analytics.hiddenBadge', { count: row.total - row.visible })}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('analytics.whereFromTitle')}</h2>
          {byCommunity.length === 0 ? (
            <p className="mt-2 text-sm text-ink-700">{t('analytics.noCommunityBody')}</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {byCommunity.map((row) => (
                <li key={row.community} className="flex justify-between gap-3">
                  <span className="text-ink-700">{row.community}</span>
                  <span className="font-semibold text-ink-900">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-ink-500">
            {t('analytics.communityNote')}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('analytics.notMeasuredTitle')}</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>{t('analytics.notMeasured1')}</li>
            <li>{t('analytics.notMeasured2')}</li>
            <li>
              {t('analytics.notMeasured3')}
            </li>
            <li>{t('analytics.notMeasured4')}</li>
          </ul>
          <p className="mt-2 text-sm">
            <Link href="/admin/audit-logs" className="underline font-semibold text-clay-700">
              {t('analytics.auditLogLink')}
            </Link>
          </p>
        </CardBody>
      </Card>
    </AdminSection>
  );
}

function Row({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div>
      <div className="flex justify-between gap-3">
        <dt className="text-ink-500">{label}</dt>
        <dd className="font-semibold text-ink-900">{value}</dd>
      </div>
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

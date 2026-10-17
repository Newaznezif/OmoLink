import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { AdminSection } from '@/components/admin-shell';
import { Badge, Card, CardBody, Empty } from '@/components/ui';
import { formatMoney } from '@/lib/money';

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
      title="Platform activity"
      description="Every figure on this page is counted from the records that exist in the current data source. Nothing is estimated, extrapolated or carried over from a spreadsheet — and no visitor traffic is measured at all."
    >
      {isDemoMode() && (
        <p className="rounded-lg border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-800">
          <strong>Demo data.</strong> The app is running with DATA_MODE=demo, so the counts below describe the sample
          catalogue in memory for this instance. They are not evidence of real-world transactions or impact.
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Catalogue</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <Row label="Listings stored" value={listings.length} />
              <Row label="Visible in the marketplace" value={publicListings.length} />
              <Row label="Unpublished by a producer" value={listings.filter((l) => !l.published && !l.archived).length} />
              <Row label="Archived" value={admin.archivedListings} />
              <Row label="Promoted on the homepage" value={listings.filter((l) => l.featured).length} />
              <Row label="Tourism services" value={publicListings.filter((l) => l.kind === 'service').length} />
              <Row label="Categories in use" value={byCategory.filter((c) => c.total > 0).length} />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Accounts</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <Row label="Profiles stored" value={profiles.length} />
              <Row label="Selling accounts (producer)" value={admin.byRole.producer} />
              <Row label="Group coordinators" value={admin.byRole.coordinator} />
              <Row label="Buyers and tourists" value={admin.byRole.buyer} />
              <Row label="Administrators" value={admin.byRole.admin} />
              <Row label="Suspended" value={admin.suspended} />
              <Row label="Verified profiles" value={stats.verified} />
              <Row label="Awaiting a verification decision" value={admin.pendingVerifications} />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Arrangements</h2>
            <p className="mt-1 text-xs text-ink-500">
              Requests and agreements between a buyer and a seller. Payment is not integrated, so none of these is a
              completed sale in the accounting sense.
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {inquiryRows.map((row) => (
                <li key={row.state} className="flex justify-between">
                  <span className="text-ink-500">{row.state.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-ink-900">{row.count}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 text-sm border-t border-ink-100 pt-2">
              <Row label="Total recorded" value={inquiries.length} />
              <Row
                label="Sum of buyer-side estimates"
                value={formatMoney({ cents: estimatedValueCents, currency: 'ETB' })}
                hint="Estimated subtotals the buyers asked for, not money that changed hands."
              />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Group orders</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <Row label="Opportunities stored" value={opportunities.length} />
              <Row label="Open or closing soon" value={admin.openOpportunities} />
              <Row label="Quantity contributed" value={stats.collectiveContributed} />
              <Row label="Quantity targeted" value={stats.collectiveTarget} />
              <Row label="Producer groups" value={stats.groups} />
            </dl>
            <p className="mt-2 text-xs text-ink-500">
              Contributed quantity is summed from the individual contribution records. Percentages only mean something
              once real orders exist.
            </p>
            <p className="mt-2 text-sm">
              <Link href="/admin/opportunities" className="underline font-semibold text-clay-700">
                Manage group orders →
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Listings by category</h2>
          {byCategory.length === 0 ? (
            <Empty title="No categories" body="Create one on the Categories tab." />
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="text-left text-xs text-ink-500 pb-2">
                  Counted from stored listings. “Hidden” includes unpublished and archived records.
                </caption>
                <thead>
                  <tr className="text-left border-b border-ink-100">
                    <th className="py-2 pr-4 font-semibold text-ink-900">Category</th>
                    <th className="py-2 pr-4 font-semibold text-ink-900">Visible</th>
                    <th className="py-2 font-semibold text-ink-900">Stored</th>
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
                            {row.total - row.visible} hidden
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
          <h2 className="font-semibold text-ink-900">Where visible listings come from</h2>
          {byCommunity.length === 0 ? (
            <p className="mt-2 text-sm text-ink-700">No visible listing records a community, so there is nothing to group.</p>
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
            The community label is typed by the producer on their own profile or listing. It is a self-description, not a
            verified demographic, and this area does not present it as one.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">What is deliberately not measured</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>No page views, sessions or visitor analytics are collected, so there are no traffic numbers to show.</li>
            <li>No revenue, commission or gross-merchandise figure exists: payments are not integrated.</li>
            <li>
              “Households reached” and similar impact claims are not calculated here. The impact page states what is
              designed rather than what is proven.
            </li>
            <li>Verification counts decisions stored by an administrator, not independent field checks.</li>
          </ul>
          <p className="mt-2 text-sm">
            <Link href="/admin/audit-logs" className="underline font-semibold text-clay-700">
              See the audit log for who changed what
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

import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { AdminSection } from '@/components/admin-shell';
import { Badge, Card, CardBody, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Record<string, string | string[] | undefined> };

export default async function AdminHome({ searchParams }: Props) {
  // The admin layout has already verified this is an active administrator; every
  // write below re-checks it server-side, because a layout is not a boundary.
  const repo = getRepo();
  const [stats, audits, settings] = await Promise.all([
    repo.adminStats(),
    repo.listAuditLogs(8),
    repo.getSiteSettings()
  ]);

  const openReports = stats.openReports;
  const freshMessages = stats.unreadMessages;

  const queues = [
    { href: '/admin/users', label: 'Accounts', count: stats.byRole.buyer + stats.byRole.producer + stats.byRole.coordinator + stats.byRole.admin, note: 'browse and manage', tone: 'neutral' as const },
    { href: '/admin/verifications', label: 'Verifications awaiting a decision', count: stats.pendingVerifications, note: 'needs attention', tone: 'warning' as const },
    { href: '/admin/reports', label: 'Open reports', count: openReports, note: 'needs attention', tone: 'warning' as const },
    { href: '/admin/messages', label: 'Contact messages awaiting a reply', count: freshMessages, note: 'needs a human reply', tone: 'warning' as const },
    { href: '/admin/orders', label: 'Arrangements received', count: stats.newInquiries, note: 'new since received', tone: 'info' as const },
    { href: '/admin/opportunities', label: 'Group orders gathering', count: stats.openOpportunities, note: 'open or closing soon', tone: 'info' as const },
    { href: '/admin/listings', label: 'Listings stored', count: stats.publishedListings + stats.archivedListings, note: `${stats.publishedListings} published, ${stats.archivedListings} archived`, tone: 'neutral' as const },
    { href: '/admin/reviews', label: 'Hidden reviews', count: stats.hiddenReviews, note: 'kept out of public pages', tone: 'neutral' as const }
  ];

  return (
    <AdminSection
        title="Administration overview"
        description="Queues and counts, straight from the stored records. Nothing here is pre-computed for a slide: a number that does not exist in the data is not shown."
        searchParams={searchParams}
      >
        {isDemoMode() && (
          <p className="rounded-lg border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-800">
            <strong>Demo mode.</strong> DATA_MODE=demo: the accounts, listings and records below are sample data held in
            this app instance’s memory, reset when it restarts. Administrative actions are real against that store —
            role changes, suspensions and moderation decisions all take effect and appear in the audit log. With{' '}
            <code>DATA_MODE=supabase</code> the same screens read and write the database, and Row Level Security decides
            what this account may see.
          </p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {queues.map((q) => (
            <Link key={q.href} href={q.href} className="block">
              <Card className="h-full hover:border-clay-300">
                <CardBody>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-black text-ink-900">{q.count}</span>
                    <Badge tone={q.tone}>{q.note}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-clay-800 underline">{q.label}</p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink-900">Role spread</h2>
              <dl className="mt-2 space-y-1 text-sm">
                <Row label="Administrators" value={stats.byRole.admin} />
                <Row label="Group coordinators" value={stats.byRole.coordinator} />
                <Row label="Producers and sellers" value={stats.byRole.producer} />
                <Row label="Buyers and tourists" value={stats.byRole.buyer} />
                <Row label="Suspended accounts" value={stats.suspended} />
              </dl>
              <p className="mt-2 text-xs text-ink-500">
                Keep at least two administrator accounts active, so a suspension or a lost login cannot lock the platform
                out of its own controls.
              </p>
              <p className="mt-2 text-sm">
                <Link href="/admin/roles" className="underline font-semibold text-clay-700">
                  Roles and permissions →
                </Link>
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink-900">Recent administrative actions</h2>
              {audits.length === 0 ? (
                <p className="mt-2 text-sm text-ink-700">
                  No privileged change has been made yet. This list fills as soon as a role, status, listing or setting
                  is altered.
                </p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {audits.map((a) => (
                    <li key={a.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-ink-500">{new Date(a.at).toLocaleString()}</span>
                        <Badge tone="neutral">{a.action.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="text-ink-700">{a.summary}</p>
                      <p className="text-xs text-ink-500">by {a.actorName}</p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-sm">
                <Link href="/admin/audit-logs" className="underline font-semibold text-clay-700">
                  Full audit log →
                </Link>
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink-900">Site content</h2>
              <dl className="mt-2 space-y-1 text-sm">
                <Row label="Site name" value={settings.siteName} />
                <Row label="Announcement bar" value={settings.announcementBar.enabled ? 'on' : 'off'} />
                <Row
                  label="Homepage sections visible"
                  value={`${settings.homepageSections.filter((s) => s.visible).length} of ${settings.homepageSections.length}`}
                />
                <Row label="Contact channels" value={settings.contactEmail || settings.contactPhone ? 'configured' : 'none yet'} />
                <Row label="Accent colour" value={settings.accentColor} />
              </dl>
              {(settings.isDemo || !settings.contactEmail) && (
                <p className="mt-2 text-xs text-ink-500">
                  No public contact channel is configured, so the contact page explains that instead of pretending a
                  mailbox is monitored.
                </p>
              )}
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <Link href="/admin/homepage" className="underline font-semibold text-clay-700">
                    Homepage content →
                  </Link>
                </p>
                <p>
                  <Link href="/admin/settings" className="underline font-semibold text-clay-700">
                    Site settings →
                  </Link>
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        {stats.openReports === 0 && audits.length === 0 && (
          <Empty
            title="Nothing to triage yet"
            body="No reports and no administrative actions have been recorded. The queues above show what exists; they are not padded with examples."
          />
        )}

        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Possible business model</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
              <li>Producer registration and a basic listing stay free during the pilot.</li>
              <li>A transparent fee on completed transactions only after the workflow is validated.</li>
              <li>Optional paid tools for hotels, retailers and institutional buyers.</li>
              <li>A logistics coordination charge only where it saves the group real money.</li>
              <li>Never sell producer data. Never charge a vulnerable producer merely to appear in search results.</li>
            </ul>
            <p className="mt-2 text-xs text-ink-500">
              No commission is charged or collected by this software today — payment is not integrated, so nothing here
              reports revenue.
            </p>
          </CardBody>
        </Card>
      </AdminSection>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-semibold text-ink-900">{String(value)}</dd>
    </div>
  );
}

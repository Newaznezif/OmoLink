import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { AdminSection } from '@/components/admin-shell';
import { Badge, Card, CardBody, Empty } from '@/components/ui';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Record<string, string | string[] | undefined> };

export default async function AdminHome({ searchParams }: Props) {
  // The admin layout has already verified this is an active administrator; every
  // write below re-checks it server-side, because a layout is not a boundary.
  const t = getT();
  const repo = getRepo();
  const [stats, audits, settings] = await Promise.all([
    repo.adminStats(),
    repo.listAuditLogs(8),
    repo.getSiteSettings()
  ]);

  const openReports = stats.openReports;
  const freshMessages = stats.unreadMessages;

  const queues = [
    { href: '/admin/users', label: t('nav.accounts'), count: stats.byRole.buyer + stats.byRole.producer + stats.byRole.coordinator + stats.byRole.admin, note: t('adminHome.noteBrowse'), tone: 'neutral' as const },
    { href: '/admin/verifications', label: t('adminHome.queueVerifications'), count: stats.pendingVerifications, note: t('adminHome.noteAttention'), tone: 'warning' as const },
    { href: '/admin/reports', label: t('adminHome.queueOpenReports'), count: openReports, note: t('adminHome.noteAttention'), tone: 'warning' as const },
    { href: '/admin/messages', label: t('adminHome.queueMessages'), count: freshMessages, note: t('adminHome.noteReply'), tone: 'warning' as const },
    { href: '/admin/orders', label: t('adminHome.queueArrangements'), count: stats.newInquiries, note: t('adminHome.noteNew'), tone: 'info' as const },
    { href: '/admin/opportunities', label: t('adminHome.queueGroupOrders'), count: stats.openOpportunities, note: t('adminHome.noteOpenSoon'), tone: 'info' as const },
    { href: '/admin/listings', label: t('adminHome.queueListings'), count: stats.publishedListings + stats.archivedListings, note: t('adminHome.noteListings', { published: stats.publishedListings, archived: stats.archivedListings }), tone: 'neutral' as const },
    { href: '/admin/reviews', label: t('adminHome.queueHiddenReviews'), count: stats.hiddenReviews, note: t('adminHome.noteHidden'), tone: 'neutral' as const }
  ];

  return (
    <AdminSection
        title={t('adminHome.title')}
        description={t('adminHome.description')}
        searchParams={searchParams}
      >
        {isDemoMode() && (
          <p className="rounded-lg border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-800">
            <strong>{t('adminHome.demoModeLead')}</strong> {t('adminHome.demoModeBody')}{' '}
            <code>DATA_MODE=supabase</code> {t('adminHome.demoModeTail')}
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
              <h2 className="font-semibold text-ink-900">{t('adminHome.roleSpread')}</h2>
              <dl className="mt-2 space-y-1 text-sm">
                <Row label={t('adminHome.roleAdmins')} value={stats.byRole.admin} />
                <Row label={t('adminHome.roleCoordinators')} value={stats.byRole.coordinator} />
                <Row label={t('adminHome.roleProducers')} value={stats.byRole.producer} />
                <Row label={t('adminHome.roleBuyers')} value={stats.byRole.buyer} />
                <Row label={t('adminHome.roleSuspended')} value={stats.suspended} />
              </dl>
              <p className="mt-2 text-xs text-ink-500">
                {t('adminHome.roleSafetyNote')}
              </p>
              <p className="mt-2 text-sm">
                <Link href="/admin/roles" className="underline font-semibold text-clay-700">
                  {t('adminHome.rolesLink')}
                </Link>
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink-900">{t('adminHome.recentActions')}</h2>
              {audits.length === 0 ? (
                <p className="mt-2 text-sm text-ink-700">
                  {t('adminHome.recentEmpty')}
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
                      <p className="text-xs text-ink-500">{t('adminHome.byActor', { name: a.actorName })}</p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-sm">
                <Link href="/admin/audit-logs" className="underline font-semibold text-clay-700">
                  {t('adminHome.fullAudit')}
                </Link>
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink-900">{t('adminHome.siteContent')}</h2>
              <dl className="mt-2 space-y-1 text-sm">
                <Row label={t('adminHome.siteName')} value={settings.siteName} />
                <Row label={t('adminHome.announcementBar')} value={settings.announcementBar.enabled ? t('adminHome.on') : t('adminHome.off')} />
                <Row
                  label={t('adminHome.homepageSectionsLabel')}
                  value={t('adminHome.sectionsVisible', {
                    visible: settings.homepageSections.filter((s) => s.visible).length,
                    total: settings.homepageSections.length
                  })}
                />
                <Row label={t('adminHome.contactChannels')} value={settings.contactEmail || settings.contactPhone ? t('adminHome.configured') : t('adminHome.noneYet')} />
                <Row label={t('adminHome.accentColour')} value={settings.accentColor} />
              </dl>
              {(settings.isDemo || !settings.contactEmail) && (
                <p className="mt-2 text-xs text-ink-500">
                  {t('adminHome.noContactNote')}
                </p>
              )}
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <Link href="/admin/homepage" className="underline font-semibold text-clay-700">
                    {t('adminHome.homepageContent')}
                  </Link>
                </p>
                <p>
                  <Link href="/admin/settings" className="underline font-semibold text-clay-700">
                    {t('adminHome.siteSettings')}
                  </Link>
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        {stats.openReports === 0 && audits.length === 0 && (
          <Empty
            title={t('adminHome.triageEmptyTitle')}
            body={t('adminHome.triageEmptyBody')}
          />
        )}

        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('adminHome.businessModelTitle')}</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
              <li>{t('adminHome.businessModel1')}</li>
              <li>{t('adminHome.businessModel2')}</li>
              <li>{t('adminHome.businessModel3')}</li>
              <li>{t('adminHome.businessModel4')}</li>
              <li>{t('adminHome.businessModel5')}</li>
            </ul>
            <p className="mt-2 text-xs text-ink-500">
              {t('adminHome.businessModelNote')}
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

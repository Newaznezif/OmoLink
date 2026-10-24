import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { AdminSection } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Empty, Input, Select } from '@/components/ui';
import { getT } from '@/lib/i18n/server';
import type { AuditAction } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

const ACTIONS: AuditAction[] = [
  'role_changed',
  'account_suspended',
  'account_reactivated',
  'verification_decision',
  'listing_moderated',
  'listing_featured',
  'category_changed',
  'site_settings_changed',
  'report_resolved',
  'review_moderated',
  'record_archived'
];

const RECORD_TYPES = ['profile', 'listing', 'category', 'settings', 'report', 'review', 'opportunity'] as const;

export default async function AdminAuditLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const t = getT();
  const text = (key: string): string => (typeof searchParams[key] === 'string' ? (searchParams[key] as string) : '');
  const limit = Math.min(Number(text('limit') || 100) || 100, 500);
  const entries = await getRepo().listAuditLogs(limit);

  const action = text('action');
  const recordType = text('recordType');
  const q = text('q').trim().toLowerCase();

  const rows = entries.filter((e) => {
    if (action && e.action !== action) return false;
    if (recordType && e.recordType !== recordType) return false;
    if (!q) return true;
    return [e.actorName, e.action, e.recordId, e.summary].join(' ').toLowerCase().includes(q);
  });

  return (
    <AdminSection
      title={t('nav.auditLog')}
      description={t('audit.description')}
      searchParams={searchParams}
    >
      {isDemoMode() && (
        <p className="rounded-lg border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-800">
          <strong>{t('audit.demoTitle')}</strong> {t('audit.demoBodyBefore')} <code>audit_logs</code> {t('audit.demoBodyAfter')}
        </p>
      )}

      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label htmlFor="q" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('audit.searchLabel')}
              </label>
              <Input id="q" name="q" defaultValue={text('q')} />
            </div>
            <div>
              <label htmlFor="action" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('audit.action')}
              </label>
              <Select id="action" name="action" defaultValue={action}>
                <option value="">{t('reports.allOptions')}</option>
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="recordType" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('audit.recordType')}
              </label>
              <Select id="recordType" name="recordType" defaultValue={recordType}>
                <option value="">{t('reports.allOptions')}</option>
                {RECORD_TYPES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="limit" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('audit.newestEntries')}
              </label>
              <Select id="limit" name="limit" defaultValue={String(limit)}>
                {[50, 100, 250, 500].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-5 flex items-end gap-2">
              <Button type="submit" size="sm">
                {t('buyerInquiries.apply')}
              </Button>
              <Link href="/admin/audit-logs" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 text-sm font-semibold">
                {t('common.clear')}
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty
          title={t('audit.emptyTitle')}
          body={
            entries.length === 0
              ? t('audit.emptyNoEntriesBody')
              : t('audit.emptyFilteredBody')
          }
        />
      ) : (
        <Card>
          <CardBody className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="text-left text-xs text-ink-500 pb-2">
                {t('audit.showing', { shown: rows.length, total: entries.length, unit: entries.length === 1 ? t('audit.entry') : t('audit.entries') })}
              </caption>
              <thead>
                <tr className="text-left border-b border-ink-100">
                  <th className="py-2 pr-3 font-semibold text-ink-900 whitespace-nowrap">{t('audit.when')}</th>
                  <th className="py-2 pr-3 font-semibold text-ink-900">{t('auth.demoAdminTitle')}</th>
                  <th className="py-2 pr-3 font-semibold text-ink-900">{t('audit.action')}</th>
                  <th className="py-2 pr-3 font-semibold text-ink-900">{t('audit.record')}</th>
                  <th className="py-2 font-semibold text-ink-900">{t('reports.summaryHeading')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-b border-ink-100 last:border-0 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap text-ink-500">{new Date(e.at).toLocaleString()}</td>
                    <td className="py-2 pr-3">
                      <Link href={`/admin/users/${e.actorProfileId}`} className="underline font-semibold text-clay-700">
                        {e.actorName}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone={e.action === 'role_changed' || e.action === 'account_suspended' ? 'warning' : 'neutral'}>
                        {e.action.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-ink-500">
                      {e.recordType}
                      {e.recordType === 'profile' ? (
                        <>
                          {' '}
                          <Link href={`/admin/users/${e.recordId}`} className="underline text-clay-700">
                            {e.recordId}
                          </Link>
                        </>
                      ) : (
                        ` ${e.recordId}`
                      )}
                    </td>
                    <td className="py-2 text-ink-700">{e.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('audit.recordedTitle')}</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>{t('audit.recorded1')}</li>
            <li>{t('audit.recorded2')}</li>
            <li>{t('audit.recorded3')}</li>
          </ul>
          <p className="mt-2 text-sm">
            <Link href="/admin/roles" className="underline font-semibold text-clay-700">
              {t('audit.rolesLink')}
            </Link>
          </p>
        </CardBody>
      </Card>
    </AdminSection>
  );
}

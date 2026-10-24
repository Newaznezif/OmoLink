import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { AdminSection, BackField, ConfirmField } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Empty, Field, Input, Select } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { getT } from '@/lib/i18n/server';
import type { TranslationKey } from '@/lib/i18n';
import type { CollectiveOpportunity } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

const STATUSES: CollectiveOpportunity['status'][] = ['open', 'closing_soon', 'closed', 'fulfilled', 'cancelled'];

/** The stored enum stays the enum; only the label shown to the administrator is translated. */
const STATUS_LABEL_KEY: Record<CollectiveOpportunity['status'], TranslationKey> = {
  open: 'status.opportunity.open',
  closing_soon: 'status.opportunity.closingSoon',
  closed: 'status.opportunity.closed',
  fulfilled: 'status.opportunity.fulfilled',
  cancelled: 'status.opportunity.cancelled'
};

export default async function AdminOpportunitiesPage({ searchParams }: { searchParams: SearchParams }) {
  const t = getT();
  const text = (key: string): string => (typeof searchParams[key] === 'string' ? (searchParams[key] as string) : '');
  const repo = getRepo();
  const [opportunities, groups, profiles, categories] = await Promise.all([
    repo.listOpportunities(),
    repo.listGroups(),
    repo.listAllProfiles(),
    repo.listAllCategories()
  ]);

  const groupById = new Map(groups.map((g) => [g.id, g]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const q = text('q').trim().toLowerCase();
  const status = text('status');

  const rows = opportunities.filter((o) => {
    if (status && o.status !== status) return false;
    if (!q) return true;
    return [o.title, groupById.get(o.organizingGroupId)?.name ?? '', o.pickupPlan].join(' ').toLowerCase().includes(q);
  });

  const open = opportunities.filter((o) => o.status === 'open' || o.status === 'closing_soon').length;

  return (
    <AdminSection
      title={t('nav.groupOrders')}
      description={
        opportunities.length === 1
          ? t('opportunityAdmin.descriptionOne', { open, total: opportunities.length })
          : t('opportunityAdmin.descriptionMany', { open, total: opportunities.length })
      }
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label htmlFor="q" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('opportunityAdmin.searchLabel')}
              </label>
              <Input id="q" name="q" defaultValue={text('q')} />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('reports.status')}
              </label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">{t('reports.allOptions')}</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(STATUS_LABEL_KEY[s])}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm">
                {t('buyerInquiries.apply')}
              </Button>
              <Link href="/admin/opportunities" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 text-sm font-semibold">
                {t('common.clear')}
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty
          title={t('opportunityAdmin.emptyTitle')}
          body={t('opportunityAdmin.emptyBody')}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((o) => {
            const progress = o.targetQuantity > 0 ? Math.min(100, Math.round((o.aggregateQuantity / o.targetQuantity) * 100)) : 0;
            const closable = o.status === 'open' || o.status === 'closing_soon';
            return (
              <Card key={o.id}>
                <CardBody className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink-900">
                        <Link href={`/collective-orders/${o.id}`} className="underline">
                          {o.title}
                        </Link>
                      </h3>
                      <Badge tone={statusTone(o.status)}>{t(STATUS_LABEL_KEY[o.status])}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-500">
                      {groupById.get(o.organizingGroupId)?.name ?? t('opportunityAdmin.noGroup')} · {t('opportunityAdmin.coordinatedBy')}{' '}
                      {profileById.get(o.coordinatorProfileId)?.displayName ?? o.coordinatorProfileId} ·{' '}
                      {categoryById.get(o.categoryId)?.name ?? o.categoryId}
                      {o.orderDeadline ? ` · ${t('opportunityAdmin.deadlinePrefix')} ${o.orderDeadline}` : ''}
                    </p>
                    <p className="mt-2 text-sm text-ink-700 line-clamp-2">{o.description}</p>

                    <div className="mt-3">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-ink-500">
                          {t('opportunityAdmin.contributed', {
                            aggregate: o.aggregateQuantity,
                            target: o.targetQuantity,
                            unit: o.unitOfSale
                          })}
                        </span>
                        <span className="font-semibold text-ink-900">{progress}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-ink-100 overflow-hidden" role="presentation">
                        <div className="h-full accent-bg" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <dl className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <dt className="text-ink-500">{t('collective.indicativePrice')}</dt>
                        <dd className="text-ink-900">{o.indicativeGroupPrice ? formatMoney(o.indicativeGroupPrice) : t('groupSelling.notSet')}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">{t('collective.buyerOfferPrefix')}</dt>
                        <dd className="text-ink-900">{o.buyerOfferedPrice ? formatMoney(o.buyerOfferedPrice) : t('opportunityAdmin.noOffer')}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">{t('opportunityAdmin.transportLabel')}</dt>
                        <dd className="text-ink-900">{o.transportPlan || t('opportunityAdmin.notRecorded')}</dd>
                      </div>
                    </dl>
                    <p className="mt-1 text-xs text-ink-500">
                      {t('opportunityAdmin.transportNote')} {t('collective.pickupPlan')}:{' '}
                      {o.pickupPlan || t('opportunityAdmin.notRecordedLower')}.
                    </p>
                  </div>

                  <form method="post" action="/api/admin/opportunity-status" className="lg:w-72 shrink-0 space-y-2">
                    <BackField path="/admin/opportunities" />
                    <input type="hidden" name="opportunityId" value={o.id} />
                    <Field label={t('opportunityAdmin.setStatusLabel')} htmlFor={`status-${o.id}`}>
                      <Select id={`status-${o.id}`} name="status" defaultValue={closable ? 'closed' : 'open'}>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {t(STATUS_LABEL_KEY[s])}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <ConfirmField id={`confirm-${o.id}`} label={t('opportunityAdmin.confirmStatusLabel')} />
                    <Button type="submit" size="sm" variant={closable ? 'danger' : 'secondary'}>
                      {t('opportunityAdmin.applyStatus')}
                    </Button>
                    <p className="text-xs text-ink-500">
                      {o.status === 'fulfilled'
                        ? t('opportunityAdmin.fulfilledWarning')
                        : t('opportunityAdmin.closedWarning')}
                    </p>
                  </form>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('opportunityAdmin.transportHeading')}</h2>
          <p className="mt-2 text-sm text-ink-700">{t('opportunityAdmin.transportBody')}</p>
          <p className="mt-2 text-sm">
            <Link href="/collective-orders" className="underline font-semibold text-clay-700">
              {t('opportunityAdmin.publicPageLink')}
            </Link>
          </p>
        </CardBody>
      </Card>
    </AdminSection>
  );
}

function statusTone(status: CollectiveOpportunity['status']): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'fulfilled') return 'success';
  if (status === 'cancelled' || status === 'closed') return 'danger';
  if (status === 'closing_soon') return 'warning';
  return 'neutral';
}

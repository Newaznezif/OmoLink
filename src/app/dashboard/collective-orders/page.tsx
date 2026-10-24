import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { formatMoney } from '@/lib/money';
import type { TranslationKey } from '@/lib/i18n';
import { getT } from '@/lib/i18n/server';
import type { CollectiveOpportunity, GroupContribution } from '@/lib/types';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';
import { SampleTag } from '@/components/status-labels';

export const dynamic = 'force-dynamic';

const OPPORTUNITY_STATUS_KEYS: Record<CollectiveOpportunity['status'], TranslationKey> = {
  open: 'status.opportunity.open',
  closing_soon: 'status.opportunity.closingSoon',
  closed: 'status.opportunity.closed',
  fulfilled: 'status.opportunity.fulfilled',
  cancelled: 'status.opportunity.cancelled'
};

const CONTRIBUTION_STATUS_KEYS: Record<GroupContribution['status'], TranslationKey> = {
  pending: 'collective.contributionStatus.pending',
  confirmed: 'collective.contributionStatus.confirmed',
  withdrawn: 'collective.contributionStatus.withdrawn'
};

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('nav.groupSelling'),
    description: t('groupSelling.metaDescription')
  };
}

export default async function DashboardCollectivePage() {
  const t = getT();
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  const opportunities = await repo.listOpportunities();
  const rows = await Promise.all(
    opportunities.map(async (o) => ({ o, contributions: await repo.listContributions(o.id) }))
  );

  const mine = rows
    .map(({ o, contributions }) => ({ o, contributions: contributions.filter((c) => c.producerProfileId === actor.profileId) }))
    .filter((row) => row.contributions.length > 0);

  const coordinated = rows.filter(({ o }) => o.coordinatorProfileId === actor.profileId);
  const isCoordinator = actor.role === 'coordinator';

  return (
    <Section
      eyebrow={t('groupSelling.eyebrow')}
      title={t('nav.groupSelling')}
      description={t('groupSelling.description')}
      actions={
        isCoordinator ? (
          <Link
            href="/dashboard/collective-orders/new"
            className="inline-flex bg-clay-700 text-white font-semibold px-4 py-2 rounded-lg"
          >
            {t('groupSelling.openAction')}
          </Link>
        ) : undefined
      }
    >
      {isCoordinator && (
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('groupSelling.coordinateHeading')}</h2>
            {coordinated.length === 0 ? (
              <p className="mt-1 text-sm text-ink-700">
                {t('groupSelling.noneLead')}{' '}
                <Link href="/dashboard/collective-orders/new" className="underline font-semibold text-clay-700">
                  {t('groupSelling.openOne')}
                </Link>{' '}
                {t('groupSelling.noneTail')}
              </p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {coordinated.map(({ o, contributions }) => {
                  const active = contributions.filter((c) => c.status !== 'withdrawn');
                  const committed = active.reduce((sum, c) => sum + c.quantity, 0);
                  return (
                    <li key={o.id} className="rounded-lg border border-ink-100 p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link href={`/dashboard/collective-orders/${o.id}`} className="font-semibold underline text-clay-700">
                          {o.title}
                        </Link>
                        <Badge tone={o.status === 'open' ? 'success' : o.status === 'cancelled' ? 'danger' : 'neutral'}>
                          {t(OPPORTUNITY_STATUS_KEYS[o.status])}
                        </Badge>
                      </div>
                      <p className="mt-1 text-ink-700">
                        {t('groupSelling.committedLine', { committed, target: o.targetQuantity, unit: o.unitOfSale, count: active.length })}
                        {o.indicativeGroupPrice ? t('groupSelling.indicativeSuffix', { amount: formatMoney(o.indicativeGroupPrice), unit: o.unitOfSale }) : ''}
                      </p>
                      <p className="mt-1 text-xs text-ink-500">
                        <Link href={`/dashboard/collective-orders/${o.id}`} className="underline">
                          {t('groupSelling.manageContributions')}
                        </Link>
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2 text-xs text-ink-500">
              {t('groupSelling.coordinatorNote')}
            </p>
          </CardBody>
        </Card>
      )}

      <h2 className="text-xl font-bold text-ink-900 mt-6 mb-2">{t('groupSelling.myContributions')}</h2>
      {mine.length === 0 ? (
        <Empty
          title={t('groupSelling.contribEmptyTitle')}
          body={t('groupSelling.contribEmptyBody')}
          action={
            <Link href="/collective-orders" className="inline-flex bg-clay-700 text-white font-semibold px-4 py-2 rounded-lg">
              {t('groupSelling.browseOpportunities')}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {mine.map(({ o, contributions }) => {
            const activeTotal = contributions
              .filter((c) => c.status !== 'withdrawn')
              .reduce((sum, c) => sum + c.quantity, 0);
            return (
              <li key={o.id}>
                <Card>
                  <CardBody>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-semibold text-ink-900">{o.title}</h3>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge tone={o.status === 'open' ? 'success' : 'neutral'}>{t(OPPORTUNITY_STATUS_KEYS[o.status])}</Badge>
                        {o.isDemo && <SampleTag />}
                      </div>
                    </div>
                    <div className="text-sm text-ink-500 mt-1 flex flex-wrap gap-4">
                      <Link href={`/collective-orders/${o.id}`} className="underline text-clay-800 font-semibold">
                        {t('groupSelling.publicPage')}
                      </Link>
                      <Link href={`/dashboard/collective-orders/${o.id}`} className="underline text-clay-800 font-semibold">
                        {t('groupSelling.changeWithdraw')}
                      </Link>
                    </div>
                    <table className="mt-3 w-full text-sm">
                      <thead>
                        <tr className="text-left text-ink-500">
                          <th className="font-medium py-1">{t('receipt.quantity')}</th>
                          <th className="font-medium py-1">{t('reports.status')}</th>
                          <th className="font-medium py-1">{t('collective.noteHeader')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contributions.map((c) => (
                          <tr key={c.id} className="border-t border-ink-100">
                            <td className="py-1">
                              {c.quantity} {o.unitOfSale}
                            </td>
                            <td className="py-1">
                              <Badge
                                tone={
                                  c.status === 'confirmed' ? 'success' : c.status === 'withdrawn' ? 'danger' : 'warning'
                                }
                              >
                                {t(CONTRIBUTION_STATUS_KEYS[c.status])}
                              </Badge>
                            </td>
                            <td className="py-1 text-ink-700">{c.note ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-2 text-sm text-ink-500">
                      {t('groupSelling.liveCommitment')} <strong>{activeTotal}</strong> {t('groupSelling.groupAggregateMiddle', { unit: o.unitOfSale })}{' '}
                      <strong>{o.aggregateQuantity}</strong> {t('groupSelling.targetSuffix', { target: o.targetQuantity, unit: o.unitOfSale })}
                    </div>
                    <p className="mt-2 text-xs text-ink-500">
                      {t('groupSelling.pendingNote')}
                    </p>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {!isCoordinator && (
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('groupSelling.wantOpenHeading')}</h2>
            <p className="mt-1 text-sm text-ink-700">
              {t('groupSelling.wantOpenLead')}{' '}
              <Link href="/contact" className="underline font-semibold text-clay-700">
                {t('groupSelling.askAboutGroup')}
              </Link>
              .
            </p>
          </CardBody>
        </Card>
      )}
    </Section>
  );
}

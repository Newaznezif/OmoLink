import Link from 'next/link';
import type { CollectiveOpportunity } from '@/lib/types';
import { formatMoney } from '@/lib/money';
import { getT } from '@/lib/i18n/server';
import { Badge } from './ui';
import { SampleTag } from './status-labels';

export function CollectiveOpportunityCard({ opportunity }: { opportunity: CollectiveOpportunity }) {
  const t = getT();
  const remaining = Math.max(opportunity.targetQuantity - opportunity.aggregateQuantity, 0);
  const progress =
    opportunity.targetQuantity > 0
      ? Math.min(100, Math.round((opportunity.aggregateQuantity / opportunity.targetQuantity) * 100))
      : 0;
  return (
    <article className="bg-white border border-ink-100 rounded-2xl card-shadow p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-ink-900">{opportunity.title}</h3>
        <StatusBadge status={opportunity.status} />
      </div>
      <p className="mt-2 text-sm text-ink-700">{opportunity.description}</p>

      <div className="mt-4">
        <div className="text-sm text-ink-700 flex justify-between">
          <span>
            <strong>{opportunity.aggregateQuantity}</strong>
            {t('collective.progressTail', { target: opportunity.targetQuantity, unit: opportunity.unitOfSale })}
          </span>
          <span>{progress}%</span>
        </div>
        <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-2 rounded bg-ink-100 overflow-hidden">
          <div className="h-full bg-clay-600" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 text-xs text-ink-500">
          {remaining > 0 ? t('collective.stillNeeded', { count: remaining, unit: opportunity.unitOfSale }) : t('collective.targetReached')}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-ink-500">{t('collective.indicativePrice')}</dt>
          <dd className="font-semibold text-clay-800">
            {opportunity.indicativeGroupPrice ? formatMoney(opportunity.indicativeGroupPrice) : t('collective.indicativePriceUnknown')}
          </dd>
        </div>
        <div>
          <dt className="text-ink-500">{t('collective.deadline')}</dt>
          <dd className="font-semibold text-ink-900">{opportunity.orderDeadline ?? t('collective.deadlineNone')}</dd>
        </div>
        <div>
          <dt className="text-ink-500">{t('collective.pickupPlan')}</dt>
          <dd className="text-ink-900">{opportunity.pickupPlan}</dd>
        </div>
        <div>
          <dt className="text-ink-500">{t('collective.transportPlan')}</dt>
          <dd className="text-ink-900">{opportunity.transportPlan ?? t('collective.transportPlanNone')}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="info">{opportunity.unitOfSale}</Badge>
        {opportunity.isDemo && <SampleTag />}
        <Link href={`/collective-orders/${opportunity.id}`} className="ml-auto font-semibold text-clay-800 underline">
          {t('common.openLink')}
        </Link>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: CollectiveOpportunity['status'] }) {
  const t = getT();
  const map: Record<CollectiveOpportunity['status'], { tone: 'success' | 'warning' | 'danger' | 'neutral'; label: string }> = {
    open: { tone: 'success', label: t('status.opportunity.open') },
    closing_soon: { tone: 'warning', label: t('status.opportunity.closingSoon') },
    closed: { tone: 'neutral', label: t('status.opportunity.closed') },
    fulfilled: { tone: 'success', label: t('status.opportunity.fulfilled') },
    cancelled: { tone: 'danger', label: t('status.opportunity.cancelled') }
  };
  const s = map[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

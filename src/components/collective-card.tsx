import Link from 'next/link';
import type { CollectiveOpportunity } from '@/lib/types';
import { formatMoney } from '@/lib/money';
import { Badge, SampleTag } from './ui';

export function CollectiveOpportunityCard({ opportunity }: { opportunity: CollectiveOpportunity }) {
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
            <strong>{opportunity.aggregateQuantity}</strong> / {opportunity.targetQuantity} {opportunity.unitOfSale}
          </span>
          <span>{progress}%</span>
        </div>
        <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-2 rounded bg-ink-100 overflow-hidden">
          <div className="h-full bg-clay-600" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 text-xs text-ink-500">
          {remaining > 0 ? `${remaining} ${opportunity.unitOfSale} still needed` : 'Target reached — closing soon.'}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-ink-500">Indicative group price</dt>
          <dd className="font-semibold text-clay-800">
            {opportunity.indicativeGroupPrice ? formatMoney(opportunity.indicativeGroupPrice) : 'Buyer offered / TBD'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-500">Deadline</dt>
          <dd className="font-semibold text-ink-900">{opportunity.orderDeadline ?? 'No deadline set'}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Pickup plan</dt>
          <dd className="text-ink-900">{opportunity.pickupPlan}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Transport plan</dt>
          <dd className="text-ink-900">{opportunity.transportPlan ?? 'To be agreed'}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="info">{opportunity.unitOfSale}</Badge>
        {opportunity.isDemo && <SampleTag />}
        <Link href={`/collective-orders/${opportunity.id}`} className="ml-auto font-semibold text-clay-800 underline">
          Open →
        </Link>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: CollectiveOpportunity['status'] }) {
  const map: Record<CollectiveOpportunity['status'], { tone: 'success' | 'warning' | 'danger' | 'neutral'; label: string }> = {
    open: { tone: 'success', label: 'Open' },
    closing_soon: { tone: 'warning', label: 'Closing soon' },
    closed: { tone: 'neutral', label: 'Closed' },
    fulfilled: { tone: 'success', label: 'Fulfilled' },
    cancelled: { tone: 'danger', label: 'Cancelled' }
  };
  const s = map[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

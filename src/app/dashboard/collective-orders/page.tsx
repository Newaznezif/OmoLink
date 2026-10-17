import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { formatMoney } from '@/lib/money';
import { Badge, Card, CardBody, Empty, SampleTag, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Group selling',
  description: 'Your contributions to group orders, and the orders your account coordinates.'
};

export default async function DashboardCollectivePage() {
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
      eyebrow="Dashboard"
      title="Group selling"
      description="Collective orders you contribute to, and the ones your account organises. A group order is a shared quantity request: OmoNETAB records who committed what, and moves no money."
      actions={
        isCoordinator ? (
          <Link
            href="/dashboard/collective-orders/new"
            className="inline-flex bg-clay-700 text-white font-semibold px-4 py-2 rounded-lg"
          >
            Open a group order
          </Link>
        ) : undefined
      }
    >
      {isCoordinator && (
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Group orders you coordinate</h2>
            {coordinated.length === 0 ? (
              <p className="mt-1 text-sm text-ink-700">
                None yet.{' '}
                <Link href="/dashboard/collective-orders/new" className="underline font-semibold text-clay-700">
                  Open one
                </Link>{' '}
                when the group has an agreed target and a pickup plan.
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
                          {o.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="mt-1 text-ink-700">
                        {committed} / {o.targetQuantity} {o.unitOfSale} committed by {active.length} member(s)
                        {o.indicativeGroupPrice ? ` · indicative ${formatMoney(o.indicativeGroupPrice)} per ${o.unitOfSale}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-ink-500">
                        <Link href={`/dashboard/collective-orders/${o.id}`} className="underline">
                          Manage contributions and state →
                        </Link>
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2 text-xs text-ink-500">
              Confirming another member’s quantity is a coordinator action and is written to the audit log. Withdrawing or
              editing your own contribution never needs a coordinator.
            </p>
          </CardBody>
        </Card>
      )}

      <h2 className="text-xl font-bold text-ink-900 mt-6 mb-2">My contributions</h2>
      {mine.length === 0 ? (
        <Empty
          title="No contributions yet"
          body="Open a group order and add an available quantity from your stock. What you commit is checked against the stock on your listings in that category."
          action={
            <Link href="/collective-orders" className="inline-flex bg-clay-700 text-white font-semibold px-4 py-2 rounded-lg">
              Browse opportunities
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
                        <Badge tone={o.status === 'open' ? 'success' : 'neutral'}>{o.status.replace(/_/g, ' ')}</Badge>
                        {o.isDemo && <SampleTag />}
                      </div>
                    </div>
                    <div className="text-sm text-ink-500 mt-1 flex flex-wrap gap-4">
                      <Link href={`/collective-orders/${o.id}`} className="underline text-clay-800 font-semibold">
                        Public page →
                      </Link>
                      <Link href={`/dashboard/collective-orders/${o.id}`} className="underline text-clay-800 font-semibold">
                        Change or withdraw my quantity →
                      </Link>
                    </div>
                    <table className="mt-3 w-full text-sm">
                      <thead>
                        <tr className="text-left text-ink-500">
                          <th className="font-medium py-1">Quantity</th>
                          <th className="font-medium py-1">Status</th>
                          <th className="font-medium py-1">Note</th>
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
                                {c.status}
                              </Badge>
                            </td>
                            <td className="py-1 text-ink-700">{c.note ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-2 text-sm text-ink-500">
                      Your live commitment: <strong>{activeTotal}</strong> {o.unitOfSale} · group aggregate{' '}
                      <strong>{o.aggregateQuantity}</strong> / {o.targetQuantity} {o.unitOfSale}
                    </div>
                    <p className="mt-2 text-xs text-ink-500">
                      “Pending” means you said you can bring it and nobody confirmed it yet. “Confirmed” is recorded by the
                      coordinating account. Withdrawing is honest as long as you really cannot supply — the buyer sees the
                      revised total.
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
            <h2 className="font-semibold text-ink-900">Want to open a group order?</h2>
            <p className="mt-1 text-sm text-ink-700">
              Opening one and confirming other members’ quantities are coordinator powers, assigned by an administrator so
              the group’s commitments have an accountable owner. Until then, contribute to orders others have opened.{' '}
              <Link href="/contact" className="underline font-semibold text-clay-700">
                Ask about your group
              </Link>
              .
            </p>
          </CardBody>
        </Card>
      )}
    </Section>
  );
}

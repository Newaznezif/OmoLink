import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { Badge, Card, CardBody, Empty, Section, SampleTag } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function DashboardCollectivePage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const repo = getRepo();
  const opportunities = await repo.listOpportunities();
  const store = await Promise.all(opportunities.map(async (o) => ({ o, contributions: await repo.listContributions(o.id) })));

  const mine = store
    .map(({ o, contributions }) => ({ o, contributions: contributions.filter((c) => c.producerProfileId === profile.id) }))
    .filter((row) => row.contributions.length > 0);

  return (
    <Section eyebrow="Dashboard" title="My collective contributions" description="Every contribution recorded against your producer profile.">
      {mine.length === 0 ? (
        <Empty
          title="No contributions yet"
          body="Open a collective order and add an available quantity from your stock."
          action={
            <Link href="/collective-orders" className="inline-flex bg-clay-700 text-white font-semibold px-4 py-2 rounded-lg">
              Browse opportunities
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {mine.map(({ o, contributions }) => (
            <li key={o.id}>
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-ink-900">{o.title}</h3>
                    <Badge tone={o.status === 'open' ? 'success' : 'neutral'}>{o.status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="text-sm text-ink-500 mt-1">
                    <Link href={`/collective-orders/${o.id}`} className="underline text-clay-800 font-semibold">
                      Open opportunity →
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
                            <Badge tone={c.status === 'confirmed' ? 'success' : c.status === 'withdrawn' ? 'danger' : 'warning'}>{c.status}</Badge>
                          </td>
                          <td className="py-1 text-ink-700">{c.note ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-2 text-sm text-ink-500">
                    Aggregate: <strong>{o.aggregateQuantity}</strong> / {o.targetQuantity} {o.unitOfSale}
                  </div>
                  <div className="mt-2">
                    <SampleTag />
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

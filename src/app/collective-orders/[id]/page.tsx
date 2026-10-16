import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import { Badge, Card, CardBody, Empty, SampleTag, Section, VerificationLabel } from '@/components/ui';
import { ContributeForm } from '@/components/contribute-form';
import { TransportCalculator } from '@/components/transport-calculator';

export const dynamic = 'force-dynamic';

export default async function CollectiveOpportunityPage({ params }: { params: { id: string } }) {
  const repo = getRepo();
  const opportunity = await repo.getOpportunity(params.id);
  if (!opportunity) notFound();
  const group = await repo.getGroup(opportunity.organizingGroupId);
  const coordinator = await repo.getProfile(opportunity.coordinatorProfileId);
  const contributions = await repo.listContributions(opportunity.id);
  const categories = await repo.listCategories();
  const profiles = await repo.listPublicProfiles();
  const producerById = new Map(profiles.map((p) => [p.id, p]));
  const sessionProfile = await getSessionProfile();
  const transportPlan = await repo.getTransportPlan(opportunity.id);

  const remaining = Math.max(opportunity.targetQuantity - opportunity.aggregateQuantity, 0);
  const progress =
    opportunity.targetQuantity > 0
      ? Math.min(100, Math.round((opportunity.aggregateQuantity / opportunity.targetQuantity) * 100))
      : 0;

  const category = categories.find((c) => c.id === opportunity.categoryId);
  const participants = new Set(contributions.filter((c) => c.status !== 'withdrawn').map((c) => c.producerProfileId));

  return (
    <Section eyebrow={`Collective order · ${category?.name ?? ''}`} title={opportunity.title} actions={opportunity.isDemo ? <SampleTag /> : undefined}>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <div className="space-y-6">
          <Card>
            <CardBody>
              <p className="text-ink-700">{opportunity.description}</p>
              <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                <Info label="Organising group" value={group?.name ?? 'Independent coordinator'} />
                <Info
                  label="Coordinator"
                  value={
                    coordinator ? (
                      <Link href={`/producers/${coordinator.id}`} className="underline">
                        {coordinator.displayName}
                      </Link>
                    ) : (
                      'Not specified'
                    )
                  }
                />
                <Info label="Pickup plan" value={opportunity.pickupPlan} />
                <Info label="Transport plan" value={opportunity.transportPlan ?? 'To be agreed'} />
                <Info label="Order deadline" value={opportunity.orderDeadline ?? 'No deadline'} />
                <Info label="Status" value={<Badge tone="success">{opportunity.status.replace('_', ' ')}</Badge>} />
              </dl>
              {coordinator && (
                <div className="mt-3 flex items-center gap-2">
                  <VerificationLabel status={coordinator.verification} isDemo={coordinator.isDemo} />
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold text-ink-900">Progress</h2>
                <span className="text-sm text-ink-700">
                  <strong>{opportunity.aggregateQuantity}</strong> / {opportunity.targetQuantity} {opportunity.unitOfSale}
                  <span className="ml-2 text-ink-500">({progress}%)</span>
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-2 h-3 rounded bg-ink-100 overflow-hidden"
              >
                <div className="h-full bg-clay-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-sm text-ink-700">
                {remaining > 0 ? (
                  <>
                    {remaining} {opportunity.unitOfSale} still needed. Participating producers so far:{' '}
                    <strong>{participants.size}</strong>.
                  </>
                ) : (
                  <>Target reached. New contributions can still be added up to twice the target for planning purposes.</>
                )}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink-900 mb-3">Recorded contributions</h2>
              {contributions.length === 0 ? (
                <Empty title="No contributions yet" body="Be the first producer to add available quantity to this opportunity." />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-500">
                      <th className="font-medium py-2">Producer</th>
                      <th className="font-medium py-2">Quantity</th>
                      <th className="font-medium py-2">Status</th>
                      <th className="font-medium py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contributions.map((c) => (
                      <tr key={c.id} className="border-t border-ink-100">
                        <td className="py-2">
                          <Link href={`/producers/${c.producerProfileId}`} className="underline">
                            {producerById.get(c.producerProfileId)?.displayName ?? 'Sample producer'}
                          </Link>
                        </td>
                        <td className="py-2">
                          {c.quantity} {opportunity.unitOfSale}
                        </td>
                        <td className="py-2">
                          <Badge tone={c.status === 'confirmed' ? 'success' : c.status === 'withdrawn' ? 'danger' : 'warning'}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="py-2 text-ink-700">{c.note ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          <TransportCalculator
            opportunityId={opportunity.id}
            unitOfSale={opportunity.unitOfSale}
            totalCostCents={transportPlan?.totalCostCents ?? 0}
            totalQuantity={opportunity.aggregateQuantity}
            quoteConfirmed={false}
            contributions={contributions.map((c) => ({ producerProfileId: c.producerProfileId, quantity: c.quantity, name: producerById.get(c.producerProfileId)?.displayName ?? 'Sample producer' }))}
          />
        </div>

        <aside className="space-y-4">
          {sessionProfile ? (
            <ContributeForm
              opportunity={{
                id: opportunity.id,
                title: opportunity.title,
                unitOfSale: opportunity.unitOfSale,
                targetQuantity: opportunity.targetQuantity,
                aggregateQuantity: opportunity.aggregateQuantity,
                status: opportunity.status
              }}
              producer={{ id: sessionProfile.id, displayName: sessionProfile.displayName, categories: sessionProfile.categories }}
              categoryId={opportunity.categoryId}
            />
          ) : (
            <Card>
              <CardBody>
                <h2 className="font-semibold text-ink-900">Contribute as a producer</h2>
                <p className="mt-1 text-sm text-ink-700">
                  Sign in with a demo producer account to add available quantity to this opportunity. Contributions are
                  validated: quantity must be a positive whole number, must not exceed your available stock, and cannot
                  be duplicated.
                </p>
                <Link href="/sign-in" className="mt-3 inline-block font-semibold text-clay-800 underline">
                  Sign in as a demo producer →
                </Link>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody>
              <h3 className="font-semibold text-ink-900 mb-1">Indicative group price</h3>
              <p className="text-sm text-ink-700">
                {opportunity.indicativeGroupPrice ? (
                  <>
                    <strong>{formatMoney(opportunity.indicativeGroupPrice)}</strong> per {opportunity.unitOfSale}. The
                    indicative price is a planning reference only — producers keep the right to negotiate and the
                    platform never imposes a mandatory price.
                  </>
                ) : opportunity.buyerOfferedPrice ? (
                  <>
                    Buyer offered <strong>{formatMoney(opportunity.buyerOfferedPrice)}</strong> per{' '}
                    {opportunity.unitOfSale}. Confirm with the coordinator before committing stock.
                  </>
                ) : (
                  'Not published. Contact the coordinator for the buyer’s offer.'
                )}
              </p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </Section>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-ink-900 font-medium">{value}</dd>
    </div>
  );
}

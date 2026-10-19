import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { formatMoney } from '@/lib/money';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';
import { SampleTag } from '@/components/status-labels';
import { OpportunityForm, type OpportunityFormValues } from '@/components/opportunity-form';
import { ContributionActions, OpportunityStatusPicker } from '@/components/collective-manage';

export const dynamic = 'force-dynamic';

export default async function ManageOpportunityPage({ params }: { params: { id: string } }) {
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  const opportunity = await repo.getOpportunity(params.id);
  if (!opportunity) notFound();

  const [contributions, categories, groups, profile] = await Promise.all([
    repo.listContributions(opportunity.id),
    repo.listCategories(),
    repo.listGroups(),
    repo.getProfile(actor.profileId)
  ]);

  const names = new Map<string, string>();
  await Promise.all(
    [...new Set(contributions.map((c) => c.producerProfileId))].map(async (id) => {
      const p = await repo.getProfile(id);
      if (p) names.set(id, p.displayName);
    })
  );

  const isCoordinator = opportunity.coordinatorProfileId === actor.profileId;
  const acceptsChanges = opportunity.status === 'open' || opportunity.status === 'closing_soon';
  const active = contributions.filter((c) => c.status !== 'withdrawn');
  const committed = active.reduce((sum, c) => sum + c.quantity, 0);
  const confirmed = active.filter((c) => c.status === 'confirmed').reduce((sum, c) => sum + c.quantity, 0);
  const myGroups = groups.filter(
    (g) => g.coordinatorProfileId === actor.profileId || (profile?.groupIds ?? []).includes(g.id)
  );

  const initial: Partial<OpportunityFormValues> = {
    id: opportunity.id,
    title: opportunity.title,
    description: opportunity.description,
    categoryId: opportunity.categoryId,
    organizingGroupId: opportunity.organizingGroupId,
    unitOfSale: opportunity.unitOfSale,
    targetQuantity: String(opportunity.targetQuantity),
    indicativeGroupPriceEtb: opportunity.indicativeGroupPrice ? (opportunity.indicativeGroupPrice.cents / 100).toFixed(2) : '',
    buyerOfferedPriceEtb: opportunity.buyerOfferedPrice ? (opportunity.buyerOfferedPrice.cents / 100).toFixed(2) : '',
    pickupPlan: opportunity.pickupPlan,
    transportPlan: opportunity.transportPlan ?? '',
    orderDeadline: opportunity.orderDeadline ?? '',
    status: opportunity.status
  };

  return (
    <Section
      eyebrow="Dashboard"
      title={opportunity.title}
      description="The coordinator’s view of this group order: who committed what, what the total came to, and the state of the arrangement."
    >
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={opportunity.status === 'open' ? 'success' : opportunity.status === 'cancelled' ? 'danger' : 'neutral'}>
              {opportunity.status.replace(/_/g, ' ')}
            </Badge>
            {opportunity.isDemo && <SampleTag />}
            <Link href={`/collective-orders/${opportunity.id}`} className="ml-auto underline text-sm font-semibold text-clay-700">
              See the public page
            </Link>
          </div>

          <dl className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-500">Target</dt>
              <dd className="text-ink-900">
                {opportunity.targetQuantity} {opportunity.unitOfSale}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">Committed now</dt>
              <dd className="text-ink-900">
                {committed} {opportunity.unitOfSale} from {active.length} member(s)
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">Confirmed by the coordinator</dt>
              <dd className="text-ink-900">
                {confirmed} {opportunity.unitOfSale}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">Order deadline</dt>
              <dd className="text-ink-900">{opportunity.orderDeadline || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Indicative group price</dt>
              <dd className="text-ink-900">
                {opportunity.indicativeGroupPrice ? `${formatMoney(opportunity.indicativeGroupPrice)} per ${opportunity.unitOfSale}` : 'Not agreed yet'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">Buyer offered price</dt>
              <dd className="text-ink-900">
                {opportunity.buyerOfferedPrice ? `${formatMoney(opportunity.buyerOfferedPrice)} per ${opportunity.unitOfSale}` : 'Not offered'}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-sm text-ink-700 whitespace-pre-line">{opportunity.description}</p>
          <p className="mt-2 text-sm text-ink-700">
            <strong>Pickup:</strong> {opportunity.pickupPlan}
          </p>
          {opportunity.transportPlan && (
            <p className="mt-1 text-sm text-ink-700">
              <strong>Transport:</strong> {opportunity.transportPlan}
            </p>
          )}
          <p className="mt-2 text-xs text-ink-500">
            Both price figures are planning numbers someone typed in. They are not invoices, and transport shares are
            estimates unless a quote was actually confirmed and written here.
          </p>
        </CardBody>
      </Card>

      {isCoordinator ? (
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">State of this group order</h2>
            <p className="mt-1 text-sm text-ink-700">
              Set the state to what has actually happened. “Fulfilled” is for after the goods were delivered, not after the
              target was reached.
            </p>
            <div className="mt-3">
              <OpportunityStatusPicker opportunity={opportunity} />
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">You are not the coordinator here</h2>
            <p className="mt-2 text-sm text-ink-700">
              You can read this group order and manage your own contribution to it, but the state of the order and the
              confirmation of other members’ quantities belong to the coordinating account
              {names.get(opportunity.coordinatorProfileId) ? ` (${names.get(opportunity.coordinatorProfileId)})` : ''} and
              to an administrator. The server refuses the attempt either way; this page simply does not offer a button that
              would fail.
            </p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Contributions</h2>
          {contributions.length === 0 ? (
            <Empty
              title="No contributions recorded"
              body="Members add their available quantity from the public page of this group order."
              action={
                <Link href={`/collective-orders/${opportunity.id}`} className="underline font-semibold text-clay-700">
                  Open the public page
                </Link>
              }
            />
          ) : (
            <ul className="mt-2 space-y-3">
              {contributions.map((c) => {
                const mineRow = c.producerProfileId === actor.profileId;
                const canWrite = mineRow || isCoordinator;
                return (
                  <li key={c.id} className="rounded-lg border border-ink-100 p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <div className="font-semibold text-ink-900">
                          {names.get(c.producerProfileId) ?? 'Account no longer available'}
                          {mineRow && <span className="ml-2 text-xs text-ink-500">(your contribution)</span>}
                        </div>
                        <div className="text-sm text-ink-700">
                          {c.quantity} {opportunity.unitOfSale}
                        </div>
                      </div>
                      <Badge tone={c.status === 'confirmed' ? 'success' : c.status === 'withdrawn' ? 'danger' : 'warning'}>
                        {c.status}
                      </Badge>
                    </div>
                    {c.note && <p className="mt-1 text-sm text-ink-700 whitespace-pre-line">{c.note}</p>}
                    <p className="mt-1 text-xs text-ink-500">
                      Added {new Date(c.createdAt).toLocaleString()}
                      {c.updatedAt ? ` · last change ${new Date(c.updatedAt).toLocaleString()}` : ''}
                    </p>
                    {canWrite ? (
                      <ContributionActions
                        contribution={c}
                        unitOfSale={opportunity.unitOfSale}
                        canConfirm={isCoordinator}
                        acceptsChanges={acceptsChanges}
                      />
                    ) : (
                      <p className="mt-2 text-xs text-ink-500">
                        Only the member who committed this quantity, the coordinator, or an administrator can change it.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-500">
            A withdrawal removes the quantity from the aggregate total at once, so the figure above is what a buyer would be
            told today. Quantities are validated against the committing account’s available stock in this category, and the
            database applies the same rule, so two people cannot oversell the same basket.
          </p>
        </CardBody>
      </Card>

      {isCoordinator && (
        <Card>
          <CardBody>
            <details>
              <summary className="cursor-pointer font-semibold text-ink-900">Edit the opportunity itself</summary>
              <div className="mt-3">
                <OpportunityForm
                  key={opportunity.id}
                  categories={categories}
                  groups={myGroups.length > 0 ? myGroups : groups.filter((g) => g.id === opportunity.organizingGroupId)}
                  initial={initial}
                />
              </div>
            </details>
          </CardBody>
        </Card>
      )}

      <p className="text-sm">
        <Link href="/dashboard/collective-orders" className="underline font-semibold text-clay-700">
          Back to group selling
        </Link>
      </p>
    </Section>
  );
}

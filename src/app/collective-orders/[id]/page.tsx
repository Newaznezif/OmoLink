import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { getSessionActor, getSessionProfile } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import type { TranslationKey } from '@/lib/i18n';
import { getLanguage, getT } from '@/lib/i18n/server';
import { listingTexts } from '@/lib/i18n/catalog';
import type { CollectiveOpportunity, GroupContribution } from '@/lib/types';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';
import { SampleTag, VerificationLabel } from '@/components/status-labels';
import { ContributeForm } from '@/components/contribute-form';
import { GroupOrderBuyer } from '@/components/group-order-buyer';
import { TransportCalculator } from '@/components/transport-calculator';

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

export default async function CollectiveOpportunityPage({ params }: { params: { id: string } }) {
  const t = getT();
  const lang = getLanguage();
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

  // A buyer buys a product, not a category, so the products that back this pool
  // are the participants' own published listings in the same category. Prices and
  // availability are read from those records, never from anything the visitor sends.
  const listings = await repo.listPublicListings();
  const buyableProducts = listings
    .filter((l) => l.categoryId === opportunity.categoryId && participants.has(l.producerId) && l.availability !== 'unavailable')
    .map((l) => ({
      id: l.id,
      title: listingTexts(lang, l).title.text,
      sellerId: l.producerId,
      sellerName: producerById.get(l.producerId)?.displayName ?? t('collective.sampleProducer'),
      unitPriceCents: l.unitPrice.cents,
      unitOfSale: l.unitOfSale,
      minOrderQuantity: l.minOrderQuantity,
      availableQuantity: l.availableQuantity,
      availability: l.availability
    }));

  // Exactly the stock rule the repository applies in contribute(), including the
  // draft listings it does not exclude, so the figure shown is the figure enforced.
  const myListings = sessionProfile
    ? (await repo.listListingsByProducer(sessionProfile.id)).filter(
        (l) => l.categoryId === opportunity.categoryId && l.availability !== 'unavailable'
      )
    : [];
  const myAvailableStock = myListings.reduce((sum, l) => sum + l.availableQuantity, 0);
  const myCommitted = contributions.find(
    (c) => c.producerProfileId === sessionProfile?.id && c.status !== 'withdrawn'
  )?.quantity ?? 0;
  const actor = await getSessionActor();
  const buyerRecordsPath = actor && actor.role === 'buyer' && actor.status === 'active' ? '/buyer/inquiries' : undefined;

  return (
    <Section eyebrow={t('collective.detailEyebrow', { category: category?.name ?? '' })} title={opportunity.title} actions={opportunity.isDemo ? <SampleTag /> : undefined}>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <div className="space-y-6">
          <Card>
            <CardBody>
              <p className="text-ink-700">{opportunity.description}</p>
              <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                <Info label={t('collective.organisingGroup')} value={group?.name ?? t('collective.independentCoordinator')} />
                <Info
                  label={t('collective.coordinator')}
                  value={
                    coordinator ? (
                      <Link href={`/producers/${coordinator.id}`} className="underline">
                        {coordinator.displayName}
                      </Link>
                    ) : (
                      t('collective.notSpecified')
                    )
                  }
                />
                <Info label={t('collective.pickupPlan')} value={opportunity.pickupPlan} />
                <Info label={t('collective.transportPlan')} value={opportunity.transportPlan ?? t('collective.transportPlanNone')} />
                <Info label={t('collective.orderDeadline')} value={opportunity.orderDeadline ?? t('collective.noDeadline')} />
                <Info label={t('reports.status')} value={<Badge tone="success">{t(OPPORTUNITY_STATUS_KEYS[opportunity.status])}</Badge>} />
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
                <h2 className="font-semibold text-ink-900">{t('collective.progress')}</h2>
                <span className="text-sm text-ink-700">
                  <strong>{opportunity.aggregateQuantity}</strong>
                  {t('collective.progressTail', { target: opportunity.targetQuantity, unit: opportunity.unitOfSale })}
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
                    {t('collective.stillNeeded', { count: remaining, unit: opportunity.unitOfSale })}.{' '}
                    {t('collective.participantsSoFar')}{' '}
                    <strong>{participants.size}</strong>.
                  </>
                ) : (
                  <>{t('collective.targetReachedNote')}</>
                )}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink-900">{t('collective.buyTitle')}</h2>
              <p className="mt-1 text-sm text-ink-700">{t('collective.buyDescription')}</p>
              <div className="mt-4">
                <GroupOrderBuyer lang={lang} products={buyableProducts} recordsPath={buyerRecordsPath} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink-900 mb-3">{t('collective.recordedContributions')}</h2>
              {contributions.length === 0 ? (
                <Empty title={t('collective.contributionsEmptyTitle')} body={t('collective.contributionsEmptyBody')} />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-500">
                      <th className="font-medium py-2">{t('collective.producerHeader')}</th>
                      <th className="font-medium py-2">{t('receipt.quantity')}</th>
                      <th className="font-medium py-2">{t('reports.status')}</th>
                      <th className="font-medium py-2">{t('collective.noteHeader')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contributions.map((c) => (
                      <tr key={c.id} className="border-t border-ink-100">
                        <td className="py-2">
                          <Link href={`/producers/${c.producerProfileId}`} className="underline">
                            {producerById.get(c.producerProfileId)?.displayName ?? t('collective.sampleProducer')}
                          </Link>
                        </td>
                        <td className="py-2">
                          {c.quantity} {opportunity.unitOfSale}
                        </td>
                        <td className="py-2">
                          <Badge tone={c.status === 'confirmed' ? 'success' : c.status === 'withdrawn' ? 'danger' : 'warning'}>
                            {t(CONTRIBUTION_STATUS_KEYS[c.status])}
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
            lang={lang}
            opportunityId={opportunity.id}
            unitOfSale={opportunity.unitOfSale}
            totalCostCents={transportPlan?.totalCostCents ?? 0}
            totalQuantity={opportunity.aggregateQuantity}
            quoteConfirmed={false}
            contributions={contributions.map((c) => ({ producerProfileId: c.producerProfileId, quantity: c.quantity, name: producerById.get(c.producerProfileId)?.displayName ?? t('collective.sampleProducer') }))}
          />
        </div>

        <aside className="space-y-4">
          {sessionProfile ? (
            <ContributeForm
              lang={lang}
              opportunity={{
                id: opportunity.id,
                unitOfSale: opportunity.unitOfSale,
                targetQuantity: opportunity.targetQuantity,
                aggregateQuantity: opportunity.aggregateQuantity,
                status: opportunity.status
              }}
              producer={{ displayName: sessionProfile.displayName }}
              stock={{
                items: myListings.map((l) => ({
                  id: l.id,
                  title: listingTexts(lang, l).title.text,
                  availableQuantity: l.availableQuantity,
                  unitOfSale: l.unitOfSale
                })),
                available: myAvailableStock,
                committed: myCommitted
              }}
            />
          ) : (
            <Card>
              <CardBody>
                <h2 className="font-semibold text-ink-900">{t('collective.contributeAsProducer')}</h2>
                <p className="mt-1 text-sm text-ink-700">
                  {t('collective.signInProducerBody')}
                </p>
                <Link href="/sign-in" className="mt-3 inline-block font-semibold text-clay-800 underline">
                  {t('collective.signInDemoProducer')}
                </Link>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody>
              <h3 className="font-semibold text-ink-900 mb-1">{t('collective.indicativePrice')}</h3>
              <p className="text-sm text-ink-700">
                {opportunity.indicativeGroupPrice ? (
                  <>
                    <strong>{formatMoney(opportunity.indicativeGroupPrice)}</strong>{' '}
                    {t('collective.indicativePriceBody', { unit: opportunity.unitOfSale })}
                  </>
                ) : opportunity.buyerOfferedPrice ? (
                  <>
                    {t('collective.buyerOfferPrefix')} <strong>{formatMoney(opportunity.buyerOfferedPrice)}</strong>{' '}
                    {t('collective.buyerOfferTail', { unit: opportunity.unitOfSale })}
                  </>
                ) : (
                  t('collective.priceNotPublished')
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

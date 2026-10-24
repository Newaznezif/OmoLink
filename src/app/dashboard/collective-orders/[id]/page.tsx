import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { formatMoney } from '@/lib/money';
import type { TranslationKey } from '@/lib/i18n';
import { getLanguage, getT } from '@/lib/i18n/server';
import type { CollectiveOpportunity, GroupContribution } from '@/lib/types';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';
import { SampleTag } from '@/components/status-labels';
import { OpportunityForm, type OpportunityFormValues } from '@/components/opportunity-form';
import { ContributionActions, OpportunityStatusPicker } from '@/components/collective-manage';

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

export default async function ManageOpportunityPage({ params }: { params: { id: string } }) {
  const t = getT();
  const lang = getLanguage();
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
      eyebrow={t('groupSelling.eyebrow')}
      title={opportunity.title}
      description={t('groupSelling.detailDescription')}
    >
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={opportunity.status === 'open' ? 'success' : opportunity.status === 'cancelled' ? 'danger' : 'neutral'}>
              {t(OPPORTUNITY_STATUS_KEYS[opportunity.status])}
            </Badge>
            {opportunity.isDemo && <SampleTag />}
            <Link href={`/collective-orders/${opportunity.id}`} className="ml-auto underline text-sm font-semibold text-clay-700">
              {t('groupSelling.seePublicPage')}
            </Link>
          </div>

          <dl className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-500">{t('groupSelling.targetLabel')}</dt>
              <dd className="text-ink-900">
                {opportunity.targetQuantity} {opportunity.unitOfSale}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">{t('groupSelling.committedNow')}</dt>
              <dd className="text-ink-900">
                {t('groupSelling.committedFromMembers', { committed, unit: opportunity.unitOfSale, count: active.length })}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">{t('groupSelling.confirmedByCoordinator')}</dt>
              <dd className="text-ink-900">
                {confirmed} {opportunity.unitOfSale}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">{t('collective.orderDeadline')}</dt>
              <dd className="text-ink-900">{opportunity.orderDeadline || t('groupSelling.notSet')}</dd>
            </div>
            <div>
              <dt className="text-ink-500">{t('groupSelling.indicativePriceLabel')}</dt>
              <dd className="text-ink-900">
                {opportunity.indicativeGroupPrice ? t('groupSelling.perUnit', { amount: formatMoney(opportunity.indicativeGroupPrice), unit: opportunity.unitOfSale }) : t('groupSelling.notAgreedYet')}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">{t('groupSelling.buyerOfferedLabel')}</dt>
              <dd className="text-ink-900">
                {opportunity.buyerOfferedPrice ? t('groupSelling.perUnit', { amount: formatMoney(opportunity.buyerOfferedPrice), unit: opportunity.unitOfSale }) : t('groupSelling.notOffered')}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-sm text-ink-700 whitespace-pre-line">{opportunity.description}</p>
          <p className="mt-2 text-sm text-ink-700">
            <strong>{t('groupSelling.pickupLabel')}</strong> {opportunity.pickupPlan}
          </p>
          {opportunity.transportPlan && (
            <p className="mt-1 text-sm text-ink-700">
              <strong>{t('groupSelling.transportLabel')}</strong> {opportunity.transportPlan}
            </p>
          )}
          <p className="mt-2 text-xs text-ink-500">
            {t('groupSelling.priceNote')}
          </p>
        </CardBody>
      </Card>

      {isCoordinator ? (
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('groupSelling.stateHeading')}</h2>
            <p className="mt-1 text-sm text-ink-700">
              {t('groupSelling.stateHelp')}
            </p>
            <div className="mt-3">
              <OpportunityStatusPicker lang={lang} opportunity={opportunity} />
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('groupSelling.notCoordinatorHeading')}</h2>
            <p className="mt-2 text-sm text-ink-700">
              {t('groupSelling.notCoordinatorLead')}
              {names.get(opportunity.coordinatorProfileId) ? ` (${names.get(opportunity.coordinatorProfileId)})` : ''}
              {t('groupSelling.notCoordinatorTail')}
            </p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('groupSelling.contributionsHeading')}</h2>
          {contributions.length === 0 ? (
            <Empty
              title={t('groupSelling.noContribTitle')}
              body={t('groupSelling.noContribBody')}
              action={
                <Link href={`/collective-orders/${opportunity.id}`} className="underline font-semibold text-clay-700">
                  {t('groupSelling.openPublicPage')}
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
                          {names.get(c.producerProfileId) ?? t('groupSelling.accountUnavailable')}
                          {mineRow && <span className="ml-2 text-xs text-ink-500">{t('groupSelling.yourContribution')}</span>}
                        </div>
                        <div className="text-sm text-ink-700">
                          {c.quantity} {opportunity.unitOfSale}
                        </div>
                      </div>
                      <Badge tone={c.status === 'confirmed' ? 'success' : c.status === 'withdrawn' ? 'danger' : 'warning'}>
                        {t(CONTRIBUTION_STATUS_KEYS[c.status])}
                      </Badge>
                    </div>
                    {c.note && <p className="mt-1 text-sm text-ink-700 whitespace-pre-line">{c.note}</p>}
                    <p className="mt-1 text-xs text-ink-500">
                      {t('groupSelling.addedAt', { when: new Date(c.createdAt).toLocaleString() })}
                      {c.updatedAt ? t('groupSelling.lastChangeAt', { when: new Date(c.updatedAt).toLocaleString() }) : ''}
                    </p>
                    {canWrite ? (
                      <ContributionActions
                        lang={lang}
                        contribution={c}
                        unitOfSale={opportunity.unitOfSale}
                        canConfirm={isCoordinator}
                        acceptsChanges={acceptsChanges}
                      />
                    ) : (
                      <p className="mt-2 text-xs text-ink-500">
                        {t('groupSelling.onlyOwnerChange')}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-500">
            {t('groupSelling.withdrawalNote')}
          </p>
        </CardBody>
      </Card>

      {isCoordinator && (
        <Card>
          <CardBody>
            <details>
              <summary className="cursor-pointer font-semibold text-ink-900">{t('groupSelling.editOpportunitySummary')}</summary>
              <div className="mt-3">
                <OpportunityForm
                  key={opportunity.id}
                  lang={lang}
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
          {t('groupSelling.backToGroupSelling')}
        </Link>
      </p>
    </Section>
  );
}

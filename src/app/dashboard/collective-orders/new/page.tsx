import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { getLanguage, getT } from '@/lib/i18n/server';
import { Badge, Card, CardBody, Section } from '@/components/ui';
import { OpportunityForm } from '@/components/opportunity-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('groupSelling.openAction'),
    description: t('groupSelling.openMetaDescription')
  };
}

export default async function NewOpportunityPage() {
  const t = getT();
  const lang = getLanguage();
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  const [profile, categories, groups] = await Promise.all([
    repo.getProfile(actor.profileId),
    repo.listCategories(),
    repo.listGroups()
  ]);
  const myGroups = groups.filter(
    (g) => g.coordinatorProfileId === actor.profileId || (profile?.groupIds ?? []).includes(g.id)
  );
  const canCoordinate = actor.role === 'coordinator' && myGroups.length > 0;

  if (!canCoordinate) {
    return (
      <Section
        eyebrow={t('groupSelling.eyebrow')}
        title={t('groupSelling.coordinatorPowerTitle')}
        description={t('groupSelling.coordinatorPowerDescription')}
      >
        <Card>
          <CardBody>
            {actor.role !== 'coordinator' ? (
              <p className="text-sm text-ink-700">
                {t('groupSelling.accountTypeLead')} <strong>{actor.role}</strong>
                {t('groupSelling.accountTypeTail')}
              </p>
            ) : (
              <p className="text-sm text-ink-700">
                {t('groupSelling.coordinatorNoGroup')}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <Link href="/dashboard/collective-orders" className="underline font-semibold text-clay-700">
                {t('groupSelling.myContributions')}
              </Link>
              <Link href="/collective-orders" className="underline font-semibold text-clay-700">
                {t('groupSelling.browseOpenGroupOrders')}
              </Link>
              <Link href="/contact" className="underline font-semibold text-clay-700">
                {t('groupSelling.contactAdmin')}
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="neutral">{t('groupSelling.roleBadge', { role: actor.role })}</Badge>
              <Badge tone="neutral">{t('groupSelling.groupsBadge', { count: myGroups.length })}</Badge>
            </div>
          </CardBody>
        </Card>
      </Section>
    );
  }

  return (
    <Section
      eyebrow={t('groupSelling.eyebrow')}
      title={t('groupSelling.openAction')}
      description={t('groupSelling.newDescription')}
    >
      <OpportunityForm lang={lang} categories={categories} groups={myGroups} />
    </Section>
  );
}

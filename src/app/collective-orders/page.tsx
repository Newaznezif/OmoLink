import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { getT } from '@/lib/i18n/server';
import { CollectiveOpportunityCard } from '@/components/collective-card';
import { Empty, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function CollectiveOrdersPage() {
  const t = getT();
  const opportunities = await getRepo().listOpportunities();
  return (
    <Section
      eyebrow={t('home.collectiveEyebrow')}
      title={t('collective.listTitle')}
      description={t('collective.listDescription')}
    >
      {opportunities.length === 0 ? (
        <Empty
          title={t('collective.emptyTitle')}
          body={t('collective.emptyBody')}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {opportunities.map((o) => (
            <div key={o.id}>
              <CollectiveOpportunityCard opportunity={o} />
              <div className="mt-2 text-sm">
                <Link href={`/collective-orders/${o.id}`} className="text-clay-800 underline font-semibold">
                  {t('collective.openDetails')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

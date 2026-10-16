import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { CollectiveOpportunityCard } from '@/components/collective-card';
import { Empty, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function CollectiveOrdersPage() {
  const opportunities = await getRepo().listOpportunities();
  return (
    <Section
      eyebrow="Collective selling"
      title="Group orders open now"
      description="Producer groups pool quantities to serve bulk buyers such as hotels, retailers, schools and other institutions. Every opportunity below is a sample; contribute an available quantity and the aggregate updates immediately."
    >
      {opportunities.length === 0 ? (
        <Empty
          title="No opportunities yet"
          body="When a coordinator opens a collective order for a producer group it will appear here. This is a demo build; real opportunities would be organised by a community coordinator."
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {opportunities.map((o) => (
            <div key={o.id}>
              <CollectiveOpportunityCard opportunity={o} />
              <div className="mt-2 text-sm">
                <Link href={`/collective-orders/${o.id}`} className="text-clay-800 underline font-semibold">
                  Open opportunity details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

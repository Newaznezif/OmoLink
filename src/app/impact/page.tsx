import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ImpactPage() {
  const stats = await getRepo().aggregateStats();
  return (
    <Section eyebrow="Impact" title="Impact dashboard design" description="These metrics describe the shape of the data model. Every value below is generated from clearly labelled sample data. Nothing here is a measured result.">
      {stats.producers === 0 ? (
        <Empty title="No data yet" body="The demo store has been cleared. Reload the page to reset it." />
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Active producers (sample)" value={stats.producers} />
          <Metric label="Published listings" value={stats.listings} />
          <Metric label="Buyer inquiries" value={stats.inquiries} />
          <Metric label="Collective orders" value={stats.opportunities} />
          <Metric label="Collective quantity pooled" value={stats.collectiveContributed} />
          <Metric label="Collective target" value={stats.collectiveTarget} />
          <Metric label="Verified profiles" value={stats.verified} />
          <Card>
            <CardBody>
              <h3 className="text-xs uppercase text-ink-500 font-semibold">Completed transactions</h3>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-3xl font-black text-ink-900">—</span>
                <Badge tone="warning">Requires reliable data</Badge>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                We do not fabricate transaction counts. Payments are not processed here, and the pilot has not yet
                validated any real completion events.
              </p>
            </CardBody>
          </Card>
        </div>
      )}

      <div className="mt-6 grid md:grid-cols-2 gap-4 text-sm">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">How a pilot should measure net producer benefit</h2>
            <ol className="mt-2 list-decimal pl-5 space-y-1 text-ink-700">
              <li>Record gross sale value per completed transaction.</li>
              <li>Deduct transport, packaging and coordination fees the producer actually paid.</li>
              <li>Deduct the platform fee if one is validated.</li>
              <li>Compare against a pre-participation baseline collected with informed consent.</li>
              <li>Report distributions (median and interquartile range), not only averages.</li>
            </ol>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">What we will not show</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-ink-700">
              <li>Fabricated impact statistics.</li>
              <li>Invented producer testimonials or endorsements.</li>
              <li>Research findings attributed to partners without their review.</li>
              <li>Claims that an origin or quality attribute is “independently verified” without an actual verification process.</li>
            </ul>
            <p className="mt-3 text-xs text-ink-500">
              Explore the code and data model in{' '}
              <Link href="/how-it-works" className="underline">
                How it works
              </Link>
              .
            </p>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardBody>
        <h3 className="text-xs uppercase text-ink-500 font-semibold">{label}</h3>
        <div className="mt-1 text-3xl font-black text-ink-900">{value}</div>
        <p className="mt-1 text-xs text-ink-500">Sample data — not a measured result.</p>
      </CardBody>
    </Card>
  );
}

import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { Badge, Card, CardBody, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const repo = getRepo();
  const [stats, reports, verifications] = await Promise.all([
    repo.aggregateStats(),
    repo.listReports(),
    repo.listVerificationReviews()
  ]);
  const pendingProfiles = (await repo.listPublicProfiles()).filter((p) => p.verification === 'pending_review');

  return (
    <Section
      eyebrow="Administration"
      title="Platform overview"
      description="Simulated admin area. Every action here is labelled as a demo — no real producers, verifications, or removals take place."
    >
      <div className="mb-4 flex gap-2 flex-wrap">
        <Link href="/admin/verifications" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold hover:bg-clay-50">
          Pending verifications ({pendingProfiles.length})
        </Link>
        <Link href="/admin/reports" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold hover:bg-clay-50">
          Reports ({reports.length})
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Sample platform activity</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <Row label="Active producers (sample)" value={stats.producers} />
              <Row label="Published listings" value={stats.listings} />
              <Row label="Producer groups" value={stats.groups} />
              <Row label="Inquiries received" value={stats.inquiries} />
              <Row label="Collective opportunities" value={stats.opportunities} />
              <Row label="Collective quantity contributed" value={stats.collectiveContributed} />
              <Row label="Verified profiles" value={stats.verified} />
            </dl>
            <p className="mt-2 text-xs text-ink-500">
              Demo data. Not measured real-world impact. Impact metrics require reliable transaction data before they
              become meaningful.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Recent verification decisions</h2>
            {verifications.length === 0 ? (
              <p className="text-sm text-ink-700">No verification decisions recorded yet in this session.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {verifications.slice(0, 5).map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2">
                    <span>{v.profileId}</span>
                    <Badge tone={v.decision === 'approved' ? 'success' : v.decision === 'rejected' ? 'danger' : 'warning'}>
                      {v.decision}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Possible business model</h2>
            <ul className="mt-2 space-y-1 text-sm text-ink-700 list-disc pl-5">
              <li>Producer registration and basic listing remain free during the pilot.</li>
              <li>Transparent fee on completed transactions only after validation.</li>
              <li>Optional paid tools for hotels, retailers or institutional buyers.</li>
              <li>Transparent logistics coordination fee when it provides real value.</li>
              <li>Never sell producer personal data. Never charge vulnerable producers merely to appear in search results.</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-semibold text-ink-900">{value}</dd>
    </div>
  );
}

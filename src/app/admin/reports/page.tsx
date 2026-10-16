import { getRepo } from '@/lib/repo';
import { Card, CardBody, Empty, Section, Badge } from '@/components/ui';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const reports = await getRepo().listReports();
  const listings = await getRepo().listPublicListings();
  const listingById = new Map(listings.map((l) => [l.id, l]));

  return (
    <Section eyebrow="Administration" title="Reported listings" description="Reports submitted by visitors. Resolve them through community discussion and documented platform rules. Every action here is simulated for the demo.">
      {reports.length === 0 ? (
        <Empty title="No reports yet" body="Reports submitted from listing pages will appear here." />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id}>
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">
                      <Link href={`/listings/${r.listingId}`} className="underline">
                        {listingById.get(r.listingId)?.title ?? r.listingId}
                      </Link>
                    </h3>
                    <Badge tone={r.status === 'resolved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}>
                      {r.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-ink-700">{r.reason}</p>
                  <div className="mt-2 text-xs text-ink-500">
                    Reporter: {r.reporterName} · {r.reporterContact} · {new Date(r.createdAt).toLocaleString()}
                  </div>
                  {r.adminNote && <p className="mt-2 text-sm text-ink-700">Reviewer note: {r.adminNote}</p>}
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { AdminSection, BackField } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Empty, Field, Input, Select } from '@/components/ui';
import type { ListingReport } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

const STATUSES: ListingReport['status'][] = ['open', 'reviewing', 'resolved', 'rejected'];

export default async function AdminReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const text = (key: string): string => (typeof searchParams[key] === 'string' ? (searchParams[key] as string) : '');
  const repo = getRepo();
  const [reports, listings] = await Promise.all([repo.listReports(), repo.listAllListings()]);
  const listingById = new Map(listings.map((l) => [l.id, l]));

  const status = text('status');
  const q = text('q').trim().toLowerCase();
  const rows = reports
    .filter((r) => {
      if (status && r.status !== status) return false;
      if (!q) return true;
      return [r.reason, r.reporterName, listingById.get(r.listingId)?.title ?? ''].join(' ').toLowerCase().includes(q);
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const openCount = reports.filter((r) => r.status === 'open' || r.status === 'reviewing').length;

  return (
    <AdminSection
      title="Reported listings"
      description={`${openCount} of ${reports.length} ${reports.length === 1 ? 'report is' : 'reports are'} awaiting a decision. A report is a signal from a visitor or an affected party — it is not proof. Decide it against the published community guidelines and record the reason; the outcome is stored with your account name in the audit log. Unpublishing or archiving the listing itself happens on the Listings tab, where the producer’s work and history are preserved.`}
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label htmlFor="q" className="block text-sm font-semibold text-ink-900 mb-1">
                Search reason, reporter or listing
              </label>
              <Input id="q" name="q" defaultValue={text('q')} />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-ink-900 mb-1">
                Status
              </label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">All</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Link href="/admin/reports" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 text-sm font-semibold">
                Clear
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty
          title="No report matches"
          body="Reports arrive from the “report this listing” link on a public listing page. Nothing is seeded here to make the queue look busy."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const listing = listingById.get(r.listingId);
            return (
              <Card key={r.id}>
                <CardBody className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink-900">
                        <Link href={`/listings/${r.listingId}`} className="underline">
                          {listing?.title ?? r.listingId}
                        </Link>
                      </h3>
                      <Badge tone={tone(r.status)}>{r.status}</Badge>
                      {listing && !listing.published && <Badge tone="neutral">not in the marketplace</Badge>}
                      {listing?.archived && <Badge tone="neutral">archived</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-ink-500">
                      {r.reporterName} · {r.reporterContact} · {new Date(r.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm text-ink-700 whitespace-pre-line rounded-lg bg-clay-50 p-3">{r.reason}</p>
                    {r.adminNote && (
                      <p className="mt-2 text-sm text-ink-700">
                        <span className="font-semibold">Decision note:</span> {r.adminNote}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink-500">
                      Reporter contact is private to this queue. The guidelines explaining what a listing may claim are
                      on the community guidelines page.
                    </p>
                  </div>

                  <form method="post" action="/api/admin/reports" className="lg:w-72 shrink-0 space-y-2">
                    <BackField path="/admin/reports" />
                    <input type="hidden" name="reportId" value={r.id} />
                    <Field label="Decision" htmlFor={`status-${r.id}`}>
                      <Select id={`status-${r.id}`} name="status" defaultValue={r.status === 'open' ? 'reviewing' : r.status}>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Reason (required)" htmlFor={`note-${r.id}`}>
                      <Input id={`note-${r.id}`} name="note" defaultValue={r.adminNote ?? ''} maxLength={400} />
                    </Field>
                    <Button type="submit" size="sm">
                      Save decision
                    </Button>
                  </form>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">How a decision should be made</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>Read the listing as a buyer would, and check the claim against the producer’s own description.</li>
            <li>Where a report concerns a cultural or community matter, consult the guidelines and the people affected before removing anything.</li>
            <li>Prefer unpublishing with a recorded reason over deletion: deletion discards the inquiry history.</li>
            <li>“Resolved” and “rejected” both need a reason, so a later reviewer can see what was weighed.</li>
          </ul>
          <p className="mt-2 text-sm">
            <Link href="/community-guidelines" className="underline font-semibold text-clay-700">
              Open the community guidelines
            </Link>
          </p>
        </CardBody>
      </Card>
    </AdminSection>
  );
}

function tone(status: ListingReport['status']): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'resolved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'open') return 'warning';
  return 'neutral';
}

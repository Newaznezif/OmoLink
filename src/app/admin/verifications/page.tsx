import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { getSessionProfile } from '@/lib/session';
import { AdminSection } from '@/components/admin-shell';
import { Badge, Card, CardBody, Empty, SampleTag, VerificationLabel } from '@/components/ui';
import { VerificationAction } from '@/components/verification-action';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminVerificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const reviewer = await getSessionProfile();
  if (!reviewer) return null;
  const repo = getRepo();
  const [profiles, reviews, listings] = await Promise.all([
    repo.listAllProfiles(),
    repo.listVerificationReviews(),
    repo.listAllListings()
  ]);
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  // Anyone not yet verified is actionable; 'pending_review' first, then the rest.
  const pending = profiles
    .filter((p) => p.verification !== 'verified')
    .sort((a, b) => rank(a.verification) - rank(b.verification) || a.displayName.localeCompare(b.displayName));

  const listingCount = new Map<string, number>();
  for (const l of listings) listingCount.set(l.producerId, (listingCount.get(l.producerId) ?? 0) + 1);

  return (
    <AdminSection
      title="Verification queue"
      description="A verification badge says an administrator reviewed what the account states about itself. It is separate from whether a listing is published, and a producer cannot record a decision on their own profile — that is refused in the data layer, not only hidden here. No identity document is demanded or stored: this pilot’s checks are the profile, the listings and what the community says."
      searchParams={searchParams}
    >
      {isDemoMode() && (
        <p className="rounded-lg border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-800">
          <strong>Demo data.</strong> These accounts are sample records held in memory. Recording a decision really does
          change the sample profile’s status inside this app instance — it verifies nobody in the real world.
        </p>
      )}

      {pending.length === 0 ? (
        <Empty title="Nothing awaiting a decision" body="Every stored account already carries a verification outcome." />
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink-900">
                        <Link href={`/admin/users/${p.id}`} className="underline">
                          {p.displayName}
                        </Link>
                      </h3>
                      <VerificationLabel status={p.verification} isDemo={p.isDemo} />
                      <Badge tone="neutral">{p.role.replace(/_/g, ' ')}</Badge>
                      {p.status === 'suspended' && <Badge tone="danger">suspended</Badge>}
                      {p.isDemo && <SampleTag />}
                    </div>
                    <p className="mt-1 text-sm text-ink-500">
                      {p.community} · {p.operatingArea} · {p.producerType.replace(/_/g, ' ')} ·{' '}
                      {listingCount.get(p.id) ?? 0} {listingCount.get(p.id) === 1 ? 'listing' : 'listings'}
                    </p>
                  </div>
                  <p className="text-xs text-ink-500">Account id {p.id}</p>
                </div>
                <p className="mt-2 text-sm text-ink-700">{p.shortBio}</p>
                {p.verificationNote && (
                  <p className="mt-2 text-sm text-ink-700">
                    <span className="font-semibold">Note on the profile:</span> {p.verificationNote}
                  </p>
                )}
                {p.id === reviewer.id ? (
                  <p className="mt-3 rounded-lg border border-ochre-200 bg-ochre-50 px-3 py-2 text-sm text-ochre-800">
                    This is your own account. The data layer refuses a self-recorded decision, so there is no action to
                    take here.
                  </p>
                ) : (
                  <div className="mt-3">
                    <VerificationAction profileId={p.id} sampleRecords={isDemoMode()} />
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Decision log</h2>
          {reviews.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">
              No decision has been recorded yet, so the log is empty rather than pre-filled.
            </p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {reviews.map((v) => (
                <li key={v.id} className="border-b border-ink-100 last:border-0 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-ink-500">{new Date(v.createdAt).toLocaleString()}</span>
                    <Badge tone={v.decision === 'approved' ? 'success' : v.decision === 'rejected' ? 'danger' : 'warning'}>
                      {v.decision.replace(/_/g, ' ')}
                    </Badge>
                    <span className="font-semibold text-ink-900">
                      {profileById.get(v.profileId)?.displayName ?? v.profileId}
                    </span>
                  </div>
                  <p className="mt-1 text-ink-700">{v.reason}</p>
                  <p className="text-xs text-ink-500">
                    Recorded by {profileById.get(v.reviewerProfileId)?.displayName ?? v.reviewerProfileId}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm">
            <Link href="/admin/audit-logs" className="underline font-semibold text-clay-700">
              Audit log of administrative changes
            </Link>
          </p>
        </CardBody>
      </Card>
    </AdminSection>
  );
}

function rank(status: string): number {
  if (status === 'pending_review') return 0;
  if (status === 'unverified') return 1;
  return 2;
}

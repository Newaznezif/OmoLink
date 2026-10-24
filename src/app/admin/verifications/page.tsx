import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { getSessionProfile } from '@/lib/session';
import { AdminSection } from '@/components/admin-shell';
import { Badge, Card, CardBody, Empty } from '@/components/ui';
import { SampleTag, VerificationLabel } from '@/components/status-labels';
import { VerificationAction } from '@/components/verification-action';
import { getLanguage, getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminVerificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const t = getT();
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
      title={t('verificationAdmin.title')}
      description={t('verificationAdmin.description')}
      searchParams={searchParams}
    >
      {isDemoMode() && (
        <p className="rounded-lg border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-800">
          <strong>{t('analytics.demoTitle')}</strong> {t('verificationAdmin.demoBody')}
        </p>
      )}

      {pending.length === 0 ? (
        <Empty title={t('verificationAdmin.emptyTitle')} body={t('verificationAdmin.emptyBody')} />
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
                      {p.status === 'suspended' && <Badge tone="danger">{t('accountSettings.wordSuspended')}</Badge>}
                      {p.isDemo && <SampleTag />}
                    </div>
                    <p className="mt-1 text-sm text-ink-500">
                      {p.community} · {p.operatingArea} · {p.producerType.replace(/_/g, ' ')} ·{' '}
                      {t((listingCount.get(p.id) ?? 0) === 1 ? 'producers.listingOne' : 'producers.listingMany', { count: listingCount.get(p.id) ?? 0 })}
                    </p>
                  </div>
                  <p className="text-xs text-ink-500">{t('verificationAdmin.accountId', { id: p.id })}</p>
                </div>
                <p className="mt-2 text-sm text-ink-700">{p.shortBio}</p>
                {p.verificationNote && (
                  <p className="mt-2 text-sm text-ink-700">
                    <span className="font-semibold">{t('verificationAdmin.profileNote')}</span> {p.verificationNote}
                  </p>
                )}
                {p.id === reviewer.id ? (
                  <p className="mt-3 rounded-lg border border-ochre-200 bg-ochre-50 px-3 py-2 text-sm text-ochre-800">
                    {t('verificationAdmin.selfAccount')}
                  </p>
                ) : (
                  <div className="mt-3">
                    <VerificationAction lang={getLanguage()} profileId={p.id} sampleRecords={isDemoMode()} />
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('verificationAdmin.decisionLogTitle')}</h2>
          {reviews.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">
              {t('verificationAdmin.decisionLogEmpty')}
            </p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {reviews.map((v) => (
                <li key={v.id} className="border-b border-ink-100 last:border-0 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-ink-500">{new Date(v.createdAt).toLocaleString()}</span>
                    <Badge tone={v.decision === 'approved' ? 'success' : v.decision === 'rejected' ? 'danger' : 'warning'}>
                      {t(`verificationAdmin.decision.${v.decision}`)}
                    </Badge>
                    <span className="font-semibold text-ink-900">
                      {profileById.get(v.profileId)?.displayName ?? v.profileId}
                    </span>
                  </div>
                  <p className="mt-1 text-ink-700">{v.reason}</p>
                  <p className="text-xs text-ink-500">
                    {t('verificationAdmin.recordedBy', { name: profileById.get(v.reviewerProfileId)?.displayName ?? v.reviewerProfileId })}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm">
            <Link href="/admin/audit-logs" className="underline font-semibold text-clay-700">
              {t('verificationAdmin.auditLink')}
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

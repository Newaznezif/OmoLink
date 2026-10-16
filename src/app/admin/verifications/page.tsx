import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { Card, CardBody, Empty, Section, VerificationLabel } from '@/components/ui';
import { VerificationAction } from '@/components/verification-action';

export const dynamic = 'force-dynamic';

export default async function AdminVerificationsPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const repo = getRepo();
  const pending = (await repo.listPublicProfiles()).filter((p) => p.verification !== 'verified');
  const reviews = await repo.listVerificationReviews();

  return (
    <Section eyebrow="Administration" title="Verification queue" description="Approving or rejecting a profile here is simulated for the demo. The real workflow requires authorised reviewers and a defined verification procedure.">
      {pending.length === 0 ? (
        <Empty title="No pending profiles" body="Every sample profile in the store is already verified." />
      ) : (
        <ul className="space-y-3">
          {pending.map((p) => (
            <li key={p.id}>
              <Card>
                <CardBody>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-ink-900">{p.displayName}</h3>
                      <p className="text-sm text-ink-500">{p.community}</p>
                    </div>
                    <VerificationLabel status={p.verification} isDemo={p.isDemo} />
                  </div>
                  <p className="mt-2 text-sm text-ink-700">{p.shortBio}</p>
                  <div className="mt-3">
                    <VerificationAction profileId={p.id} simulated={profile.isDemo} />
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <h2 className="text-xl font-bold text-ink-900 mb-2">Decision log</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-ink-500">No decisions recorded in this session.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {reviews.map((v) => (
              <li key={v.id}>
                <span className="font-mono text-xs text-ink-500">{new Date(v.createdAt).toLocaleString()}</span> ·{' '}
                {v.profileId} → <strong>{v.decision}</strong> — {v.reason}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

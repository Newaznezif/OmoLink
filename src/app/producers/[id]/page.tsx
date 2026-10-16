import { notFound } from 'next/navigation';
import { getRepo } from '@/lib/repo';
import { ListingCard } from '@/components/listing-card';
import { Badge, Empty, SampleTag, Section, VerificationLabel } from '@/components/ui';
import { QrCode } from '@/components/qr-code';

export const dynamic = 'force-dynamic';

export default async function ProducerPage({ params }: { params: { id: string } }) {
  const repo = getRepo();
  const profile = await repo.getProfile(params.id);
  if (!profile) notFound();
  const listings = (await repo.listListingsByProducer(profile.id)).filter((l) => l.published);
  const groups = await repo.listGroups();
  const memberOf = groups.filter((g) => g.memberProfileIds.includes(profile.id));
  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/producers/${profile.id}`;

  return (
    <Section
      eyebrow={profile.producerType.replace('_', ' ')}
      title={profile.displayName}
      actions={
        <>
          <VerificationLabel status={profile.verification} isDemo={profile.isDemo} />
          {profile.isDemo && <SampleTag />}
        </>
      }
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="space-y-6">
          <article className="bg-white border border-ink-100 rounded-2xl card-shadow p-5">
            <h2 className="font-semibold text-ink-900 mb-2">Profile</h2>
            <p className="text-ink-700">{profile.shortBio}</p>
            <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-ink-500">Community</dt>
                <dd className="text-ink-900">{profile.community}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Operating area</dt>
                <dd className="text-ink-900">{profile.operatingArea}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Preferred language</dt>
                <dd className="text-ink-900">{profile.preferredLanguage}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Contact on platform</dt>
                <dd className="text-ink-900">{profile.contactMethod.kind === 'in_app' ? 'In-app inquiry only' : profile.contactMethod.kind}</dd>
              </div>
            </dl>
            {memberOf.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-ink-900 mb-2">Groups</h3>
                <ul className="flex flex-wrap gap-2">
                  {memberOf.map((g) => (
                    <li key={g.id}>
                      <Badge tone="info">{g.name}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile.verificationNote && (
              <p className="mt-4 text-sm text-ink-500 border-l-4 border-ochre-500 pl-3">
                {profile.verificationNote}
              </p>
            )}
          </article>

          <div>
            <h2 className="text-xl font-bold text-ink-900 mb-3">Published listings</h2>
            {listings.length === 0 ? (
              <Empty title="No published listings yet" body="This sample producer has not published any listings." />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            )}
          </div>
        </div>
        <aside>
          <div className="bg-white border border-ink-100 rounded-2xl card-shadow p-5">
            <h2 className="font-semibold text-ink-900 mb-2">Share profile</h2>
            <p className="text-sm text-ink-700 mb-3">
              Public URL with QR code. QR codes point to real public pages, never to private contact details or
              fabricated verification certificates.
            </p>
            <QrCode value={publicUrl} size={180} label="QR for this producer profile URL" />
            <div className="mt-2 break-all text-xs text-ink-500">{publicUrl}</div>
          </div>
        </aside>
      </div>
    </Section>
  );
}

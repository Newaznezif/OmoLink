import { notFound } from 'next/navigation';
import { getRepo } from '@/lib/repo';
import { getT } from '@/lib/i18n/server';
import type { Translator } from '@/lib/i18n';
import { ListingCard } from '@/components/listing-card';
import { Badge, Empty, Section } from '@/components/ui';
import { SampleTag, VerificationLabel } from '@/components/status-labels';
import { QrCode } from '@/components/qr-code';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * A seller who handed over a number for the pilot is reachable on it, so the
 * public profile shows exactly what they supplied. Consent is recorded on the
 * contact method itself: without it, or for an in-app account, the page offers
 * only the inquiry form and never reveals a number.
 */
function publicContact(profile: Profile, t: Translator): string {
  const method = profile.contactMethod;
  if (!('consent' in method) || !method.consent) return t('producers.inquiryOnly');
  return method.kind === 'phone'
    ? t('producers.phoneContact', { value: method.value })
    : t('producers.emailContact', { value: method.value });
}

export default async function ProducerPage({ params }: { params: { id: string } }) {
  const t = getT();
  const repo = getRepo();
  const profile = await repo.getProfile(params.id);
  // A buyer’s or an administrator’s profile is private: only a selling account
  // that consented to be published has a public page, whatever its id is.
  if (!profile || !profile.consentToPublish || (profile.role !== 'producer' && profile.role !== 'coordinator')) notFound();
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
            <h2 className="font-semibold text-ink-900 mb-2">{t('producers.profileHeading')}</h2>
            <p className="text-ink-700">{profile.shortBio}</p>
            <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-ink-500">{t('filter.community')}</dt>
                <dd className="text-ink-900">{profile.community}</dd>
              </div>
              <div>
                <dt className="text-ink-500">{t('producers.operatingAreaLabel')}</dt>
                <dd className="text-ink-900">{profile.operatingArea}</dd>
              </div>
              <div>
                <dt className="text-ink-500">{t('producers.preferredLanguageLabel')}</dt>
                <dd className="text-ink-900">{profile.preferredLanguage}</dd>
              </div>
              <div>
                <dt className="text-ink-500">{t('producers.contactOnPlatformLabel')}</dt>
                <dd className="text-ink-900">{publicContact(profile, t)}</dd>
              </div>
            </dl>
            {memberOf.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-ink-900 mb-2">{t('producers.groupsLabel')}</h3>
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
            <h2 className="text-xl font-bold text-ink-900 mb-3">{t('producers.publishedListingsHeading')}</h2>
            {listings.length === 0 ? (
              <Empty title={t('producers.noListingsTitle')} body={t('producers.noListingsBody')} />
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
            <h2 className="font-semibold text-ink-900 mb-2">{t('producers.shareProfileHeading')}</h2>
            <p className="text-sm text-ink-700 mb-3">
              {t('producers.shareProfileBody')}
            </p>
            <QrCode value={publicUrl} size={180} label={t('producers.shareQrAria')} />
            <div className="mt-2 break-all text-xs text-ink-500">{publicUrl}</div>
          </div>
        </aside>
      </div>
    </Section>
  );
}

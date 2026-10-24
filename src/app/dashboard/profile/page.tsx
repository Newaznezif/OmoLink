import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { requireArea } from '@/lib/area';
import { getT } from '@/lib/i18n/server';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';
import { VerificationLabel } from '@/components/status-labels';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('producerProfile.metaTitle'),
    description: t('producerProfile.metaDescription')
  };
}

/**
 * Read-only by design: the editable version of these fields lives on
 * /dashboard/settings, which posts through the validated /api/profile route.
 * Two write paths for one record is how a demo build ends up storing an
 * unvalidated bio.
 */
export default async function DashboardProfilePage() {
  const t = getT();
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  const [profile, categories, myListings] = await Promise.all([
    repo.getProfile(actor.profileId),
    repo.listCategories(),
    repo.listListingsByProducer(actor.profileId)
  ]);

  if (!profile) {
    return (
      <Section eyebrow={t('myListings.eyebrow')} title={t('nav.myProfile')}>
        <Empty
          title={t('accountSettings.noProfileTitle')}
          body={t('producerProfile.noProfileBody')}
          action={
            <Link href="/dashboard/settings" className="underline font-semibold text-clay-700">
              {t('producerProfile.openSettings')}
            </Link>
          }
        />
      </Section>
    );
  }

  const published = myListings.filter((l) => l.published && !l.archived);
  const myCategories = categories.filter((c) => profile.categories.includes(c.id));

  const contactLine =
    profile.contactMethod.kind === 'in_app'
      ? t('producerProfile.contactInApp')
      : 'consent' in profile.contactMethod && profile.contactMethod.consent
        ? profile.contactMethod.kind === 'email'
          ? t('producerProfile.contactEmail', { value: profile.contactMethod.value })
          : t('producerProfile.contactPhone', { value: profile.contactMethod.value })
        : t('producerProfile.contactWithheld');

  return (
    <Section
      eyebrow={t('myListings.eyebrow')}
      title={t('nav.myProfile')}
      description={t('producerProfile.sectionDescription')}
    >
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <VerificationLabel status={profile.verification} isDemo={profile.isDemo} />
            <Badge tone="neutral">{t('producerProfile.memberSince', { date: new Date(profile.createdAt).toLocaleDateString() })}</Badge>
          </div>

          <h2 className="font-semibold text-ink-900">{profile.displayName}</h2>
          <p className="mt-1 text-sm text-ink-500">
            {profile.producerType.replace(/_/g, ' ')} · {profile.community || t('producerProfile.communityMissing')} ·{' '}
            {profile.operatingArea || t('producerProfile.operatingAreaMissing')}
          </p>

          <div className="mt-3">
            <h3 className="text-sm font-semibold text-ink-900">{t('producerProfile.aboutHeading')}</h3>
            <p className="mt-1 text-sm text-ink-700 whitespace-pre-line">
              {profile.shortBio || t('producerProfile.bioEmpty')}
            </p>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-ink-900">{t('register.workCategories')}</h3>
            <div className="mt-1 flex flex-wrap gap-2">
              {myCategories.map((c) => (
                <Badge key={c.id} tone="info">
                  {c.name}
                </Badge>
              ))}
              {myCategories.length === 0 && (
                <span className="text-sm text-ink-500">
                  {t('producerProfile.categoriesEmpty')}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-ink-900">{t('producerProfile.contactHeading')}</h3>
            <p className="mt-1 text-sm text-ink-700">{contactLine}</p>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-ink-900">
              {t('producerProfile.listingsHeading')}
            </h3>
            {published.length === 0 ? (
              <p className="mt-1 text-sm text-ink-500">
                {t('producerProfile.nonePublishedLead')}{' '}
                <Link href="/dashboard/listings/new" className="underline font-semibold text-clay-700">
                  {t('producerProfile.addListingLink')}
                </Link>{' '}
                {t('producerProfile.nonePublishedTail')}
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {published.map((l) => (
                  <li key={l.id}>
                    <Link href={`/listings/${l.id}`} className="underline font-semibold text-clay-700">
                      {l.title}
                    </Link>{' '}
                    <span className="text-ink-500">· {l.kind === 'service' ? t('producerProfile.kindExperience') : t('producerProfile.kindGoods')}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-ink-500">
              {t('producerProfile.hiddenFromBuyers', { hidden: myListings.length - published.length, total: myListings.length })}
            </p>
          </div>

          <div className="mt-4">
            <Link href="/dashboard/settings" className="underline font-semibold text-clay-700">
              {t('producerProfile.editOnSettings')}
            </Link>
          </div>

          <p className="mt-3 text-xs text-ink-500">
            {isDemoMode() ? t('producerProfile.demoNote') : t('producerProfile.supabaseNote')}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('producerProfile.notShownTitle')}</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>{t('producerProfile.notShown1')}</li>
            <li>{t('producerProfile.notShown2')}</li>
            <li>{t('producerProfile.notShown3')}</li>
            <li>{t('producerProfile.notShown4')}</li>
          </ul>
          {profile.consentToPublish ? (
            <p className="mt-2 text-sm text-ink-700">
              {t('producerProfile.consentOnLead')}{' '}
              <Link href={`/producers/${profile.id}`} className="underline font-semibold text-clay-700">
                {t('producerProfile.consentOnLink')}
              </Link>
              .
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-700">
              {t('producerProfile.consentOffBody')}
            </p>
          )}
        </CardBody>
      </Card>
    </Section>
  );
}

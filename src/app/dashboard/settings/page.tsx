import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { requireArea } from '@/lib/area';
import { getLanguage, getT } from '@/lib/i18n/server';
import type { TranslationKey } from '@/lib/i18n';
import type { AccountStatus } from '@/lib/types';
import { AccountSettingsForm } from '@/components/account-settings-form';
import { AppLockCard } from '@/components/app-lock-card';
import { AppearanceCard } from '@/components/appearance-card';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';
import { VerificationLabel } from '@/components/status-labels';

export const dynamic = 'force-dynamic';

const ACCOUNT_STATUS_WORD: Record<AccountStatus, TranslationKey> = {
  active: 'accountSettings.wordActive',
  suspended: 'accountSettings.wordSuspended'
};

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('accountSettings.metaTitle'),
    description: t('accountSettings.metaDescription')
  };
}

export default async function DashboardSettingsPage() {
  const t = getT();
  const lang = getLanguage();
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  const [profile, myListings] = await Promise.all([
    repo.getProfile(actor.profileId),
    repo.listListingsByProducer(actor.profileId)
  ]);
  const publishedCount = myListings.filter((l) => l.published && !l.archived).length;

  if (!profile) {
    return (
      <Section eyebrow={t('myListings.eyebrow')} title={t('nav.settings')}>
        <Empty
          title={t('accountSettings.noProfileTitle')}
          body={t('accountSettings.noProfileBody')}
          action={
            <Link href="/register" className="underline font-semibold text-clay-700">
              {t('accountSettings.goToRegistration')}
            </Link>
          }
        />
      </Section>
    );
  }

  return (
    <Section
      eyebrow={t('myListings.eyebrow')}
      title={t('nav.settings')}
      description={t('accountSettings.sectionDescription')}
    >
      <AccountSettingsForm profile={profile} variant="seller" lang={lang} />

      <AppearanceCard profile={profile} />

      <AppLockCard userId={actor.userId} />

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('accountSettings.recordTitle')}</h2>
          <dl className="mt-2 grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-500">{t('producers.accountTypeLabel')}</dt>
              <dd className="text-ink-900">{profile.role === 'coordinator' ? t('accountSettings.roleCoordinator') : t('accountSettings.roleProducer')}</dd>
            </div>
            <div>
              <dt className="text-ink-500">{t('reports.status')}</dt>
              <dd className="text-ink-900">
                {profile.status === 'active' ? t('accountSettings.statusActive') : profile.status === 'suspended' ? t('accountSettings.statusSuspended') : profile.status}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">{t('producers.verificationLabel')}</dt>
              <dd className="text-ink-900">
                <VerificationLabel status={profile.verification} isDemo={profile.isDemo} />
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">{t('accountSettings.listingsFindable')}</dt>
              <dd className="text-ink-900">
                {t('accountSettings.listingsVisibleCount', { published: publishedCount, total: myListings.length })}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-sm text-ink-700">
            {t('accountSettings.roleNoteLead')}{' '}
            <Link href="/dashboard/profile" className="underline font-semibold text-clay-700">
              {t('accountSettings.profilePreviewLink')}
            </Link>{' '}
            {t('accountSettings.roleNoteTail')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={profile.status === 'active' ? 'success' : 'danger'}>{t(ACCOUNT_STATUS_WORD[profile.status])}</Badge>
            <Badge tone="neutral">{t('accountSettings.noIdBadge')}</Badge>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('accountSettings.storesTitle')}</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>{t('accountSettings.storesItem1')}</li>
            <li>{t('accountSettings.storesItem2')}</li>
            <li>{t('accountSettings.storesItem3')}</li>
            <li>{t('accountSettings.storesItem4')}</li>
            <li>{t('accountSettings.storesItem5')}</li>
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            {isDemoMode() ? t('accountSettings.storesDemo') : t('accountSettings.storesSupabase')}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('accountSettings.correctionsTitle')}</h2>
          <p className="mt-2 text-sm text-ink-700">
            {t('accountSettings.correctionsLead')}{' '}
            <Link href="/contact" className="underline font-semibold text-clay-700">
              {t('shell.contactPageLink')}
            </Link>
            {t('accountSettings.correctionsMiddle')}{' '}
            <Link href="/dashboard/listings" className="underline font-semibold text-clay-700">
              {t('nav.myListings')}
            </Link>{' '}
            {t('accountSettings.correctionsTail')}{' '}
            <Link href="/privacy" className="underline font-semibold text-clay-700">
              {t('accountSettings.privacyNoticeLink')}
            </Link>{' '}
            {t('accountSettings.correctionsEnd')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 items-center text-sm">
            <Badge tone="neutral">{t('accountSettings.signOutBadge')}</Badge>
            <Link href="/offline" className="underline font-semibold text-clay-700">
              {t('offline.draftBrowserTitle')}
            </Link>
          </div>
        </CardBody>
      </Card>
    </Section>
  );
}

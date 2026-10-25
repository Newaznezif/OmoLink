import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { requireArea } from '@/lib/area';
import { getLanguage, getT } from '@/lib/i18n/server';
import { AccountSettingsForm } from '@/components/account-settings-form';
import { AppLockCard } from '@/components/app-lock-card';
import { AppearanceCard } from '@/components/appearance-card';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('accountSettings.buyerMetaTitle'),
    description: t('accountSettings.buyerMetaDescription')
  };
}

export default async function BuyerSettingsPage() {
  const t = getT();
  const lang = getLanguage();
  const actor = await requireArea('/buyer', ['buyer']);
  const profile = await getRepo().getProfile(actor.profileId);

  if (!profile) {
    return (
      <Section eyebrow={t('nav.myAccountAria')} title={t('accountSettings.buyerMetaTitle')}>
        <Empty
          title={t('accountSettings.noProfileTitle')}
          body={t('accountSettings.buyerNoProfileBody')}
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
      eyebrow={t('nav.myAccountAria')}
      title={t('nav.settings')}
      description={t('accountSettings.buyerSectionDescription')}
    >
      <AccountSettingsForm profile={profile} variant="buyer" lang={lang} />

      <AppearanceCard profile={profile} />

      <AppLockCard userId={actor.userId} />

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('accountSettings.storesTitle')}</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>{t('accountSettings.buyerStoresItem1')}</li>
            <li>{t('accountSettings.buyerStoresItem2')}</li>
            <li>{t('accountSettings.buyerStoresItem3')}</li>
            <li>
              {t('accountSettings.buyerRoleLead')} <strong>{profile.role}</strong>
              {t('accountSettings.buyerRoleTail')}
            </li>
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            {isDemoMode() ? t('accountSettings.storesDemo') : t('accountSettings.storesSupabase')}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('accountSettings.buyerCorrectionsTitle')}</h2>
          <p className="mt-2 text-sm text-ink-700">
            {t('accountSettings.buyerCorrectionsLead')}{' '}
            <Link href="/contact" className="underline font-semibold text-clay-700">
              {t('shell.contactPageLink')}
            </Link>
            {t('accountSettings.buyerCorrectionsMiddle')}{' '}
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

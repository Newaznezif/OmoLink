import { getRepo } from '@/lib/repo';
import { getSessionActor } from '@/lib/session';
import { AdminSection, BackField } from '@/components/admin-shell';
import { AppLockCard } from '@/components/app-lock-card';
import { AppearanceCard } from '@/components/appearance-card';
import { Button, Card, CardBody, Field, Input, Textarea } from '@/components/ui';
import { accentContrastColor } from '@/lib/settings';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

/** Rows offered for social links beyond the stored ones; blank rows are dropped on save. */
const SPARE_LINK_ROWS = 3;

export default async function AdminSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const t = getT();
  const settings = await getRepo().getSiteSettings();
  // The appearance card below is the signed-in administrator's own scheme, not a
  // site-wide setting, so it reads their profile record — which is exactly why the
  // site-settings form above does not contain it.
  const actor = await getSessionActor();
  const adminProfile = actor ? await getRepo().getProfile(actor.profileId) : undefined;
  const links: { key: string; label: string; url: string }[] = [
    ...settings.socialLinks.map((link, index) => ({ key: `stored-${index}`, ...link })),
    ...Array.from({ length: SPARE_LINK_ROWS }, (_, index) => ({ key: `spare-${index}`, label: '', url: '' }))
  ];

  return (
    <AdminSection
      title={t('siteSettings.title')}
      description={t('siteSettings.description')}
      searchParams={searchParams}
    >
      <form method="post" action="/api/admin/settings" className="space-y-4">
        <BackField path="/admin/settings" />

        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-ink-900">{t('siteSettings.identity')}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field
                label={t('siteSettings.siteName')}
                htmlFor="siteName"
                required
                hint={t('siteSettings.siteNameHint')}
              >
                <Input id="siteName" name="siteName" defaultValue={settings.siteName} maxLength={60} required />
              </Field>
              <Field label={t('siteSettings.tagline')} htmlFor="tagline" hint={t('siteSettings.taglineHint')}>
                <Input id="tagline" name="tagline" defaultValue={settings.tagline} maxLength={160} />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-ink-900">{t('siteSettings.announcementBar')}</h2>
            <label htmlFor="announcementEnabled" className="flex items-start gap-2 text-sm text-ink-700">
              <input
                id="announcementEnabled"
                name="announcementEnabled"
                type="checkbox"
                value="on"
                defaultChecked={settings.announcementBar.enabled}
                className="mt-1 h-4 w-4"
              />
              <span>{t('siteSettings.showBar')}</span>
            </label>
            <Field label={t('siteSettings.announcementText')} htmlFor="announcementText" hint={t('siteSettings.announcementTextHint')}>
              <Input
                id="announcementText"
                name="announcementText"
                defaultValue={settings.announcementBar.text}
                maxLength={160}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-ink-900">{t('siteSettings.accentColour')}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field
                label={t('siteSettings.hexColour')}
                htmlFor="accentColor"
                required
                hint={t('siteSettings.hexColourHint')}
              >
                <Input id="accentColor" name="accentColor" type="color" defaultValue={settings.accentColor} className="h-11 p-1" />
              </Field>
              <div>
                <p className="block text-sm font-semibold text-ink-900 mb-1">{t('siteSettings.preview')}</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="accent-bg rounded-lg px-4 py-2 text-sm font-semibold">{t('siteSettings.previewPrimaryButton')}</span>
                  <span className="accent-bg rounded-lg px-4 py-2 text-sm">{t('siteSettings.announcementText')}</span>
                </div>
                <p className="mt-2 text-xs text-ink-500">
                  {t('siteSettings.contrastNote')}
                </p>
              </div>
            </div>
            <p className="text-xs text-ink-500">
              {t('siteSettings.storedValueLead')} <code>{settings.accentColor}</code> {t('siteSettings.storedValueArrow')}{' '}
              <code>{accentContrastColor(settings.accentColor)}</code>{t('siteSettings.storedValueTail')}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-ink-900">{t('siteSettings.contactHeading')}</h2>
            <p className="text-sm text-ink-500">
              {t('siteSettings.contactIntro')}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t('siteSettings.contactEmail')} htmlFor="contactEmail">
                <Input id="contactEmail" name="contactEmail" type="email" defaultValue={settings.contactEmail} maxLength={200} />
              </Field>
              <Field label={t('siteSettings.contactPhone')} htmlFor="contactPhone">
                <Input id="contactPhone" name="contactPhone" defaultValue={settings.contactPhone} maxLength={40} />
              </Field>
            </div>
            <Field label={t('siteSettings.locationNote')} htmlFor="addressNote" hint={t('siteSettings.locationNoteHint')}>
              <Input id="addressNote" name="addressNote" defaultValue={settings.addressNote} maxLength={240} />
            </Field>
            <Field label={t('siteSettings.footerNote')} htmlFor="footerNote">
              <Textarea id="footerNote" name="footerNote" defaultValue={settings.footerNote} maxLength={240} className="min-h-[80px]" />
            </Field>

            <h3 className="font-semibold text-ink-900 pt-2">{t('siteSettings.links')}</h3>
            <p className="text-xs text-ink-500">
              {t('siteSettings.linksHint')}
            </p>
            <div className="space-y-3">
              {links.map((link, index) => (
                <div key={link.key} className="grid md:grid-cols-2 gap-3">
                  <Input
                    name="socialLabel"
                    aria-label={t('siteSettings.linkLabel', { number: index + 1 })}
                    placeholder={t('siteSettings.linkLabelPlaceholder')}
                    defaultValue={link.label}
                    maxLength={40}
                  />
                  <Input
                    name="socialUrl"
                    aria-label={t('siteSettings.linkAddressLabel', { number: index + 1 })}
                    placeholder="https://…"
                    defaultValue={link.url}
                    maxLength={300}
                  />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-wrap gap-2 items-center">
          <Button type="submit">{t('siteSettings.save')}</Button>
          <span className="text-xs text-ink-500">
            {settings.updatedAt
              ? settings.updatedByProfileId
                ? t('siteSettings.lastUpdatedBy', {
                    date: new Date(settings.updatedAt).toLocaleString(),
                    name: settings.updatedByProfileId
                  })
                : t('siteSettings.lastUpdated', { date: new Date(settings.updatedAt).toLocaleString() })
              : t('siteSettings.neverUpdated')}
          </span>
        </div>
      </form>

      <AppearanceCard profile={adminProfile} />

      {/* An administrator's own lock, not a site setting: it belongs to the account that
          signs in here, and nothing about it changes what anyone else sees. */}
      {actor ? <AppLockCard userId={actor.userId} /> : null}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('siteSettings.redeployTitle')}</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>
              <strong>{t('siteSettings.redeploy1Label')}</strong> {t('siteSettings.redeploy1Tail')}
            </li>
            <li>
              <strong>{t('siteSettings.redeploy2Label')}</strong> {t('siteSettings.redeploy2TailA')} <code>src/app/</code>{' '}
              {t('siteSettings.redeploy2TailB')}
            </li>
            <li>
              <strong>{t('siteSettings.redeploy3Label')}</strong> {t('siteSettings.redeploy3TailA')} <code>src/app/globals.css</code>{' '}
              {t('siteSettings.redeploy3TailB')} <code>tailwind.config.ts</code>
              {t('siteSettings.redeploy3TailC')}
            </li>
            <li>
              <strong>{t('siteSettings.redeploy4Label')}</strong> {t('siteSettings.redeploy4Tail')}
            </li>
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            {t('siteSettings.noRichTextNote')}
          </p>
        </CardBody>
      </Card>
    </AdminSection>
  );
}

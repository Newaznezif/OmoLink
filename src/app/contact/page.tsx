import { getRepo } from '@/lib/repo';
import { Section, Card, CardBody, Badge } from '@/components/ui';
import { ContactForm } from '@/components/contact-form';
import { getLanguage, getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('contact.eyebrow'),
    description: t('contact.metadataDescription')
  };
}

export default async function ContactPage() {
  const t = getT();
  const lang = getLanguage();
  const settings = await getRepo().getSiteSettings();

  return (
    <Section eyebrow={t('contact.eyebrow')} title={t('contact.title')} description={t('contact.description')}>
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <Card className="lg:col-span-2">
          <CardBody>
            <ContactForm lang={lang} />
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-2 text-sm">
              <h2 className="font-semibold text-ink-900">{t('contact.otherWays')}</h2>
              {settings.contactEmail ? (
                <p>
                  {t('contact.emailLabel')}{' '}
                  <a href={`mailto:${settings.contactEmail}`} className="underline font-semibold">{settings.contactEmail}</a>
                </p>
              ) : (
                <p className="text-ink-500">{t('contact.noEmail')}</p>
              )}
              {settings.contactPhone ? (
                <p>
                  {t('contact.phoneLabel')} {settings.contactPhone}
                </p>
              ) : (
                <p className="text-ink-500">{t('contact.noPhone')}</p>
              )}
              {settings.addressNote && <p className="text-ink-700">{settings.addressNote}</p>}
              <p className="text-xs text-ink-500">{t('contact.adminMaintained')}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-2 text-sm">
              <h2 className="font-semibold text-ink-900">{t('contact.beforeYouWrite')}</h2>
              <ul className="list-disc pl-5 space-y-1 text-ink-700">
                <li>{t('contact.before1')}</li>
                <li>{t('contact.before2')}</li>
                <li>{t('contact.before3')}</li>
              </ul>
              <Badge tone="info">{t('contact.noSmsBadge')}</Badge>
              <p className="text-xs text-ink-500">{t('contact.noSmsBody')}</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </Section>
  );
}

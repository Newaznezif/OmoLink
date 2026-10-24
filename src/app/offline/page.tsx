import { Card, CardBody, Section, Badge } from '@/components/ui';
import { DraftBrowser } from '@/components/draft-browser';
import { getLanguage, getT } from '@/lib/i18n/server';

export default function OfflinePage() {
  const t = getT();
  return (
    <Section
      eyebrow={t('offline.eyebrow')}
      title={t('offline.title')}
      description={t('offline.description')}
    >
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('offline.shellTitle')}</h2>
            <p className="mt-1 text-sm text-ink-700">
              {t('offline.shellBody')}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="info">{t('offline.shellBadgePages')}</Badge>
              <Badge tone="neutral">{t('offline.shellBadgeSent')}</Badge>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('offline.draftsTitle')}</h2>
            <p className="mt-1 text-sm text-ink-700">
              {t('offline.draftsBody')}
            </p>
            <p className="mt-2 text-sm text-ink-500">
              {t('offline.draftsPrivacyNote')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('offline.retryTitle')}</h2>
            <p className="mt-1 text-sm text-ink-700">
              {t('offline.retryBody')}
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <DraftBrowser lang={getLanguage()} />
      </div>

      <div className="mt-6 rounded-lg border border-ochre-100 bg-ochre-50 p-4 text-sm text-ochre-700">
        <h2 className="font-semibold">{t('offline.notDoTitle')}</h2>
        <ul className="mt-1 list-disc pl-5 space-y-1">
          <li>
            {t('offline.notDoPrefix')}
            <strong>{t('offline.notWord')}</strong>
            {t('offline.notDoSms')}
          </li>
          <li>
            {t('offline.notDoPrefix')}
            <strong>{t('offline.notWord')}</strong>
            {t('offline.notDoPayments')}
          </li>
          <li>
            {t('offline.notDoPrefix')}
            <strong>{t('offline.notWord')}</strong>
            {t('offline.notDoFabricate')}
          </li>
        </ul>
      </div>
    </Section>
  );
}

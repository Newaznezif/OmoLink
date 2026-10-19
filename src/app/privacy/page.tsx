import { Card, CardBody, Section } from '@/components/ui';
import { getT } from '@/lib/i18n/server';

export default function PrivacyPage() {
  const t = getT();
  return (
    <Section eyebrow={t('privacy.eyebrow')} title={t('privacy.title')} description={t('privacy.description')}>
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('privacy.storeTitle')}</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-ink-700">
              <li>{t('privacy.store1')}</li>
              <li>{t('privacy.store2')}</li>
              <li>{t('privacy.store3')}</li>
              <li>{t('privacy.store4')}</li>
              <li>{t('privacy.store5')}</li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('privacy.skipTitle')}</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-ink-700">
              <li>{t('privacy.skip1')}</li>
              <li>{t('privacy.skip2')}</li>
              <li>{t('privacy.skip3')}</li>
              <li>{t('privacy.skip4')}</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}

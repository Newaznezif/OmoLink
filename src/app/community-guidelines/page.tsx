import { Card, CardBody, Section } from '@/components/ui';
import { getT } from '@/lib/i18n/server';

export default function CommunityGuidelinesPage() {
  const t = getT();
  return (
    <Section
      eyebrow={t('guidelines.eyebrow')}
      title={t('guidelines.title')}
      description={t('guidelines.description')}
    >
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('guidelines.publishing')}</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-ink-700">
              <li>{t('guidelines.publishing1')}</li>
              <li>{t('guidelines.publishing2')}</li>
              <li>{t('guidelines.publishing3')}</li>
              <li>{t('guidelines.publishing4')}</li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('guidelines.behaviour')}</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-ink-700">
              <li>{t('guidelines.behaviour1')}</li>
              <li>{t('guidelines.behaviour2')}</li>
              <li>{t('guidelines.behaviour3')}</li>
              <li>{t('guidelines.behaviour4')}</li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('guidelines.disputes')}</h2>
            <p className="mt-2 text-ink-700">{t('guidelines.disputesBody')}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('guidelines.impact')}</h2>
            <p className="mt-2 text-ink-700">
              {t('guidelines.impactBodyPrefix')}
              <em>{t('guidelines.impactBodyAfter')}</em>
              {t('guidelines.impactBodySuffix')}
            </p>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}

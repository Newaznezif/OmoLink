import { Card, CardBody, Section, Badge } from '@/components/ui';
import { getT } from '@/lib/i18n/server';

export default function HowItWorksPage() {
  const t = getT();
  return (
    <Section eyebrow={t('how.eyebrow')} title={t('how.title')} description={t('how.description')}>
      <div className="grid md:grid-cols-3 gap-4">
        <Step n={1} title={t('how.step1Title')}>
          {t('how.step1Body')}
        </Step>
        <Step n={2} title={t('how.step2Title')}>
          {t('how.step2Body')}
        </Step>
        <Step n={3} title={t('how.step3Title')}>
          {t('how.step3Body')}
        </Step>
        <Step n={4} title={t('how.step4Title')}>
          {t('how.step4Body')}
        </Step>
        <Step n={5} title={t('how.step5Title')}>
          {t('how.step5Body')}
        </Step>
        <Step n={6} title={t('how.step6Title')}>
          {t('how.step6Body')}
        </Step>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-3">{t('how.trustTitle')}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardBody>
              <h3 className="font-semibold">{t('how.trustVerification')}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="neutral">{t('status.unverified')}</Badge>
                <Badge tone="warning">{t('status.pending')}</Badge>
                <Badge tone="success">{t('status.verified')}</Badge>
              </div>
              <p className="mt-2 text-sm text-ink-700">{t('how.trustVerificationBody')}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h3 className="font-semibold">{t('how.trustConsent')}</h3>
              <p className="mt-2 text-sm text-ink-700">{t('how.trustConsentBody')}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h3 className="font-semibold">{t('how.trustSample')}</h3>
              <p className="mt-2 text-sm text-ink-700">{t('how.trustSampleBody')}</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </Section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-clay-700 text-white font-black grid place-items-center">{n}</span>
          <h3 className="font-semibold text-ink-900">{title}</h3>
        </div>
        <p className="mt-2 text-sm text-ink-700">{children}</p>
      </CardBody>
    </Card>
  );
}

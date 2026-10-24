import { Badge, Section } from '@/components/ui';
import { getLanguage, getT } from '@/lib/i18n/server';
import type { TranslationKey } from '@/lib/i18n';
import { GuideSteps, type GuideStep } from '@/components/guide-steps';

export default function HowItWorksPage() {
  const t = getT();
  const lang = getLanguage();

  // Written out rather than composed, so the dead-key guard can see each key is used.
  const steps: GuideStep[] = (
    [
      ['how.step1Title', 'how.step1Body'],
      ['how.step2Title', 'how.step2Body'],
      ['how.step3Title', 'how.step3Body'],
      ['how.step4Title', 'how.step4Body'],
      ['how.step5Title', 'how.step5Body'],
      ['how.step6Title', 'how.step6Body']
    ] as [TranslationKey, TranslationKey][]
  ).map(([title, body]) => ({ title: t(title), body: t(body) }));

  const notes: { title: string; body: string }[] = [
    { title: t('how.trustConsent'), body: t('how.trustConsentBody') },
    { title: t('how.trustSample'), body: t('how.trustSampleBody') }
  ];

  return (
    <Section eyebrow={t('how.eyebrow')} title={t('how.title')} description={t('how.description')}>
      <GuideSteps steps={steps} lang={lang} />

      <div className="mt-8">
        <h2 className="text-lg font-bold mb-3">{t('how.trustTitle')}</h2>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 sm:p-5 grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <h3 className="font-semibold text-ink-900">{t('how.trustVerification')}</h3>
            <p className="mt-2 text-ink-700">{t('how.trustVerificationBody')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="neutral">{t('status.unverified')}</Badge>
              <Badge tone="warning">{t('status.pending')}</Badge>
              <Badge tone="success">{t('status.verified')}</Badge>
            </div>
          </div>
          {notes.map((note) => (
            <div key={note.title}>
              <h3 className="font-semibold text-ink-900">{note.title}</h3>
              <p className="mt-2 text-ink-700">{note.body}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

import { getLanguage, getT } from '@/lib/i18n/server';
import { Section } from '@/components/ui';
import { PriceCalculator } from '@/components/price-calculator';

export default function PricingToolPage() {
  const t = getT();
  return (
    <Section
      eyebrow={t('nav.pricing')}
      title={t('pricing.toolTitle')}
      description={t('pricing.toolDescription')}
    >
      <PriceCalculator lang={getLanguage()} />
      <div className="mt-6 grid md:grid-cols-2 gap-4 text-sm text-ink-700">
        <p>
          <strong>{t('pricing.markupTerm')}</strong>
          {t('pricing.markupTail')}
        </p>
        <p>
          <strong>{t('pricing.marginOnSellingPrice')}</strong>
          {t('pricing.marginTail')}
        </p>
      </div>
    </Section>
  );
}

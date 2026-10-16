import { Section } from '@/components/ui';
import { PriceCalculator } from '@/components/price-calculator';

export default function PricingToolPage() {
  return (
    <Section
      eyebrow="Pricing tool"
      title="Estimate a sustainable selling price"
      description="A transparent calculator that helps producers think about production, packaging and transport cost against a healthy margin. The suggested price is only a suggestion — producers always override the final price. The platform never imposes a mandatory price and never undermines collective negotiation."
    >
      <PriceCalculator />
      <div className="mt-6 grid md:grid-cols-2 gap-4 text-sm text-ink-700">
        <p>
          <strong>Markup on cost</strong> = extra percentage added on top of total cost. Suggested price = total cost ×
          (1 + markup %).
        </p>
        <p>
          <strong>Profit margin on selling price</strong> = profit ÷ selling price. A 25% markup on cost yields a 20%
          profit margin — the calculator shows both so producers understand the difference.
        </p>
      </div>
    </Section>
  );
}

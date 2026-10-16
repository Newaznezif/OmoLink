/**
 * Pricing math for the producer pricing tool, kept in integer cents.
 *
 * Markup and margin are different numbers and are easy to confuse:
 *  - markup  is a percentage OF COST
 *  - margin  is a percentage OF SELLING PRICE
 * With total cost 800.00 ETB and a 25% markup the selling price is 1,000.00,
 * profit is 200.00, and the margin is 20% — not 25%.
 */

export type PriceSuggestion = {
  totalCostCents: number;
  suggestedPriceCents: number;
  profitCents: number;
  marginPercent: number;
};

export function suggestSellingPrice(costCents: number, markupPercent: number): PriceSuggestion {
  if (!Number.isInteger(costCents) || costCents < 0) {
    throw new Error('costCents must be a non-negative integer.');
  }
  if (!Number.isFinite(markupPercent) || markupPercent < 0) {
    throw new Error('markupPercent must be zero or greater.');
  }
  const suggestedPriceCents = Math.round(costCents * (1 + markupPercent / 100));
  const profitCents = suggestedPriceCents - costCents;
  const marginPercent =
    costCents > 0 && suggestedPriceCents > 0
      ? Math.round((profitCents / suggestedPriceCents) * 10_000) / 100
      : 0;
  return { totalCostCents: costCents, suggestedPriceCents, profitCents, marginPercent };
}

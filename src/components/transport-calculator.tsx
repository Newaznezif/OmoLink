'use client';

import { useMemo, useState } from 'react';
import { formatMoney } from '@/lib/money';
import type { UnitOfSale } from '@/lib/types';
import { Card, CardBody, Field, Input } from './ui';

export function TransportCalculator({
  opportunityId,
  unitOfSale,
  totalCostCents,
  totalQuantity,
  quoteConfirmed,
  contributions
}: {
  opportunityId: string;
  unitOfSale: UnitOfSale;
  totalCostCents: number;
  totalQuantity: number;
  quoteConfirmed: boolean;
  contributions: { producerProfileId: string; quantity: number; name: string }[];
}) {
  const [costEtb, setCostEtb] = useState((totalCostCents / 100).toString());
  const [qty, setQty] = useState(String(Math.max(totalQuantity, 1)));
  const [customShare, setCustomShare] = useState<Record<string, string>>({});

  const parsedCost = Math.round((Number(costEtb) || 0) * 100);
  const parsedQty = Number(qty) || 0;

  const perUnit = useMemo(() => (parsedQty > 0 ? Math.round(parsedCost / parsedQty) : 0), [parsedCost, parsedQty]);
  const effectiveQuantities = useMemo(() => {
    return contributions.map((c) => ({
      ...c,
      quantity: Number(customShare[c.producerProfileId] ?? c.quantity) || 0
    }));
  }, [contributions, customShare]);
  const sumQty = effectiveQuantities.reduce((s, c) => s + c.quantity, 0);

  return (
    <Card>
      <CardBody>
        <h2 className="font-semibold text-ink-900">Shared transport calculator</h2>
        <p className="mt-1 text-sm text-ink-700">
          {quoteConfirmed
            ? 'A confirmed transport quote has been recorded for this plan.'
            : 'This is an estimate. No real transport quote has been confirmed. Actual costs may be higher or lower — do not treat the numbers below as savings that have already occurred.'}
        </p>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <Field label="Total transport cost (ETB)" htmlFor={`tp-cost-${opportunityId}`} hint="Enter the shared cost agreed by the group.">
            <Input id={`tp-cost-${opportunityId}`} inputMode="decimal" value={costEtb} onChange={(e) => setCostEtb(e.target.value)} />
          </Field>
          <Field label={`Total quantity (${unitOfSale})`} htmlFor={`tp-qty-${opportunityId}`}>
            <Input id={`tp-qty-${opportunityId}`} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>

        <div className="mt-4 rounded-lg bg-clay-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-700">Estimated transport cost per {unitOfSale}</span>
            <span className="font-bold text-clay-800">{formatMoney({ cents: perUnit, currency: 'ETB' })}</span>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            Formula: total transport cost ÷ total quantity. Rounded to the nearest cent.
          </p>
        </div>

        {effectiveQuantities.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-ink-900 mb-2">Per-producer share (by contribution)</h3>
            <ul className="space-y-2 text-sm">
              {effectiveQuantities.map((c) => {
                const share = sumQty > 0 ? Math.round((c.quantity / sumQty) * parsedCost) : 0;
                return (
                  <li key={c.producerProfileId} className="grid sm:grid-cols-[1fr_140px_160px] gap-2 items-center">
                    <span className="text-ink-900">{c.name}</span>
                    <label className="text-xs text-ink-500">
                      <span className="sr-only">Quantity for {c.name}</span>
                      <input
                        type="number"
                        min={0}
                        value={customShare[c.producerProfileId] ?? c.quantity}
                        onChange={(e) => setCustomShare({ ...customShare, [c.producerProfileId]: e.target.value })}
                        className="w-full rounded border border-ink-100 px-2 py-1"
                      />
                    </label>
                    <span className="text-right font-semibold text-clay-800">{formatMoney({ cents: share, currency: 'ETB' })}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-ink-500">
              Editing a quantity here only previews a different split — it does not change the recorded contribution.
              Adjust contributions through the form on this page.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

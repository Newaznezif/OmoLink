'use client';

import { useMemo, useState } from 'react';
import { formatMoney } from '@/lib/money';
import { t, type TranslationKey } from '@/lib/i18n';
import type { LanguageCode, UnitOfSale } from '@/lib/types';
import { Card, CardBody, Field, Input } from './ui';

export function TransportCalculator({
  lang = 'en',
  opportunityId,
  unitOfSale,
  totalCostCents,
  totalQuantity,
  quoteConfirmed,
  contributions
}: {
  lang?: LanguageCode;
  opportunityId: string;
  unitOfSale: UnitOfSale;
  totalCostCents: number;
  totalQuantity: number;
  quoteConfirmed: boolean;
  contributions: { producerProfileId: string; quantity: number; name: string }[];
}) {
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
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
        <h2 className="font-semibold text-ink-900">{tr('pricing.transportTitle')}</h2>
        <p className="mt-1 text-sm text-ink-700">
          {quoteConfirmed
            ? tr('pricing.quoteConfirmed')
            : tr('pricing.quoteEstimate')}
        </p>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <Field label={tr('pricing.totalTransportCost')} htmlFor={`tp-cost-${opportunityId}`} hint={tr('pricing.sharedCostHint')}>
            <Input id={`tp-cost-${opportunityId}`} inputMode="decimal" value={costEtb} onChange={(e) => setCostEtb(e.target.value)} />
          </Field>
          <Field label={tr('pricing.totalQuantityUnit', { unit: unitOfSale })} htmlFor={`tp-qty-${opportunityId}`}>
            <Input id={`tp-qty-${opportunityId}`} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>

        <div className="mt-4 rounded-lg bg-clay-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-700">{tr('pricing.perUnitCost', { unit: unitOfSale })}</span>
            <span className="font-bold text-clay-800">{formatMoney({ cents: perUnit, currency: 'ETB' })}</span>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {tr('pricing.formulaNote')}
          </p>
        </div>

        {effectiveQuantities.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-ink-900 mb-2">{tr('pricing.producerShare')}</h3>
            <ul className="space-y-2 text-sm">
              {effectiveQuantities.map((c) => {
                const share = sumQty > 0 ? Math.round((c.quantity / sumQty) * parsedCost) : 0;
                return (
                  <li key={c.producerProfileId} className="grid sm:grid-cols-[1fr_140px_160px] gap-2 items-center">
                    <span className="text-ink-900">{c.name}</span>
                    <label className="text-xs text-ink-500">
                      <span className="sr-only">{tr('pricing.quantityFor', { name: c.name })}</span>
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
              {tr('pricing.editShareNote')}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

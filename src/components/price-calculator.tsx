'use client';

import { useMemo, useState } from 'react';
import { formatMoney, parseDecimalAmount } from '@/lib/money';
import { suggestSellingPrice } from '@/lib/pricing';
import { t, type TranslationKey } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';
import { Card, CardBody, Field, Input } from './ui';

type Inputs = {
  production: string;
  packaging: string;
  transport: string;
  other: string;
  markupPct: string;
};

const defaults: Inputs = {
  production: '500',
  packaging: '100',
  transport: '150',
  other: '50',
  markupPct: '25'
};

export function PriceCalculator({ lang }: { lang: LanguageCode }) {
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
  const [values, setValues] = useState<Inputs>(defaults);

  const parsed = useMemo(() => {
    const cents: Record<keyof Inputs, number | null> = {
      production: parseDecimalAmount(values.production),
      packaging: parseDecimalAmount(values.packaging),
      transport: parseDecimalAmount(values.transport),
      other: parseDecimalAmount(values.other),
      markupPct: parseDecimalAmount(values.markupPct)
    };
    const invalid = Object.entries(cents).filter(([, v]) => v === null);
    if (invalid.length > 0) return { invalid: invalid.map(([k]) => k) as (keyof Inputs)[], result: null };
    const prod = cents.production!;
    const pack = cents.packaging!;
    const trans = cents.transport!;
    const other = cents.other!;
    // parseDecimalAmount returns minor units, so "25" arrives as 2500 — i.e. 25.00 %.
    const markupPercent = cents.markupPct! / 100;
    const total = prod + pack + trans + other;
    return { invalid: [] as (keyof Inputs)[], result: suggestSellingPrice(total, markupPercent) };
  }, [values]);

  function set<K extends keyof Inputs>(k: K, v: string) {
    setValues((s) => ({ ...s, [k]: v }));
  }

  const invalidSet = new Set(parsed.invalid);

  return (
    <div className="grid md:grid-cols-[minmax(0,1fr)_360px] gap-4">
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{tr('pricing.enterCosts')}</h2>
          <div className="mt-3 grid sm:grid-cols-2 gap-4">
            <Field label={tr('pricing.productionCost')} htmlFor="pc-prod" required>
              <Input id="pc-prod" inputMode="decimal" value={values.production} onChange={(e) => set('production', e.target.value)} invalid={invalidSet.has('production')} />
            </Field>
            <Field label={tr('pricing.packagingCost')} htmlFor="pc-pack" required>
              <Input id="pc-pack" inputMode="decimal" value={values.packaging} onChange={(e) => set('packaging', e.target.value)} invalid={invalidSet.has('packaging')} />
            </Field>
            <Field label={tr('pricing.transportCost')} htmlFor="pc-trans" required>
              <Input id="pc-trans" inputMode="decimal" value={values.transport} onChange={(e) => set('transport', e.target.value)} invalid={invalidSet.has('transport')} />
            </Field>
            <Field label={tr('pricing.otherCosts')} htmlFor="pc-other" required>
              <Input id="pc-other" inputMode="decimal" value={values.other} onChange={(e) => set('other', e.target.value)} invalid={invalidSet.has('other')} />
            </Field>
            <Field label={tr('pricing.markupLabel')} htmlFor="pc-markup" required hint={tr('pricing.markupHint')}>
              <Input id="pc-markup" inputMode="decimal" value={values.markupPct} onChange={(e) => set('markupPct', e.target.value)} invalid={invalidSet.has('markupPct')} />
            </Field>
          </div>
          {parsed.invalid.length > 0 && (
            <p className="mt-3 text-sm text-red-700">{tr('pricing.fillFields')}</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{tr('pricing.suggestionHeading')}</h2>
          {parsed.result ? (
            <dl className="mt-3 space-y-2 text-sm">
              <Row label={tr('pricing.totalCost')} value={formatMoney({ cents: parsed.result.totalCostCents, currency: 'ETB' })} />
              <Row
                label={tr('pricing.suggestedPrice')}
                value={formatMoney({ cents: parsed.result.suggestedPriceCents, currency: 'ETB' })}
                strong
              />
              <Row label={tr('pricing.estimatedProfit')} value={formatMoney({ cents: parsed.result.profitCents, currency: 'ETB' })} />
              <Row label={tr('pricing.marginOnSellingPrice')} value={`${parsed.result.marginPercent.toFixed(2)} %`} />
            </dl>
          ) : (
            <p className="text-sm text-ink-500">{tr('pricing.completeForm')}</p>
          )}
          <p className="mt-3 text-xs text-ink-500">
            {tr('pricing.exampleNote')}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className={strong ? 'text-clay-800 font-bold' : 'text-ink-900 font-medium'}>{value}</dd>
    </div>
  );
}

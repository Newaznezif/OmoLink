'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { t, type TranslationKey } from '@/lib/i18n';
import type { CollectiveOpportunity, LanguageCode, UnitOfSale } from '@/lib/types';
import { Button, Field, Input, Textarea } from './ui';

const OPPORTUNITY_STATUS_KEYS: Record<CollectiveOpportunity['status'], TranslationKey> = {
  open: 'status.opportunity.open',
  closing_soon: 'status.opportunity.closingSoon',
  closed: 'status.opportunity.closed',
  fulfilled: 'status.opportunity.fulfilled',
  cancelled: 'status.opportunity.cancelled'
};

const CONTRIBUTION_STATUS_KEYS: Record<string, TranslationKey> = {
  pending: 'collective.contributionStatus.pending',
  confirmed: 'collective.contributionStatus.confirmed',
  withdrawn: 'collective.contributionStatus.withdrawn'
};

export type ProducerStock = {  items: { id: string; title: string; availableQuantity: number; unitOfSale: UnitOfSale }[];
  available: number;
  committed: number;
};

export function ContributeForm({
  lang,
  opportunity,
  producer,
  stock
}: {
  lang: LanguageCode;
  opportunity: {
    id: string;
    unitOfSale: UnitOfSale;
    targetQuantity: number;
    aggregateQuantity: number;
    status: CollectiveOpportunity['status'];
  };
  producer: { displayName: string };
  stock: ProducerStock;
}) {
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
  const router = useRouter();
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>();
  const [result, setResult] = useState<{ ok: boolean; message: string; reference?: string; status?: string } | null>(null);

  const remaining = Math.max(opportunity.targetQuantity - opportunity.aggregateQuantity, 0);
  // The same rule the repository applies: what is left of this account's stock in
  // the matching category after what it has already committed.
  const leftToCommit = Math.max(stock.available - stock.committed, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(quantity);
    if (!Number.isInteger(value) || value <= 0) {
      setLocalError(tr('apiCollective.quantityPositive'));
      return;
    }
    if (value > leftToCommit) {
      setLocalError(tr('collective.overStockError', { count: leftToCommit, unit: opportunity.unitOfSale }));
      return;
    }
    setLocalError(undefined);
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/collective/${opportunity.id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: value, note })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? tr('collective.contributionFailed'));
      setResult({
        ok: true,
        message: tr('collective.contributionRecorded', { quantity: value, unit: opportunity.unitOfSale }),
        reference: typeof json?.contribution?.id === 'string' ? json.contribution.id : undefined,
        status: typeof json?.contribution?.status === 'string' ? json.contribution.status : undefined
      });
      setQuantity('');
      router.refresh();
    } catch (err: unknown) {
      setResult({ ok: false, message: err instanceof Error ? err.message : tr('auth.genericError') });
    } finally {
      setBusy(false);
    }
  }

  if (opportunity.status === 'closed' || opportunity.status === 'fulfilled' || opportunity.status === 'cancelled') {
    return (
      <div className="bg-white border border-ink-100 rounded-2xl card-shadow p-5">
        <h2 className="font-semibold text-ink-900">{tr('collective.contributionsClosed')}</h2>
        <p className="mt-1 text-sm text-ink-700">
          {tr('collective.opportunityIsPrefix')} <strong>{tr(OPPORTUNITY_STATUS_KEYS[opportunity.status])}</strong>{' '}
          {tr('collective.opportunityIsTail')}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-ink-100 rounded-2xl card-shadow p-5 space-y-4"
      aria-labelledby="contribute-heading"
    >
      <div>
        <h2 id="contribute-heading" className="font-semibold text-ink-900">
          {tr('collective.contributeAs', { name: producer.displayName })}
        </h2>
        <ol className="mt-2 space-y-1 text-sm text-ink-700 list-decimal pl-5">
          <li>{tr('collective.contributeStep1')}</li>
          <li>{tr('collective.contributeStep2')}</li>
          <li>{tr('collective.contributeStep3')}</li>
        </ol>
        {remaining === 0 && (
          <p className="mt-2 text-xs text-ochre-700">
            {tr('collective.targetAlreadyMetNote')}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-ink-100 bg-clay-50 p-3 text-sm">
        <h3 className="font-semibold text-ink-900">{tr('collective.yourStockTitle')}</h3>
        {stock.items.length === 0 ? (
          <>
            <p className="mt-1 text-ink-700">{tr('collective.yourStockNone')}</p>
            <Link href="/dashboard/listings/new" className="mt-1 inline-block font-semibold text-clay-800 underline">
              {tr('collective.publishListingInCategory')}
            </Link>
          </>
        ) : (
          <>
            <ul className="mt-1 space-y-1 text-ink-700">
              {stock.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-2">
                  <span>{item.title}</span>
                  <span className="text-ink-900 font-medium">
                    {item.availableQuantity} {item.unitOfSale}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-ink-700">
              {tr('collective.committedSoFar', { count: stock.committed, unit: opportunity.unitOfSale })}{' '}
              <strong>{tr('collective.remainingToCommit', { count: leftToCommit, unit: opportunity.unitOfSale })}</strong>
            </p>
          </>
        )}
      </div>

      <Field
        label={tr('inquiry.quantityLabel', { unit: opportunity.unitOfSale })}
        htmlFor="contribute-qty"
        required
        error={localError}
        hint={tr('collective.quantityHint', { count: leftToCommit, unit: opportunity.unitOfSale })}
      >
        <Input
          id="contribute-qty"
          inputMode="numeric"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
          invalid={Boolean(localError) || Boolean(result && !result.ok)}
        />
      </Field>
      <Field label={tr('collective.noteLabel')} htmlFor="contribute-note">
        <Textarea id="contribute-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <Button type="submit" disabled={busy}>
        {busy ? tr('inquiry.submitting') : tr('collective.addContribution')}
      </Button>

      {result && (
        <div
          role="status"
          className={
            'rounded-lg p-3 text-sm border ' +
            (result.ok ? 'bg-moss-50 text-moss-700 border-moss-100' : 'bg-red-50 text-red-700 border-red-100')
          }
        >
          <p>{result.message}</p>
          {result.status && CONTRIBUTION_STATUS_KEYS[result.status] && (
            <p className="mt-1">
              {tr('reports.status')}: {tr(CONTRIBUTION_STATUS_KEYS[result.status])}
            </p>
          )}
          {result.reference && <p className="mt-1">{tr('collective.contributionReference', { id: result.reference })}</p>}
        </div>
      )}
    </form>
  );
}

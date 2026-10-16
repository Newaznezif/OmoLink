'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CollectiveOpportunity, UnitOfSale } from '@/lib/types';
import { Button, Field, Input, Textarea } from './ui';

export function ContributeForm({
  opportunity,
  producer
}: {
  opportunity: {
    id: string;
    title: string;
    unitOfSale: UnitOfSale;
    targetQuantity: number;
    aggregateQuantity: number;
    status: CollectiveOpportunity['status'];
  };
  producer: { id: string; displayName: string; categories: string[] };
  categoryId: string;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const remaining = Math.max(opportunity.targetQuantity - opportunity.aggregateQuantity, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/collective/${opportunity.id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: Number(quantity), note })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? 'Contribution failed.');
      setResult({ ok: true, message: `Contribution of ${quantity} ${opportunity.unitOfSale} recorded as pending. The coordinator will confirm.` });
      setQuantity('');
      router.refresh();
    } catch (err: unknown) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  }

  if (opportunity.status === 'closed' || opportunity.status === 'fulfilled' || opportunity.status === 'cancelled') {
    return (
      <div className="bg-white border border-ink-100 rounded-2xl card-shadow p-5">
        <h2 className="font-semibold text-ink-900">Contributions closed</h2>
        <p className="mt-1 text-sm text-ink-700">
          This opportunity is <strong>{opportunity.status.replace('_', ' ')}</strong> and no longer accepting new
          contributions.
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
          Contribute as {producer.displayName}
        </h2>
        <p className="mt-1 text-sm text-ink-700">
          Add an available quantity. The system validates that the amount is a positive whole number and does not
          exceed your stock in the matching category. Duplicate contributions from the same producer are merged.
        </p>
        {remaining === 0 && (
          <p className="mt-2 text-xs text-ochre-700">
            Target already met. Additional contributions up to twice the target are still accepted for planning but
            should be coordinated with the group.
          </p>
        )}
      </div>

      <Field label={`Quantity (${opportunity.unitOfSale})`} htmlFor="contribute-qty" required>
        <Input
          id="contribute-qty"
          inputMode="numeric"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
          invalid={Boolean(result && !result.ok)}
        />
      </Field>
      <Field label="Note for the coordinator (optional)" htmlFor="contribute-note">
        <Textarea id="contribute-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <Button type="submit" disabled={busy}>
        {busy ? 'Submitting…' : 'Add contribution'}
      </Button>

      {result && (
        <div
          role="status"
          className={
            'rounded-lg p-3 text-sm border ' +
            (result.ok ? 'bg-moss-50 text-moss-700 border-moss-100' : 'bg-red-50 text-red-700 border-red-100')
          }
        >
          {result.message}
        </div>
      )}
    </form>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Input } from './ui';
import { STATUS_LABELS } from './opportunity-form';
import type { GroupContribution } from '@/lib/types';
import type { CollectiveOpportunity } from '@/lib/types';

function useRequest() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(path: string, body: Record<string, unknown>, successText: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: json?.error ?? `The server refused (status ${res.status}).` });
        return;
      }
      setMessage({ ok: true, text: successText });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: 'Network problem: nothing was changed.' });
    } finally {
      setBusy(false);
    }
  }

  return { busy, message, send };
}

function MessageLine({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'mt-1 text-sm text-moss-700' : 'mt-1 text-sm text-red-700'}>
      {message.text}
    </p>
  );
}

export function OpportunityStatusPicker({ opportunity }: { opportunity: CollectiveOpportunity }) {
  const { busy, message, send } = useRequest();
  const states: CollectiveOpportunity['status'][] = ['open', 'closing_soon', 'closed', 'fulfilled', 'cancelled'];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {states.map((state) => (
          <Button
            key={state}
            type="button"
            size="sm"
            variant={state === opportunity.status ? 'primary' : 'secondary'}
            disabled={busy || state === opportunity.status}
            onClick={() =>
              send(
                `/api/collective/opportunities/${opportunity.id}`,
                { status: state },
                `State set to “${STATUS_LABELS[state]}”.`
              )
            }
          >
            {STATUS_LABELS[state]}
          </Button>
        ))}
      </div>
      <MessageLine message={message} />
      {opportunity.status === 'fulfilled' && (
        <p className="mt-1 text-xs text-ink-500">
          A fulfilled opportunity cannot be reopened. If the delivery did not actually happen, leave the record as it is
          and open a new opportunity — the contributions stay truthful either way.
        </p>
      )}
    </div>
  );
}

export function ContributionActions({
  contribution,
  unitOfSale,
  canConfirm,
  acceptsChanges
}: {
  contribution: GroupContribution;
  unitOfSale: string;
  canConfirm: boolean;
  acceptsChanges: boolean;
}) {
  const { busy, message, send } = useRequest();
  const [quantity, setQuantity] = useState(String(contribution.quantity));
  const withdrawn = contribution.status === 'withdrawn';

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`qty-${contribution.id}`}>
          Quantity for this contribution
        </label>
        <Input
          id={`qty-${contribution.id}`}
          className="w-24"
          inputMode="numeric"
          value={quantity}
          disabled={busy || withdrawn || !acceptsChanges}
          onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy || withdrawn || !acceptsChanges || quantity === String(contribution.quantity)}
          onClick={() =>
            send(
              `/api/collective/contributions/${contribution.id}`,
              { action: 'quantity', quantity: Number(quantity) },
              `Contribution set to ${quantity} ${unitOfSale}.`
            )
          }
        >
          Set quantity
        </Button>
        {canConfirm && contribution.status !== 'confirmed' && (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() =>
              send(`/api/collective/contributions/${contribution.id}`, { action: 'confirm' }, 'Contribution confirmed.')
            }
          >
            Confirm
          </Button>
        )}
        {!withdrawn && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              send(
                `/api/collective/contributions/${contribution.id}`,
                { action: 'withdraw' },
                'Contribution withdrawn. The aggregate total drops immediately.'
              )
            }
          >
            Withdraw
          </Button>
        )}
      </div>
      <MessageLine message={message} />
      {!acceptsChanges && !withdrawn && (
        <p className="mt-1 text-xs text-ink-500">
          This opportunity is {opportunityClosedLabel(contribution.status)}; quantities can no longer be edited here.
        </p>
      )}
    </div>
  );
}

function opportunityClosedLabel(status: GroupContribution['status']): string {
  return status === 'confirmed' ? 'closed to changes, contribution confirmed' : 'closed to quantity changes';
}

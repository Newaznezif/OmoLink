'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { t, type TranslationKey } from '@/lib/i18n';
import { Button, Input } from './ui';
import { STATUS_LABELS } from './opportunity-form';
import type { GroupContribution, LanguageCode } from '@/lib/types';
import type { CollectiveOpportunity } from '@/lib/types';

function useRequest(lang: LanguageCode) {
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
        setMessage({ ok: false, text: json?.error ?? t(lang, 'collectiveManage.serverRefused', { status: res.status }) });
        return;
      }
      setMessage({ ok: true, text: successText });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: t(lang, 'collectiveManage.networkError') });
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

export function OpportunityStatusPicker({ lang, opportunity }: { lang: LanguageCode; opportunity: CollectiveOpportunity }) {
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
  const { busy, message, send } = useRequest(lang);
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
                tr('collectiveManage.stateSet', { label: t(lang, STATUS_LABELS[state]) })
              )
            }
          >
            {t(lang, STATUS_LABELS[state])}
          </Button>
        ))}
      </div>
      <MessageLine message={message} />
      {opportunity.status === 'fulfilled' && (
        <p className="mt-1 text-xs text-ink-500">
          {tr('collectiveManage.fulfilledNote')}
        </p>
      )}
    </div>
  );
}

export function ContributionActions({
  lang,
  contribution,
  unitOfSale,
  canConfirm,
  acceptsChanges
}: {
  lang: LanguageCode;
  contribution: GroupContribution;
  unitOfSale: string;
  canConfirm: boolean;
  acceptsChanges: boolean;
}) {
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
  const { busy, message, send } = useRequest(lang);
  const [quantity, setQuantity] = useState(String(contribution.quantity));
  const withdrawn = contribution.status === 'withdrawn';

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`qty-${contribution.id}`}>
          {tr('collectiveManage.qtyAria')}
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
              tr('collectiveManage.setQuantitySuccess', { quantity, unit: unitOfSale })
            )
          }
        >
          {tr('collectiveManage.setQuantity')}
        </Button>
        {canConfirm && contribution.status !== 'confirmed' && (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() =>
              send(`/api/collective/contributions/${contribution.id}`, { action: 'confirm' }, tr('collectiveManage.confirmed'))
            }
          >
            {tr('collectiveManage.confirm')}
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
                tr('collectiveManage.withdrawn')
              )
            }
          >
            {tr('collectiveManage.withdraw')}
          </Button>
        )}
      </div>
      <MessageLine message={message} />
      {!acceptsChanges && !withdrawn && (
        <p className="mt-1 text-xs text-ink-500">
          {tr('collectiveManage.closedNote', { state: opportunityClosedLabel(lang, contribution.status) })}
        </p>
      )}
    </div>
  );
}

function opportunityClosedLabel(lang: LanguageCode, status: GroupContribution['status']): string {
  return t(lang, status === 'confirmed' ? 'collectiveManage.closedConfirmed' : 'collectiveManage.closedQuantity');
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { t, type TranslationKey } from '@/lib/i18n';
import { PAYMENT_STATUSES } from '@/lib/payments';
import type { LanguageCode, PaymentStatus } from '@/lib/types';
import { Button } from './ui';

/**
 * The four buttons of the simulated checkout.
 *
 * They choose which scenario the demo simulator will answer with; they do not
 * decide the status of anything. The status printed underneath comes back from
 * the server, which asks the simulator the same `verify()` question it would ask
 * a real provider. That distinction is the whole point of this page: it lets the
 * production code path be demonstrated without ever pretending money moved.
 */
export function DemoCheckout({
  lang,
  reference,
  inquiryId,
  status: initialStatus
}: {
  lang: LanguageCode;
  reference: string;
  inquiryId: string;
  /** The status on the record when the page rendered. Only `pending` offers buttons. */
  status: PaymentStatus;
}) {
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
  const router = useRouter();
  const [current, setCurrent] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options: { outcome: 'success' | 'pending' | 'failed' | 'cancelled'; label: string }[] = [
    { outcome: 'success', label: tr('demoCheckout.success') },
    { outcome: 'pending', label: tr('demoCheckout.pending') },
    { outcome: 'failed', label: tr('demoCheckout.failed') },
    { outcome: 'cancelled', label: tr('demoCheckout.cancelled') }
  ];

  async function choose(outcome: 'success' | 'pending' | 'failed' | 'cancelled') {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/payments/${encodeURIComponent(reference)}/demo-outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json?.error === 'string' ? json.error : tr('payment.tryAgain'));
      const status = PAYMENT_STATUSES.find((s) => s === json?.status);
      if (status) setCurrent(status);
      // The inquiry page reads payments from the server, so it needs a fresh render.
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : tr('payment.tryAgain'));
    } finally {
      setBusy(false);
    }
  }

  const backLink = (
    <a
      href={`/buyer/inquiries/${inquiryId}`}
      className="inline-flex items-center font-semibold text-sm underline text-clay-700 min-h-9 px-3 py-1.5"
    >
      {tr('payment.backToInquiry')}
    </a>
  );

  if (current !== 'pending') {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-ink-900" role="status">
          {tr(`payment.status.${current}`)}
        </p>
        <p className="text-xs text-ink-500">{tr('payment.simulatedNote')}</p>
        {backLink}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-700">{tr('demoCheckout.choose')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.outcome}
            type="button"
            size="sm"
            variant={option.outcome === 'success' ? 'primary' : 'secondary'}
            onClick={() => choose(option.outcome)}
            disabled={busy}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-500">{tr('demoCheckout.footnote')}</p>
      {error && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

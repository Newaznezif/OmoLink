'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { t, type TranslationKey } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';
import { Button } from './ui';

/**
 * Buyer-side record keeping. Only the two statuses a buyer can honestly attest
 * to are offered; the endpoint refuses anything else even if this page is edited
 * in the browser.
 */
export function BuyerArrangementActions({
  inquiryId,
  current,
  lang = 'en'
}: {
  inquiryId: string;
  current: string;
  lang?: LanguageCode;
}) {
  const router = useRouter();
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function record(status: 'completed' | 'cancelled') {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? tr('arrangement.recordFailed'));
      setMessage(status === 'completed' ? tr('arrangement.recordedCompleted') : tr('arrangement.recordedCancelled'));
      router.refresh();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : tr('report.generic'));
    } finally {
      setBusy(false);
    }
  }

  if (current === 'completed' || current === 'cancelled') {
    return (
      <p className="text-sm text-ink-500">
        {current === 'completed' ? tr('arrangement.alreadyCompleted') : tr('arrangement.alreadyCancelled')}
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => record('completed')} disabled={busy}>
          {busy ? tr('arrangement.recording') : tr('arrangement.confirmReceived')}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => record('cancelled')} disabled={busy}>
          {tr('arrangement.cancelRequest')}
        </Button>
      </div>
      {message && (
        <p className="mt-2 text-sm text-ink-700" role="status">
          {message}
        </p>
      )}
      <p className="mt-1 text-xs text-ink-500">{tr('arrangement.actionsHint')}</p>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { t, type TranslationKey } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';
import { Button } from './ui';

const STATUS_OPTIONS: { v: string; label: TranslationKey }[] = [
  { v: 'new', label: 'inquiries.statusNew' },
  { v: 'accepted', label: 'inquiries.statusAccepted' },
  { v: 'awaiting_confirmation', label: 'inquiry.status.awaiting_confirmation' },
  { v: 'fulfillment_arranged', label: 'inquiries.statusFulfillment' },
  { v: 'completed', label: 'inquiry.status.completed' },
  { v: 'cancelled', label: 'inquiry.status.cancelled' }
];

// `lang` defaults to English only so the seller card in arrangement-card.tsx,
// which is keyed by another pass, keeps rendering until it threads the prop in.
export function InquiryStatusPicker({
  inquiryId,
  current,
  lang = 'en'
}: {
  inquiryId: string;
  current: string;
  lang?: LanguageCode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: string) {
    if (next === current) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? t(lang, 'inquiries.updateFailed'));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t(lang, 'report.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label htmlFor={`status-${inquiryId}`} className="text-sm font-semibold text-ink-900">
        {t(lang, 'inquiries.updateLabel')}
      </label>
      <div className="mt-1 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((o) => (
          <Button
            key={o.v}
            type="button"
            size="sm"
            variant={o.v === current ? 'primary' : 'secondary'}
            disabled={busy || o.v === current}
            onClick={() => change(o.v)}
          >
            {t(lang, o.label)}
          </Button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

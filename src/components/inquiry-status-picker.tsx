'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui';

export function InquiryStatusPicker({ inquiryId, current }: { inquiryId: string; current: string }) {
  const router = useRouter();
  const options = [
    { v: 'new', label: 'New' },
    { v: 'accepted', label: 'Accepted' },
    { v: 'awaiting_confirmation', label: 'Awaiting confirmation' },
    { v: 'fulfillment_arranged', label: 'Fulfillment arranged' },
    { v: 'completed', label: 'Completed' },
    { v: 'cancelled', label: 'Cancelled' }
  ];
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
      if (!res.ok) throw new Error(json?.error ?? 'Could not update status.');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label htmlFor={`status-${inquiryId}`} className="text-sm font-semibold text-ink-900">
        Update status
      </label>
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map((o) => (
          <Button
            key={o.v}
            type="button"
            size="sm"
            variant={o.v === current ? 'primary' : 'secondary'}
            disabled={busy || o.v === current}
            onClick={() => change(o.v)}
          >
            {o.label}
          </Button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

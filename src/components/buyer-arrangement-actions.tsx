'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from './ui';

/**
 * Buyer-side record keeping. Only the two statuses a buyer can honestly attest
 * to are offered; the endpoint refuses anything else even if this page is edited
 * in the browser.
 */
export function BuyerArrangementActions({ inquiryId, current }: { inquiryId: string; current: string }) {
  const router = useRouter();
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
      if (!res.ok) throw new Error(json?.error ?? 'Could not record that.');
      setMessage(
        status === 'completed'
          ? 'Recorded as completed on your side. The seller confirms it too when they deliver.'
          : 'Recorded as cancelled. Nothing was charged — OmoLink does not take payment.'
      );
      router.refresh();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (current === 'completed' || current === 'cancelled') {
    return (
      <p className="text-sm text-ink-500">
        {current === 'completed'
          ? 'This arrangement is recorded as completed. Leave a review on the listing if you would like to.'
          : 'This arrangement is recorded as cancelled.'}
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => record('completed')} disabled={busy}>
          {busy ? 'Recording…' : 'Confirm I received it'}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => record('cancelled')} disabled={busy}>
          Cancel this request
        </Button>
      </div>
      {message && (
        <p className="mt-2 text-sm text-ink-700" role="status">
          {message}
        </p>
      )}
      <p className="mt-1 text-xs text-ink-500">
        Recording completion says the goods or the guide actually turned up. Until then the record stays an arrangement,
        not a sale.
      </p>
    </div>
  );
}

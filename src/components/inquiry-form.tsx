'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { multiplyUnitPrice, formatMoney } from '@/lib/money';
import type { AvailabilityStatus, UnitOfSale } from '@/lib/types';
import { Button, Field, Input, Textarea } from './ui';

export type InquiryListingInfo = {
  id: string;
  title: string;
  unitPriceCents: number;
  unitOfSale: UnitOfSale;
  minOrderQuantity: number;
  availableQuantity: number;
  availability: AvailabilityStatus;
};

export function InquiryForm({ listing }: { listing: InquiryListingInfo }) {
  const router = useRouter();
  const [qty, setQty] = useState<number>(listing.minOrderQuantity);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [preference, setPreference] = useState<'pickup' | 'delivery' | 'booking' | 'unsure'>('pickup');
  const [preferredDate, setPreferredDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; reference?: string; message?: string } | null>(null);
  const idempotencyRef = useRef<string>('');

  useEffect(() => {
    // Idempotency key stable per mount so retries don't duplicate.
    idempotencyRef.current = `idem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  const subtotal = useMemo(() => multiplyUnitPrice(listing.unitPriceCents, qty), [qty, listing.unitPriceCents]);
  const maxQty = listing.availability === 'made_to_order' ? listing.availableQuantity + 999 : listing.availableQuantity;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setResult(null);

    const localErrors: Record<string, string> = {};
    if (!name.trim()) localErrors.name = 'Enter your name or organisation.';
    if (!contact.trim()) localErrors.contact = 'Enter a phone number, email, or coordinator contact so the producer can reply.';
    if (!Number.isInteger(qty) || qty < listing.minOrderQuantity) localErrors.qty = `Enter a whole number of at least ${listing.minOrderQuantity}.`;
    else if (qty > maxQty) localErrors.qty = `Only ${listing.availableQuantity} ${listing.unitOfSale} available right now.`;

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setSubmitting(false);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      // Cache the inquiry payload locally so it can be resubmitted when online.
      try {
        localStorage.setItem(
          'omolink_pending_inquiry',
          JSON.stringify({
            listingId: listing.id,
            buyerName: name,
            buyerContact: contact,
            quantity: qty,
            message,
            preference,
            preferredDate,
            idempotencyKey: idempotencyRef.current
          })
        );
        setResult({
          ok: false,
          message: 'You are offline. This inquiry has been queued on your device and can be retried when a connection returns.'
        });
        setSubmitting(false);
        return;
      } catch {
        /* ignore storage failures */
      }
    }

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          buyerName: name,
          buyerContact: contact,
          quantity: qty,
          message,
          preference,
          preferredDate,
          idempotencyKey: idempotencyRef.current
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to submit inquiry.');
      setResult({ ok: true, reference: json.inquiry?.reference });
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please retry.';
      setResult({ ok: false, message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-ink-100 rounded-2xl card-shadow p-5 space-y-4"
      aria-labelledby="inquiry-heading"
    >
      <h2 id="inquiry-heading" className="font-semibold text-ink-900">
        Send an inquiry
      </h2>

      <Field label={`Quantity (${listing.unitOfSale})`} htmlFor="qty" required error={errors.qty} hint={`Minimum ${listing.minOrderQuantity} ${listing.unitOfSale}.`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(listing.minOrderQuantity, q - 1))}
            className="w-11 h-11 rounded-lg border border-ink-100 text-lg font-bold"
          >
            −
          </button>
          <Input
            id="qty"
            inputMode="numeric"
            value={String(qty)}
            onChange={(e) => setQty(Number(e.target.value.replace(/\D/g, '')) || 0)}
            invalid={Boolean(errors.qty)}
            className="w-24 text-center text-lg font-bold"
          />
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(maxQty || q + 1, q + 1))}
            className="w-11 h-11 rounded-lg border border-ink-100 text-lg font-bold"
          >
            +
          </button>
        </div>
      </Field>

      <div className="rounded-lg bg-clay-50 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink-700">Estimated subtotal</span>
          <span className="font-bold text-clay-800">{formatMoney({ cents: subtotal, currency: 'ETB' })}</span>
        </div>
        <p className="mt-1 text-xs text-ink-500">
          Not a total charge. Transport, coordination or packaging (if any) are agreed separately with the producer and
          disclosed before payment. Nothing has been paid.
        </p>
      </div>

      <Field label="Your name or organisation" htmlFor="buyer-name" required error={errors.name}>
        <Input id="buyer-name" value={name} onChange={(e) => setName(e.target.value)} invalid={Boolean(errors.name)} />
      </Field>
      <Field label="How the producer can reply" htmlFor="buyer-contact" required error={errors.contact} hint="Phone number, email, or a coordinator contact.">
        <Input id="buyer-contact" value={contact} onChange={(e) => setContact(e.target.value)} invalid={Boolean(errors.contact)} />
      </Field>

      <Field label="Delivery preference" htmlFor="preference">
        <select
          id="preference"
          value={preference}
          onChange={(e) => setPreference(e.target.value as typeof preference)}
          className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2.5 min-h-11"
        >
          <option value="pickup">Pickup at producer / meeting point</option>
          <option value="delivery">Ask about delivery</option>
          <option value="booking">Book a service session</option>
          <option value="unsure">Not sure yet</option>
        </select>
      </Field>

      {(preference === 'booking' || preference === 'delivery') && (
        <Field label="Preferred date (optional)" htmlFor="preferred-date">
          <Input id="preferred-date" type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
        </Field>
      )}

      <Field label="Message to producer (optional)" htmlFor="message">
        <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit inquiry'}
      </Button>

      {result && (
        <div
          role="status"
          className={
            'rounded-lg p-3 text-sm border ' +
            (result.ok ? 'bg-moss-50 text-moss-700 border-moss-100' : 'bg-red-50 text-red-700 border-red-100')
          }
        >
          {result.ok ? (
            <>
              <p className="font-semibold">Inquiry submitted.</p>
              <p>Reference: <span className="font-mono">{result.reference}</span>. The producer will see it in their dashboard. Nothing has been paid.</p>
            </>
          ) : (
            <p>{result.message}</p>
          )}
        </div>
      )}
    </form>
  );
}

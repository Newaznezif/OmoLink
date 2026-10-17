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

type PendingInquiry = {
  listingId: string;
  buyerName: string;
  buyerContact: string;
  quantity: number;
  message: string;
  preference: 'pickup' | 'delivery' | 'booking' | 'unsure';
  preferredDate: string;
  idempotencyKey: string;
};

// One record per listing: a single shared slot would let a second offline
// inquiry overwrite the first one.
const PENDING_PREFIX = 'omonetab_pending_inquiry:';

function readPendingInquiry(listingId: string): PendingInquiry | null {
  try {
    const raw = window.localStorage.getItem(PENDING_PREFIX + listingId);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed.idempotencyKey !== 'string') return null;
    return {
      listingId,
      buyerName: String(parsed.buyerName ?? ''),
      buyerContact: String(parsed.buyerContact ?? ''),
      quantity: Number.isInteger(parsed.quantity) ? parsed.quantity : 0,
      message: String(parsed.message ?? ''),
      preference: parsed.preference === 'delivery' || parsed.preference === 'booking' || parsed.preference === 'unsure' ? parsed.preference : 'pickup',
      preferredDate: String(parsed.preferredDate ?? ''),
      idempotencyKey: parsed.idempotencyKey
    };
  } catch {
    return null;
  }
}

function writePendingInquiry(record: PendingInquiry) {
  try {
    window.localStorage.setItem(PENDING_PREFIX + record.listingId, JSON.stringify(record));
  } catch {
    /* private mode or full storage: the inquiry simply is not queued */
  }
}

function clearPendingInquiry(listingId: string) {
  try {
    window.localStorage.removeItem(PENDING_PREFIX + listingId);
  } catch {
    /* nothing to clear */
  }
}

function newIdempotencyKey() {
  return `idem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function InquiryForm({ listing, recordsPath }: { listing: InquiryListingInfo; recordsPath?: string }) {
  const router = useRouter();
  const [qty, setQty] = useState<number>(listing.minOrderQuantity);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [preference, setPreference] = useState<'pickup' | 'delivery' | 'booking' | 'unsure'>('pickup');
  const [preferredDate, setPreferredDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; reference?: string; inquiryId?: string; message?: string } | null>(
    null
  );
  const idempotencyRef = useRef<string>('');
  const [queuedOffline, setQueuedOffline] = useState(false);

  useEffect(() => {
    // A queued inquiry keeps its key so that sending it again after the
    // connection returns is matched against the same idempotency key by the
    // repository instead of creating a second inquiry.
    const stored = readPendingInquiry(listing.id);
    if (!stored) {
      idempotencyRef.current = newIdempotencyKey();
      return;
    }
    idempotencyRef.current = stored.idempotencyKey;
    setName(stored.buyerName);
    setContact(stored.buyerContact);
    setMessage(stored.message);
    setPreference(stored.preference);
    setPreferredDate(stored.preferredDate);
    setQty(stored.quantity);
    setQueuedOffline(true);
  }, [listing.id]);

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
      writePendingInquiry({
        listingId: listing.id,
        buyerName: name,
        buyerContact: contact,
        quantity: qty,
        message,
        preference,
        preferredDate,
        idempotencyKey: idempotencyRef.current
      });
      setQueuedOffline(true);
      setResult({
        ok: false,
        message:
          'You are offline. This inquiry is saved on this device, and the form keeps its contents. Sending it again once a connection returns reuses the same reference, so the producer will not receive it twice.'
      });
      setSubmitting(false);
      return;
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
      clearPendingInquiry(listing.id);
      setQueuedOffline(false);
      setResult({ ok: true, reference: json.inquiry?.reference, inquiryId: json.inquiry?.id });
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

      {queuedOffline && (
        <p role="status" className="rounded-lg border border-ochre-100 bg-ochre-50 p-3 text-sm text-ochre-700">
          This inquiry is waiting on this device. It has not reached the producer yet: send it again once a connection
          returns.
        </p>
      )}

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
              {recordsPath && result.inquiryId && (
                <p className="mt-1">
                  <a href={`${recordsPath}/${result.inquiryId}`} className="underline font-semibold">
                    Open it in your records
                  </a>{' '}
                  to follow up or cancel it.
                </p>
              )}
            </>
          ) : (
            <p>{result.message}</p>
          )}
        </div>
      )}
    </form>
  );
}

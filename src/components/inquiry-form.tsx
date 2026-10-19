'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { multiplyUnitPrice, formatMoney } from '@/lib/money';
import type { AvailabilityStatus, LanguageCode, UnitOfSale } from '@/lib/types';
import { t, type TranslationKey } from '@/lib/i18n';
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

export function InquiryForm({
  lang,
  listing,
  recordsPath
}: {
  lang: LanguageCode;
  listing: InquiryListingInfo;
  recordsPath?: string;
}) {
  const router = useRouter();
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
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
    if (!name.trim()) localErrors.name = tr('inquiry.errorName');
    if (!contact.trim()) localErrors.contact = tr('inquiry.errorContact');
    if (!Number.isInteger(qty) || qty < listing.minOrderQuantity) localErrors.qty = tr('inquiry.errorMinQuantity', { count: listing.minOrderQuantity });
    else if (qty > maxQty) localErrors.qty = tr('inquiry.errorMaxQuantity', { count: listing.availableQuantity, unit: listing.unitOfSale });

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
      setResult({ ok: false, message: tr('inquiry.errorOffline') });
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
      if (!res.ok) throw new Error(json?.error ?? tr('inquiry.errorFailed'));
      clearPendingInquiry(listing.id);
      setQueuedOffline(false);
      setResult({ ok: true, reference: json.inquiry?.reference, inquiryId: json.inquiry?.id });
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tr('inquiry.errorGeneric');
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
        {tr('inquiry.inquire')}
      </h2>

      <Field
        label={tr('inquiry.quantityLabel', { unit: listing.unitOfSale })}
        htmlFor="qty"
        required
        error={errors.qty}
        hint={tr('inquiry.minimumHint', { count: listing.minOrderQuantity, unit: listing.unitOfSale })}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={tr('inquiry.decrease')}
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
            aria-label={tr('inquiry.increase')}
            onClick={() => setQty((q) => Math.min(maxQty || q + 1, q + 1))}
            className="w-11 h-11 rounded-lg border border-ink-100 text-lg font-bold"
          >
            +
          </button>
        </div>
      </Field>

      <div className="rounded-lg bg-clay-50 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink-700">{tr('inquiry.subtotal')}</span>
          <span className="font-bold text-clay-800">{formatMoney({ cents: subtotal, currency: 'ETB' })}</span>
        </div>
        <p className="mt-1 text-xs text-ink-500">{tr('inquiry.subtotalNote')}</p>
      </div>

      <Field label={tr('inquiry.nameLabel')} htmlFor="buyer-name" required error={errors.name}>
        <Input id="buyer-name" value={name} onChange={(e) => setName(e.target.value)} invalid={Boolean(errors.name)} />
      </Field>
      <Field label={tr('inquiry.contactLabel')} htmlFor="buyer-contact" required error={errors.contact} hint={tr('inquiry.contactHint')}>
        <Input id="buyer-contact" value={contact} onChange={(e) => setContact(e.target.value)} invalid={Boolean(errors.contact)} />
      </Field>

      <Field label={tr('inquiry.preferenceLabel')} htmlFor="preference">
        <select
          id="preference"
          value={preference}
          onChange={(e) => setPreference(e.target.value as typeof preference)}
          className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2.5 min-h-11"
        >
          <option value="pickup">{tr('inquiry.preference.pickup')}</option>
          <option value="delivery">{tr('inquiry.preference.delivery')}</option>
          <option value="booking">{tr('inquiry.preference.booking')}</option>
          <option value="unsure">{tr('inquiry.preference.unsure')}</option>
        </select>
      </Field>

      {(preference === 'booking' || preference === 'delivery') && (
        <Field label={tr('inquiry.dateLabel')} htmlFor="preferred-date">
          <Input id="preferred-date" type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
        </Field>
      )}

      <Field label={tr('inquiry.messageLabel')} htmlFor="message">
        <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>

      {queuedOffline && (
        <p role="status" className="rounded-lg border border-ochre-100 bg-ochre-50 p-3 text-sm text-ochre-700">
          {tr('inquiry.queuedNote')}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? tr('inquiry.submitting') : tr('inquiry.submit')}
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
              <p className="font-semibold">{tr('inquiry.submitted')}</p>
              <p>{tr('inquiry.referenceLine', { reference: result.reference ?? '' })}</p>
              {recordsPath && result.inquiryId && (
                <p className="mt-1">
                  <a href={`${recordsPath}/${result.inquiryId}`} className="underline font-semibold">
                    {tr('inquiry.openRecord')}
                  </a>
                  {tr('inquiry.openRecordTail')}
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

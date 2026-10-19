'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { t, type TranslationKey } from '@/lib/i18n';
import { PAYMENT_STATUSES, type PaymentBlocker } from '@/lib/payments';
import { formatMoney } from '@/lib/money';
import type { LanguageCode, Payment, PaymentStatus } from '@/lib/types';
import { Badge, Button } from './ui';

/**
 * The buyer's payment surface for one inquiry.
 *
 * Everything it does goes through a route that re-reads the stored inquiry: the
 * amount is never taken from this component, and a status is only ever reported
 * after the workflow has asked the provider. The buttons are the honest options
 * for the state the record is actually in, which is why "Proceed to Payment"
 * appears only once the producer has answered and a price is on file.
 */
const BLOCKED_COPY: Partial<Record<PaymentBlocker | 'suspended', TranslationKey>> = {
  seller_has_not_responded: 'payment.awaitingSeller',
  no_documented_price: 'payment.noPrice',
  inquiry_closed: 'payment.closed',
  suspended: 'payment.suspended'
};

export function PaymentPanel({
  lang,
  inquiryId,
  amountCents,
  payments,
  canPay,
  blockedReason
}: {
  lang: LanguageCode;
  inquiryId: string;
  amountCents: number;
  payments: Payment[];
  canPay: boolean;
  /** The eligibility gate's own reason, so the copy matches the real blocker. */
  blockedReason?: PaymentBlocker | 'suspended';
}) {
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
  const router = useRouter();
  const [busy, setBusy] = useState<'start' | 'check' | 'cancel' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Newest first regardless of how the repository ordered the list, so the badge
  // and the open attempt describe the buyer's latest attempt.
  const ordered = [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const blockedKey: TranslationKey = (blockedReason ? BLOCKED_COPY[blockedReason] : undefined) ?? 'payment.noneYet';
  const latest = ordered[0];
  const openAttempt = ordered.find((p) => p.status === 'pending');
  const paid = ordered.find((p) => p.status === 'confirmed' || p.status === 'refunded');

  async function call(path: string, method: 'POST', body?: unknown) {
    setBusy(path === `/api/inquiries/${inquiryId}/payments` ? 'start' : path.endsWith('/cancel') ? 'cancel' : 'check');
    setMessage(null);
    try {
      const res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? '{}' : JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json?.error === 'string' ? json.error : tr('payment.startFailed'));
      }
      if (typeof json?.checkoutUrl === 'string' && isSafeCheckoutLink(json.checkoutUrl)) {
        // Handing the browser to the checkout page is the only thing a start
        // response may do. Nothing is marked paid here — that answer comes from
        // the provider, read by the server, when the buyer comes back.
        window.location.assign(json.checkoutUrl);
        return;
      }
      const status = PAYMENT_STATUSES.find((s) => s === json?.status);
      setMessage(status ? tr(`payment.status.${status}`) : null);
      router.refresh();
    } catch (err: unknown) {
      setMessage(err instanceof Error && err.message ? err.message : tr('payment.tryAgain'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-ink-900">{tr('payment.heading')}</h2>
        {latest && <PaymentStatusBadge lang={lang} status={latest.status} isDemo={latest.isDemo} />}
      </div>

      <p className="mt-2 text-sm text-ink-700">{tr('payment.amountLine', { amount: formatMoney({ cents: amountCents, currency: 'ETB' }) })}</p>

      {!canPay && !openAttempt && !paid && <p className="mt-2 text-sm text-ink-700">{tr(blockedKey)}</p>}

      {canPay && !openAttempt && (
        <>
          {payments.length === 0 && <p className="mt-1 text-xs text-ink-500">{tr('payment.noneYet')}</p>}
          <div className="mt-3">
            <Button type="button" size="sm" onClick={() => call(`/api/inquiries/${inquiryId}/payments`, 'POST')} disabled={busy !== null}>
              {busy === 'start' ? tr('payment.opening') : tr('payment.proceed')}
            </Button>
          </div>
        </>
      )}

      {openAttempt && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-ink-700">{tr('payment.referenceLine', { reference: openAttempt.reference })}</p>
          {openAttempt.checkoutExpiresAt && (
            <p className="text-xs text-ink-500">{tr('payment.windowLine', { when: new Date(openAttempt.checkoutExpiresAt).toLocaleString() })}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {isSafeCheckoutLink(openAttempt.checkoutUrl) && (
              <a
                href={openAttempt.checkoutUrl}
                className="inline-flex items-center font-semibold text-sm underline text-clay-700 min-h-9 px-3 py-1.5"
              >
                {openAttempt.isDemo ? tr('demoCheckout.title') : tr('payment.checkStatus')}
              </a>
            )}
            <Button type="button" size="sm" variant="secondary" onClick={() => call(`/api/payments/${openAttempt.reference}/verify`, 'POST')} disabled={busy !== null}>
              {busy === 'check' ? tr('payment.checking') : tr('payment.checkStatus')}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => call(`/api/payments/${openAttempt.reference}/cancel`, 'POST')} disabled={busy !== null}>
              {busy === 'cancel' ? tr('payment.cancelling') : tr('payment.cancelAttempt')}
            </Button>
          </div>
        </div>
      )}

      {paid && (
        <p className="mt-2 text-sm text-ink-700">
          {tr('payment.referenceLine', { reference: paid.reference })}
          {paid.status === 'refunded' && <span className="block mt-1">{tr('payment.refundedNote')}</span>}
        </p>
      )}

      {payments.length > 0 && (
        <p className="mt-2 text-xs text-ink-500">{tr('payment.attemptCount', { count: payments.length })}</p>
      )}

      {latest?.isDemo && (
        <p className="mt-2 text-xs text-ink-500">{tr('payment.simulatedNote')}</p>
      )}

      {message && (
        <p className="mt-2 text-sm text-ink-700" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

/** A checkout address is only ever https or this site's own path. */
function isSafeCheckoutLink(url: string | undefined): boolean {
  return typeof url === 'string' && (url.startsWith('/') || url.startsWith('https://'));
}

export function PaymentStatusBadge({
  lang,
  status,
  isDemo
}: {
  lang: LanguageCode;
  status: PaymentStatus;
  isDemo: boolean;
}) {
  const tone = status === 'confirmed' ? 'success' : status === 'refunded' ? 'info' : status === 'pending' ? 'warning' : 'danger';
  return (
    <Badge tone={tone} title={isDemo ? t(lang, 'payment.simulatedNote') : undefined}>
      {t(lang, `payment.status.${status}`)}
      {isDemo && <span className="ml-1 opacity-70">({t(lang, 'payment.simulatedBadge')})</span>}
    </Badge>
  );
}

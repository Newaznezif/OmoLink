import type { Inquiry, InquiryStatus, Payment, PaymentProviderId, PaymentStatus } from './types';

/**
 * Payment rules that hold no state and touch no I/O, so both the repositories and
 * the test suite can use them. Nothing in here talks to a provider: this module
 * decides whether a payment may exist and what a provider answer means.
 *
 * Two rules run through the whole file:
 *   1. An amount is only ever read from a persisted record, never from a browser.
 *   2. A provider's word is only trusted after server-side verification; a
 *      redirected browser proves nothing.
 */

/**
 * Raised when production payment configuration is missing or unusable. The app
 * shows this text and stops; it never quietly switches to the simulator.
 *
 * It lives in this rules module rather than behind the provider boundary because
 * the Supabase repository has to raise it too, and that module is loaded by the
 * Node test suite, which cannot import a `server-only` module.
 */
export class PaymentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentConfigurationError';
  }
}

/** Statuses documented by the provider as terminal for our purposes. */
export const CONFIRMED_STATUS: PaymentStatus = 'confirmed';
export const CLOSED_PAYMENT_STATUSES: PaymentStatus[] = ['confirmed', 'failed', 'cancelled', 'expired'];

/** Every payment state we can display, so a screen can branch without a list literal. */
export const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'confirmed', 'failed', 'cancelled', 'expired', 'refunded'];

/**
 * Inquiry states in which the seller has answered, so the amount and the purchase
 * conditions are agreed and a payment can be attempted. `new` deliberately is not
 * here: paying before the producer has responded is exactly what the current
 * confirmation text promises has not happened.
 */
export const PAYABLE_INQUIRY_STATUSES: InquiryStatus[] = ['accepted', 'awaiting_confirmation', 'fulfillment_arranged'];

export type PaymentBlocker =
  | 'not_signed_in'
  | 'not_your_inquiry'
  | 'inquiry_missing'
  | 'seller_has_not_responded'
  | 'inquiry_closed'
  | 'no_documented_price'
  | 'already_paid'
  | 'in_progress';

export type PaymentEligibility =
  | { eligible: true; paymentAllowed: 'new_payment' | 'retry' }
  | { eligible: false; reason: PaymentBlocker };

/**
 * Why a payment is not on the table, in the same order the gate checks it. The
 * interface text comes from the dictionary; these are the plain-language fallbacks
 * the repositories throw and that a screen can print verbatim.
 */
export const PAYMENT_BLOCKER_MESSAGES: Record<PaymentBlocker, string> = {
  not_signed_in: 'Sign in before attempting a payment, so the record has an owner.',
  not_your_inquiry: 'This inquiry belongs to another buyer.',
  inquiry_missing: 'The inquiry this payment would belong to cannot be found.',
  seller_has_not_responded: 'The producer has not answered this inquiry yet, so there is no agreed amount to pay.',
  inquiry_closed: 'This inquiry is closed, so no payment can be taken against it.',
  no_documented_price: 'No price was documented for this item, so there is nothing to pay until the producer quotes one.',
  already_paid: 'This inquiry already has a confirmed payment.',
  in_progress: 'A payment for this inquiry is already open. Complete or wait for it before starting another.'
};

/**
 * The single gate in front of every payment write. `existing` is every payment
 * already recorded against this inquiry, newest first or oldest first — the order
 * does not matter because the checks scan the whole set.
 */
export function paymentEligibility(input: {
  inquiry: Inquiry | undefined;
  actorProfileId: string | undefined;
  existing: Payment[];
}): PaymentEligibility {
  const { inquiry, actorProfileId, existing } = input;
  if (!actorProfileId) return { eligible: false, reason: 'not_signed_in' };
  if (!inquiry) return { eligible: false, reason: 'inquiry_missing' };
  // Guests own nothing, and a buyer may never pay against someone else's inquiry.
  if (inquiry.buyerProfileId !== actorProfileId) return { eligible: false, reason: 'not_your_inquiry' };
  if (existing.some((p) => p.status === 'confirmed')) return { eligible: false, reason: 'already_paid' };
  if (inquiry.status === 'new') return { eligible: false, reason: 'seller_has_not_responded' };
  if (inquiry.status === 'completed' || inquiry.status === 'cancelled') {
    return { eligible: false, reason: 'inquiry_closed' };
  }
  if (!PAYABLE_INQUIRY_STATUSES.includes(inquiry.status)) return { eligible: false, reason: 'seller_has_not_responded' };
  // Real catalogue items whose producer never quoted a price have no amount to pay.
  if (!Number.isInteger(inquiry.estimatedSubtotalCents) || inquiry.estimatedSubtotalCents <= 0) {
    return { eligible: false, reason: 'no_documented_price' };
  }
  if (existing.some((p) => p.status === 'pending')) return { eligible: false, reason: 'in_progress' };
  return { eligible: true, paymentAllowed: existing.length > 0 ? 'retry' : 'new_payment' };
}

/**
 * Whether one recorded status may move to another. `confirmed` is only reachable
 * through a verified provider answer, and only a confirmed payment can be
 * refunded, so a webhook replay can never un-pay something.
 */
export function canMovePaymentStatus(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true;
  if (from === 'confirmed') return to === 'refunded';
  if (from === 'refunded') return false;
  if (from === 'pending') return CLOSED_PAYMENT_STATUSES.includes(to);
  // failed / cancelled / expired may be re-opened only by a fresh attempt, which
  // creates a new record rather than rewriting this one.
  return false;
}

/** Provider states that a hosted-checkout provider documents, kept as text. */
export type ProviderStatus = 'success' | 'pending' | 'failed' | 'cancelled' | 'incomplete' | 'blocked';

/**
 * Translation from provider language to ours. Anything that is not an explicit
 * `success` stays non-terminal, because treating an unclear state as failure
 * would let a slow provider cancel a payment that later completes.
 */
export const PROVIDER_STATUS_TO_PAYMENT: Record<ProviderStatus, PaymentStatus> = {
  success: 'confirmed',
  pending: 'pending',
  failed: 'failed',
  cancelled: 'cancelled',
  incomplete: 'pending',
  blocked: 'pending'
};

export const PROVIDER_STATUSES = Object.keys(PROVIDER_STATUS_TO_PAYMENT) as ProviderStatus[];

export function isProviderStatus(value: unknown): value is ProviderStatus {
  return typeof value === 'string' && (PROVIDER_STATUSES as string[]).includes(value);
}

/**
 * The one place a provider answer becomes our status. A not-yet-decided answer on
 * a checkout whose window has passed becomes `expired`, because there is no longer
 * any way for the buyer to pay that reference; everything else maps straight
 * through, and only `success` can ever produce `confirmed`.
 */
export function resolveVerifiedStatus(
  payment: Payment,
  providerStatus: ProviderStatus,
  nowIso: string
): { status: PaymentStatus; detail: string } {
  const mapped = PROVIDER_STATUS_TO_PAYMENT[providerStatus];
  if (mapped === 'confirmed') {
    return { status: 'confirmed', detail: `Provider reported ${providerStatus}.` };
  }
  const windowPassed = Boolean(payment.checkoutExpiresAt && payment.checkoutExpiresAt <= nowIso);
  if (mapped === 'pending' && windowPassed) {
    return { status: 'expired', detail: `Provider still reported ${providerStatus} after the checkout window closed.` };
  }
  return { status: mapped, detail: `Provider reported ${providerStatus}.` };
}

/**
 * Integer cents to the provider's decimal major units, as an exact string so no
 * float ever reaches a money field. 123456 cents -> "1234.56".
 */
export function centsToMajorUnits(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error('Amount must be a non-negative integer number of cents.');
  const whole = Math.floor(cents / 100);
  const frac = String(cents % 100).padStart(2, '0');
  return `${whole}.${frac}`;
}

/** Major units back to integer cents, refusing anything with sub-cent precision. */
export function majorUnitsToCents(value: unknown): number | null {
  const asText = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(asText)) return null;
  const [whole, frac = ''] = asText.split('.');
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
}

/**
 * Compares what the provider says it charged against what we recorded. A mismatch
 * in amount or currency is a security event, not a rounding difference.
 */
export function amountMatches(payment: Payment, reportedAmount: unknown, reportedCurrency: unknown): boolean {
  const reportedCents = majorUnitsToCents(reportedAmount);
  if (reportedCents === null) return false;
  return reportedCents === payment.amountCents && reportedCurrency === payment.currency;
}

/** Whether a receipt for this payment may claim the money arrived. */
export function isPaid(payment: Payment): boolean {
  return payment.status === 'confirmed' || payment.status === 'refunded';
}

/** Every label the receipt prints for a payment state, kept in one place. */
export function receiptDocumentKind(payment: Payment | undefined): 'payment_receipt' | 'payment_pending' | 'inquiry_acknowledgement' {
  if (!payment) return 'inquiry_acknowledgement';
  return payment.status === 'confirmed' || payment.status === 'refunded' ? 'payment_receipt' : 'payment_pending';
}

export const PROVIDER_LABELS: Record<PaymentProviderId, string> = {
  demo_simulated: 'Simulated payment (demo mode)',
  chapa: 'Chapa'
};

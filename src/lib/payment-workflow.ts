import 'server-only';
import { getRepo } from './repo';
import { resolvePaymentProvider } from './payment-providers';
import { PaymentConfigurationError, resolveVerifiedStatus } from './payments';
import type { PaymentProvider } from './payment-providers/contract';
import { isDemoOutcome } from './payment-providers/demo';
import type { Actor } from './session';
import type { Inquiry, Payment } from './types';

/**
 * The server side of inquiry → payment, in one place so the route handlers, the
 * provider notification and the tests all run the same sequence:
 *
 *   validate the stored inquiry and its ownership → open a persisted attempt with
 *   our own reference → ask the provider for a checkout → store what it returned →
 *   later, ask the provider what actually happened and record only that answer.
 *
 * Two rules shape everything below. The amount never comes from a request: it is
 * read off the stored inquiry by the repository. And a browser arriving back from
 * a checkout page proves nothing: every status that reports money goes through
 * `verifyPayment()`, which asks the provider itself.
 */

export type PaymentOutcome =
  | { ok: true; payment: Payment; simulated: boolean }
  | { ok: false; status: number; error: string };

const failure = (status: number, error: string): PaymentOutcome => ({ ok: false, status, error });

/**
 * Keeps the honest status code: missing or unusable production configuration is a
 * 503 the operator has to fix, not a 400 the buyer is told to retry, and never a
 * quiet switch to the simulator.
 */
function asFailure(err: unknown, fallback: string): PaymentOutcome {
  if (err instanceof PaymentConfigurationError) return failure(503, err.message);
  const message = err instanceof Error && err.message.trim() ? err.message : fallback;
  return failure(400, message);
}

function providerFor(): { provider: PaymentProvider } | { fail: PaymentOutcome } {
  try {
    return { provider: resolvePaymentProvider() };
  } catch (err) {
    return { fail: asFailure(err, 'Payment is not configured on this deployment.') };
  }
}

/**
 * Opens a payment attempt for an inquiry and returns the checkout address.
 *
 * `demoOutcome` is honoured only while the resolved provider is the simulator, so
 * a request can never pick its own result against a live provider.
 */
export async function startPayment(inquiryId: string, actor: Actor, demoOutcome?: unknown): Promise<PaymentOutcome> {
  const resolved = providerFor();
  if ('fail' in resolved) return resolved.fail;
  const provider = resolved.provider;

  const repo = getRepo();
  const inquiry: Inquiry | undefined = await repo.getInquiry(inquiryId);
  if (!inquiry) return failure(404, 'That arrangement is not in your records.');

  let payment: Payment;
  try {
    payment = await repo.createPayment({
      inquiryId,
      actorProfileId: actor.profileId,
      provider: provider.id,
      demoOutcome: provider.live ? undefined : isDemoOutcome(demoOutcome) ? demoOutcome : undefined
    });
  } catch (err) {
    return asFailure(err, 'This payment attempt could not be opened.');
  }

  const listing = await repo.getListing(inquiry.listingId);
  const description = `${listing?.title ?? 'OmoNetTab arrangement'} — ${inquiry.quantity} ${inquiry.unitOfSale}`;

  let checkout;
  try {
    checkout = await provider.initiate({
      reference: payment.reference,
      amountCents: payment.amountCents,
      currency: payment.currency,
      description,
      buyerName: inquiry.buyerName,
      buyerContact: inquiry.buyerContact
    });
  } catch (err) {
    // The attempt was written before the provider was asked, so the reference
    // exists even though no checkout was ever issued. Close it honestly instead
    // of leaving an open attempt that blocks a retry — and keep the record,
    // because an attempt that never reached a payment page is still history.
    const reason = err instanceof Error ? err.message : 'The payment provider could not be reached.';
    try {
      await repo.settlePayment({
        merchantReference: payment.reference,
        status: 'cancelled',
        detail: `Closed because no checkout address could be obtained: ${reason}`,
        actorProfileId: actor.profileId
      });
    } catch {
      // The provider's own refusal matters more than the cleanup. The attempt
      // stays open and the buyer can cancel it from the inquiry page.
    }
    return asFailure(err, 'The payment provider could not be reached. Nothing has been marked paid.');
  }

  try {
    const settled = await repo.attachCheckout(
      payment.id,
      { checkoutUrl: checkout.checkoutUrl, providerReference: checkout.providerReference, expiresAt: checkout.expiresAt },
      actor.profileId
    );
    return { ok: true, payment: settled, simulated: !provider.live };
  } catch (err) {
    return asFailure(err, 'The checkout address could not be stored for this attempt.');
  }
}

/**
 * Asks the provider what happened to an attempt and records that answer. This is
 * the only route by which a status that reports money can change — in demo mode
 * and in live mode alike, the workflow reads the provider rather than the browser.
 */
export async function verifyPayment(
  merchantReference: string,
  options: { actorProfileId?: string; providerEventId?: string; fromWebhook?: boolean } = {}
): Promise<PaymentOutcome> {
  const resolved = providerFor();
  if ('fail' in resolved) return resolved.fail;
  const provider = resolved.provider;

  const repo = getRepo();
  const payment = await repo.getPayment(merchantReference);
  if (!payment) return failure(404, 'No payment with that reference.');
  if (options.actorProfileId && options.actorProfileId !== payment.buyerProfileId) {
    return failure(403, 'Only the buyer of this attempt can check its status here.');
  }

  let reported;
  try {
    reported = await provider.verify(payment.reference);
  } catch (err) {
    return asFailure(err, 'The payment provider could not be reached, so nothing was marked paid.');
  }

  const resolvedStatus = resolveVerifiedStatus(payment, reported.status, new Date().toISOString());
  try {
    const settled = await repo.settlePayment({
      merchantReference: payment.reference,
      status: resolvedStatus.status,
      detail: resolvedStatus.detail,
      reportedAmount: reported.amount,
      reportedCurrency: reported.currency,
      providerReference: reported.providerReference,
      paymentMethod: reported.paymentMethod,
      feeCents: reported.feeCents,
      providerEventId:
        options.providerEventId ?? (options.fromWebhook ? `${payment.reference}:${resolvedStatus.status}` : undefined),
      actorProfileId: options.actorProfileId
    });
    return { ok: true, payment: settled, simulated: !provider.live };
  } catch (err) {
    return asFailure(err, 'The payment outcome could not be recorded.');
  }
}

/**
 * Closes the buyer's own open attempt. A retry needs this first, because one
 * inquiry carries at most one open attempt — the same rule the database enforces
 * with a partial unique index, so it holds under two simultaneous clicks.
 */
export async function cancelPayment(merchantReference: string, actor: Actor): Promise<PaymentOutcome> {
  const resolved = providerFor();
  // Cancellation is a statement about our own record rather than the provider's,
  // so a missing provider configuration does not stop an open attempt being closed.
  const provider = 'provider' in resolved ? resolved.provider : undefined;

  const repo = getRepo();
  const payment = await repo.getPayment(merchantReference);
  if (!payment) return failure(404, 'No payment with that reference.');
  if (payment.buyerProfileId !== actor.profileId && actor.role !== 'admin') {
    return failure(403, 'Only the buyer cancels their own payment attempt.');
  }
  if (payment.status !== 'pending') return failure(409, `This attempt is already ${payment.status}.`);

  try {
    const settled = await repo.settlePayment({
      merchantReference: payment.reference,
      status: 'cancelled',
      detail: 'Cancelled by the buyer before completing the checkout.',
      actorProfileId: actor.profileId
    });
    return { ok: true, payment: settled, simulated: provider ? !provider.live : false };
  } catch (err) {
    return asFailure(err, 'The payment attempt could not be cancelled.');
  }
}

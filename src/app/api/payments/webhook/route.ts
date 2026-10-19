import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/store';
import { verifyPayment } from '@/lib/payment-workflow';
import { webhookMerchantReference, verifyChapaWebhook } from '@/lib/payment-providers/chapa';
import { PaymentConfigurationError } from '@/lib/payments';

export const dynamic = 'force-dynamic';

/**
 * The provider's notification about a payment.
 *
 * Three things are deliberately true here:
 *
 * 1. The signature is checked against the **raw** request body before anything
 *    else is read, because a notification is an unauthenticated request from the
 *    internet that claims money moved. A failure is 401; a missing webhook secret
 *    is 503, since that is the operator's configuration to fix.
 * 2. The body is trusted for exactly one field: the merchant reference, which is
 *    our own identifier. The outcome is then re-read from the provider's verify
 *    endpoint, so a forged or mistyped notification cannot state that anything was
 *    paid.
 * 3. Recording the answer goes through the same `verifyPayment()` the buyer's
 *    status check uses, with a provider event id derived from the verified answer —
 *    the documentation says a notification may be delivered more than once, and a
 *    replay must not become a second receipt or a second line in a report.
 *
 * What is NOT yet true: live notifications have never been received. The digest
 * encoding the provider puts in `x-chapa-signature` is not stated in its
 * documentation, so both renderings are accepted here and the first real provider
 * test has to confirm which one arrives. Until a test transaction succeeds, this
 * endpoint is documented as unproven, not as working.
 */
export async function POST(req: Request) {
  if (isDemoMode()) {
    // In demo mode there is no external provider to notify us; the simulated
    // checkout page reports its own scenario instead, through a route that only
    // exists while DATA_MODE=demo.
    return NextResponse.json({ error: 'Demo mode has no external payment provider to notify this site.' }, { status: 404 });
  }

  const raw = await req.text();
  const signature = req.headers.get('x-chapa-signature') ?? undefined;

  let authenticated: boolean;
  try {
    authenticated = verifyChapaWebhook(raw, signature);
  } catch (err) {
    if (err instanceof PaymentConfigurationError) return NextResponse.json({ error: err.message }, { status: 503 });
    throw err;
  }
  if (!authenticated) {
    return NextResponse.json({ error: 'This notification does not carry a signature we can verify.' }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'The notification body is not readable as JSON.' }, { status: 400 });
  }

  const reference = webhookMerchantReference(parsed);
  if (!reference) {
    return NextResponse.json({ error: 'The notification carries no merchant reference to look up.' }, { status: 400 });
  }

  const result = await verifyPayment(reference, { fromWebhook: true });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ received: true, reference: result.payment.reference, status: result.payment.status });
}

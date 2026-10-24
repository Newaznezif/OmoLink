import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { authErrorResponse, requireRole, type Actor } from '@/lib/session';
import { verifyPayment } from '@/lib/payment-workflow';
import { isDemoOutcome, recordDemoOutcome } from '@/lib/payment-providers/demo';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

/**
 * The simulated checkout page's equivalent of a buyer finishing payment on a
 * provider's hosted page: it records which scenario the demonstration chose, then
 * the workflow reads that answer back through the same verification path a live
 * provider is checked with.
 *
 * Demo mode only. Outside demo mode this route answers 404, because an endpoint
 * that lets a visitor declare their own payment successful would be the worst
 * possible thing to ship alongside a real provider — which is why the outcome is
 * never taken from a request in the live flow at all.
 */
export async function POST(req: Request, { params }: { params: { reference: string } }) {
  const t = getT();
  if (!isDemoMode()) return NextResponse.json({ error: t('apiDemoCheckout.notFound') }, { status: 404 });

  let actor: Actor;
  try {
    actor = await requireRole('buyer');
  } catch (err) {
    const { body, status } = authErrorResponse(err, t('apiDemoCheckout.signInAsBuyer'));
    return NextResponse.json(body, { status });
  }

  const body = (await req.json().catch(() => ({}))) as { outcome?: unknown };
  if (!isDemoOutcome(body.outcome)) {
    return NextResponse.json({ error: t('apiDemoCheckout.chooseOutcome') }, { status: 400 });
  }

  const payment = await getRepo().getPayment(params.reference);
  if (!payment) return NextResponse.json({ error: t('apiDemoCheckout.noPayment') }, { status: 404 });
  if (payment.buyerProfileId !== actor.profileId) {
    return NextResponse.json({ error: t('apiDemoCheckout.onlyBuyer') }, { status: 403 });
  }
  if (payment.status !== 'pending') {
    return NextResponse.json({ error: t('apiDemoCheckout.attemptAlready', { status: payment.status }) }, { status: 409 });
  }

  try {
    recordDemoOutcome(payment.reference, body.outcome);
  } catch (err: unknown) {
    // The simulator keeps its answer in process memory, so a server restart can
    // legitimately have forgotten an attempt the demo store still shows.
    const message = err instanceof Error && err.message ? err.message : t('apiDemoCheckout.checkoutNotOpen');
    return NextResponse.json({ error: message }, { status: 409 });
  }
  const result = await verifyPayment(payment.reference, { actorProfileId: actor.profileId });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    reference: result.payment.reference,
    status: result.payment.status,
    simulated: true
  });
}

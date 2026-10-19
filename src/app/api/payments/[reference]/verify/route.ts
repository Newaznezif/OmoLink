import { NextResponse } from 'next/server';
import { authErrorResponse, requireRole, type Actor } from '@/lib/session';
import { verifyPayment } from '@/lib/payment-workflow';

export const dynamic = 'force-dynamic';

/**
 * "What happened to my payment?" — answered by asking the provider, never by
 * trusting where the browser was redirected to.
 *
 * This is the endpoint a buyer presses after coming back from a hosted checkout,
 * and the reason a return link alone cannot mark anything paid: the status here
 * comes from the provider's own verification call, and the amount and currency it
 * reports are compared with the attempt before anything is written.
 */
export async function POST(_req: Request, { params }: { params: { reference: string } }) {
  let actor: Actor;
  try {
    actor = await requireRole('buyer');
  } catch (err) {
    const { body, status } = authErrorResponse(err, 'Sign in as the buyer of this attempt to check its status.');
    return NextResponse.json(body, { status });
  }

  const result = await verifyPayment(params.reference, { actorProfileId: actor.profileId });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    reference: result.payment.reference,
    status: result.payment.status,
    amountCents: result.payment.amountCents,
    paymentMethod: result.payment.paymentMethod,
    confirmedAt: result.payment.confirmedAt,
    simulated: result.simulated
  });
}

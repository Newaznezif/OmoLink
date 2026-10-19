import { NextResponse } from 'next/server';
import { authErrorResponse, requireRole, type Actor } from '@/lib/session';
import { startPayment } from '@/lib/payment-workflow';

export const dynamic = 'force-dynamic';

/**
 * A buyer opens a payment attempt against their own inquiry, once the producer
 * has answered it.
 *
 * The request carries no amount: the attempt is priced from the stored inquiry in
 * `startPayment`, and an inquiry whose producer never quoted a price is refused
 * with `no_documented_price`. `demoOutcome` is read only while the resolved
 * provider is the simulator.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let actor: Actor;
  try {
    actor = await requireRole('buyer');
  } catch (err) {
    const { body, status } = authErrorResponse(err, 'Sign in as a buyer before paying for an inquiry.');
    return NextResponse.json(body, { status });
  }

  const body = (await req.json().catch(() => ({}))) as { demoOutcome?: unknown };
  const result = await startPayment(params.id, actor, body.demoOutcome);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json(
    {
      reference: result.payment.reference,
      status: result.payment.status,
      amountCents: result.payment.amountCents,
      checkoutUrl: result.payment.checkoutUrl,
      expiresAt: result.payment.checkoutExpiresAt,
      simulated: result.simulated
    },
    { status: 201 }
  );
}

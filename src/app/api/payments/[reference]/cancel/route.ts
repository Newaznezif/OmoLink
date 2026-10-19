import { NextResponse } from 'next/server';
import { authErrorResponse, requireRole, type Actor } from '@/lib/session';
import { cancelPayment } from '@/lib/payment-workflow';

export const dynamic = 'force-dynamic';

/**
 * Closes the buyer's own open attempt, which is also the only way to make room
 * for a retry: one inquiry carries at most one open attempt, in demo mode and in
 * the schema (0006 enforces it with a partial unique index).
 *
 * A closed attempt is kept, not deleted — an abandoned checkout is part of the
 * history of the arrangement, and a report that only counts confirmed payments
 * ignores it either way.
 */
export async function POST(_req: Request, { params }: { params: { reference: string } }) {
  let actor: Actor;
  try {
    actor = await requireRole('buyer');
  } catch (err) {
    const { body, status } = authErrorResponse(err, 'Sign in as the buyer of this attempt to cancel it.');
    return NextResponse.json(body, { status });
  }

  const result = await cancelPayment(params.reference, actor);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ reference: result.payment.reference, status: result.payment.status });
}

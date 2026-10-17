import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { authErrorResponse, requireRole, type Actor } from '@/lib/session';
import type { CollectiveOpportunity } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUSES: CollectiveOpportunity['status'][] = ['open', 'closing_soon', 'closed', 'fulfilled', 'cancelled'];

/** Closing or reopening an opportunity: what the group may still contribute to. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let actor: Actor;
  try {
    actor = await requireRole(['coordinator', 'admin']);
  } catch (err) {
    const { body, status } = authErrorResponse(err, 'Sign in before changing an opportunity.');
    return NextResponse.json(body, { status });
  }

  const body = (await req.json().catch(() => ({}))) as { status?: unknown };
  const status = typeof body.status === 'string' ? (body.status as CollectiveOpportunity['status']) : undefined;
  if (!status || !STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Unknown opportunity status.' }, { status: 400 });
  }

  try {
    const opportunity = await getRepo().setOpportunityStatus(params.id, status, actor);
    return NextResponse.json({ opportunity });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not change the status.';
    const notFound = /not found/i.test(message);
    return NextResponse.json({ error: message }, { status: notFound ? 404 : 400 });
  }
}

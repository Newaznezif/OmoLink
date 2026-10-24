import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { authErrorResponse, requireRole, type Actor } from '@/lib/session';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

/**
 * The three things a contribution record needs: change the committed quantity,
 * withdraw it, or have the coordinator confirm it. Who may do which is decided by
 * the repository (owner / coordinating account / administrator) and, in Supabase
 * mode, by row level security — this handler only refuses unsigned and suspended
 * accounts up front and validates the number.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const t = getT();
  let actor: Actor;
  try {
    actor = await requireRole(['producer', 'coordinator', 'admin']);
  } catch (err) {
    const { body, status } = authErrorResponse(err, t('apiCollective.signInToChangeContribution'));
    return NextResponse.json(body, { status });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: unknown; quantity?: unknown };
  const action = typeof body.action === 'string' ? body.action : '';
  const repo = getRepo();

  try {
    if (action === 'withdraw') {
      const contribution = await repo.withdrawContribution(params.id, actor);
      return NextResponse.json({ contribution });
    }
    if (action === 'confirm') {
      const contribution = await repo.confirmContribution(params.id, actor);
      return NextResponse.json({ contribution });
    }
    if (action === 'quantity') {
      const quantity = Number(body.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100000) {
        return NextResponse.json({ error: t('apiCollective.quantityRange') }, { status: 400 });
      }
      const contribution = await repo.updateContribution(params.id, quantity, actor);
      return NextResponse.json({ contribution });
    }
    return NextResponse.json({ error: t('apiCollective.chooseAction') }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('apiCollective.changeContributionFailed');
    const notFound = /not found/i.test(message);
    return NextResponse.json({ error: message }, { status: notFound ? 404 : 400 });
  }
}

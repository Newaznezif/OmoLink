import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { authErrorResponse, requireRole, type Actor } from '@/lib/session';
import { parseDecimalAmount } from '@/lib/money';
import { makeId } from '@/lib/ids';
import { getT } from '@/lib/i18n/server';
import { UNIT_OF_SALES, type CollectiveOpportunity, type UnitOfSale } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUSES: CollectiveOpportunity['status'][] = ['open', 'closing_soon', 'closed', 'fulfilled', 'cancelled'];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Creating or editing a collective opportunity. Powers here are the coordinator
 * ones the prompt asks for: opening an opportunity and setting its public state.
 * A plain producer account is refused by requireRole() before any of this runs,
 * and the repository refuses again — a client cannot claim to be a coordinator
 * by editing the request body.
 */
export async function POST(req: Request) {
  const t = getT();
  let actor: Actor;
  try {
    actor = await requireRole(['coordinator', 'admin']);
  } catch (err) {
    const { body, status } = authErrorResponse(err, t('apiCollective.signInToEdit'));
    return NextResponse.json(body, { status });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const repo = getRepo();

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const pickupPlan = typeof body.pickupPlan === 'string' ? body.pickupPlan.trim() : '';
  const transportPlan = typeof body.transportPlan === 'string' ? body.transportPlan.trim() : '';
  const categoryId = typeof body.categoryId === 'string' ? body.categoryId : '';
  const organizingGroupId = typeof body.organizingGroupId === 'string' ? body.organizingGroupId : '';
  const unitOfSale = typeof body.unitOfSale === 'string' ? (body.unitOfSale as UnitOfSale) : ('kg' as UnitOfSale);
  const targetQuantity = Number(body.targetQuantity);
  const status = typeof body.status === 'string' ? (body.status as CollectiveOpportunity['status']) : 'open';
  const orderDeadline = typeof body.orderDeadline === 'string' && body.orderDeadline ? body.orderDeadline : undefined;
  const id = typeof body.id === 'string' && body.id ? body.id : undefined;

  const bad = (message: string) => NextResponse.json({ error: message }, { status: 400 });

  if (title.length < 6) return bad(t('apiCollective.titleTooShort'));
  if (description.length < 20) return bad(t('apiCollective.descriptionTooShort'));
  if (pickupPlan.length < 3) return bad(t('apiCollective.pickupPlanRequired'));
  if (transportPlan.length > 800) return bad(t('apiCollective.transportTooLong'));
  if (!UNIT_OF_SALES.includes(unitOfSale)) return bad(t('apiCollective.unknownUnitOfSale'));
  if (!Number.isInteger(targetQuantity) || targetQuantity < 1 || targetQuantity > 100000) {
    return bad(t('apiCollective.targetQuantityRange'));
  }
  if (!STATUSES.includes(status)) return bad(t('apiCollective.unknownStatus'));
  if (orderDeadline && Number.isNaN(Date.parse(orderDeadline))) return bad(t('apiCollective.deadlineUnreadable'));

  const categories = await repo.listCategories();
  if (!categories.some((c) => c.id === categoryId)) return bad(t('apiCollective.chooseCategory'));

  const groups = await repo.listGroups();
  if (organizingGroupId) {
    const group = groups.find((g) => g.id === organizingGroupId);
    if (!group) return bad(t('apiCollective.groupNotFound'));
    // An administrator may file on behalf of any group; a coordinator must belong to it.
    if (actor.role !== 'admin' && group.coordinatorProfileId !== actor.profileId) {
      return bad(t('apiCollective.onlyCoordinateOwnGroup'));
    }
  } else if (actor.role !== 'admin') {
    return bad(t('apiCollective.chooseGroup'));
  }

  const priceInput = (value: unknown) => {
    if (typeof value !== 'string' || value.trim() === '') return { ok: true, cents: undefined };
    const cents = parseDecimalAmount(value);
    if (cents === null || cents < 0) return { ok: false, cents: undefined };
    return { ok: true, cents };
  };
  const indicative = priceInput(body.indicativeGroupPriceEtb);
  const offered = priceInput(body.buyerOfferedPriceEtb);
  if (!indicative.ok || !offered.ok) return bad(t('apiCollective.priceFormat'));

  const existing = id ? await repo.getOpportunity(id) : undefined;
  if (id && !existing) return NextResponse.json({ error: t('apiCollective.opportunityNotFound') }, { status: 404 });

  let slug = slugify(title) || `collective-${makeId('s').slice(2)}`;
  if (existing?.slug === slug) {
    slug = existing.slug;
  } else {
    const taken = (await repo.listOpportunities()).some((o) => o.slug === slug && o.id !== existing?.id);
    if (taken) slug = `${slug}-${makeId('').slice(1, 6)}`;
  }

  try {
    const opportunity = await repo.saveOpportunity(
      {
        // Empty string means "create": both repositories branch on a truthy id.
        id: existing?.id ?? '',
        slug,
        title,
        description,
        categoryId,
        unitOfSale,
        organizingGroupId: organizingGroupId || (existing?.organizingGroupId ?? ''),
        // Never taken from the request: the coordinating account is who is signed in,
        // or whoever already coordinated the record being edited.
        coordinatorProfileId: existing?.coordinatorProfileId ?? actor.profileId,
        targetQuantity,
        indicativeGroupPrice: indicative.cents ? { cents: indicative.cents, currency: 'ETB' } : undefined,
        buyerOfferedPrice: offered.cents ? { cents: offered.cents, currency: 'ETB' } : undefined,
        pickupPlan,
        transportPlan: transportPlan || undefined,
        orderDeadline,
        status
      },
      actor
    );
    return NextResponse.json({ opportunity }, { status: existing ? 200 : 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('apiCollective.saveFailed');
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

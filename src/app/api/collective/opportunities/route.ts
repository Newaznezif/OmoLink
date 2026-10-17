import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { authErrorResponse, requireRole, type Actor } from '@/lib/session';
import { parseDecimalAmount } from '@/lib/money';
import { makeId } from '@/lib/ids';
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
  let actor: Actor;
  try {
    actor = await requireRole(['coordinator', 'admin']);
  } catch (err) {
    const { body, status } = authErrorResponse(err, 'Sign in before editing a collective opportunity.');
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

  if (title.length < 6) return bad('Give the opportunity a title of at least 6 characters.');
  if (description.length < 20) return bad('Explain what the group is collecting in at least 20 characters.');
  if (pickupPlan.length < 3) return bad('Say where and how the goods are picked up.');
  if (transportPlan.length > 800) return bad('Keep the transport note under 800 characters.');
  if (!UNIT_OF_SALES.includes(unitOfSale)) return bad('Unknown unit of sale.');
  if (!Number.isInteger(targetQuantity) || targetQuantity < 1 || targetQuantity > 100000) {
    return bad('Target quantity must be a whole number between 1 and 100000.');
  }
  if (!STATUSES.includes(status)) return bad('Unknown opportunity status.');
  if (orderDeadline && Number.isNaN(Date.parse(orderDeadline))) return bad('The deadline is not a readable date.');

  const categories = await repo.listCategories();
  if (!categories.some((c) => c.id === categoryId)) return bad('Choose which category this opportunity is for.');

  const groups = await repo.listGroups();
  if (organizingGroupId) {
    const group = groups.find((g) => g.id === organizingGroupId);
    if (!group) return bad('That group does not exist.');
    // An administrator may file on behalf of any group; a coordinator must belong to it.
    if (actor.role !== 'admin' && group.coordinatorProfileId !== actor.profileId) {
      return bad('You can only open an opportunity for a group you coordinate.');
    }
  } else if (actor.role !== 'admin') {
    return bad('Choose the group this opportunity is organised under.');
  }

  const priceInput = (value: unknown) => {
    if (typeof value !== 'string' || value.trim() === '') return { ok: true, cents: undefined };
    const cents = parseDecimalAmount(value);
    if (cents === null || cents < 0) return { ok: false, cents: undefined };
    return { ok: true, cents };
  };
  const indicative = priceInput(body.indicativeGroupPriceEtb);
  const offered = priceInput(body.buyerOfferedPriceEtb);
  if (!indicative.ok || !offered.ok) return bad('Prices must be numbers like 450 or 1250.50.');

  const existing = id ? await repo.getOpportunity(id) : undefined;
  if (id && !existing) return NextResponse.json({ error: 'Opportunity not found.' }, { status: 404 });

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
    const message = err instanceof Error ? err.message : 'Could not save the opportunity.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

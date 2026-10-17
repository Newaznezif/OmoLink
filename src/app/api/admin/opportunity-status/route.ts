import { confirmed, handleAdminForm, required } from '@/lib/admin-actions';
import type { CollectiveOpportunity } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUSES: CollectiveOpportunity['status'][] = ['open', 'closing_soon', 'closed', 'fulfilled', 'cancelled'];

/**
 * Closing or reopening a group order. A fulfilled order cannot be reopened, and
 * contributions stop being editable once the order is closed — both enforced in
 * the repository, not only by hiding the buttons here.
 */
export async function POST(req: Request) {
  return handleAdminForm(req, async ({ form, actor, repo }) => {
    const id = required(form, 'opportunityId', 'The group order');
    const status = String(form.get('status') ?? '');
    if (!STATUSES.includes(status as CollectiveOpportunity['status'])) throw new Error('Unknown order status.');
    if (status === 'closed' || status === 'fulfilled' || status === 'cancelled') confirmed(form, 'the closure');

    const updated = await repo.setOpportunityStatus(id, status as CollectiveOpportunity['status'], actor);
    return `“${updated.title}” is now ${updated.status.replace('_', ' ')}.`;
  });
}

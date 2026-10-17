import { handleAdminForm, required } from '@/lib/admin-actions';

export const dynamic = 'force-dynamic';

const STATUSES = ['published', 'hidden'] as const;

/** Review moderation. Hiding keeps the record; it is not deleted. */
export async function POST(req: Request) {
  return handleAdminForm(req, async ({ form, actor, repo }) => {
    const id = required(form, 'reviewId', 'The review');
    const status = String(form.get('status') ?? '');
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) throw new Error('Unknown review status.');
    const note = String(form.get('note') ?? '').trim();
    if (status === 'hidden' && !note) throw new Error('Record why the review is hidden, so the producer can be told.');

    const updated = await repo.setReviewStatus(id, status as 'published' | 'hidden', note, actor);
    return updated.status === 'hidden'
      ? 'The review is hidden from the public listing page and stays in the moderation record.'
      : 'The review is published again.';
  });
}

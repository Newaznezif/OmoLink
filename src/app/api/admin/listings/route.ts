import { confirmed, handleAdminForm, required } from '@/lib/admin-actions';

export const dynamic = 'force-dynamic';

const ACTIONS = ['feature', 'unfeature', 'publish', 'unpublish', 'archive', 'delete'] as const;

/**
 * Listing moderation. The repository checks that the actor is an active
 * administrator (or the owning producer) before anything changes, and a listing
 * with inquiry history cannot be deleted — only archived — so the history that
 * buyers and producers relied on survives.
 */
export async function POST(req: Request) {
  return handleAdminForm(req, async ({ form, actor, repo }) => {
    const listingId = required(form, 'listingId', 'The listing');
    const action = String(form.get('action') ?? '');
    if (!ACTIONS.includes(action as (typeof ACTIONS)[number])) throw new Error('Unknown moderation action.');
    const listing = await repo.getListing(listingId);
    if (!listing) throw new Error('Listing not found.');
    if (action !== 'feature' && action !== 'unfeature') confirmed(form, `the “${action}” moderation action`);

    switch (action) {
      case 'feature':
        await repo.setListingFeatured(listingId, true, actor);
        return `“${listing.title}” is highlighted on the homepage.`;
      case 'unfeature':
        await repo.setListingFeatured(listingId, false, actor);
        return `“${listing.title}” is no longer highlighted on the homepage.`;
      case 'publish':
        await repo.setListingPublished(listingId, true, actor);
        return `“${listing.title}” is published.`;
      case 'unpublish':
        await repo.setListingPublished(listingId, false, actor);
        return `“${listing.title}” is no longer publicly visible. The producer can publish it again from their dashboard.`;
      case 'archive':
        await repo.archiveListing(listingId, actor);
        return `“${listing.title}” is archived. Its inquiries are kept.`;
      default:
        await repo.deleteListing(listingId, actor);
        return `“${listing.title}” was deleted because no inquiry history was attached to it.`;
    }
  });
}

import { handleAdminForm, required } from '@/lib/admin-actions';
import type { ListingReport } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUSES: ListingReport['status'][] = ['open', 'reviewing', 'resolved', 'rejected'];

/**
 * Report resolution. The note is stored with the decision and appears in the
 * audit log, so a resolution is traceable instead of a silent status flip.
 * The reason requirement is checked here as well as in the repository so both
 * data modes ask for the same trace.
 */
export async function POST(req: Request) {
  return handleAdminForm(req, async ({ form, actor, repo }) => {
    const id = required(form, 'reportId', 'The report');
    const status = String(form.get('status') ?? '');
    if (!STATUSES.includes(status as ListingReport['status'])) throw new Error('Unknown report status.');
    const note = String(form.get('note') ?? '').trim();
    if (status !== 'open' && !note) {
      throw new Error(`Not saved — record why the report moves to ${status.replace(/_/g, ' ')}.`);
    }

    const updated = await repo.updateReport(id, status as ListingReport['status'], note, actor);
    const listing = await repo.getListing(updated.listingId);
    return `Report on “${listing?.title ?? updated.listingId}” marked ${updated.status}.`;
  });
}

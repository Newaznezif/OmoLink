import { confirmed, handleAdminForm, required } from '@/lib/admin-actions';
import type { AccountStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Suspend or reactivate an account. A suspended account keeps read access to its
 * own records but loses every write path, and the loss takes effect immediately
 * because the status is re-read from the stored profile on each request — an old
 * session cookie does not keep it working.
 */
export async function POST(req: Request) {
  return handleAdminForm(req, async ({ form, actor, repo }) => {
    const profileId = required(form, 'profileId', 'The account');
    const status = String(form.get('status') ?? '');
    if (status !== 'active' && status !== 'suspended') throw new Error('Unknown account status.');
    confirmed(form, status === 'suspended' ? 'the suspension' : 'the reactivation');

    const updated = await repo.setProfileStatus(profileId, status as AccountStatus, actor);
    return updated.status === 'suspended'
      ? `${updated.displayName} is suspended. Their own records stay readable to them, but publishing, replying and contributing are blocked.`
      : `${updated.displayName} can use the platform again.`;
  });
}

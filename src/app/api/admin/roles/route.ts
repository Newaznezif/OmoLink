import { confirmed, handleAdminForm, required } from '@/lib/admin-actions';
import type { Role } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ASSIGNABLE: Role[] = ['buyer', 'producer', 'coordinator', 'admin'];

/**
 * Role assignment. Enforced here and again in the repository: the actor must be
 * an active administrator, the change must be confirmed, and the last active
 * administrator cannot be demoted. In Supabase mode the database trigger refuses
 * a privileged role written by anyone who is not already an administrator.
 */
export async function POST(req: Request) {
  return handleAdminForm(req, async ({ form, actor, repo }) => {
    const profileId = required(form, 'profileId', 'The account');
    const role = String(form.get('role') ?? '');
    if (!ASSIGNABLE.includes(role as Role)) throw new Error('Choose one of the four known roles.');
    confirmed(form, `the ${role} assignment`);

    const updated = await repo.setProfileRole(profileId, role as Role, actor);
    return `${updated.displayName} now has the “${role}” role.`;
  });
}

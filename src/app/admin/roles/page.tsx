import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { AdminSection, BackField, ConfirmField } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Field, Select } from '@/components/ui';
import type { Role } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MATRIX: { role: Role; can: string; cannot: string }[] = [
  {
    role: 'buyer',
    can: 'Browse, inquire, review a completed arrangement, manage their own profile.',
    cannot: 'Publish listings, see another account’s records, moderate anything.'
  },
  {
    role: 'producer',
    can: 'Everything a buyer can do, plus publish and edit their own listings and reply to inquiries on them.',
    cannot: 'Edit another producer’s listing, assign roles, approve their own verification, read platform-wide private data.'
  },
  {
    role: 'coordinator',
    can: 'Producer rights, plus create and close collective opportunities in their group and confirm contributions.',
    cannot: 'Change accounts, moderate content, edit another group’s opportunity.'
  },
  {
    role: 'admin',
    can: 'Moderate listings and reviews, resolve reports, assign roles, suspend accounts, edit site content.',
    cannot: 'Read a buyer’s private contact detail unless the account published it; delete inquiry history.'
  }
];

const ROLES: Role[] = ['buyer', 'producer', 'coordinator', 'admin'];

export default async function AdminRolesPage({
  searchParams
}: {
  searchParams: { status?: string | string[]; error?: string | string[] };
}) {
  const repo = getRepo();
  const [profiles, stats] = await Promise.all([repo.listAllProfiles(), repo.adminStats()]);
  const privileged = profiles.filter((p) => p.role === 'admin' || p.role === 'coordinator');

  return (
    <AdminSection
      title="Roles and permissions"
      description="What each permission class means, who holds a privileged one right now, and where an administrator can grant or remove it."
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Permission matrix</h2>
          <ul className="mt-2 text-sm space-y-3">
            {MATRIX.map((row) => (
              <li key={row.role} className="border border-ink-100 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink-900 capitalize">{row.role}</span>
                  <span className="text-xs text-ink-500">{stats.byRole[row.role]} account(s)</span>
                </div>
                <p className="mt-1 text-ink-700">{row.can}</p>
                <p className="mt-1 text-ink-500">Cannot: {row.cannot}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-500">
            These rules are enforced on the server and, with Supabase credentials, again by Row Level Security and the
            privileged-column trigger in <code>supabase/migrations/0003_admin_accounts_reviews.sql</code>. Hiding a
            button is not the boundary.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Privileged accounts</h2>
          {privileged.length === 0 ? (
            <p className="mt-2 text-sm text-ink-700">No administrator or coordinator accounts exist.</p>
          ) : (
            <ul className="mt-2 text-sm space-y-2">
              {privileged.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-2 last:border-0">
                  <div>
                    <Link href={`/admin/users/${p.id}`} className="font-semibold underline">
                      {p.displayName}
                    </Link>{' '}
                    <span className="text-ink-500">— {p.community}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={p.role === 'admin' ? 'info' : 'success'}>{p.role}</Badge>
                    {p.status === 'suspended' && <Badge tone="danger">suspended</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-ink-700">
            Keep at least two active administrators. The repository refuses to demote or suspend the last active one, so
            the platform cannot be locked out of its own moderation.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Assign a role</h2>
          <p className="mt-1 text-sm text-ink-700">
            Self-registration can only ever produce a buyer or a producer. Coordinator and administrator access has to
            be granted here by someone who already holds it.
          </p>
          <form method="post" action="/api/admin/roles" className="mt-3 grid md:grid-cols-[1fr_auto] gap-3 items-end">
            <BackField path="/admin/roles" />
            <div className="space-y-3">
              <Field label="Account" htmlFor="profileId">
                <Select id="profileId" name="profileId" required>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} — {p.role}
                      {p.status === 'suspended' ? ' (suspended)' : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="New role" htmlFor="role">
                <Select id="role" name="role" defaultValue="producer">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </Field>
              <ConfirmField
                id="assign-confirm"
                label="I confirm this role change and understand it takes effect immediately for the next request."
              />
            </div>
            <Button type="submit">Assign role</Button>
          </form>
          {isDemoMode() && (
            <p className="mt-3 text-xs text-ink-500">
              Demo mode: the session cookie carries only a user id, so role changes are read back from the stored
              profile. With Supabase, the same rules are enforced by the database policies.
            </p>
          )}
        </CardBody>
      </Card>
    </AdminSection>
  );
}

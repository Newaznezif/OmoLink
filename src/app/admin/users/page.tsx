import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { AdminSection } from '@/components/admin-shell';
import { Badge, Card, CardBody, Empty, Input, Select } from '@/components/ui';
import type { AccountStatus, Profile, Role } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ROLES: Role[] = ['buyer', 'producer', 'coordinator', 'admin'];
const ACCOUNT_KINDS: Record<string, string> = {
  tourist: 'Tourist',
  individual_buyer: 'Individual buyer',
  business_buyer: 'Business buyer',
  producer: 'Producer',
  group_or_cooperative: 'Group or cooperative',
  platform_admin: 'Platform administrator'
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const text = (key: string): string => (typeof searchParams[key] === 'string' ? (searchParams[key] as string) : '');
  const repo = getRepo();
  const [profiles, listings] = await Promise.all([repo.listAllProfiles(), repo.listAllListings()]);

  const q = text('q').trim().toLowerCase();
  const role = ROLES.includes(text('role') as Role) ? (text('role') as Role) : '';
  const status: AccountStatus | '' = text('status') === 'suspended' || text('status') === 'active' ? (text('status') as AccountStatus) : '';

  const listingCounts = new Map<string, number>();
  for (const listing of listings) listingCounts.set(listing.producerId, (listingCounts.get(listing.producerId) ?? 0) + 1);

  const rows = profiles.filter((p) => {
    if (role && p.role !== role) return false;
    if (status && p.status !== status) return false;
    if (!q) return true;
    return [p.displayName, p.community, p.organizationName ?? '', p.userId].join(' ').toLowerCase().includes(q);
  });

  return (
    <AdminSection
      title="Accounts"
      description="Every account on this instance. Roles and suspension are changed on the account page, never from here, and every change is written to the audit log."
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label htmlFor="q" className="block text-sm font-semibold text-ink-900 mb-1">
                Search name, community or organisation
              </label>
              <Input id="q" name="q" defaultValue={text('q')} />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-semibold text-ink-900 mb-1">
                Role
              </label>
              <Select id="role" name="role" defaultValue={role}>
                <option value="">Any role</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-ink-900 mb-1">
                Account status
              </label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">Active or suspended</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>
            <div className="md:col-span-4 flex gap-2">
              <button type="submit" className="rounded-lg bg-clay-700 text-white px-4 py-2 min-h-11 font-semibold">
                Apply filters
              </button>
              <Link href="/admin/users" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold">
                Clear
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty title="No account matches" body="Adjust the search or filters. Accounts are never invented for an empty list." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-ink-100 rounded-xl overflow-hidden bg-white">
            <caption className="sr-only">Accounts on this instance</caption>
            <thead className="bg-clay-50 text-left">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Account</th>
                <th scope="col" className="px-3 py-2 font-semibold">Role</th>
                <th scope="col" className="px-3 py-2 font-semibold">Account kind</th>
                <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                <th scope="col" className="px-3 py-2 font-semibold">Verification</th>
                <th scope="col" className="px-3 py-2 font-semibold">Listings</th>
                <th scope="col" className="px-3 py-2 font-semibold">Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((profile) => (
                <UserRow key={profile.id} profile={profile} listingCount={listingCounts.get(profile.id) ?? 0} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-ink-500">
        Counts are records in this instance. Demo mode shows sample accounts; with Supabase credentials they are the real
        rows the current administrator is allowed to see under Row Level Security.
      </p>
    </AdminSection>
  );
}

function UserRow({ profile, listingCount }: { profile: Profile; listingCount: number }) {
  return (
    <tr className="border-t border-ink-100">
      <th scope="row" className="px-3 py-2 text-left font-normal">
        <span className="block font-semibold text-ink-900">{profile.displayName}</span>
        <span className="block text-xs text-ink-500">
          {profile.community}
          {profile.organizationName ? ` · ${profile.organizationName}` : ''}
        </span>
      </th>
      <td className="px-3 py-2">{profile.role}</td>
      <td className="px-3 py-2">{ACCOUNT_KINDS[profile.accountKind] ?? profile.accountKind}</td>
      <td className="px-3 py-2">
        {profile.status === 'suspended' ? <Badge tone="danger">Suspended</Badge> : <Badge tone="success">Active</Badge>}
      </td>
      <td className="px-3 py-2">{profile.verification.replace('_', ' ')}</td>
      <td className="px-3 py-2 tabular-nums">{listingCount}</td>
      <td className="px-3 py-2">
        <Link
          href={`/admin/users/${profile.id}`}
          className="font-semibold text-clay-700 underline rounded py-1 px-1 hover:bg-clay-50"
        >
          Manage
        </Link>
      </td>
    </tr>
  );
}

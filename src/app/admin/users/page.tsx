import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { AdminSection } from '@/components/admin-shell';
import { Badge, Card, CardBody, Empty, Input, Select } from '@/components/ui';
import { getT } from '@/lib/i18n/server';
import type { TranslationKey } from '@/lib/i18n';
import type { AccountStatus, Profile, Role, VerificationStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ROLES: Role[] = ['buyer', 'producer', 'coordinator', 'admin'];
/** Labels only: an unknown code stored on a record is shown as it was recorded. */
const ACCOUNT_KINDS: Record<string, TranslationKey> = {
  tourist: 'adminUsers.kindTourist',
  individual_buyer: 'adminUsers.kindIndividualBuyer',
  business_buyer: 'adminUsers.kindBusinessBuyer',
  producer: 'adminUsers.kindProducer',
  group_or_cooperative: 'adminUsers.kindGroupOrCooperative',
  platform_admin: 'adminUsers.kindPlatformAdmin'
};
const VERIFICATION_LABELS: Record<VerificationStatus, TranslationKey> = {
  unverified: 'status.unverified',
  pending_review: 'status.pending',
  verified: 'status.verified'
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const t = getT();
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
      title={t('nav.accounts')}
      description={t('adminUsers.description')}
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label htmlFor="q" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('adminUsers.searchLabel')}
              </label>
              <Input id="q" name="q" defaultValue={text('q')} />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('adminUsers.roleLabel')}
              </label>
              <Select id="role" name="role" defaultValue={role}>
                <option value="">{t('adminUsers.anyRole')}</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('adminUsers.accountStatusLabel')}
              </label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">{t('adminUsers.anyStatus')}</option>
                <option value="active">{t('accountSettings.statusActive')}</option>
                <option value="suspended">{t('accountSettings.statusSuspended')}</option>
              </Select>
            </div>
            <div className="md:col-span-4 flex gap-2">
              <button type="submit" className="rounded-lg bg-clay-700 text-white px-4 py-2 min-h-11 font-semibold">
                {t('filter.apply')}
              </button>
              <Link href="/admin/users" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold">
                {t('common.clear')}
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty title={t('adminUsers.emptyTitle')} body={t('adminUsers.emptyBody')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-ink-100 rounded-xl overflow-hidden bg-white">
            <caption className="sr-only">{t('adminUsers.tableCaption')}</caption>
            <thead className="bg-clay-50 text-left">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">{t('adminUsers.colAccount')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t('adminUsers.roleLabel')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t('adminUsers.kindLabel')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t('reports.status')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t('producers.verificationLabel')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t('nav.listings')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t('adminUsers.colOpen')}</th>
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
        {t('adminUsers.countsNote')}
      </p>
    </AdminSection>
  );
}

function UserRow({ profile, listingCount }: { profile: Profile; listingCount: number }) {
  const t = getT();
  const kindKey = ACCOUNT_KINDS[profile.accountKind];
  const verificationKey = VERIFICATION_LABELS[profile.verification];
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
      <td className="px-3 py-2">{kindKey ? t(kindKey) : profile.accountKind}</td>
      <td className="px-3 py-2">
        {profile.status === 'suspended' ? (
          <Badge tone="danger">{t('accountSettings.statusSuspended')}</Badge>
        ) : (
          <Badge tone="success">{t('accountSettings.statusActive')}</Badge>
        )}
      </td>
      <td className="px-3 py-2">{verificationKey ? t(verificationKey) : profile.verification.replace('_', ' ')}</td>
      <td className="px-3 py-2 tabular-nums">{listingCount}</td>
      <td className="px-3 py-2">
        <Link
          href={`/admin/users/${profile.id}`}
          className="font-semibold text-clay-700 underline rounded py-1 px-1 hover:bg-clay-50"
        >
          {t('adminUsers.manageLink')}
        </Link>
      </td>
    </tr>
  );
}

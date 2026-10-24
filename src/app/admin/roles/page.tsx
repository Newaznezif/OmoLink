import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { AdminSection, BackField, ConfirmField } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Field, Select } from '@/components/ui';
import { getT } from '@/lib/i18n/server';
import type { TranslationKey } from '@/lib/i18n';
import type { Role } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Permission text kept truthful: what the role grants, and what it refuses. */
const MATRIX: { role: Role; can: TranslationKey; cannot: TranslationKey }[] = [
  {
    role: 'buyer',
    can: 'roleAdmin.buyerCan',
    cannot: 'roleAdmin.buyerCannot'
  },
  {
    role: 'producer',
    can: 'roleAdmin.producerCan',
    cannot: 'roleAdmin.producerCannot'
  },
  {
    role: 'coordinator',
    can: 'roleAdmin.coordinatorCan',
    cannot: 'roleAdmin.coordinatorCannot'
  },
  {
    role: 'admin',
    can: 'roleAdmin.adminCan',
    cannot: 'roleAdmin.adminCannot'
  }
];

/** The role enum shown to the administrator; the stored value is never renamed. */
const ROLE_NAME_KEY: Record<Role, TranslationKey> = {
  buyer: 'inquiries.buyer',
  producer: 'collective.producerHeader',
  coordinator: 'collective.coordinator',
  admin: 'auth.demoAdminTitle'
};

const ROLES: Role[] = ['buyer', 'producer', 'coordinator', 'admin'];

export default async function AdminRolesPage({
  searchParams
}: {
  searchParams: { status?: string | string[]; error?: string | string[] };
}) {
  const t = getT();
  const repo = getRepo();
  const [profiles, stats] = await Promise.all([repo.listAllProfiles(), repo.adminStats()]);
  const privileged = profiles.filter((p) => p.role === 'admin' || p.role === 'coordinator');

  return (
    <AdminSection
      title={t('roleAdmin.title')}
      description={t('roleAdmin.description')}
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('roleAdmin.matrixHeading')}</h2>
          <ul className="mt-2 text-sm space-y-3">
            {MATRIX.map((row) => (
              <li key={row.role} className="border border-ink-100 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink-900 capitalize">{t(ROLE_NAME_KEY[row.role])}</span>
                  <span className="text-xs text-ink-500">{t('roleAdmin.accountCount', { count: stats.byRole[row.role] })}</span>
                </div>
                <p className="mt-1 text-ink-700">{t(row.can)}</p>
                <p className="mt-1 text-ink-500">{t('roleAdmin.cannotPrefix')}: {t(row.cannot)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-500">
            {t('roleAdmin.enforcementLead')} <code>supabase/migrations/0003_admin_accounts_reviews.sql</code>
            {t('roleAdmin.enforcementTail')}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('roleAdmin.privilegedHeading')}</h2>
          {privileged.length === 0 ? (
            <p className="mt-2 text-sm text-ink-700">{t('roleAdmin.privilegedEmpty')}</p>
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
                    <Badge tone={p.role === 'admin' ? 'info' : 'success'}>{t(ROLE_NAME_KEY[p.role])}</Badge>
                    {p.status === 'suspended' && <Badge tone="danger">{t('accountSettings.wordSuspended')}</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-ink-700">{t('roleAdmin.keepTwoNote')}</p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('roleAdmin.assignHeading')}</h2>
          <p className="mt-1 text-sm text-ink-700">{t('roleAdmin.assignNote')}</p>
          <form method="post" action="/api/admin/roles" className="mt-3 grid md:grid-cols-[1fr_auto] gap-3 items-end">
            <BackField path="/admin/roles" />
            <div className="space-y-3">
              <Field label={t('register.eyebrowAccount')} htmlFor="profileId">
                <Select id="profileId" name="profileId" required>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} — {t(ROLE_NAME_KEY[p.role])}
                      {p.status === 'suspended' ? ` (${t('accountSettings.wordSuspended')})` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('roleAdmin.newRoleLabel')} htmlFor="role">
                <Select id="role" name="role" defaultValue="producer">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {t(ROLE_NAME_KEY[r])}
                    </option>
                  ))}
                </Select>
              </Field>
              <ConfirmField
                id="assign-confirm"
                label={t('roleAdmin.confirmLabel')}
              />
            </div>
            <Button type="submit">{t('roleAdmin.assignSubmit')}</Button>
          </form>
          {isDemoMode() && (
            <p className="mt-3 text-xs text-ink-500">{t('roleAdmin.demoModeNote')}</p>
          )}
        </CardBody>
      </Card>
    </AdminSection>
  );
}

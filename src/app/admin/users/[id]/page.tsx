import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { AdminFeedback, BackField, ConfirmField } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Field, Select, Section } from '@/components/ui';
import { getT } from '@/lib/i18n/server';
import type { TranslationKey } from '@/lib/i18n';
import type { Role, VerificationStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ROLES: Role[] = ['buyer', 'producer', 'coordinator', 'admin'];

const ROLE_HELP: Record<Role, TranslationKey> = {
  buyer: 'adminAccount.roleHelpBuyer',
  producer: 'adminAccount.roleHelpProducer',
  coordinator: 'adminAccount.roleHelpCoordinator',
  admin: 'adminAccount.roleHelpAdmin'
};

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

type SearchParams = { status?: string | string[]; error?: string | string[] };

export default async function AdminUserPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: SearchParams;
}) {
  const t = getT();
  const repo = getRepo();
  const profile = await repo.getProfile(params.id);
  if (!profile) notFound();

  const [listings, groups, audit] = await Promise.all([
    repo.listListingsByProducer(profile.id),
    repo.listGroups(),
    repo.listAuditLogs(200)
  ]);
  const theirAudit = audit.filter((entry) => entry.recordId === profile.id || entry.actorProfileId === profile.id);
  const sellerInquiries = listings.length > 0 ? await repo.listInquiriesForSeller(profile.id) : [];
  const buyerInquiries = await repo.listInquiriesForBuyer(profile.id);
  const theirGroups = groups.filter((g) => g.memberProfileIds.includes(profile.id));

  const kindKey = ACCOUNT_KINDS[profile.accountKind];
  const verificationKey = VERIFICATION_LABELS[profile.verification];

  return (
    <Section
      eyebrow={t('nav.administrationAria')}
      title={profile.displayName}
      description={t('adminAccount.headerDescription', {
        userId: profile.userId,
        community: profile.community,
        operatingArea: profile.operatingArea
      })}
    >
      <AdminFeedback searchParams={searchParams} />

      <div className="mt-4 grid md:grid-cols-2 gap-4 items-start">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('adminAccount.standingTitle')}</h2>
            <dl className="mt-2 text-sm space-y-1">
              <Line label={t('adminUsers.roleLabel')}>{profile.role}</Line>
              <Line label={t('adminUsers.kindLabel')}>
                {kindKey ? t(kindKey) : profile.accountKind.replace(/_/g, ' ')}
              </Line>
              {profile.organizationName && <Line label={t('buyerProfile.organisationLabel')}>{profile.organizationName}</Line>}
              <Line label={t('reports.status')}>
                {profile.status === 'suspended' ? (
                  <Badge tone="danger">{t('accountSettings.statusSuspended')}</Badge>
                ) : (
                  <Badge tone="success">{t('accountSettings.statusActive')}</Badge>
                )}
              </Line>
              <Line label={t('producers.verificationLabel')}>
                {verificationKey ? t(verificationKey) : profile.verification.replace('_', ' ')}
              </Line>
              {profile.verificationNote && <Line label={t('adminAccount.reviewerNoteLabel')}>{profile.verificationNote}</Line>}
              <Line label={t('adminAccount.publishesProfileLabel')}>
                {profile.consentToPublish ? t('adminAccount.consentYes') : t('adminAccount.consentNo')}
              </Line>
              <Line label={t('register.producerTypeLabel')}>{profile.producerType.replace(/_/g, ' ')}</Line>
              <Line label={t('producers.preferredLanguageLabel')}>{profile.preferredLanguage}</Line>
              <Line label={t('producers.groupsLabel')}>
                {theirGroups.map((g) => g.name).join(', ') || t('adminAccount.none')}
              </Line>
              <Line label={t('nav.listings')}>
                {t('adminAccount.listingsCount', {
                  total: listings.length,
                  published: listings.filter((l) => l.published && !l.archived).length
                })}
              </Line>
              <Line label={t('producerOverview.inquiriesReceived')}>{sellerInquiries.length}</Line>
              <Line label={t('adminAccount.ownInquiriesSent')}>{buyerInquiries.length}</Line>
              <Line label={t('listing.lastUpdated')}>{new Date(profile.updatedAt).toLocaleString()}</Line>
            </dl>
            <p className="mt-2 text-xs text-ink-500">
              {t('adminAccount.contactNote')}{' '}
              {isDemoMode() ? t('adminAccount.contactNoteDemo') : t('adminAccount.contactNoteLive')}
            </p>
            {profile.shortBio && <p className="mt-3 text-sm text-ink-700">{profile.shortBio}</p>}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink-900">{t('adminAccount.changeRoleTitle')}</h2>
              <p className="mt-1 text-sm text-ink-700">{t('adminAccount.roleChangeNote')}</p>
              <form method="post" action="/api/admin/roles" className="mt-3 space-y-3">
                <BackField path={`/admin/users/${profile.id}`} />
                <input type="hidden" name="profileId" value={profile.id} />
                <Field label={t('adminAccount.newRoleLabel')} htmlFor="role" hint={t(ROLE_HELP[profile.role])}>
                  <Select id="role" name="role" defaultValue={profile.role}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r} — {t(ROLE_HELP[r])}
                      </option>
                    ))}
                  </Select>
                </Field>
                <ConfirmField
                  id="role-confirm"
                  label={t('adminAccount.roleConfirm', { name: profile.displayName })}
                />
                <Button type="submit" size="sm">
                  {t('adminAccount.saveRole')}
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink-900">{t('adminAccount.suspensionTitle')}</h2>
              <p className="mt-1 text-sm text-ink-700">{t('adminAccount.suspensionNote')}</p>
              <form method="post" action="/api/admin/status" className="mt-3 space-y-3">
                <BackField path={`/admin/users/${profile.id}`} />
                <input type="hidden" name="profileId" value={profile.id} />
                <Field label={t('adminAccount.actionLabel')} htmlFor="status">
                  <Select id="status" name="status" defaultValue={profile.status === 'suspended' ? 'active' : 'suspended'}>
                    {profile.status === 'suspended' ? (
                      <option value="active">{t('adminAccount.reactivateOption')}</option>
                    ) : (
                      <option value="suspended">{t('adminAccount.suspendOption')}</option>
                    )}
                  </Select>
                </Field>
                <ConfirmField
                  id="status-confirm"
                  label={
                    profile.status === 'suspended'
                      ? t('adminAccount.reactivateConfirm', { name: profile.displayName })
                      : t('adminAccount.suspendConfirm', { name: profile.displayName })
                  }
                />
                <Button type="submit" size="sm" variant={profile.status === 'suspended' ? 'secondary' : 'danger'}>
                  {profile.status === 'suspended' ? t('adminAccount.reactivateButton') : t('adminAccount.suspendButton')}
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink-900">{t('producers.verificationLabel')}</h2>
              <p className="mt-1 text-sm text-ink-700">{t('adminAccount.verificationNote')}</p>
              <Link href="/admin/verifications" className="mt-3 inline-block font-semibold text-clay-700 underline">
                {t('adminAccount.verificationQueueLink')}
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-bold text-ink-900 mb-2">{t('adminAccount.theirListingsTitle')}</h2>
        {listings.length === 0 ? (
          <p className="text-sm text-ink-500">{t('adminAccount.noListings')}</p>
        ) : (
          <ul className="text-sm space-y-1">
            {listings.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/listings?q=${encodeURIComponent(l.title)}`} className="underline font-semibold">
                  {l.title}
                </Link>
                <span className="text-ink-500">
                  {l.published && !l.archived
                    ? t('buyerProfile.statusPublished')
                    : l.archived
                      ? t('adminAccount.listingArchived')
                      : t('adminAccount.listingUnpublished')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-bold text-ink-900 mb-2">{t('adminAccount.auditTitle')}</h2>
        {theirAudit.length === 0 ? (
          <p className="text-sm text-ink-500">{t('adminAccount.auditEmpty')}</p>
        ) : (
          <ul className="text-sm space-y-1">
            {theirAudit.slice(0, 20).map((entry) => (
              <li key={entry.id}>
                <span className="font-mono text-xs text-ink-500">{new Date(entry.at).toLocaleString()}</span> ·{' '}
                <strong>{entry.action}</strong> — {entry.summary} <span className="text-ink-500">({entry.actorName})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 justify-between border-b border-ink-100 last:border-0 py-1">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-semibold text-ink-900 text-right">{children}</dd>
    </div>
  );
}

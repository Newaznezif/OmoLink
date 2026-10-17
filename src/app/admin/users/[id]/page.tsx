import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { AdminFeedback, BackField, ConfirmField } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Field, Select, Section } from '@/components/ui';
import type { Role } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ROLES: Role[] = ['buyer', 'producer', 'coordinator', 'admin'];

const ROLE_HELP: Record<Role, string> = {
  buyer: 'Buys and inquires. Sees only their own records.',
  producer: 'Publishes listings and replies to their own inquiries.',
  coordinator: 'Producer rights plus group-order creation and contribution confirmation.',
  admin: 'Platform-wide moderation. Assigned only by an existing administrator.'
};

type SearchParams = { status?: string | string[]; error?: string | string[] };

export default async function AdminUserPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: SearchParams;
}) {
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

  return (
    <Section
      eyebrow="Administration"
      title={profile.displayName}
      description={`Account ${profile.userId} · ${profile.community} · ${profile.operatingArea}`}
    >
      <AdminFeedback searchParams={searchParams} />

      <div className="mt-4 grid md:grid-cols-2 gap-4 items-start">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Current standing</h2>
            <dl className="mt-2 text-sm space-y-1">
              <Line label="Role">{profile.role}</Line>
              <Line label="Account kind">{profile.accountKind.replace(/_/g, ' ')}</Line>
              {profile.organizationName && <Line label="Organisation">{profile.organizationName}</Line>}
              <Line label="Status">
                {profile.status === 'suspended' ? <Badge tone="danger">Suspended</Badge> : <Badge tone="success">Active</Badge>}
              </Line>
              <Line label="Verification">{profile.verification.replace('_', ' ')}</Line>
              {profile.verificationNote && <Line label="Reviewer note">{profile.verificationNote}</Line>}
              <Line label="Publishes profile">{profile.consentToPublish ? 'Yes, consent recorded' : 'No consent on file'}</Line>
              <Line label="Producer type">{profile.producerType.replace(/_/g, ' ')}</Line>
              <Line label="Preferred language">{profile.preferredLanguage}</Line>
              <Line label="Groups">{theirGroups.map((g) => g.name).join(', ') || 'None'}</Line>
              <Line label="Listings">{`${listings.length} (${listings.filter((l) => l.published && !l.archived).length} published)`}</Line>
              <Line label="Inquiries received">{sellerInquiries.length}</Line>
              <Line label="Own inquiries sent">{buyerInquiries.length}</Line>
              <Line label="Last updated">{new Date(profile.updatedAt).toLocaleString()}</Line>
            </dl>
            <p className="mt-2 text-xs text-ink-500">
              Contact details are not displayed here. {isDemoMode() ? 'This is a sample account.' : 'They stay on the account holder’s own profile page.'}
            </p>
            {profile.shortBio && <p className="mt-3 text-sm text-ink-700">{profile.shortBio}</p>}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink-900">Change role</h2>
              <p className="mt-1 text-sm text-ink-700">
                The role is the permission class. A suspended or demoted account loses its write paths on the next
                request because the server re-reads this record.
              </p>
              <form method="post" action="/api/admin/roles" className="mt-3 space-y-3">
                <BackField path={`/admin/users/${profile.id}`} />
                <input type="hidden" name="profileId" value={profile.id} />
                <Field label="New role" htmlFor="role" hint={ROLE_HELP[profile.role]}>
                  <Select id="role" name="role" defaultValue={profile.role}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r} — {ROLE_HELP[r]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <ConfirmField
                  id="role-confirm"
                  label={`I confirm this change of role for ${profile.displayName}. Assigning administrator access is recorded in the audit log, and the last active administrator cannot be removed.`}
                />
                <Button type="submit" size="sm">
                  Save role
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink-900">Suspension</h2>
              <p className="mt-1 text-sm text-ink-700">
                Suspension blocks publishing, replying, contributing and role or settings changes. It does not delete
                the account’s data, and the account can still read its own records.
              </p>
              <form method="post" action="/api/admin/status" className="mt-3 space-y-3">
                <BackField path={`/admin/users/${profile.id}`} />
                <input type="hidden" name="profileId" value={profile.id} />
                <Field label="Action" htmlFor="status">
                  <Select id="status" name="status" defaultValue={profile.status === 'suspended' ? 'active' : 'suspended'}>
                    {profile.status === 'suspended' ? (
                      <option value="active">Reactivate this account</option>
                    ) : (
                      <option value="suspended">Suspend this account</option>
                    )}
                  </Select>
                </Field>
                <ConfirmField
                  id="status-confirm"
                  label={`I confirm the ${profile.status === 'suspended' ? 'reactivation' : 'suspension'} of ${profile.displayName}.`}
                />
                <Button type="submit" size="sm" variant={profile.status === 'suspended' ? 'secondary' : 'danger'}>
                  {profile.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink-900">Verification</h2>
              <p className="mt-1 text-sm text-ink-700">
                Verification is separate from publication and from the role. Decisions are recorded in the queue, where
                no one can approve their own request.
              </p>
              <Link href="/admin/verifications" className="mt-3 inline-block font-semibold text-clay-700 underline">
                Open the verification queue →
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-bold text-ink-900 mb-2">Their listings</h2>
        {listings.length === 0 ? (
          <p className="text-sm text-ink-500">This account has no listings.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {listings.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/listings?q=${encodeURIComponent(l.title)}`} className="underline font-semibold">
                  {l.title}
                </Link>
                <span className="text-ink-500">
                  {l.published && !l.archived ? 'published' : l.archived ? 'archived' : 'unpublished'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-bold text-ink-900 mb-2">Audit entries touching this account</h2>
        {theirAudit.length === 0 ? (
          <p className="text-sm text-ink-500">No recorded actions for this account in the last 200 entries.</p>
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

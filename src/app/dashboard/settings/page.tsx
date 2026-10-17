import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { requireArea } from '@/lib/area';
import { AccountSettingsForm } from '@/components/account-settings-form';
import { Badge, Card, CardBody, Empty, Section, VerificationLabel } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Seller account settings',
  description: 'Change how buyers see you, choose the contact detail you are willing to share, and check what the platform holds.'
};

export default async function DashboardSettingsPage() {
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  const [profile, myListings] = await Promise.all([
    repo.getProfile(actor.profileId),
    repo.listListingsByProducer(actor.profileId)
  ]);
  const publishedCount = myListings.filter((l) => l.published && !l.archived).length;

  if (!profile) {
    return (
      <Section eyebrow="Dashboard" title="Settings">
        <Empty
          title="No profile for this account"
          body="The signed-in seller account has no profile record to edit. Register again, or ask an administrator to look at the account."
          action={
            <Link href="/register" className="underline font-semibold text-clay-700">
              Go to registration
            </Link>
          }
        />
      </Section>
    );
  }

  return (
    <Section
      eyebrow="Dashboard"
      title="Settings"
      description="What buyers read beside your listings, how they reach you, and an honest list of what this platform stores."
    >
      <AccountSettingsForm profile={profile} variant="seller" />

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Account record</h2>
          <dl className="mt-2 grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-500">Account type</dt>
              <dd className="text-ink-900">{profile.role === 'coordinator' ? 'Coordinator (selling with a group)' : 'Producer / seller'}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Status</dt>
              <dd className="text-ink-900">
                {profile.status === 'active' ? 'Active' : profile.status === 'suspended' ? 'Suspended' : profile.status}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">Verification</dt>
              <dd className="text-ink-900">
                <VerificationLabel status={profile.verification} isDemo={profile.isDemo} />
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">Listings buyers can find</dt>
              <dd className="text-ink-900">
                {publishedCount} of {myListings.length}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-sm text-ink-700">
            Role, status and verification are not editable here. An administrator sets them in the account record, and the
            server overwrites any request that tries to change them from this page — see the{' '}
            <Link href="/dashboard/profile" className="underline font-semibold text-clay-700">
              public profile preview
            </Link>{' '}
            for what buyers actually see.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={profile.status === 'active' ? 'success' : 'danger'}>{profile.status}</Badge>
            <Badge tone="neutral">Document number: never stored</Badge>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">What OmoNETAB stores about you</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>Your profile record: display name, community, operating area, language, the contact method above, and consent flags.</li>
            <li>Your listings with their price, quantity, category and pickup terms, plus every change recorded against them.</li>
            <li>Each inquiry sent to your listings — its terms, status history and your replies — visible to you and to an administrator.</li>
            <li>Any group contribution or opportunity you take part in, with the quantities attributed to you.</li>
            <li>Reviews left on your listings, and your audit-log entries when an administrator acts on your account.</li>
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            {isDemoMode()
              ? 'Demo mode: this session is a plain cookie holding a sample user id, and every record above is sample data that disappears when the server restarts.'
              : 'Authentication runs through Supabase with Row Level Security, so these records are readable only to the accounts allowed to see them.'}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Corrections and deletion</h2>
          <p className="mt-2 text-sm text-ink-700">
            There is no self-service delete button for the account, because an inquiry record is also a buyer’s and a
            group’s evidence of an arrangement. Ask for a correction or a deletion through the{' '}
            <Link href="/contact" className="underline font-semibold text-clay-700">
              contact page
            </Link>
            ; an administrator acts on it and records the decision in the audit log. Listings you no longer sell can be
            archived from{' '}
            <Link href="/dashboard/listings" className="underline font-semibold text-clay-700">
              My listings
            </Link>{' '}
            at any time. The{' '}
            <Link href="/privacy" className="underline font-semibold text-clay-700">
              privacy notice
            </Link>{' '}
            states what is held and for how long.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 items-center text-sm">
            <Badge tone="neutral">Sign out using the button in the header</Badge>
            <Link href="/offline" className="underline font-semibold text-clay-700">
              Drafts saved on this device
            </Link>
          </div>
        </CardBody>
      </Card>
    </Section>
  );
}

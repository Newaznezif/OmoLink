import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { requireArea } from '@/lib/area';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';
import { VerificationLabel } from '@/components/status-labels';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Public profile preview',
  description: 'Exactly what a buyer reads on your seller page, with nothing hidden and nothing editable.'
};

/**
 * Read-only by design: the editable version of these fields lives on
 * /dashboard/settings, which posts through the validated /api/profile route.
 * Two write paths for one record is how a demo build ends up storing an
 * unvalidated bio.
 */
export default async function DashboardProfilePage() {
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  const [profile, categories, myListings] = await Promise.all([
    repo.getProfile(actor.profileId),
    repo.listCategories(),
    repo.listListingsByProducer(actor.profileId)
  ]);

  if (!profile) {
    return (
      <Section eyebrow="Dashboard" title="My profile">
        <Empty
          title="No profile for this account"
          body="This account has no profile record yet, so there is nothing to show buyers."
          action={
            <Link href="/dashboard/settings" className="underline font-semibold text-clay-700">
              Open settings
            </Link>
          }
        />
      </Section>
    );
  }

  const published = myListings.filter((l) => l.published && !l.archived);
  const myCategories = categories.filter((c) => profile.categories.includes(c.id));

  const contactLine =
    profile.contactMethod.kind === 'in_app'
      ? 'In-app inquiries only. No phone number or email address is published.'
      : 'consent' in profile.contactMethod && profile.contactMethod.consent
        ? `${profile.contactMethod.kind === 'email' ? 'Email' : 'Phone'}: ${profile.contactMethod.value}`
        : 'A contact detail is stored but not published, because consent for it is not recorded.';

  return (
    <Section
      eyebrow="Dashboard"
      title="My profile"
      description="A preview of the page buyers reach from your listings. Everything here is published text; edit it on Settings, never on this page."
    >
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <VerificationLabel status={profile.verification} isDemo={profile.isDemo} />
            <Badge tone="neutral">Member since {new Date(profile.createdAt).toLocaleDateString()}</Badge>
          </div>

          <h2 className="font-semibold text-ink-900">{profile.displayName}</h2>
          <p className="mt-1 text-sm text-ink-500">
            {profile.producerType.replace(/_/g, ' ')} · {profile.community || 'community not set'} ·{' '}
            {profile.operatingArea || 'operating area not set'}
          </p>

          <div className="mt-3">
            <h3 className="text-sm font-semibold text-ink-900">About your work</h3>
            <p className="mt-1 text-sm text-ink-700 whitespace-pre-line">
              {profile.shortBio || 'No bio written yet. Buyers see an empty line, so it is worth filling in.'}
            </p>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-ink-900">Categories you work in</h3>
            <div className="mt-1 flex flex-wrap gap-2">
              {myCategories.map((c) => (
                <Badge key={c.id} tone="info">
                  {c.name}
                </Badge>
              ))}
              {myCategories.length === 0 && (
                <span className="text-sm text-ink-500">
                  None selected. Categories come from your listings; a seller page without any still works.
                </span>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-ink-900">Contact shown to buyers</h3>
            <p className="mt-1 text-sm text-ink-700">{contactLine}</p>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-ink-900">
              Listings a buyer can reach from this page
            </h3>
            {published.length === 0 ? (
              <p className="mt-1 text-sm text-ink-500">
                None published yet.{' '}
                <Link href="/dashboard/listings/new" className="underline font-semibold text-clay-700">
                  Add a listing
                </Link>{' '}
                or publish an existing one.
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {published.map((l) => (
                  <li key={l.id}>
                    <Link href={`/listings/${l.id}`} className="underline font-semibold text-clay-700">
                      {l.title}
                    </Link>{' '}
                    <span className="text-ink-500">· {l.kind === 'service' ? 'experience' : 'goods'}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-ink-500">
              {myListings.length - published.length} of your {myListings.length} listing record(s) are hidden from buyers
              (unpublished or archived).
            </p>
          </div>

          <div className="mt-4">
            <Link href="/dashboard/settings" className="underline font-semibold text-clay-700">
              Edit these details on Settings →
            </Link>
          </div>

          <p className="mt-3 text-xs text-ink-500">
            {isDemoMode()
              ? 'Demo mode: this is a sample profile, and it resets when the server restarts.'
              : 'Saved in the profiles table; your public page reads the same record, so a buyer never sees more than what appears above.'}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">What is not on this page</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>Your role and account status — set by an administrator, never editable by you.</li>
            <li>Verification decisions, and the audit trail behind them.</li>
            <li>Buyer names, contacts and inquiry terms from other accounts.</li>
            <li>Any identity document number. OmoNetTab does not store or demand one for a basic seller account.</li>
          </ul>
          {profile.consentToPublish ? (
            <p className="mt-2 text-sm text-ink-700">
              To see the page exactly as a visitor does, open{' '}
              <Link href={`/producers/${profile.id}`} className="underline font-semibold text-clay-700">
                your public producer page
              </Link>
              .
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-700">
              Publishing consent is currently off, so this profile has no public producer page — buyers reach you only
              through your listings. Turn it on from the header consent control or ask an administrator.
            </p>
          )}
        </CardBody>
      </Card>
    </Section>
  );
}

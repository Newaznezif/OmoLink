import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My profile',
  description: 'What your OmoNetTab account holds, and what anyone else can see.'
};

export default async function BuyerProfilePage() {
  const actor = await requireArea('/buyer', ['buyer']);
  const repo = getRepo();
  const [profile, reviews, inquiries] = await Promise.all([
    repo.getProfile(actor.profileId),
    repo.listReviews({ includeHidden: true }),
    repo.listInquiriesForBuyer(actor.profileId)
  ]);
  if (!profile) {
    return (
      <Section eyebrow="My account" title="My profile">
        <Empty
          title="No profile record"
          body="This account has no profile yet. Finish onboarding or sign out and register again."
          action={
            <Link href="/sign-in" className="underline font-semibold text-clay-700">
              Sign in again
            </Link>
          }
        />
      </Section>
    );
  }

  const mine = reviews.filter((r) => r.authorProfileId === profile.id);
  const listingIds = new Set(inquiries.map((i) => i.listingId));

  return (
    <Section
      eyebrow="My account"
      title="My profile"
      description="A buying account has no public page. Sellers see your name and contact details only on the specific inquiry you send them."
    >
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-ink-900">{profile.displayName}</h2>
            <Badge tone="neutral">{profile.accountKind.replace(/_/g, ' ')}</Badge>
            <Badge tone="info">{profile.role}</Badge>
            {profile.status === 'suspended' && <Badge tone="danger">suspended</Badge>}
            {profile.isDemo && <Badge tone="warning">sample account</Badge>}
          </div>
          <dl className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
            <Line label="Community" value={profile.community || 'Not given'} />
            <Line label="Operating area" value={profile.operatingArea || 'Not given'} />
            <Line label="Preferred language" value={languageLabel(profile.preferredLanguage)} />
            <Line label="Organisation" value={profile.organizationName || 'Not given'} />
            <Line label="Contact shared with sellers" value={describeContact(profile.contactMethod)} />
            <Line label="Member since" value={new Date(profile.createdAt).toLocaleDateString()} />
            <Line label="Last updated" value={new Date(profile.updatedAt).toLocaleString()} />
            <Line label="Consent to publish a profile" value={profile.consentToPublish ? 'Recorded' : 'Not recorded'} />
          </dl>
          <p className="mt-3 text-sm text-ink-700">{profile.shortBio || 'No bio written yet.'}</p>
          <p className="mt-3 text-sm">
            <Link href="/buyer/settings" className="underline font-semibold text-clay-700">
              Change these details, language or contact settings
            </Link>
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">What is visible to whom</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>
              <strong>The seller you contact:</strong> the name and contact you typed into that inquiry, plus the
              quantity and dates. Nothing else.
            </li>
            <li>
              <strong>Other visitors:</strong> your profile is not listed anywhere. Buying history is private to you.
            </li>
            <li>
              <strong>An administrator:</strong> your account record, your inquiries and your reviews, to run the
              marketplace and answer a report.
            </li>
            <li>
              <strong>Never published:</strong> a phone number or email without the consent tick on the settings page.
            </li>
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            Your reviews appear next to the listing they describe, under the name you chose to display.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Reviews you wrote</h2>
          {mine.length === 0 ? (
            <p className="mt-2 text-sm text-ink-700">
              {listingIds.size === 0
                ? 'You have not sent an inquiry yet, so there is nothing to review.'
                : 'No review yet. Once an arrangement is recorded as completed, the option appears on that record.'}
            </p>
          ) : (
            <ul className="mt-2 space-y-3 text-sm">
              {mine.map((r) => (
                <li key={r.id} className="border-b border-ink-100 last:border-0 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.status === 'published' ? 'success' : 'warning'}>{r.status}</Badge>
                    <span className="font-semibold text-ink-900">{r.rating} / 5</span>
                    <span className="text-ink-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-ink-700">{r.comment}</p>
                  <p className="mt-1 text-xs">
                    <Link href={`/listings/${r.listingId}`} className="underline font-semibold text-clay-700">
                      On the listing page
                    </Link>
                    {r.status === 'hidden' && r.moderationNote ? ` · hidden: ${r.moderationNote}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </Section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-ink-900">{value}</dd>
    </div>
  );
}

function describeContact(method: { kind: string } & Record<string, unknown>): string {
  if (method.kind === 'in_app') return 'Through the platform inquiry form only';
  if (method.kind === 'none') return 'Nothing shared';
  const consent = method.consent === true;
  const value = typeof method.value === 'string' ? method.value : '';
  if (!consent) return 'Recorded but not shared';
  return `${method.kind}: ${value}`;
}

function languageLabel(code: string): string {
  if (code === 'en') return 'English';
  if (code === 'am') return 'Amharic (interface copy still under review)';
  return `${code} (no reviewed translation available yet)`;
}

import Link from 'next/link';
import { getSessionProfile } from '@/lib/session';
import { getRepo } from '@/lib/repo';
import { Badge, Card, CardBody, Empty, SampleTag, Section } from '@/components/ui';
import { formatMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function DashboardHome() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const repo = getRepo();
  const listings = await repo.listListingsByProducer(profile.id);
  const inquiries = await repo.listInquiriesForSeller(profile.id);
  const opportunities = await repo.listOpportunities();
  const contributions = opportunities.flatMap((o) => o); // to keep tree simple
  void contributions;

  const openInquiries = inquiries.filter((i) => i.status === 'new' || i.status === 'accepted' || i.status === 'awaiting_confirmation');

  return (
    <Section eyebrow="Dashboard" title={`Welcome, ${profile.displayName}`}>
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/dashboard/listings" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold hover:bg-clay-50">
          My listings ({listings.length})
        </Link>
        <Link href="/dashboard/listings/new" className="rounded-lg bg-clay-700 text-white px-4 py-2 min-h-11 font-semibold hover:bg-clay-800">
          New listing
        </Link>
        <Link href="/dashboard/inquiries" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold hover:bg-clay-50">
          Inquiries ({openInquiries.length} open)
        </Link>
        <Link href="/dashboard/collective-orders" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold hover:bg-clay-50">
          Collective contributions
        </Link>
        <Link href="/dashboard/profile" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold hover:bg-clay-50">
          Profile
        </Link>
      </div>

      {profile.isDemo && (
        <div className="mb-4 flex items-center gap-2">
          <SampleTag />
          <span className="text-sm text-ink-500">
            This dashboard runs on an in-memory demo store. It resets when the server cold-restarts.
          </span>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Activity summary</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Published listings</dt>
                <dd className="font-semibold">{listings.filter((l) => l.published).length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Draft / unpublished</dt>
                <dd className="font-semibold">{listings.filter((l) => !l.published).length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Inquiries received</dt>
                <dd className="font-semibold">{inquiries.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Est. demand across open inquiries</dt>
                <dd className="font-semibold">
                  {formatMoney({
                    cents: inquiries
                      .filter((i) => i.status !== 'cancelled')
                      .reduce((s, i) => s + i.estimatedSubtotalCents, 0),
                    currency: 'ETB'
                  })}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Verification status</h2>
            <p className="mt-1 text-sm text-ink-700">
              Only an authorised reviewer can approve a profile. Creating a profile does not grant verified status.
            </p>
            <div className="mt-2">
              <Badge tone={profile.verification === 'verified' ? 'success' : profile.verification === 'pending_review' ? 'warning' : 'neutral'}>
                {profile.verification.replace('_', ' ')}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-ink-500">
              {profile.verificationNote ?? 'Verification workflow is pending pilot design.'}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Profile completeness</h2>
            <ul className="mt-2 space-y-1 text-sm">
              <CompletenessRow ok={Boolean(profile.displayName)} label="Display name set" />
              <CompletenessRow ok={Boolean(profile.community)} label="Community set" />
              <CompletenessRow ok={Boolean(profile.shortBio) && profile.shortBio.length >= 40} label="Descriptive bio (40+ characters)" />
              <CompletenessRow ok={profile.categories.length > 0} label="At least one category" />
              <CompletenessRow ok={listings.some((l) => l.published)} label="At least one published listing" />
              <CompletenessRow ok={Boolean(profile.consentToPublish)} label="Consent recorded" />
            </ul>
          </CardBody>
        </Card>
      </div>

      {inquiries.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold text-ink-900 mb-3">Latest inquiries</h2>
          <ul className="space-y-2">
            {inquiries.slice(0, 5).map((i) => {
              const listing = listings.find((l) => l.id === i.listingId);
              return (
                <li key={i.id}>
                  <Card>
                    <CardBody>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="font-semibold">{i.reference}</div>
                        <div className="text-sm text-ink-700">{listing?.title ?? 'Listing removed'}</div>
                      </div>
                      <div className="mt-1 text-sm">
                        {i.quantity} {i.unitOfSale} · {formatMoney({ cents: i.estimatedSubtotalCents, currency: i.currency })} ·{' '}
                        <Badge tone={statusTone(i.status)}>{i.status.replace('_', ' ')}</Badge>
                      </div>
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {listings.length === 0 && (
        <div className="mt-6">
          <Empty
            title="No listings yet"
            body="Create your first listing to start receiving buyer inquiries. Drafts can be saved on this device while offline."
            action={
              <Link href="/dashboard/listings/new" className="inline-flex bg-clay-700 text-white font-semibold px-4 py-2 rounded-lg">
                New listing
              </Link>
            }
          />
        </div>
      )}
    </Section>
  );
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'new' || status === 'awaiting_confirmation') return 'warning';
  return 'neutral';
}

function CompletenessRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={'w-3 h-3 rounded-full ' + (ok ? 'bg-moss-500' : 'bg-ink-100')} />
      <span className={ok ? 'text-ink-900' : 'text-ink-500'}>{label}</span>
    </li>
  );
}

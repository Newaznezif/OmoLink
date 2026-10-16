import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import { Badge, Card, CardBody, Empty, Section, VerificationLabel } from '@/components/ui';
import { PublishListingButton, ToggleAvailabilityButton } from '@/components/listing-actions';

export const dynamic = 'force-dynamic';

export default async function DashboardListingsPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const listings = (await getRepo().listListingsByProducer(profile.id)).sort((a, b) =>
    a.lastUpdated < b.lastUpdated ? 1 : -1
  );

  return (
    <Section
      eyebrow="Dashboard"
      title="My listings"
      actions={
        <Link href="/dashboard/listings/new" className="inline-flex bg-clay-700 text-white font-semibold px-4 py-2 rounded-lg">
          New listing
        </Link>
      }
    >
      {listings.length === 0 ? (
        <Empty title="No listings yet" body="Create your first listing. You can save it as a draft to publish later." />
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => (
            <li key={l.id}>
              <Card>
                <CardBody>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={`/listings/${l.id}`} className="text-lg font-semibold hover:underline">
                        {l.title}
                      </Link>
                      <div className="text-sm text-ink-500">
                        {formatMoney(l.unitPrice)} · per {l.unitOfSale} · {l.availableQuantity} available
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge tone={l.published ? 'success' : 'neutral'}>{l.published ? 'Published' : 'Draft'}</Badge>
                      <VerificationLabel status={l.verification} isDemo={l.isDemo} />
                      <AvailabilityBadge availability={l.availability} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/dashboard/listings/${l.id}`} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm font-semibold hover:bg-clay-50">
                      Edit
                    </Link>
                    <PublishListingButton listingId={l.id} published={l.published} />
                    <ToggleAvailabilityButton listingId={l.id} current={l.availability} />
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function AvailabilityBadge({ availability }: { availability: 'available' | 'limited' | 'made_to_order' | 'seasonal' | 'unavailable' }) {
  const tone = availability === 'unavailable' ? 'danger' : availability === 'limited' || availability === 'seasonal' ? 'warning' : 'neutral';
  return <Badge tone={tone}>{availability.replace('_', ' ')}</Badge>;
}

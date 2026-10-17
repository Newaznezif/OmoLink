import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { formatMoney } from '@/lib/money';
import { Badge, Card, CardBody, Empty, Section, VerificationLabel } from '@/components/ui';
import { ListingLifecycleActions } from '@/components/listing-actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My listings',
  description: 'Every listing you manage: what buyers see, what each one is priced at, and what you can do with it.'
};

export default async function DashboardListingsPage() {
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  const [listings, inquiries] = await Promise.all([
    repo.listListingsByProducer(actor.profileId),
    repo.listInquiriesForSeller(actor.profileId)
  ]);
  const sorted = [...listings].sort((a, b) => (a.lastUpdated < b.lastUpdated ? 1 : -1));
  const inquiriesByListing = new Map<string, number>();
  for (const i of inquiries) {
    inquiriesByListing.set(i.listingId, (inquiriesByListing.get(i.listingId) ?? 0) + 1);
  }

  const publishedCount = sorted.filter((l) => l.published && !l.archived).length;

  return (
    <Section
      eyebrow="Dashboard"
      title="My listings"
      description="Publish, hide, change the price, or archive. A listing you archive keeps its inquiry history, so a record you both rely on stays correct."
      actions={
        <Link href="/dashboard/listings/new" className="inline-flex bg-clay-700 text-white font-semibold px-4 py-2 rounded-lg">
          New listing
        </Link>
      }
    >
      {sorted.length === 0 ? (
        <Empty
          title="No listings yet"
          body="Create your first listing. You can save it unpublished and publish it when the details and the photos are ready."
        />
      ) : (
        <>
          <p className="text-sm text-ink-500">
            {publishedCount} of {sorted.length} listing(s) are visible in the marketplace right now.
          </p>
          <ul className="space-y-3 mt-2">
            {sorted.map((l) => {
              const linkedInquiries = inquiriesByListing.get(l.id) ?? 0;
              return (
                <li key={l.id}>
                  <Card>
                    <CardBody>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <Link href={`/listings/${l.id}`} className="text-lg font-semibold hover:underline">
                            {l.title}
                          </Link>
                          <div className="text-sm text-ink-500">
                            {formatMoney(l.unitPrice)} · per {l.unitOfSale} · {l.availableQuantity} {l.unitOfSale} available
                            {l.minOrderQuantity > 1 ? ` · minimum ${l.minOrderQuantity}` : ''}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge tone={l.archived ? 'neutral' : l.published ? 'success' : 'warning'}>
                            {l.archived ? 'Archived' : l.published ? 'Published' : 'Draft'}
                          </Badge>
                          <VerificationLabel status={l.verification} isDemo={l.isDemo} />
                          <AvailabilityBadge availability={l.availability} />
                          {linkedInquiries > 0 && <Badge tone="info">{linkedInquiries} inquiry record(s)</Badge>}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/listings/${l.id}`}
                          className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm font-semibold hover:bg-clay-50"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/dashboard/inquiries?listing=${l.id}`}
                          className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm font-semibold hover:bg-clay-50"
                        >
                          Inquiries for this listing
                        </Link>
                      </div>
                      <ListingLifecycleActions listing={l} inquiryCount={linkedInquiries} />
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Publish, archive or delete — what each one means</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>
              <strong>Publish</strong> puts the listing in the marketplace with the price and quantity you set here. Only
              published, unarchived listings appear in search.
            </li>
            <li>
              <strong>Unpublish</strong> keeps the page and its history but hides it from buyers. Existing inquiries stay
              open — hiding a listing does not cancel anyone’s request.
            </li>
            <li>
              <strong>Archive</strong> is the permanent-feeling option that still keeps records: the listing leaves the
              marketplace, its inquiries remain readable by you and by the buyers who sent them.
            </li>
            <li>
              <strong>Delete</strong> is offered only when no inquiry has ever been sent for that listing. Once there is a
              record, the server refuses, because removing it would erase the other side’s evidence of an arrangement.
            </li>
            <li>
              <strong>Availability</strong> tells buyers whether you can supply now. It is separate from publishing: an
              out-of-season listing can stay readable while nobody can order it.
            </li>
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            Changes are checked on the server against your own account: another seller’s listing cannot be edited from
            here, and a suspended account cannot change any listing at all.
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}

function AvailabilityBadge({ availability }: { availability: 'available' | 'limited' | 'made_to_order' | 'seasonal' | 'unavailable' }) {
  const tone = availability === 'unavailable' ? 'danger' : availability === 'limited' || availability === 'seasonal' ? 'warning' : 'neutral';
  return <Badge tone={tone}>{availability.replace('_', ' ')}</Badge>;
}

import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { formatMoney } from '@/lib/money';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';
import { InquiryStatusPicker } from '@/components/inquiry-status-picker';

export const dynamic = 'force-dynamic';

const STATUSES = ['new', 'accepted', 'awaiting_confirmation', 'fulfillment_arranged', 'completed', 'cancelled'] as const;

export default async function DashboardInquiriesPage({
  searchParams
}: {
  searchParams: { listing?: string; status?: string };
}) {
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  const all = await repo.listInquiriesForSeller(actor.profileId);
  const listings = await repo.listListingsByProducer(actor.profileId);

  // Filters change the rows that are rendered, so the links on the listing page
  // and the status chips below are working navigation, not decoration.
  const listingFilter = typeof searchParams.listing === 'string' ? searchParams.listing : '';
  const statusFilter = STATUSES.includes(searchParams.status as (typeof STATUSES)[number]) ? searchParams.status : undefined;
  const inquiries = all
    .filter((i) => (listingFilter ? i.listingId === listingFilter : true))
    .filter((i) => (statusFilter ? i.status === statusFilter : true))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const needsReply = all.filter((i) => i.status === 'new').length;
  const filteredListing = listings.find((l) => l.id === listingFilter);

  return (
    <Section
      eyebrow="Dashboard"
      title="Incoming inquiries"
      description="Each inquiry is a request, not a confirmed sale. Nothing here has been paid. Update status honestly as you and the buyer arrange pickup, delivery or booking."
    >
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <span className="font-semibold text-ink-900">Filter by status</span>
        {STATUSES.map((s) =>
          s === statusFilter ? (
            <Link
              key={s}
              href={listingFilter ? `/dashboard/inquiries?listing=${listingFilter}` : '/dashboard/inquiries'}
              className="rounded-full bg-clay-700 px-3 py-1 font-semibold text-white"
            >
              {s.replace(/_/g, ' ')} ✕
            </Link>
          ) : (
            <Link
              key={s}
              href={`/dashboard/inquiries?status=${s}${listingFilter ? `&listing=${listingFilter}` : ''}`}
              className="rounded-full border border-ink-100 bg-white px-3 py-1 hover:bg-clay-50"
            >
              {s.replace(/_/g, ' ')}
            </Link>
          )
        )}
        <Badge tone={needsReply > 0 ? 'warning' : 'neutral'}>{needsReply} awaiting a first reply</Badge>
      </div>

      {filteredListing && (
        <p className="mt-2 text-sm text-ink-700">
          Showing records for{' '}
          <Link href={`/listings/${filteredListing.id}`} className="underline font-semibold text-clay-700">
            {filteredListing.title}
          </Link>{' '}
          ·{' '}
          <Link href="/dashboard/inquiries" className="underline text-ink-500">
            show all listings
          </Link>
        </p>
      )}
      {!filteredListing && listingFilter && (
        <p className="mt-2 text-sm text-ink-500">
          Filtered to a listing you do not manage, so nothing matches.{' '}
          <Link href="/dashboard/inquiries" className="underline text-clay-700">
            Clear the filter
          </Link>
        </p>
      )}

      {inquiries.length === 0 ? (
        <Empty
          title={all.length === 0 ? 'No inquiries yet' : 'Nothing matches this filter'}
          body={
            all.length === 0
              ? 'Once a buyer submits an inquiry on one of your listings it will appear here.'
              : 'No inquiry for this listing has that status. Widen the filter or show all listings.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {inquiries.map((i) => {
            const listing = listings.find((l) => l.id === i.listingId);
            return (
              <li key={i.id}>
                <Card>
                  <CardBody>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <div className="text-sm text-ink-500">{i.reference}</div>
                        <h3 className="font-semibold text-ink-900">{listing?.title ?? 'Listing removed'}</h3>
                      </div>
                      <Badge tone={statusTone(i.status)}>{i.status.replace('_', ' ')}</Badge>
                    </div>
                    <dl className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <dt className="text-ink-500">Quantity</dt>
                        <dd className="text-ink-900 font-medium">
                          {i.quantity} {i.unitOfSale}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">Estimated subtotal</dt>
                        <dd className="text-ink-900 font-medium">{formatMoney({ cents: i.estimatedSubtotalCents, currency: i.currency })}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">Preference</dt>
                        <dd className="text-ink-900">{i.preference}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">Buyer</dt>
                        <dd className="text-ink-900">{i.buyerName}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">Reply to</dt>
                        <dd className="text-ink-900">{i.buyerContact}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">Received</dt>
                        <dd className="text-ink-900">{new Date(i.createdAt).toLocaleString()}</dd>
                      </div>
                    </dl>
                    {i.message && (
                      <p className="mt-3 text-sm text-ink-700 whitespace-pre-line rounded-lg bg-clay-50 p-3">{i.message}</p>
                    )}
                    <p className="mt-3 text-sm flex flex-wrap gap-4">
                      <Link href={`/dashboard/inquiries/${i.id}`} className="underline text-clay-800 font-semibold">
                        Open the record →
                      </Link>
                      {listing && (
                        <Link href={`/listings/${listing.id}`} className="underline text-ink-500">
                          See the listing
                        </Link>
                      )}
                    </p>
                    <div className="mt-3">
                      <InquiryStatusPicker inquiryId={i.id} current={i.status} />
                    </div>
                    {i.events.length > 1 && (
                      <details className="mt-2 text-xs text-ink-500">
                        <summary className="cursor-pointer font-semibold">Activity log</summary>
                        <ul className="mt-1 space-y-1 pl-4 list-disc">
                          {i.events.map((e) => (
                            <li key={e.id}>
                              <span className="font-mono">{new Date(e.at).toLocaleString()}</span> · {e.actor} · {e.detail}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
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

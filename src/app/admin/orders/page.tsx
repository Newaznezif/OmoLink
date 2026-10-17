import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { AdminSection } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Empty, Input, Select } from '@/components/ui';
import { formatMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const text = (key: string): string => (typeof searchParams[key] === 'string' ? (searchParams[key] as string) : '');
  const repo = getRepo();
  const [inquiries, listings] = await Promise.all([repo.listAllInquiries(), repo.listAllListings()]);
  const listingById = new Map(listings.map((l) => [l.id, l]));

  const q = text('q').trim().toLowerCase();
  const status = text('status');
  const kind = text('kind');

  const rows = inquiries
    .filter((i) => {
      if (status && i.status !== status) return false;
      if (kind === 'product' && listingById.get(i.listingId)?.kind !== 'product') return false;
      if (kind === 'service' && listingById.get(i.listingId)?.kind !== 'service') return false;
      if (!q) return true;
      return [i.reference, i.buyerName, i.buyerContact, listingById.get(i.listingId)?.title ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const completed = inquiries.filter((i) => i.status === 'completed').length;
  const cancelled = inquiries.filter((i) => i.status === 'cancelled').length;

  return (
    <AdminSection
      title="Arrangements"
      description={`Every inquiry on the platform, newest first. These are arrangements between a buyer and a seller, not paid transactions — no payment is processed here, so nothing is counted as a sale. ${completed} of ${inquiries.length} marked completed, ${cancelled} cancelled.`}
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label htmlFor="q" className="block text-sm font-semibold text-ink-900 mb-1">
                Search reference, buyer or listing
              </label>
              <Input id="q" name="q" defaultValue={text('q')} />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-ink-900 mb-1">
                Status
              </label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">All</option>
                {['new', 'accepted', 'awaiting_confirmation', 'fulfillment_arranged', 'completed', 'cancelled'].map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="kind" className="block text-sm font-semibold text-ink-900 mb-1">
                Listing type
              </label>
              <Select id="kind" name="kind" defaultValue={kind}>
                <option value="">All</option>
                <option value="product">Product</option>
                <option value="service">Tourism service</option>
              </Select>
            </div>
            <div className="md:col-span-4 flex items-end gap-2">
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Link href="/admin/orders" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 text-sm font-semibold">
                Clear
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty title="No arrangement matches" body="Clear the filters, or wait for a buyer to submit an inquiry from a listing page." />
      ) : (
        <div className="space-y-3">
          {rows.map((i) => {
            const listing = listingById.get(i.listingId);
            return (
              <Card key={i.id}>
                <CardBody>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="text-sm text-ink-500">{i.reference}</div>
                      <h3 className="font-semibold text-ink-900">
                        {listing ? (
                          <Link href={`/listings/${listing.id}`} className="underline">
                            {listing.title}
                          </Link>
                        ) : (
                          'Listing no longer present'
                        )}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <Badge tone={statusTone(i.status)}>{i.status.replace(/_/g, ' ')}</Badge>
                      {listing?.kind === 'service' && <Badge tone="neutral">booking</Badge>}
                    </div>
                  </div>

                  <dl className="mt-3 grid sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <dt className="text-ink-500">Buyer</dt>
                      <dd className="text-ink-900">{i.buyerName}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Contact given for this arrangement</dt>
                      <dd className="text-ink-900 break-words">{i.buyerContact}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Quantity</dt>
                      <dd className="text-ink-900">
                        {i.quantity} {i.unitOfSale}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Estimated subtotal</dt>
                      <dd className="text-ink-900">{formatMoney({ cents: i.estimatedSubtotalCents, currency: i.currency })}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Preference</dt>
                      <dd className="text-ink-900">{i.preference}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Preferred date</dt>
                      <dd className="text-ink-900">{i.preferredDate || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Received</dt>
                      <dd className="text-ink-900">{new Date(i.createdAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Last change</dt>
                      <dd className="text-ink-900">{new Date(i.updatedAt).toLocaleString()}</dd>
                    </div>
                  </dl>

                  {i.message && <p className="mt-3 text-sm text-ink-700 whitespace-pre-line rounded-lg bg-clay-50 p-3">{i.message}</p>}

                  {i.events.length > 1 && (
                    <details className="mt-2 text-xs text-ink-500">
                      <summary className="cursor-pointer font-semibold">Status history</summary>
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
            );
          })}
        </div>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Why there is no status control here</h2>
          <p className="mt-2 text-sm text-ink-700">
            The buyer and the producer move a record along, because they are the parties who actually agree the pickup,
            delivery or booking. An administrator changing it would put words about a deal into the platform’s mouth that
            neither party confirmed, so the queue above is deliberately read-only. Suspended accounts and role changes
            are handled on the Accounts tab; a listing can be unpublished from Listings.
          </p>
          <p className="mt-2 text-xs text-ink-500">
            Buyer contact details are shown only to the administrator view and to the producer on the listing — they are
            not published on any public page, and the private record is never written into a public field.
          </p>
        </CardBody>
      </Card>
    </AdminSection>
  );
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'new' || status === 'awaiting_confirmation') return 'warning';
  return 'neutral';
}

import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';
import { InquiryStatusPicker } from '@/components/inquiry-status-picker';

export const dynamic = 'force-dynamic';

export default async function DashboardInquiriesPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const repo = getRepo();
  const inquiries = (await repo.listInquiriesForSeller(profile.id)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const listings = await repo.listListingsByProducer(profile.id);

  return (
    <Section
      eyebrow="Dashboard"
      title="Incoming inquiries"
      description="Each inquiry is a request, not a confirmed sale. Nothing here has been paid. Update status honestly as you and the buyer arrange pickup, delivery or booking."
    >
      {inquiries.length === 0 ? (
        <Empty title="No inquiries yet" body="Once a buyer submits an inquiry on one of your listings it will appear here." />
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
                    {listing && (
                      <p className="mt-3 text-sm">
                        <Link href={`/listings/${listing.id}`} className="underline text-clay-800 font-semibold">
                          Open listing →
                        </Link>
                      </p>
                    )}
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

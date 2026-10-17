import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { ArrangementCard } from '@/components/arrangement-card';
import { Card, CardBody, Empty, Section } from '@/components/ui';
import { formatMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My orders',
  description: 'Goods you asked for, and where each arrangement stands.'
};

export default async function BuyerOrdersPage() {
  const actor = await requireArea('/buyer', ['buyer']);
  const repo = getRepo();
  const [inquiries, listings] = await Promise.all([repo.listInquiriesForBuyer(actor.profileId), repo.listAllListings()]);
  const listingById = new Map(listings.map((l) => [l.id, l]));

  // An order is a request for goods; a tour or guide is tracked under bookings.
  const rows = inquiries
    .filter((i) => listingById.get(i.listingId)?.kind !== 'service' && i.preference !== 'booking')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const live = rows.filter((i) => i.status !== 'cancelled' && i.status !== 'completed');
  const closed = rows.filter((i) => i.status === 'cancelled' || i.status === 'completed');
  const estimate = live.reduce((total, i) => total + i.estimatedSubtotalCents, 0);

  return (
    <Section
      eyebrow="My account"
      title="Orders"
      description="Goods you asked a producer or group to supply. Each row is an arrangement you and the seller are organising — OmoNETAB does not charge or move money, so this is not a payment history."
    >
      <Card>
        <CardBody>
          <dl className="grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-ink-500">Still being arranged</dt>
              <dd className="text-2xl font-black text-ink-900">{live.length}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Finished or cancelled</dt>
              <dd className="text-2xl font-black text-ink-900">{closed.length}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Sum of open estimates</dt>
              <dd className="text-2xl font-black text-ink-900">{formatMoney({ cents: estimate, currency: 'ETB' })}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-ink-500">
            The estimate is the listing’s unit price multiplied by the quantity you asked for, computed when you sent the
            request. The final figure is whatever you and the seller agree.
          </p>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty
          title="No orders yet"
          body="Send an inquiry from a product listing, and it appears here until it is completed or cancelled."
          action={
            <Link href="/products" className="underline font-semibold text-clay-700">
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((i) => (
            <div key={i.id}>
              <ArrangementCard inquiry={i} listing={listingById.get(i.listingId)} canAct={actor.status === 'active'} />
              <p className="mt-1 px-1 text-sm">
                <Link href={`/buyer/inquiries/${i.id}`} className="underline font-semibold text-clay-700">
                  Open the record
                </Link>
              </p>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Getting it to you</h2>
          <p className="mt-2 text-sm text-ink-700">
            Pickup and delivery options are written by the seller on each listing. For bulk quantities, transport is
            usually shared — the group order pages show how a delivery plan is split, and any figure there is an
            estimate until a quote is confirmed.
          </p>
          <p className="mt-2 text-sm">
            <Link href="/collective-orders" className="underline font-semibold text-clay-700">
              Group orders
            </Link>{' '}
            ·{' '}
            <Link href="/pricing-tool" className="underline font-semibold text-clay-700">
              Price and transport calculator
            </Link>
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}

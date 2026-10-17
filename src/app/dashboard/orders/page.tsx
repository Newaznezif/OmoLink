import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { ArrangementCard } from '@/components/arrangement-card';
import { Card, CardBody, Empty, Section } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import type { Inquiry, Listing } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Orders and sessions',
  description: 'What your buyers have asked for, split into goods to supply and sessions to host.'
};

export default async function DashboardOrdersPage() {
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  const [inquiries, listings] = await Promise.all([repo.listInquiriesForSeller(actor.profileId), repo.listListingsByProducer(actor.profileId)]);
  const listingById = new Map(listings.map((l) => [l.id, l]));

  const isSession = (i: Inquiry) => listingById.get(i.listingId)?.kind === 'service' || i.preference === 'booking';
  const live = inquiries.filter((i) => i.status !== 'completed' && i.status !== 'cancelled');
  const closed = inquiries.filter((i) => i.status === 'completed' || i.status === 'cancelled');
  const needsReply = live.filter((i) => i.status === 'new');
  const goods = live.filter((i) => !isSession(i));
  const sessions = live.filter(isSession);
  const estimate = goods.reduce((total, i) => total + i.estimatedSubtotalCents, 0);
  const canAct = actor.status === 'active';

  return (
    <Section
      eyebrow="Dashboard"
      title="Orders"
      description="Requests against your listings, grouped by what you have to do next. OmoNETAB records the arrangement; it does not charge a buyer, hold money, or mark anything sold until you record it."
    >
      <Card>
        <CardBody>
          <dl className="grid sm:grid-cols-4 gap-3 text-sm">
            <div>
              <dt className="text-ink-500">Awaiting your reply</dt>
              <dd className="text-2xl font-black text-ink-900">{needsReply.length}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Goods to supply</dt>
              <dd className="text-2xl font-black text-ink-900">{goods.length}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Sessions to host</dt>
              <dd className="text-2xl font-black text-ink-900">{sessions.length}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Closed records</dt>
              <dd className="text-2xl font-black text-ink-900">{closed.length}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-ink-500">
            The goods rows came to {formatMoney({ cents: estimate, currency: 'ETB' })} added together. That is a sum of
            estimates taken from your listing prices at the time of each request — not money owed to you, and not a
            ledger.
          </p>
        </CardBody>
      </Card>

      {inquiries.length === 0 ? (
        <Empty
          title="No inquiries have arrived yet"
          body="When a buyer sends an inquiry on one of your listings it appears here, and its status becomes yours to keep honest."
          action={
            <Link href="/dashboard/listings/new" className="underline font-semibold text-clay-700">
              Create a listing
            </Link>
          }
        />
      ) : (
        <>
          <OrderList title="Goods to supply" rows={goods} listingById={listingById} canAct={canAct} empty="No open goods arrangements. Anything not yet answered sits under Inquiries." />
          <OrderList title="Sessions to host" rows={sessions} listingById={listingById} canAct={canAct} empty="No open bookings. Tour and guide requests appear here when they arrive." />
          <OrderList
            title="Closed records"
            rows={closed}
            listingById={listingById}
            // A finished or cancelled record has no status left to move: the server
            // refuses to reopen it, so offering the buttons would only offer failures.
            canAct={false}
            empty="Nothing has been completed or cancelled yet."
          />
        </>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Keeping the record honest</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>Accept only what you can actually deliver at the quantity and date asked for.</li>
            <li>“Fulfillment arranged” means pickup, delivery or the meeting point is settled — not that it happened.</li>
            <li>Mark completed once the goods changed hands or the visit took place. The buyer then confirms it their side.</li>
            <li>If plans change, cancel this record and ask for a new inquiry rather than rewriting history.</li>
          </ul>
          <p className="mt-2 text-sm">
            <Link href="/dashboard/inquiries" className="underline font-semibold text-clay-700">
              All inquiries, newest first
            </Link>{' '}
            ·{' '}
            <Link href="/dashboard/collective-orders" className="underline font-semibold text-clay-700">
              Group selling
            </Link>
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}

function OrderList({
  title,
  rows,
  listingById,
  canAct,
  empty
}: {
  title: string;
  rows: Inquiry[];
  listingById: Map<string, Listing>;
  canAct: boolean;
  empty: string;
}) {
  return (
    <div>
      <h2 className="font-semibold text-ink-900 mb-2">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-500 rounded-lg border border-ink-100 bg-white p-3">{empty}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((i) => (
            <div key={i.id}>
              <ArrangementCard inquiry={i} listing={listingById.get(i.listingId)} canAct={canAct} side="seller" />
              <p className="mt-1 px-1 text-sm">
                <Link href={`/dashboard/inquiries/${i.id}`} className="underline font-semibold text-clay-700">
                  Open the record
                </Link>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

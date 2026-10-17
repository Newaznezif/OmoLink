import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { requireArea } from '@/lib/area';
import { ArrangementCard } from '@/components/arrangement-card';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My account',
  description: 'Your inquiries, orders and bookings on OmoLink.'
};

export default async function BuyerOverview() {
  const actor = await requireArea('/buyer', ['buyer']);
  const profile = await getSessionProfile();
  const repo = getRepo();
  const [inquiries, listings] = await Promise.all([
    repo.listInquiriesForBuyer(actor.profileId),
    repo.listPublicListings()
  ]);

  const listingById = new Map(listings.map((l) => [l.id, l]));
  const sorted = [...inquiries].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const waitingSeller = inquiries.filter((i) => i.status === 'new' || i.status === 'awaiting_confirmation').length;
  const inProgress = inquiries.filter((i) => i.status === 'accepted' || i.status === 'fulfillment_arranged').length;
  const done = inquiries.filter((i) => i.status === 'completed').length;
  const cancelled = inquiries.filter((i) => i.status === 'cancelled').length;
  const recent = sorted.slice(0, 3);

  const kindLabel =
    profile?.accountKind === 'tourist'
      ? 'visitor'
      : profile?.accountKind === 'business_buyer'
        ? `${profile.organizationName ? 'business ' : ''}buyer`
        : 'buyer';

  return (
    <Section
      eyebrow="My account"
      title={`Welcome, ${profile?.displayName ?? 'there'}`}
      description="Everything here is your own record: requests you sent, and what the other side noted. OmoLink does not take payment, so nothing below is a receipt — it is an arrangement you and a seller are organising."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Awaiting a reply" value={waitingSeller} tone="warning" href="/buyer/inquiries" />
        <Stat label="Being arranged" value={inProgress} tone="info" href="/buyer/inquiries" />
        <Stat label="Completed" value={done} tone="success" href="/buyer/orders" />
        <Stat label="Cancelled" value={cancelled} tone="neutral" href="/buyer/inquiries" />
      </div>

      {recent.length === 0 ? (
        <Empty
          title="You have not contacted anyone yet"
          body="Find what you need in the marketplace, then send an inquiry with your quantity and preferred date. The seller replies and you arrange pickup, delivery or the booking."
          action={
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/products" className="underline font-semibold text-clay-700">
                Browse products
              </Link>
              <Link href="/tourism" className="underline font-semibold text-clay-700">
                Browse tours and guides
              </Link>
              <Link href="/how-it-works" className="underline font-semibold text-clay-700">
                How the arrangement works
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-ink-900">Most recent activity</h2>
            <Link href="/buyer/inquiries" className="underline font-semibold text-sm text-clay-700">
              All {inquiries.length} inquiries
            </Link>
          </div>
          {recent.map((i) => (
            <ArrangementCard key={i.id} inquiry={i} listing={listingById.get(i.listingId)} canAct={actor.status === 'active'} />
          ))}
        </div>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">As a {kindLabel} on OmoLink</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>
              <Link href="/buyer/orders" className="underline">
                Orders
              </Link>{' '}
              tracks goods you asked for;{' '}
              <Link href="/buyer/bookings" className="underline">
                Bookings
              </Link>{' '}
              tracks tours, guides and transfers with a date.
            </li>
            <li>Confirm completion only when you actually received the goods or the visit took place — that is what makes a later review honest.</li>
            <li>Your contact details are visible to the seller you chose, never published on a listing page.</li>
            <li>
              Something wrong?{' '}
              <Link href="/community-guidelines" className="underline">
                The guidelines
              </Link>{' '}
              explain what a listing may claim, and every listing page has a report link.
            </li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Buying in bulk, or for a hotel or shop?</h2>
          <p className="mt-2 text-sm text-ink-700">
            A group order lets several producers contribute quantity toward one buyer order, which is often the only way
            to reach a volume that is worth transporting. Prices shown for group orders are indicative until a quote is
            confirmed.
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <Link href="/collective-orders" className="underline font-semibold text-clay-700">
              Open group orders
            </Link>
            <Link href="/pricing-tool" className="underline font-semibold text-clay-700">
              Work out a fair price
            </Link>
          </div>
        </CardBody>
      </Card>
    </Section>
  );
}

function Stat({
  label,
  value,
  tone,
  href
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full hover:border-clay-300">
        <CardBody>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-ink-900">{value}</span>
            <Badge tone={tone}>{value === 1 ? 'record' : 'records'}</Badge>
          </div>
          <p className="mt-1 text-sm font-semibold text-clay-800 underline">{label}</p>
        </CardBody>
      </Card>
    </Link>
  );
}

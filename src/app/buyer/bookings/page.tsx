import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { ArrangementCard, arrangementTone } from '@/components/arrangement-card';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My bookings',
  description: 'Tours, guides and services you arranged, with the dates you asked for.'
};

export default async function BuyerBookingsPage() {
  const actor = await requireArea('/buyer', ['buyer']);
  const repo = getRepo();
  const [inquiries, listings] = await Promise.all([repo.listInquiriesForBuyer(actor.profileId), repo.listAllListings()]);
  const listingById = new Map(listings.map((l) => [l.id, l]));

  const rows = inquiries
    .filter((i) => listingById.get(i.listingId)?.kind === 'service' || i.preference === 'booking')
    .sort((a, b) => (a.preferredDate ?? a.createdAt) < (b.preferredDate ?? b.createdAt) ? -1 : 1);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.filter((i) => i.preferredDate && i.preferredDate >= today && i.status !== 'cancelled' && i.status !== 'completed');
  const rest = rows.filter((i) => !upcoming.includes(i));

  return (
    <Section
      eyebrow="My account"
      title="Bookings"
      description="Tours, guides and services. A date here is the day you asked for — it is only agreed once the seller accepts, and both of you confirm it happened."
    >
      {rows.length === 0 ? (
        <Empty
          title="Nothing booked yet"
          body="Tour and guide listings let you ask for a date. Send one and it will be tracked here."
          action={
            <Link href="/tourism" className="underline font-semibold text-clay-700">
              Browse tours and guides
            </Link>
          }
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <Card>
              <CardBody>
                <h2 className="font-semibold text-ink-900">Coming up</h2>
                <ul className="mt-2 space-y-2 text-sm">
                  {upcoming.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/buyer/inquiries/${i.id}`} className="underline font-semibold text-clay-700">
                        {listingById.get(i.listingId)?.tourism?.packageName ?? listingById.get(i.listingId)?.title ?? i.reference}
                      </Link>
                      <span className="flex items-center gap-2 text-ink-500">
                        {i.preferredDate}
                        <Badge tone={arrangementTone(i.status)}>{i.status.replace(/_/g, ' ')}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink-500">
                  “New” and “awaiting confirmation” are not confirmed bookings. Check the record for what the guide
                  replied.
                </p>
              </CardBody>
            </Card>
          )}

          <div className="space-y-3">
            {rest.map((i) => (
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
        </>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Before you arrange a visit</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>Meeting point, duration, inclusions and the cancellation policy are on the listing page.</li>
            <li>Photographs of people, ceremonies or cultural property are only used where consent was recorded.</li>
            <li>If a guide asks for something the listing did not state, that is worth reporting from the listing page.</li>
          </ul>
          <p className="mt-2 text-sm">
            <Link href="/community-guidelines" className="underline font-semibold text-clay-700">
              Community guidelines
            </Link>
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}

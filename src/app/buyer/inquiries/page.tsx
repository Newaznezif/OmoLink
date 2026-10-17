import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { ArrangementCard, arrangementTone } from '@/components/arrangement-card';
import { Badge, Button, Card, CardBody, Empty, Field, Input, Select, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

const STATUSES = ['new', 'accepted', 'awaiting_confirmation', 'fulfillment_arranged', 'completed', 'cancelled'] as const;

export const metadata = {
  title: 'My inquiries',
  description: 'Every request you have sent through OmoNETAB, with what has been recorded since.'
};

export default async function BuyerInquiriesPage({ searchParams }: { searchParams?: SearchParams }) {
  const actor = await requireArea('/buyer', ['buyer']);
  const text = (key: string): string => (typeof searchParams?.[key] === 'string' ? (searchParams[key] as string) : '');
  const repo = getRepo();
  const [inquiries, listings] = await Promise.all([
    repo.listInquiriesForBuyer(actor.profileId),
    repo.listAllListings()
  ]);

  const listingById = new Map(listings.map((l) => [l.id, l]));
  const q = text('q').trim().toLowerCase();
  const status = text('status');

  const rows = inquiries
    .filter((i) => {
      if (status && i.status !== status) return false;
      if (!q) return true;
      return [i.reference, i.message, listingById.get(i.listingId)?.title ?? ''].join(' ').toLowerCase().includes(q);
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const counts = STATUSES.map((s) => ({ status: s, count: inquiries.filter((i) => i.status === s).length }));

  return (
    <Section
      eyebrow="My account"
      title="My inquiries"
      description="Only the requests you sent appear here — a buyer never sees anyone else’s arrangements. Each record shows what the seller noted and what you recorded yourself."
    >
      {inquiries.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {counts.map((c) => (
                <Link key={c.status} href={`/buyer/inquiries?status=${c.status}`}>
                  <Badge tone={arrangementTone(c.status)}>
                    {c.status.replace(/_/g, ' ')} · {c.count}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <Field label="Search reference, message or listing" htmlFor="q">
              <Input id="q" name="q" defaultValue={text('q')} />
            </Field>
            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={status}>
                <option value="">Any</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="md:col-span-2 flex items-end gap-2">
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Link
                href="/buyer/inquiries"
                className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-9 text-sm font-semibold inline-flex items-center"
              >
                Clear
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty
          title={inquiries.length === 0 ? 'No inquiries yet' : 'No inquiry matches'}
          body={
            inquiries.length === 0
              ? 'Send a request from any listing page and it will be tracked here.'
              : 'Clear the filters to see the rest of your records.'
          }
          action={
            inquiries.length === 0 ? (
              <Link href="/explore" className="underline font-semibold text-clay-700">
                Browse the marketplace
              </Link>
            ) : (
              <Link href="/buyer/inquiries" className="underline font-semibold text-clay-700">
                Show all inquiries
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((i) => (
            <div key={i.id}>
              <ArrangementCard inquiry={i} listing={listingById.get(i.listingId)} canAct={actor.status === 'active'} />
              <p className="mt-1 px-1 text-sm">
                <Link href={`/buyer/inquiries/${i.id}`} className="underline font-semibold text-clay-700">
                  Open this record
                </Link>
              </p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

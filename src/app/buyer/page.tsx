import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { requireArea } from '@/lib/area';
import { getLanguage, getT } from '@/lib/i18n/server';
import { ArrangementCard } from '@/components/arrangement-card';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const tr = getT();
  return {
    title: tr('nav.myAccountAria'),
    description: tr('buyerHome.metaDescription')
  };
}

export default async function BuyerOverview() {
  const actor = await requireArea('/buyer', ['buyer']);
  const profile = await getSessionProfile();
  const repo = getRepo();
  const lang = getLanguage();
  const tr = getT();
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
      ? tr('buyerHome.kindVisitor')
      : profile?.accountKind === 'business_buyer'
        ? profile.organizationName
          ? tr('buyerHome.kindBusiness')
          : tr('buyerHome.kindBuyer')
        : tr('buyerHome.kindBuyer');

  return (
    <Section
      eyebrow={tr('nav.myAccountAria')}
      title={tr('buyerHome.welcome', { name: profile?.displayName ?? tr('buyerHome.there') })}
      description={tr('buyerHome.description')}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={tr('buyerHome.statAwaiting')} value={waitingSeller} tone="warning" href="/buyer/inquiries" recordUnit={tr('buyerHome.recordUnit')} recordsUnit={tr('buyerHome.recordsUnit')} />
        <Stat label={tr('buyerHome.statArranged')} value={inProgress} tone="info" href="/buyer/inquiries" recordUnit={tr('buyerHome.recordUnit')} recordsUnit={tr('buyerHome.recordsUnit')} />
        <Stat label={tr('inquiry.status.completed')} value={done} tone="success" href="/buyer/orders" recordUnit={tr('buyerHome.recordUnit')} recordsUnit={tr('buyerHome.recordsUnit')} />
        <Stat label={tr('inquiry.status.cancelled')} value={cancelled} tone="neutral" href="/buyer/inquiries" recordUnit={tr('buyerHome.recordUnit')} recordsUnit={tr('buyerHome.recordsUnit')} />
      </div>

      {recent.length === 0 ? (
        <Empty
          title={tr('buyerHome.emptyTitle')}
          body={tr('buyerHome.emptyBody')}
          action={
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/products" className="underline font-semibold text-clay-700">
                {tr('home.browseProducts')}
              </Link>
              <Link href="/tourism" className="underline font-semibold text-clay-700">
                {tr('buyerHome.browseTours')}
              </Link>
              <Link href="/how-it-works" className="underline font-semibold text-clay-700">
                {tr('buyerHome.howArrangementWorks')}
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-ink-900">{tr('buyerHome.recentTitle')}</h2>
            <Link href="/buyer/inquiries" className="underline font-semibold text-sm text-clay-700">
              {tr('buyerHome.allInquiries', { count: inquiries.length })}
            </Link>
          </div>
          {recent.map((i) => (
            <ArrangementCard key={i.id} inquiry={i} listing={listingById.get(i.listingId)} canAct={actor.status === 'active'} lang={lang} />
          ))}
        </div>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{tr('buyerHome.roleHeading', { kind: kindLabel })}</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>
              <Link href="/buyer/orders" className="underline">
                {tr('nav.orders')}
              </Link>{' '}
              {tr('buyerHome.ordersMiddle')}{' '}
              <Link href="/buyer/bookings" className="underline">
                {tr('nav.bookings')}
              </Link>{' '}
              {tr('buyerHome.bookingsTail')}
            </li>
            <li>{tr('buyerHome.honestItem')}</li>
            <li>{tr('buyerHome.contactItem')}</li>
            <li>
              {tr('buyerHome.reportPrefix')}{' '}
              <Link href="/community-guidelines" className="underline">
                {tr('buyerHome.guidelinesLink')}
              </Link>{' '}
              {tr('buyerHome.reportSuffix')}
            </li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{tr('buyerHome.bulkTitle')}</h2>
          <p className="mt-2 text-sm text-ink-700">
            {tr('buyerHome.bulkBody')}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <Link href="/collective-orders" className="underline font-semibold text-clay-700">
              {tr('home.collectiveTitle')}
            </Link>
            <Link href="/pricing-tool" className="underline font-semibold text-clay-700">
              {tr('buyerHome.pricingLink')}
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
  href,
  recordUnit,
  recordsUnit
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  href: string;
  recordUnit: string;
  recordsUnit: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full hover:border-clay-300">
        <CardBody>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-ink-900">{value}</span>
            <Badge tone={tone}>{value === 1 ? recordUnit : recordsUnit}</Badge>
          </div>
          <p className="mt-1 text-sm font-semibold text-clay-800 underline">{label}</p>
        </CardBody>
      </Card>
    </Link>
  );
}

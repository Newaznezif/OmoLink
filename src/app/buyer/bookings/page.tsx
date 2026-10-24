import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { getLanguage, getT } from '@/lib/i18n/server';
import type { TranslationKey } from '@/lib/i18n';
import { ArrangementCard, arrangementLabel, arrangementTone } from '@/components/arrangement-card';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

const STATUS_WORD: Record<string, TranslationKey> = {
  new: 'inquiries.statusWord.new',
  accepted: 'inquiries.statusWord.accepted',
  awaiting_confirmation: 'inquiries.statusWord.awaiting_confirmation',
  fulfillment_arranged: 'inquiries.statusWord.fulfillment_arranged',
  completed: 'inquiries.statusWord.completed',
  cancelled: 'inquiries.statusWord.cancelled'
};

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('bookings.metaTitle'),
    description: t('bookings.metaDescription')
  };
}

export default async function BuyerBookingsPage() {
  const t = getT();
  const lang = getLanguage();
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
      eyebrow={t('nav.myAccountAria')}
      title={t('nav.bookings')}
      description={t('bookings.description')}
    >
      {rows.length === 0 ? (
        <Empty
          title={t('bookings.emptyTitle')}
          body={t('bookings.emptyBody')}
          action={
            <Link href="/tourism" className="underline font-semibold text-clay-700">
              {t('buyerHome.browseTours')}
            </Link>
          }
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <Card>
              <CardBody>
                <h2 className="font-semibold text-ink-900">{t('bookings.upcomingTitle')}</h2>
                <ul className="mt-2 space-y-2 text-sm">
                  {upcoming.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/buyer/inquiries/${i.id}`} className="underline font-semibold text-clay-700">
                        {listingById.get(i.listingId)?.tourism?.packageName ?? listingById.get(i.listingId)?.title ?? i.reference}
                      </Link>
                      <span className="flex items-center gap-2 text-ink-500">
                        {i.preferredDate}
                        <Badge tone={arrangementTone(i.status)}>
                          {STATUS_WORD[i.status] ? t(STATUS_WORD[i.status]) : arrangementLabel(i.status)}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink-500">{t('bookings.notConfirmedNote')}</p>
              </CardBody>
            </Card>
          )}

          <div className="space-y-3">
            {rest.map((i) => (
              <div key={i.id}>
                <ArrangementCard inquiry={i} listing={listingById.get(i.listingId)} canAct={actor.status === 'active'} lang={lang} />
                <p className="mt-1 px-1 text-sm">
                  <Link href={`/buyer/inquiries/${i.id}`} className="underline font-semibold text-clay-700">
                    {t('orders.openRecord')}
                  </Link>
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('bookings.beforeTitle')}</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>{t('bookings.before1')}</li>
            <li>{t('bookings.before2')}</li>
            <li>{t('bookings.before3')}</li>
          </ul>
          <p className="mt-2 text-sm">
            <Link href="/community-guidelines" className="underline font-semibold text-clay-700">
              {t('footer.guidelines')}
            </Link>
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}

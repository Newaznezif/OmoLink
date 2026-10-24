import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { getLanguage, getT } from '@/lib/i18n/server';
import { t as translate } from '@/lib/i18n';
import type { Inquiry, LanguageCode, Listing } from '@/lib/types';
import { ArrangementCard } from '@/components/arrangement-card';
import { Card, CardBody, Empty, Section } from '@/components/ui';
import { formatMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('orders.metaTitle'),
    description: t('orders.metaDescription')
  };
}

export default async function DashboardOrdersPage() {
  const t = getT();
  const lang = getLanguage();
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
      eyebrow={t('orders.eyebrow')}
      title={t('nav.orders')}
      description={t('orders.description')}
    >
      <Card>
        <CardBody>
          <dl className="grid sm:grid-cols-4 gap-3 text-sm">
            <div>
              <dt className="text-ink-500">{t('orders.statAwaitingReply')}</dt>
              <dd className="text-2xl font-black text-ink-900">{needsReply.length}</dd>
            </div>
            <div>
              <dt className="text-ink-500">{t('orders.statGoods')}</dt>
              <dd className="text-2xl font-black text-ink-900">{goods.length}</dd>
            </div>
            <div>
              <dt className="text-ink-500">{t('orders.statSessions')}</dt>
              <dd className="text-2xl font-black text-ink-900">{sessions.length}</dd>
            </div>
            <div>
              <dt className="text-ink-500">{t('orders.statClosed')}</dt>
              <dd className="text-2xl font-black text-ink-900">{closed.length}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-ink-500">
            {t('orders.estimateNote', { amount: formatMoney({ cents: estimate, currency: 'ETB' }) })}
          </p>
        </CardBody>
      </Card>

      {inquiries.length === 0 ? (
        <Empty
          title={t('orders.emptyTitle')}
          body={t('orders.emptyBody')}
          action={
            <Link href="/dashboard/listings/new" className="underline font-semibold text-clay-700">
              {t('orders.createListing')}
            </Link>
          }
        />
      ) : (
        <>
          <OrderList lang={lang} title={t('orders.statGoods')} rows={goods} listingById={listingById} canAct={canAct} empty={t('orders.goodsEmpty')} />
          <OrderList lang={lang} title={t('orders.statSessions')} rows={sessions} listingById={listingById} canAct={canAct} empty={t('orders.sessionsEmpty')} />
          <OrderList
            lang={lang}
            title={t('orders.statClosed')}
            rows={closed}
            listingById={listingById}
            // A finished or cancelled record has no status left to move: the server
            // refuses to reopen it, so offering the buttons would only offer failures.
            canAct={false}
            empty={t('orders.closedEmpty')}
          />
        </>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('orders.honestTitle')}</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>{t('orders.honest1')}</li>
            <li>{t('orders.honest2')}</li>
            <li>{t('orders.honest3')}</li>
            <li>{t('orders.honest4')}</li>
          </ul>
          <p className="mt-2 text-sm">
            <Link href="/dashboard/inquiries" className="underline font-semibold text-clay-700">
              {t('orders.allInquiries')}
            </Link>{' '}
            ·{' '}
            <Link href="/dashboard/collective-orders" className="underline font-semibold text-clay-700">
              {t('nav.groupSelling')}
            </Link>
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}

function OrderList({
  lang,
  title,
  rows,
  listingById,
  canAct,
  empty
}: {
  lang: LanguageCode;
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
              <ArrangementCard lang={lang} inquiry={i} listing={listingById.get(i.listingId)} canAct={canAct} side="seller" />
              <p className="mt-1 px-1 text-sm">
                <Link href={`/dashboard/inquiries/${i.id}`} className="underline font-semibold text-clay-700">
                  {translate(lang, 'orders.openRecord')}
                </Link>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { formatMoney } from '@/lib/money';
import { getLanguage, getT } from '@/lib/i18n/server';
import type { TranslationKey } from '@/lib/i18n';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';
import { InquiryStatusPicker } from '@/components/inquiry-status-picker';

export const dynamic = 'force-dynamic';

const STATUSES = ['new', 'accepted', 'awaiting_confirmation', 'fulfillment_arranged', 'completed', 'cancelled'] as const;

// The English entries are the lowercase words the chips and badges rendered
// before localization, so the visible page is unchanged while other languages
// get real wording.
const STATUS_WORD: Record<(typeof STATUSES)[number], TranslationKey> = {
  new: 'inquiries.statusWord.new',
  accepted: 'inquiries.statusWord.accepted',
  awaiting_confirmation: 'inquiries.statusWord.awaiting_confirmation',
  fulfillment_arranged: 'inquiries.statusWord.fulfillment_arranged',
  completed: 'inquiries.statusWord.completed',
  cancelled: 'inquiries.statusWord.cancelled'
};

export default async function DashboardInquiriesPage({
  searchParams
}: {
  searchParams: { listing?: string; status?: string };
}) {
  const t = getT();
  const lang = getLanguage();
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  const all = await repo.listInquiriesForSeller(actor.profileId);
  const listings = await repo.listListingsByProducer(actor.profileId);

  // Filters change the rows that are rendered, so the links on the listing page
  // and the status chips below are working navigation, not decoration.
  const listingFilter = typeof searchParams.listing === 'string' ? searchParams.listing : '';
  const statusFilter = STATUSES.includes(searchParams.status as (typeof STATUSES)[number]) ? searchParams.status : undefined;
  const inquiries = all
    .filter((i) => (listingFilter ? i.listingId === listingFilter : true))
    .filter((i) => (statusFilter ? i.status === statusFilter : true))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const needsReply = all.filter((i) => i.status === 'new').length;
  const filteredListing = listings.find((l) => l.id === listingFilter);

  return (
    <Section
      eyebrow={t('myListings.eyebrow')}
      title={t('inquiries.title')}
      description={t('inquiries.description')}
    >
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <span className="font-semibold text-ink-900">{t('inquiries.filterLabel')}</span>
        {STATUSES.map((s) =>
          s === statusFilter ? (
            <Link
              key={s}
              href={listingFilter ? `/dashboard/inquiries?listing=${listingFilter}` : '/dashboard/inquiries'}
              className="rounded-full bg-clay-700 px-3 py-1 font-semibold text-white"
            >
              {t(STATUS_WORD[s])} ✕
            </Link>
          ) : (
            <Link
              key={s}
              href={`/dashboard/inquiries?status=${s}${listingFilter ? `&listing=${listingFilter}` : ''}`}
              className="rounded-full border border-ink-100 bg-white px-3 py-1 hover:bg-clay-50"
            >
              {t(STATUS_WORD[s])}
            </Link>
          )
        )}
        <Badge tone={needsReply > 0 ? 'warning' : 'neutral'}>{t('inquiries.awaitingFirstReply', { count: needsReply })}</Badge>
      </div>

      {filteredListing && (
        <p className="mt-2 text-sm text-ink-700">
          {t('inquiries.showingFor')}{' '}
          <Link href={`/listings/${filteredListing.id}`} className="underline font-semibold text-clay-700">
            {filteredListing.title}
          </Link>{' '}
          ·{' '}
          <Link href="/dashboard/inquiries" className="underline text-ink-500">
            {t('inquiries.showAllListings')}
          </Link>
        </p>
      )}
      {!filteredListing && listingFilter && (
        <p className="mt-2 text-sm text-ink-500">
          {t('inquiries.notManagedFilter')}{' '}
          <Link href="/dashboard/inquiries" className="underline text-clay-700">
            {t('inquiries.clearFilter')}
          </Link>
        </p>
      )}

      {inquiries.length === 0 ? (
        <Empty
          title={all.length === 0 ? t('inquiries.emptyTitle') : t('inquiries.noMatchTitle')}
          body={
            all.length === 0
              ? t('inquiries.emptyBody')
              : t('inquiries.noMatchBody')
          }
        />
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
                        <h3 className="font-semibold text-ink-900">{listing?.title ?? t('inquiries.listingRemoved')}</h3>
                      </div>
                      <Badge tone={statusTone(i.status)}>{t(STATUS_WORD[i.status])}</Badge>
                    </div>
                    <dl className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <dt className="text-ink-500">{t('receipt.quantity')}</dt>
                        <dd className="text-ink-900 font-medium">
                          {i.quantity} {i.unitOfSale}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">{t('inquiry.subtotal')}</dt>
                        <dd className="text-ink-900 font-medium">{formatMoney({ cents: i.estimatedSubtotalCents, currency: i.currency })}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">{t('inquiries.preference')}</dt>
                        <dd className="text-ink-900">{i.preference}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">{t('inquiries.buyer')}</dt>
                        <dd className="text-ink-900">{i.buyerName}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">{t('inquiries.replyTo')}</dt>
                        <dd className="text-ink-900">{i.buyerContact}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">{t('inquiries.received')}</dt>
                        <dd className="text-ink-900">{new Date(i.createdAt).toLocaleString()}</dd>
                      </div>
                    </dl>
                    {i.message && (
                      <p className="mt-3 text-sm text-ink-700 whitespace-pre-line rounded-lg bg-clay-50 p-3">{i.message}</p>
                    )}
                    <p className="mt-3 text-sm flex flex-wrap gap-4">
                      <Link href={`/dashboard/inquiries/${i.id}`} className="underline text-clay-800 font-semibold">
                        {t('inquiries.openRecord')}
                      </Link>
                      {listing && (
                        <Link href={`/listings/${listing.id}`} className="underline text-ink-500">
                          {t('inquiries.seeListing')}
                        </Link>
                      )}
                    </p>
                    <div className="mt-3">
                      <InquiryStatusPicker inquiryId={i.id} current={i.status} lang={lang} />
                    </div>
                    {i.events.length > 1 && (
                      <details className="mt-2 text-xs text-ink-500">
                        <summary className="cursor-pointer font-semibold">{t('inquiries.activityLog')}</summary>
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

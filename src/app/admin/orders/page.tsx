import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { AdminSection } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Empty, Input, Select } from '@/components/ui';
import { getT } from '@/lib/i18n/server';
import type { TranslationKey } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

const STATUS_WORD: Record<string, TranslationKey> = {
  new: 'inquiries.statusWord.new',
  accepted: 'inquiries.statusWord.accepted',
  awaiting_confirmation: 'inquiries.statusWord.awaiting_confirmation',
  fulfillment_arranged: 'inquiries.statusWord.fulfillment_arranged',
  completed: 'inquiries.statusWord.completed',
  cancelled: 'inquiries.statusWord.cancelled'
};

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const t = getT();
  const text = (key: string): string => (typeof searchParams[key] === 'string' ? (searchParams[key] as string) : '');
  const repo = getRepo();
  const [inquiries, listings] = await Promise.all([repo.listAllInquiries(), repo.listAllListings()]);
  const listingById = new Map(listings.map((l) => [l.id, l]));

  const q = text('q').trim().toLowerCase();
  const status = text('status');
  const kind = text('kind');

  const rows = inquiries
    .filter((i) => {
      if (status && i.status !== status) return false;
      if (kind === 'product' && listingById.get(i.listingId)?.kind !== 'product') return false;
      if (kind === 'service' && listingById.get(i.listingId)?.kind !== 'service') return false;
      if (!q) return true;
      return [i.reference, i.buyerName, i.buyerContact, listingById.get(i.listingId)?.title ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const completed = inquiries.filter((i) => i.status === 'completed').length;
  const cancelled = inquiries.filter((i) => i.status === 'cancelled').length;

  return (
    <AdminSection
      title={t('nav.arrangements')}
      description={t('adminOrders.description', { completed, total: inquiries.length, cancelled })}
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label htmlFor="q" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('adminOrders.searchLabel')}
              </label>
              <Input id="q" name="q" defaultValue={text('q')} />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('reports.status')}
              </label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">{t('reports.allOptions')}</option>
                {['new', 'accepted', 'awaiting_confirmation', 'fulfillment_arranged', 'completed', 'cancelled'].map((s) => (
                  <option key={s} value={s}>
                    {t(STATUS_WORD[s])}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="kind" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('listingForm.typeLabel')}
              </label>
              <Select id="kind" name="kind" defaultValue={kind}>
                <option value="">{t('reports.allOptions')}</option>
                <option value="product">{t('listingForm.typeProduct')}</option>
                <option value="service">{t('adminOrders.kindService')}</option>
              </Select>
            </div>
            <div className="md:col-span-4 flex items-end gap-2">
              <Button type="submit" size="sm">
                {t('buyerInquiries.apply')}
              </Button>
              <Link href="/admin/orders" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 text-sm font-semibold">
                {t('common.clear')}
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty title={t('adminOrders.emptyTitle')} body={t('adminOrders.emptyBody')} />
      ) : (
        <div className="space-y-3">
          {rows.map((i) => {
            const listing = listingById.get(i.listingId);
            return (
              <Card key={i.id}>
                <CardBody>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="text-sm text-ink-500">{i.reference}</div>
                      <h3 className="font-semibold text-ink-900">
                        {listing ? (
                          <Link href={`/listings/${listing.id}`} className="underline">
                            {listing.title}
                          </Link>
                        ) : (
                          t('adminOrders.listingMissing')
                        )}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <Badge tone={statusTone(i.status)}>{t(STATUS_WORD[i.status])}</Badge>
                      {listing?.kind === 'service' && <Badge tone="neutral">{t('arrangement.bookingBadge')}</Badge>}
                    </div>
                  </div>

                  <dl className="mt-3 grid sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <dt className="text-ink-500">{t('inquiries.buyer')}</dt>
                      <dd className="text-ink-900">{i.buyerName}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">{t('adminOrders.contactLabel')}</dt>
                      <dd className="text-ink-900 break-words">{i.buyerContact}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">{t('receipt.quantity')}</dt>
                      <dd className="text-ink-900">
                        {i.quantity} {i.unitOfSale}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">{t('inquiry.subtotal')}</dt>
                      <dd className="text-ink-900">{formatMoney({ cents: i.estimatedSubtotalCents, currency: i.currency })}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">{t('inquiries.preference')}</dt>
                      <dd className="text-ink-900">{i.preference}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">{t('inquiries.preferredDate')}</dt>
                      <dd className="text-ink-900">{i.preferredDate || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">{t('inquiries.received')}</dt>
                      <dd className="text-ink-900">{new Date(i.createdAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">{t('adminOrders.lastChange')}</dt>
                      <dd className="text-ink-900">{new Date(i.updatedAt).toLocaleString()}</dd>
                    </div>
                  </dl>

                  {i.message && <p className="mt-3 text-sm text-ink-700 whitespace-pre-line rounded-lg bg-clay-50 p-3">{i.message}</p>}

                  {i.events.length > 1 && (
                    <details className="mt-2 text-xs text-ink-500">
                      <summary className="cursor-pointer font-semibold">{t('adminOrders.statusHistory')}</summary>
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
            );
          })}
        </div>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('adminOrders.noStatusTitle')}</h2>
          <p className="mt-2 text-sm text-ink-700">{t('adminOrders.noStatusBody')}</p>
          <p className="mt-2 text-xs text-ink-500">{t('adminOrders.contactNote')}</p>
        </CardBody>
      </Card>
    </AdminSection>
  );
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'new' || status === 'awaiting_confirmation') return 'warning';
  return 'neutral';
}

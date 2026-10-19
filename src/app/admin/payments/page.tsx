import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { AdminSection } from '@/components/admin-shell';
import { PaymentStatusBadge } from '@/components/payment-panel';
import { Button, Card, CardBody, Empty, ErrorState, Input, Select } from '@/components/ui';
import { SampleTag } from '@/components/status-labels';
import { paymentProviderStatus } from '@/lib/payment-providers';
import { getLanguage } from '@/lib/i18n/server';
import { t } from '@/lib/i18n';
import { receiptLabelKey } from '@/lib/receipts';
import { formatMoney } from '@/lib/money';
import type { Payment, PaymentStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

const STATUSES: PaymentStatus[] = ['pending', 'confirmed', 'failed', 'cancelled', 'expired', 'refunded'];

/**
 * The platform's payment ledger, for administrators only.
 *
 * The area itself is gated on the server (`src/app/admin/layout.tsx`), so this is
 * not a page that merely hides a tab: a non-administrator never renders it.
 *
 * What it says about money is deliberately narrow. A `confirmed` row means a
 * provider's verification call reported success and the amount matched the record;
 * it does not mean the seller has been paid, because OmoNetTab does not hold or
 * forward funds. Rows created in demo mode are labelled, and the configuration
 * line below states plainly whether a live provider is even wired up.
 */
export default async function AdminPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const text = (key: string): string => (typeof searchParams[key] === 'string' ? (searchParams[key] as string) : '');
  const lang = getLanguage();
  const repo = getRepo();
  const provider = paymentProviderStatus();

  let payments: Payment[] | undefined;
  let loadError: string | undefined;
  try {
    payments = await repo.listAllPayments();
  } catch (err: unknown) {
    loadError = err instanceof Error && err.message ? err.message : 'The payment records could not be read.';
  }

  const q = text('q').trim().toLowerCase();
  const status = text('status');
  const rows = (payments ?? [])
    .filter((p) => {
      if (status && p.status !== status) return false;
      if (!q) return true;
      return [p.reference, p.providerReference ?? '', p.inquiryId, p.buyerProfileId, p.sellerProfileId, p.paymentMethod ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const confirmed = rows.filter((p) => p.status === 'confirmed');
  const revenueCents = confirmed.reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <AdminSection
      title="Payments"
      description={`Every payment attempt on the platform, newest first. ${rows.length} shown, ${confirmed.length} confirmed. Counts here are of attempts, not of money handed to a seller.`}
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Payment configuration on this deployment</h2>
          <p className="mt-2 text-sm text-ink-700">{provider.detail}</p>
          <dl className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-ink-500">Mode</dt>
              <dd className="text-ink-900 font-medium">{provider.mode === 'demo' ? 'demo (simulated)' : 'production'}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Provider</dt>
              <dd className="text-ink-900 font-medium">{provider.provider}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Configured</dt>
              <dd className="text-ink-900 font-medium">{provider.configured ? 'yes' : 'no'}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-ink-500">
            A live provider being configured is not the same as a live payment working. Nothing on this page claims
            otherwise until a real transaction has been tested against the provider.
          </p>
        </CardBody>
      </Card>

      {loadError && <ErrorState title="Payment records are unavailable" body={loadError} retryHref="/admin/payments" />}

      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label htmlFor="q" className="block text-sm font-semibold text-ink-900 mb-1">
                Search reference, provider reference or profile
              </label>
              <Input id="q" name="q" defaultValue={text('q')} />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-ink-900 mb-1">
                Status
              </label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">All</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-4 flex items-end gap-2">
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Link href="/admin/payments" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 text-sm font-semibold">
                Clear
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {!loadError && rows.length === 0 ? (
        <Empty
          title="No payment attempt matches"
          body={
            provider.mode === 'demo'
              ? 'Demo mode starts with no payment attempts. Open one from a buyer’s inquiry page and it appears here, labelled as simulated.'
              : 'Either no buyer has started a payment, or the payments table has not been created yet — migration 0006 has to be reviewed and applied before attempts can be stored.'
          }
        />
      ) : (
        <>
          <Card>
            <CardBody>
              <dl className="grid sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-ink-500">Attempts shown</dt>
                  <dd className="text-ink-900 font-medium text-lg">{rows.length}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Confirmed</dt>
                  <dd className="text-ink-900 font-medium text-lg">{confirmed.length}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Confirmed total (not revenue received)</dt>
                  <dd className="text-ink-900 font-medium text-lg">
                    {formatMoney({ cents: revenueCents, currency: 'ETB' })}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-ink-500">
                Pending, failed, cancelled and expired attempts are never added to that total, and a repeated provider
                notification for the same reference does not create a second row.
              </p>
            </CardBody>
          </Card>

          <div className="space-y-3">
            {rows.map((p) => (
              <Card key={p.id}>
                <CardBody>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="text-sm text-ink-500 font-mono break-all">{p.reference}</div>
                      <h3 className="font-semibold text-ink-900">{formatMoney({ cents: p.amountCents, currency: p.currency })}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PaymentStatusBadge lang={lang} status={p.status} isDemo={p.isDemo} />
                      {p.isDemo && <SampleTag />}
                    </div>
                  </div>

                  <dl className="mt-3 grid sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <dt className="text-ink-500">Provider</dt>
                      <dd className="text-ink-900">{p.provider}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Provider reference</dt>
                      <dd className="text-ink-900 break-all">{p.providerReference ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Payment method reported</dt>
                      <dd className="text-ink-900">{p.paymentMethod ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Fee reported</dt>
                      <dd className="text-ink-900">{p.feeCents === undefined ? '—' : formatMoney({ cents: p.feeCents, currency: p.currency })}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Buyer profile</dt>
                      <dd className="text-ink-900 break-all">{p.buyerProfileId}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Seller profile</dt>
                      <dd className="text-ink-900 break-all">{p.sellerProfileId}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Opened</dt>
                      <dd className="text-ink-900">{new Date(p.createdAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Confirmed / closed</dt>
                      <dd className="text-ink-900">
                        {p.confirmedAt ? new Date(p.confirmedAt).toLocaleString() : p.closedAt ? new Date(p.closedAt).toLocaleString() : '—'}
                      </dd>
                    </div>
                  </dl>

                  {p.failureReason && (
                    <p className="mt-2 text-sm text-ink-700">
                      <span className="font-semibold">Why it ended:</span> {p.failureReason}
                    </p>
                  )}

                  {p.events.length > 0 && (
                    <details className="mt-2 text-xs text-ink-500">
                      <summary className="cursor-pointer font-semibold">Provider and session history</summary>
                      <ul className="mt-1 space-y-1 pl-4 list-disc">
                        {p.events.map((e) => (
                          <li key={e.id}>
                            <span className="font-mono">{new Date(e.at).toLocaleString()}</span> · {e.actor} · {e.kind}
                            {e.detail ? ` · ${e.detail}` : ''}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  <p className="mt-3 text-sm">
                    <a
                      href={`/api/payments/${encodeURIComponent(p.reference)}/receipt`}
                      className="underline font-semibold text-clay-700"
                    >
                      {t(getLanguage(), receiptLabelKey(p))}
                    </a>
                  </p>

                  <p className="mt-1 text-sm">
                    <Link href={`/admin/orders?q=${encodeURIComponent(p.reference)}`} className="underline font-semibold text-clay-700">
                      Find the arrangement this belongs to
                    </Link>
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Why there is no refund button here</h2>
          <p className="mt-2 text-sm text-ink-700">
            A refund is the provider’s action as much as ours, and marking one without the provider confirming it would
            put a statement about money into the platform’s mouth that the money-mover has not made. So this ledger is
            read-only: statuses change through the buyer’s own verification call or a signed provider notification, and
            the daily and weekly figures are built from those stored records.
          </p>
          <p className="mt-2 text-xs text-ink-500">
            Profile identifiers are shown rather than names because the payment record is keyed by them, and a buyer’s
            contact details stay on the arrangement record instead of being copied into a financial one.
          </p>
        </CardBody>
      </Card>
    </AdminSection>
  );
}

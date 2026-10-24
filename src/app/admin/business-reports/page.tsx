import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { AdminSection } from '@/components/admin-shell';
import { PaymentStatusBadge } from '@/components/payment-panel';
import { Card, CardBody, Empty, ErrorState, Input, Select } from '@/components/ui';
import { SampleTag } from '@/components/status-labels';
import { paymentProviderStatus } from '@/lib/payment-providers';
import { getLanguage } from '@/lib/i18n/server';
import { t, type TranslationKey } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import { PROVIDER_LABELS } from '@/lib/payments';
import {
  REPORT_TIMEZONE,
  buildBusinessReport,
  parseReportFilters,
  resolveRange,
  type BusinessReport,
  type ReportSource
} from '@/lib/business-reports';
import type { PaymentStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

const STATUSES: PaymentStatus[] = ['pending', 'confirmed', 'failed', 'cancelled', 'expired', 'refunded'];

/** How many ledger rows the page lists before pointing at the exports. */
const PAGE_ROW_LIMIT = 40;

/**
 * The administrator's daily and weekly report, in its own section so the existing
 * “Reports” tab — which is the queue of reported listings — keeps meaning one thing.
 *
 * Every number comes from `src/lib/business-reports.ts`, the same module the CSV and
 * PDF exports run through, so the page and the downloaded files cannot disagree about
 * what counts as revenue. Nothing here is estimated or carried in from the browser:
 * the records are read from the repository and counted on the server.
 *
 * The area is gated on the server (`src/app/admin/layout.tsx`): a non-administrator
 * never renders this page, and the export route repeats the check for itself.
 */
export default async function AdminBusinessReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLanguage();
  const tr = (key: TranslationKey, vars?: Record<string, string | number>) => t(lang, key, vars);
  const money = (cents: number) => formatMoney({ cents, currency: 'ETB' });
  const text = (key: string): string => (typeof searchParams[key] === 'string' ? (searchParams[key] as string) : '');

  const nowIso = new Date().toISOString();
  const range = resolveRange({ kind: text('range'), from: text('from'), to: text('to'), nowIso });
  const filters = parseReportFilters(searchParams);
  const provider = paymentProviderStatus();

  let report: BusinessReport | undefined;
  let source: ReportSource | undefined;
  let loadError: string | undefined;
  try {
    const repo = getRepo();
    const [payments, inquiries, listings, profiles, categories] = await Promise.all([
      repo.listAllPayments(),
      repo.listAllInquiries(),
      repo.listAllListings(),
      repo.listAllProfiles(),
      repo.listAllCategories()
    ]);
    source = { payments, inquiries, listings, profiles, categories };
    report = buildBusinessReport({ source, range, filters, nowIso });
  } catch (err: unknown) {
    loadError = err instanceof Error && err.message ? err.message : tr('reports.recordsUnreadable');
  }

  // Options are built from every record rather than from the filtered report, so
  // choosing one seller still leaves the others pickable.
  const sellerNames = new Map((source?.profiles ?? []).map((profile) => [profile.id, profile.displayName]));
  const sellerIds = new Set<string>();
  for (const listing of source?.listings ?? []) sellerIds.add(listing.producerId);
  for (const payment of source?.payments ?? []) sellerIds.add(payment.sellerProfileId);
  const sellerOptions = [...sellerIds]
    .map((id) => ({ id, label: sellerNames.get(id) || id }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const categoryOptions = (source?.categories ?? [])
    .filter((category) => (source?.listings ?? []).some((listing) => listing.categoryId === category.id))
    .map((category) => ({ id: category.id, label: category.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const providerIds = new Set<string>((source?.payments ?? []).map((payment) => payment.provider));
  if (filters.provider) providerIds.add(filters.provider);

  /** A URL query carrying the current window and filters, with overrides. */
  const query = (overrides: Record<string, string>): string => {
    const params = new URLSearchParams();
    const values: Record<string, string> = {
      range: range.kind === 'custom' && !range.invalidCustom ? 'custom' : range.kind,
      from: range.fromDay,
      to: range.toDay,
      status: filters.status,
      seller: filters.sellerId,
      category: filters.categoryId,
      provider: filters.provider,
      ...overrides
    };
    for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
    return params.toString();
  };

  return (
    <AdminSection
      title={tr('reports.title')}
      description={`${tr('reports.intro')} ${tr('reports.timezoneNote', { timeZone: REPORT_TIMEZONE })}`}
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            {(['day', 'week', 'custom'] as const).map((kind) => {
              const active = range.kind === kind && !range.invalidCustom;
              const label = kind === 'day' ? tr('reports.daily') : kind === 'week' ? tr('reports.weekly') : tr('reports.custom');
              return (
                <Link
                  key={kind}
                  href={`/admin/business-reports?${query({ range: kind, from: '', to: '' })}`}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-lg px-3 py-2 min-h-11 border ${
                    active ? 'bg-clay-50 border-clay-200 text-clay-800' : 'border-ink-100 bg-white text-ink-700 hover:bg-clay-50'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <form method="get" className="mt-4 grid md:grid-cols-4 gap-3">
            <input type="hidden" name="range" value={range.kind === 'day' || range.kind === 'week' ? range.kind : 'custom'} />
            <div>
              <label htmlFor="from" className="block text-sm font-semibold text-ink-900 mb-1">
                {tr('reports.from')}
              </label>
              <Input id="from" name="from" type="date" defaultValue={range.fromDay} />
            </div>
            <div>
              <label htmlFor="to" className="block text-sm font-semibold text-ink-900 mb-1">
                {tr('reports.to')}
              </label>
              <Input id="to" name="to" type="date" defaultValue={range.toDay} />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-ink-900 mb-1">
                {tr('reports.status')}
              </label>
              <Select id="status" name="status" defaultValue={filters.status}>
                <option value="">{tr('reports.allOptions')}</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {tr(`payment.status.${status}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="seller" className="block text-sm font-semibold text-ink-900 mb-1">
                {tr('reports.seller')}
              </label>
              <Select id="seller" name="seller" defaultValue={filters.sellerId}>
                <option value="">{tr('reports.allOptions')}</option>
                {sellerOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-ink-900 mb-1">
                {tr('reports.category')}
              </label>
              <Select id="category" name="category" defaultValue={filters.categoryId}>
                <option value="">{tr('reports.allOptions')}</option>
                {categoryOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="provider" className="block text-sm font-semibold text-ink-900 mb-1">
                {tr('reports.provider')}
              </label>
              <Select id="provider" name="provider" defaultValue={filters.provider}>
                <option value="">{tr('reports.allOptions')}</option>
                {Object.entries(PROVIDER_LABELS)
                  .filter(([id]) => providerIds.has(id))
                  .map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="rounded-lg bg-ink-900 text-white px-4 py-2 min-h-11 text-sm font-semibold">
                {tr('reports.run')}
              </button>
              <Link
                href="/admin/business-reports"
                className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 text-sm font-semibold"
              >
                {tr('common.clear')}
              </Link>
            </div>
          </form>

          <p className="mt-3 text-sm text-ink-700">
            <span className="font-semibold">{tr('reports.range')}:</span> {range.fromDay} → {range.toDay} · {REPORT_TIMEZONE}
          </p>
          {range.invalidCustom && <p className="mt-2 text-sm rounded-lg bg-clay-50 text-clay-800 px-3 py-2">{tr('reports.invalidCustom')}</p>}
          <p className="mt-2 text-xs text-ink-500">{tr('reports.countingRules')}</p>
          {(filters.status || filters.provider) && <p className="mt-1 text-xs text-ink-500">{tr('reports.inquiryFilterNote')}</p>}
        </CardBody>
      </Card>

      {loadError && (
        <ErrorState lang={lang} title={tr('reports.recordsUnavailable')} body={loadError} retryHref="/admin/business-reports" />
      )}

      {report && (
        <>
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-ink-900">{tr('reports.summaryHeading')}</h2>
                {report.containsSampleData && <SampleTag />}
              </div>
              <dl className="mt-2 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <Figure label={tr('reports.inquiries')} value={String(report.totals.inquiries)} />
                <Figure label={tr('reports.attempts')} value={String(report.totals.attempts)} />
                <Figure label={tr('reports.confirmed')} value={String(report.totals.confirmed)} />
                <Figure label={tr('reports.paidInquiries')} value={String(report.totals.paidInquiries)} />
                <Figure label={tr('reports.revenue')} value={money(report.totals.revenueCents)} />
                <Figure label={tr('reports.awaiting')} value={String(report.totals.awaiting)} />
                <Figure label={tr('reports.closed')} value={String(report.totals.closed)} />
                <Figure
                  label={tr('reports.refunded')}
                  value={`${report.totals.refunded} · ${money(report.totals.refundedCents)}`}
                />
              </dl>
              <p className="mt-2 text-xs text-ink-500">{tr('reports.notRevenueNote')}</p>
              <p className="mt-2 text-xs text-ink-500">{tr('reports.fees')}: {money(report.totals.feeCents)}</p>
              <p className="mt-2 text-xs text-ink-500">{provider.detail}</p>
              {report.containsSampleData && (
                <p className="mt-2 text-xs text-ink-500">{tr('reports.demoRows', { count: report.totals.demoRows })}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/api/admin/business-reports/export?${query({ format: 'csv' })}`}
                  className="rounded-lg bg-ink-900 text-white px-4 py-2 min-h-11 text-sm font-semibold"
                >
                  {tr('reports.exportCsv')}
                </Link>
                <Link
                  href={`/api/admin/business-reports/export?${query({ format: 'pdf' })}`}
                  className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 text-sm font-semibold"
                >
                  {tr('reports.exportPdf')}
                </Link>
              </div>
              <p className="mt-2 text-xs text-ink-500">{tr('reports.csvNote')}</p>
            </CardBody>
          </Card>

          {report.totals.inquiries === 0 && report.totals.attempts === 0 ? (
            <Empty
              title={tr('reports.empty')}
              body={`${tr('reports.timezoneNote', { timeZone: REPORT_TIMEZONE })} ${
                provider.mode === 'demo' ? tr('reports.emptyDemoNote') : tr('reports.emptyLedgerNote')
              }`}
            />
          ) : (
            <>
              <ReportTable
                heading={tr('reports.byDay')}
                emptyText={tr('reports.empty')}
                columns={[tr('reports.day'), tr('reports.inquiries'), tr('reports.attempts'), tr('reports.confirmed'), tr('reports.revenue')]}
                rows={report.byDay.map((entry) => [
                  entry.day,
                  String(entry.inquiries),
                  String(entry.attempts),
                  String(entry.confirmed),
                  money(entry.revenueCents)
                ])}
              />
              <ReportTable
                heading={tr('reports.status')}
                emptyText={tr('reports.empty')}
                columns={[tr('reports.status'), tr('reports.count'), tr('reports.amount'), tr('reports.countsAsRevenue')]}
                rows={report.byStatus.map((entry) => [
                  tr(`payment.status.${entry.status}`),
                  String(entry.count),
                  money(entry.amountCents),
                  entry.countsAsRevenue ? tr('reports.yes') : tr('reports.no')
                ])}
              />
              <ReportTable
                heading={tr('reports.bySeller')}
                emptyText={tr('reports.empty')}
                columns={[tr('reports.seller'), tr('reports.inquiries'), tr('reports.confirmed'), tr('reports.revenue')]}
                rows={report.bySeller.map((entry) => [entry.label, String(entry.inquiries), String(entry.confirmed), money(entry.revenueCents)])}
              />
              <ReportTable
                heading={tr('reports.byCategory')}
                emptyText={tr('reports.empty')}
                columns={[tr('reports.category'), tr('reports.inquiries'), tr('reports.confirmed'), tr('reports.revenue')]}
                rows={report.byCategory.map((entry) => [entry.label, String(entry.inquiries), String(entry.confirmed), money(entry.revenueCents)])}
              />
              <ReportTable
                heading={tr('reports.byProvider')}
                emptyText={tr('reports.empty')}
                columns={[tr('reports.provider'), tr('reports.attempts'), tr('reports.confirmed'), tr('reports.revenue')]}
                rows={report.byProvider.map((entry) => [entry.label, String(entry.attempts), String(entry.confirmed), money(entry.revenueCents)])}
              />

              <Card>
                <CardBody>
                  <h2 className="font-semibold text-ink-900">{tr('reports.paymentRows')}</h2>
                  {report.rows.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-700">{tr('reports.empty')}</p>
                  ) : (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-sm">
                        <caption className="text-left text-xs text-ink-500 pb-2">
                          {tr('reports.rowsShown', { shown: Math.min(report.rows.length, PAGE_ROW_LIMIT), total: report.rows.length })}
                        </caption>
                        <thead>
                          <tr className="text-left border-b border-ink-100">
                            <th className="py-2 pr-4 font-semibold text-ink-900">{tr('reports.reference')}</th>
                            <th className="py-2 pr-4 font-semibold text-ink-900">{tr('reports.inquiryRef')}</th>
                            <th className="py-2 pr-4 font-semibold text-ink-900">{tr('reports.seller')}</th>
                            <th className="py-2 pr-4 font-semibold text-ink-900">{tr('reports.status')}</th>
                            <th className="py-2 font-semibold text-ink-900">{tr('reports.amount')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.rows.slice(0, PAGE_ROW_LIMIT).map((row) => (
                            <tr key={row.paymentReference} className="border-b border-ink-100 last:border-0">
                              <td className="py-2 pr-4 font-mono break-all">{row.paymentReference}</td>
                              <td className="py-2 pr-4">
                                <Link href={`/admin/orders?q=${encodeURIComponent(row.inquiryReference)}`} className="underline">
                                  {row.inquiryReference}
                                </Link>
                              </td>
                              <td className="py-2 pr-4">{row.sellerName}</td>
                              <td className="py-2 pr-4">
                                <span className="flex flex-wrap gap-2 items-center">
                                  <PaymentStatusBadge lang={lang} status={row.status} isDemo={row.isDemo} />
                                  {row.isDemo && <SampleTag />}
                                </span>
                              </td>
                              <td className="py-2">{money(row.amountCents)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-ink-500">{tr('reports.receiptsLinkNote')}</p>
                  <p className="mt-2 text-sm">
                    <Link href="/admin/payments" className="underline font-semibold text-clay-700">
                      {tr('reports.openLedger')}
                    </Link>
                  </p>
                </CardBody>
              </Card>
            </>
          )}
        </>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{tr('reports.otherReportsTitle')}</h2>
          <p className="mt-2 text-sm text-ink-700">{tr('reports.otherReportsBody')}</p>
          <p className="mt-2 text-sm">
            <Link href="/admin/reports" className="underline font-semibold text-clay-700">
              {tr('reports.openListingReports')}
            </Link>
          </p>
        </CardBody>
      </Card>
    </AdminSection>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-ink-900 font-medium text-lg">{value}</dd>
    </div>
  );
}

function ReportTable({ heading, columns, rows, emptyText }: { heading: string; columns: string[]; rows: string[][]; emptyText: string }) {
  return (
    <Card>
      <CardBody>
        <h2 className="font-semibold text-ink-900">{heading}</h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-ink-700">{emptyText}</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-ink-100">
                  {columns.map((column) => (
                    <th key={column} className="py-2 pr-4 font-semibold text-ink-900">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((cells) => (
                  <tr key={cells.join('|')} className="border-b border-ink-100 last:border-0">
                    {cells.map((cell, index) => (
                      <td key={`${index}-${cell}`} className="py-2 pr-4 tabular-nums">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
